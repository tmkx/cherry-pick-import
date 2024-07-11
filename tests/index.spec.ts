import path from 'node:path';
import { expect, test } from 'vitest';
import { cherryPickImport } from '../src';

test('Plasmo', () => {
  const result = cherryPickImport({
    filename: path.resolve(__dirname, './fixtures/plasmo/content.tsx'),
    identifiers: ['config'],
  });

  expect(result).toMatchInlineSnapshot(`
    {
      "config": {
        "css": [
          "font.css",
        ],
        "matches": [
          "https://www.plasmo.com/*",
        ],
      },
    }
  `);
});
