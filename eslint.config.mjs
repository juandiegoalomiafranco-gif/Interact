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
  {
    rules: {
      /**
       * Un parámetro con guion bajo delante está ahí a propósito y no se usa.
       * Caso real: `middleware.ts` declara el segundo parámetro solo para que
       * TypeScript elija la sobrecarga de middleware de `auth()` en vez de la
       * de manejador de ruta. Borrarlo rompe los tipos.
       */
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

export default config;
