import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * A colour written where code needs one: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, or a static
 * `rgb()`/`hsl()` string. Values come from `src/scene/palette.ts` or an `@theme` token, and the
 * palette is the one module allowed to hold them.
 */
const PALETTE_MESSAGE =
  'Colours live in src/scene/palette.ts or an @theme token in src/index.css, never in a component or module. Add the value to the palette and import it.'
const colourLiterals = [
  {
    selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: PALETTE_MESSAGE,
  },
  {
    selector: 'Literal[value=/^(?:rgb|rgba|hsl|hsla)\\(/]',
    message: PALETTE_MESSAGE,
  },
]

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
        ...colourLiterals,
      ],
    },
  },
  {
    // The same rule for the modules behind the components: the PDF report and the map's HUD are
    // where hardcoded inks have actually appeared. The palette itself holds the values, and the
    // tests may assert on them.
    files: ['src/**/*.ts'],
    ignores: ['src/scene/palette.ts', 'src/**/*.test.ts'],
    rules: { 'no-restricted-syntax': ['error', ...colourLiterals] },
  },
  prettier,
)
