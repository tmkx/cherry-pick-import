import ts from 'typescript/lib/tsserverlibrary';

const sourceText = `
import cssText from 'data-text:~/contents/plasmo-overlay.css';
import unused from 'unused';
import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://www.plasmo.com/*'],
  css: ['font.css'],
};

const hello = 'world';

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

function PlasmoOverlay() {
  return (
    <span
      className="hw-top"
      style={{
        padding: 12,
      }}
    >
      CSUI OVERLAY FIXED POSITION
    </span>
  );
};

// export default PlasmoOverlay;
`;

const start = performance.now();

const sourceFilename = '/mod.tsx';
const keepIdentifiers = ['config'];

const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ESNext,
  skipDefaultLibCheck: true,
  skipLibCheck: true,
};

function createLanguageServiceHost(sourceFilename: string, sourceText: string) {
  let currentScriptVersion = 0;
  let currentSourceText = sourceText;

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
    readFile(path: string, encoding?: string): string | undefined {
      throw new Error('readFile Function not implemented.');
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

const { languageServiceHost, updateFile } = createLanguageServiceHost(sourceFilename, sourceText);
const lsp = ts.createLanguageService(languageServiceHost);

// console.log(lsp.getSuggestionDiagnostics(sourceFilename).map((diagnostics) => diagnostics.messageText));

const program = lsp.getProgram()!;

function applyFix(program: ts.Program, fileName: string, fixId: string) {
  const sf = program.getSourceFile(sourceFilename)!;
  let text = sf.text;
  const combinedCodeFix = lsp.getCombinedCodeFix({ type: 'file', fileName }, fixId, {}, {});
  for (const change of combinedCodeFix.changes) {
    for (const { span, newText } of change.textChanges) {
      text = text.slice(0, span.start) + newText + text.slice(span.start + span.length);
      updateFile(text);
    }
  }
}

applyFix(program, sourceFilename, 'unusedIdentifier_delete');
// applyFix(program, sourceFilename, 'unusedIdentifier_deleteImports');

console.log(lsp.getEmitOutput(sourceFilename).outputFiles[0].text);

console.log('elapsed:', `${performance.now() - start}ms`);
