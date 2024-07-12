import { cherryPickTransform } from './src/transform';

const sourceText = `
import cssText from 'data-text:~/contents/plasmo-overlay.css';
import unused from 'unused';
import type { PlasmoCSConfig } from 'plasmo';
import '@/global.less';

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
}

export default PlasmoOverlay;
`;

const start = performance.now();

const sourceFilename = '/mod.tsx';
const keepIdentifiers = ['config'];

const result = cherryPickTransform({ filename: sourceFilename, code: sourceText, identifiers: keepIdentifiers });

console.log(result);

console.log('elapsed:', `${performance.now() - start}ms`);
