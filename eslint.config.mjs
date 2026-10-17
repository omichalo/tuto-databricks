import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const forbiddenEverywhere = [
  { name: 'next/og', message: 'next/og est interdit (base de sécurité Next.js).' },
  {
    name: 'firebase/firestore',
    message: 'Le client ne parle pas à Firestore directement : passer par les Route Handlers.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.tools/**',
      '.next/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'public/**',
      'src/generated/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unnecessary-condition': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "ExpressionStatement[directive='use server']",
          message: 'Aucune Server Action : utiliser des Route Handlers (GHSA Server Actions).',
        },
      ],
      'no-restricted-imports': ['error', { paths: forbiddenEverywhere }],
    },
  },
  {
    files: ['src/components/**', 'src/lib/client/**', 'src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...forbiddenEverywhere,
            { name: 'firebase-admin', message: 'Admin SDK réservé à src/server.' },
          ],
          patterns: [
            { group: ['@/server/*', '**/server/*'], message: 'Code serveur interdit côté client.' },
            { group: ['firebase-admin/*'], message: 'Admin SDK réservé à src/server.' },
            {
              group: ['@/generated/server/*'],
              message: 'Clés de correction : serveur uniquement.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.ts', '*.config.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Les tests de règles jouent le rôle d'un client malveillant : ils ont besoin du SDK client.
    files: ['tests/emulators/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: forbiddenEverywhere.filter((p) => p.name !== 'firebase/firestore') },
      ],
    },
  },
);
