import { describe, expect, test } from 'vitest';
import { cherryPickTransform, CherryPickTransformOptions, trimExport } from '../src/transform';

describe('trimExport', () => {
  test('no identifiers', () => {
    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = 'bar';
          export const baz = 'qux';
        `,
        identifiers: [],
      }).trim()
    ).toMatchInlineSnapshot(`"export {};"`);

    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = 'bar';
          export default 'qux';
        `,
        identifiers: [],
      }).trim()
    ).toMatchInlineSnapshot(`"export {};"`);

    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = () => {};
          export default function() {}
        `,
        identifiers: [],
      }).trim()
    ).toMatchInlineSnapshot(`"export {};"`);
  });

  test('not exist', () => {
    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = 'bar';
          export const baz = 'qux';
        `,
        identifiers: ['hello'],
      }).trim()
    ).toMatchInlineSnapshot(`"export {};"`);
  });

  test('side effects', () => {
    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          console.log('Hello');
        `,
        identifiers: [],
      }).trim()
    ).toMatchInlineSnapshot(`"console.log('Hello');"`);

    // FIXME:
    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          const r = Math.random();

          export {};
        `,
        identifiers: [],
      }).trim()
    ).toMatchInlineSnapshot(`
      "const r = Math.random();
      export {};"
    `);
  });

  test('one identifier', () => {
    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = 'bar';
          export const baz = 'qux';
        `,
        identifiers: ['foo'],
      }).trim()
    ).toMatchInlineSnapshot(`"export const foo = 'bar';"`);

    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = 'bar';
          export default function App() {}
        `,
        identifiers: ['foo'],
      }).trim()
    ).toMatchInlineSnapshot(`"export const foo = 'bar';"`);
  });

  test('default identifier', () => {
    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = 'bar';
          export default function App() {}
        `,
        identifiers: ['default'],
      }).trim()
    ).toMatchInlineSnapshot(`"export default function App() { }"`);

    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export const foo = 'bar';
          export default 123;
        `,
        identifiers: ['default'],
      }).trim()
    ).toMatchInlineSnapshot(`"export default 123;"`);
  });

  test('export declarations', () => {
    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export * from './foo';
          export const foo = 'bar';
          export const baz = 'qux';
        `,
        identifiers: [],
      }).trim()
    ).toMatchInlineSnapshot(`"export {};"`);

    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export { foo } from './foo';
          export const baz = 'qux';
        `,
        identifiers: ['foo'],
      }).trim()
    ).toMatchInlineSnapshot(`"export { foo } from './foo';"`);

    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export { foo } from './foo';
          export const baz = 'qux';
        `,
        identifiers: ['baz'],
      }).trim()
    ).toMatchInlineSnapshot(`"export const baz = 'qux';"`);

    expect(
      trimExport({
        filename: '/mod.tsx',
        code: `
          export * as foo from './foo';
          export const baz = 'qux';
        `,
        identifiers: ['baz'],
      }).trim()
    ).toMatchInlineSnapshot(`"export const baz = 'qux';"`);
  });
});

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
