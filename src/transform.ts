import path from 'node:path';
import ts from 'typescript/lib/tsserverlibrary';

const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  skipDefaultLibCheck: true,
  skipLibCheck: true,
};

export interface CherryPickTransformOptions {
  filename: string;
  code: string;
  identifiers: string[];
}

function createLanguageServiceHost(sourceFilename: string, sourceText: string) {
  let currentScriptVersion = 0;
  let currentSourceText = sourceText;
  sourceFilename = toRootDirFilename(sourceFilename);

  const languageServiceHost: ts.LanguageServiceHost = {
    jsDocParsingMode: ts.JSDocParsingMode.ParseNone,
    getCompilationSettings() {
      return compilerOptions;
    },
    getScriptFileNames() {
      return [sourceFilename];
    },
    getScriptVersion(fileName) {
      if (fileName !== sourceFilename) return '0';
      return String(currentScriptVersion);
    },
    getScriptSnapshot(fileName) {
      if (fileName !== sourceFilename) return undefined;
      return ts.ScriptSnapshot.fromString(currentSourceText);
    },
    getCurrentDirectory() {
      return '/';
    },
    directoryExists(directoryName) {
      return directoryName === '/';
    },
    getDefaultLibFileName(options) {
      return ts.getDefaultLibFileName(options);
    },
    readFile() {
      return undefined;
    },
    fileExists(path: string): boolean {
      return path === sourceFilename;
    },
  };

  function updateFile(newSourceText: string) {
    currentSourceText = newSourceText;
    currentScriptVersion++;
  }

  return {
    languageServiceHost,
    updateFile,
  };
}

export function cherryPickTransform(options: CherryPickTransformOptions): string {
  const sourceFilename = toRootDirFilename(options.filename);
  const { languageServiceHost, updateFile } = createLanguageServiceHost(sourceFilename, trimExport(options));
  const lsp = ts.createLanguageService(languageServiceHost);
  updateFile(applyFix(lsp, sourceFilename, 'unusedIdentifier_delete'));
  // updateFile(applyFix(lsp, sourceFilename, 'unusedIdentifier_deleteImports'));
  return lsp.getEmitOutput(sourceFilename).outputFiles[0].text;
}

function applyFix(lsp: ts.LanguageService, fileName: string, fixId: string) {
  const sourceFile = lsp.getProgram()!.getSourceFile(fileName)!;
  let text = sourceFile.text;
  const combinedCodeFix = lsp.getCombinedCodeFix({ type: 'file', fileName }, fixId, {}, {});
  for (const change of combinedCodeFix.changes) {
    for (const { span, newText } of change.textChanges) {
      text = text.slice(0, span.start) + newText + text.slice(span.start + span.length);
    }
  }
  return text;
}

export function trimExport({ filename, code, identifiers }: CherryPickTransformOptions): string {
  return ts
    .transpileModule(code, {
      compilerOptions,
      jsDocParsingMode: ts.JSDocParsingMode.ParseNone,
      fileName: filename,
      transformers: {
        before: [
          (ctx) => {
            const visitor: ts.Visitor = (node) => {
              // remove all import declarations that have no specifiers, assuming that they have no side effects.
              if (ts.isImportDeclaration(node) && !node.importClause) return;
              if (ts.isVariableStatement(node) && isMarkedAsExport(node)) {
                // export const xxx = { ... };
                const declarations = node.declarationList.declarations;
                const [shouldKeep, shouldRemove] = partition(
                  declarations,
                  (decl) => ts.isIdentifier(decl.name) && identifiers.includes(decl.name.text)
                );
                if (shouldKeep.length === 0) return; // no declarations should be kept, just remove the node
              }
              if (ts.isFunctionDeclaration(node) && isMarkedAsExport(node)) {
                // export default function () {}
                const exportName = isMarkedAsDefault(node) ? 'default' : node.name!.text;
                if (!identifiers.includes(exportName)) return;
              }
              if (ts.isExportAssignment(node)) {
                // export default xxx;
                const name = (node as unknown as ts.Type).symbol.name;
                if (!identifiers.includes(name)) return;
              }
              if (ts.isExportDeclaration(node)) {
                const { exportClause } = node;
                // export * from './foo';
                if (!exportClause) return;
                if (ts.isNamedExports(exportClause)) {
                  // export { foo } from './foo';
                  if (exportClause.elements.every(({ name }) => !identifiers.includes(name.text))) return;
                  return ts.factory.updateExportDeclaration(
                    node,
                    node.modifiers,
                    node.isTypeOnly,
                    ts.factory.updateNamedExports(
                      exportClause,
                      exportClause.elements.filter((exportSpecifier) => identifiers.includes(exportSpecifier.name.text))
                    ),
                    node.moduleSpecifier,
                    node.attributes
                  );
                } else {
                  // export * as foo from './foo';
                  if (!identifiers.includes(exportClause.name.text)) return;
                }
              }
              return node; // only need to visit the top-level scope, skip ts.visitEachChild(node, visitor, ctx)
            };
            return (sf) => ts.visitEachChild(sf, visitor, ctx);
          },
        ],
      },
    })
    .outputText.replace(/^\s*\/\/\s*@ts-nocheck/g, '//');
}

function containsModifier(kind: ts.SyntaxKind) {
  return function (node: { readonly modifiers?: ts.NodeArray<ts.ModifierLike> }): boolean {
    return !!node.modifiers && node.modifiers.some((modifier) => modifier.kind === kind);
  };
}

const isMarkedAsExport = containsModifier(ts.SyntaxKind.ExportKeyword);
const isMarkedAsDefault = containsModifier(ts.SyntaxKind.DefaultKeyword);

function toRootDirFilename(filename: string) {
  return path.posix.resolve('/', path.basename(filename));
}

function partition<T>(array: ArrayLike<T>, predicate: (value: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (let i = 0; i < array.length; ++i) {
    const item = array[i];
    if (predicate(item)) truthy.push(item);
    else falsy.push(item);
  }
  return [truthy, falsy];
}
