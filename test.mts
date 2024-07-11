import ts from 'typescript';

const sourceText = `
import cssText from 'data-text:~/contents/plasmo-overlay.css';
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

export default PlasmoOverlay;
`;

const start = performance.now();

const sourceFilename = '/mod.tsx';
const keepIdentifiers = ['config'];

class LightCompilerHost implements ts.CompilerHost {
  jsDocParsingMode = ts.JSDocParsingMode.ParseNone;
  getSourceFile(
    fileName: string,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions
  ): ts.SourceFile | undefined {
    if (fileName !== sourceFilename) return undefined;
    return ts.createSourceFile(fileName, sourceText, languageVersionOrOptions, true);
  }
  getSourceFileByPath?(
    fileName: string,
    path: ts.Path,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean
  ): ts.SourceFile | undefined {
    throw new Error('getSourceFileByPath Method not implemented.');
  }
  getDefaultLibFileName(_options: ts.CompilerOptions): string {
    return '';
  }
  writeFile(fileName: string, text: string) {
    console.log('writeFile', fileName, text);
  }

  getCurrentDirectory(): string {
    return '/';
  }
  getCanonicalFileName(fileName: string): string {
    return fileName;
  }
  useCaseSensitiveFileNames(): boolean {
    return true;
  }
  getNewLine(): string {
    throw new Error('getNewLine Method not implemented.');
  }
  fileExists(fileName: string): boolean {
    console.log('fileExists', fileName);
    return fileName === sourceFilename;
  }
  readFile(fileName: string): string | undefined {
    console.log('readFile', { fileName });
    if (fileName === sourceFilename) return sourceText;
    return undefined;
  }
  directoryExists(directoryName: string): boolean {
    return directoryName === '/';
  }
}

const compilerHost = new LightCompilerHost();

const program = ts.createProgram({
  rootNames: [sourceFilename],
  options: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ESNext,
    skipDefaultLibCheck: true,
    skipLibCheck: true,
  },
  host: compilerHost,
});

const modSf = program.getSourceFile(sourceFilename)!;
const typeChecker = program.getTypeChecker();

const modSymbol = typeChecker.getSymbolAtLocation(modSf)!;
const exportsOfModule = typeChecker.getExportsOfModule(modSymbol);

const unusedDecls: ts.Node[] = exportsOfModule
  .filter((exp) => !keepIdentifiers.includes(exp.escapedName.toString()))
  .flatMap((exp) => exp.declarations || []);

const newSf = ts.transform(
  modSf,
  [
    (ctx) => {
      const visitor: ts.Visitor = (node) => {
        if (unusedDecls.includes(node)) {
          return;
        }
        return ts.visitEachChild(node, visitor, ctx);
      };
      return (sf) => ts.visitEachChild(sf, visitor, ctx);
    },
  ],
  undefined
);

console.log(ts.createPrinter().printNode(ts.EmitHint.Unspecified, newSf.transformed[0], newSf.transformed[0]));
console.log('elapsed:', `${performance.now() - start}ms`);
