import ts from 'typescript';
import tsserver from 'typescript/lib/tsserverlibrary';

const sourceText = `
import cssText from 'data-text:~/contents/plasmo-overlay.css';
import unused from 'unused';
import type { PlasmoCSConfig } from 'plasmo';

export const config: PlasmoCSConfig = {
  matches: ['https://www.plasmo.com/*'],
  css: ['font.css'],
};

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
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ESNext,
  skipDefaultLibCheck: true,
  skipLibCheck: true,
};

const lsp = tsserver.createLanguageService({
  jsDocParsingMode: ts.JSDocParsingMode.ParseNone,
  getCompilationSettings() {
    return compilerOptions;
  },
  getScriptFileNames() {
    return [sourceFilename];
  },
  getScriptVersion() {
    return '1';
  },
  getScriptSnapshot(fileName) {
    if (fileName !== sourceFilename) return undefined;
    return ts.ScriptSnapshot.fromString(sourceText);
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
});

// console.log(lsp.getSuggestionDiagnostics(sourceFilename).map((diagnostics) => diagnostics.messageText));

const unusedIdentifierCodeFix = lsp.getCombinedCodeFix(
  {
    type: 'file',
    fileName: sourceFilename,
  },
  'unusedIdentifier_delete',
  {},
  {}
);
const unusedImportsCodeFix = lsp.getCombinedCodeFix(
  {
    type: 'file',
    fileName: sourceFilename,
  },
  'unusedIdentifier_deleteImports',
  {},
  {}
);

console.log(unusedIdentifierCodeFix.changes[0].textChanges);
console.log(unusedImportsCodeFix.changes[0].textChanges);

console.log('elapsed:', `${performance.now() - start}ms`);
