import path from 'node:path';
import createJITI from 'jiti';
import babelTransform from 'jiti/dist/babel.js';
import { cherryPickTransform } from './transform';

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
      if (opts.filename === filename) opts.source = cherryPickTransform({ filename, code: opts.source, identifiers });
      return babelTransform(opts);
    },
  })(filename);
}
