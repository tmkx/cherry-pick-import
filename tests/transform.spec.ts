import { describe, expect, test } from 'vitest';
import { cherryPickTransform, CherryPickTransformOptions, trimExport } from '../src/transform';

describe('Plasmo', () => {
  const code = `
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

    const PlasmoOverlay = () => {
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

  const options: CherryPickTransformOptions = {
    filename: '/contents.tsx',
    code,
    identifiers: ['config'],
  };

  test('trimExport', () => {
    const result = trimExport(options);
    expect(result).toMatchInlineSnapshot(`
      "import cssText from 'data-text:~/contents/plasmo-overlay.css';
      export const config = {
          matches: ['https://www.plasmo.com/*'],
          css: ['font.css'],
      };
      const PlasmoOverlay = () => {
          return (<span className="hw-top" style={{
                  padding: 12,
              }}>
                CSUI OVERLAY FIXED POSITION
              </span>);
      };
      "
    `);
  });

  test('cherryPickTransform', () => {
    const result = cherryPickTransform(options);
    expect(result).toMatchInlineSnapshot(`
    "export const config = {
        matches: ['https://www.plasmo.com/*'],
        css: ['font.css'],
    };
    "
  `);
  });
});
