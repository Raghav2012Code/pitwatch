import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
  },
  {
    // Pure modules must not depend on React or three.js.
    files: ['src/{domain,data,geo,compliance}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'three', '@react-three/*', 'zustand'] },
      ],
    },
  },
  {
    // Subscribing to a whole zustand store re-renders on every write, including state the
    // component never reads. Select the slices instead.
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='useTerrain'][arguments.length=0]",
          message:
            'Read only the slices you use: useTerrain((s) => s.surveys), not the whole store.',
        },
      ],
    },
  },
  prettier,
)
