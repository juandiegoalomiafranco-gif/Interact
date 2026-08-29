import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    // next-env.d.ts y los tipos de Airtable son generados: no se revisan a mano.
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'types/airtable.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default config;
