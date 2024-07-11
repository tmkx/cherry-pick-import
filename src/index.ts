import path from 'node:path';
import createJITI from 'jiti';
import babelTransform from 'jiti/dist/babel.js';
import { Project, ts } from 'ts-morph';

export interface CherryPickImportOptions {
  filename: string;
  identifiers: string[];
}

export function cherryPickImport({ filename, identifiers }: CherryPickImportOptions) {
  if (!path.isAbsolute(filename)) throw new Error(`filename must be an absolute path`);
  return createJITI(__filename, {
    cache: false,
    requireCache: false,
    extensions: ['.ts', '.js', '.mts', '.mjs', '.tsx'],
    transform(opts) {
      if (opts.filename === filename)
        return {
          code: cherryPick(filename, opts.source, identifiers),
        };
      return babelTransform(opts);
    },
  })(filename);
}

function cherryPick(filename: string, code: string, identifiers: string[]) {
  const basename = path.basename(filename);
  const project = new Project({
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ESNext,
    },
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
  });

  const sourceFile = project.createSourceFile(basename, code);
  sourceFile.transform((traversal) => {
    const node = traversal.visitChildren();
    if (ts.isImportDeclaration(node)) {
      // remove all import declarations that have no specifiers, assuming that they have no side effects.
      if (!node.importClause) return traversal.factory.createEmptyStatement();
    }
    return node;
  });
  const variableDeclarations = sourceFile.getVariableDeclarations();
  variableDeclarations.filter((exp) => !identifiers.includes(exp.getName())).forEach((exp) => exp.remove());
  sourceFile.removeDefaultExport().fixUnusedIdentifiers().saveSync();

  project.emitSync();

  const fs = project.getFileSystem();
  const extIndex = basename.lastIndexOf(path.extname(basename));
  return fs.readFileSync(basename.slice(0, extIndex) + '.js', 'utf8');
}
