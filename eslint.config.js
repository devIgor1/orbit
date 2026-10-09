import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  { files: ['src/**/*.{ts,tsx}'], plugins: { 'react-refresh': reactRefresh }, rules: { 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] } },
  { files: ['**/*.{js,mjs}'], languageOptions: { globals: globals.node } },
  { files: ['supabase/functions/**/*.ts'], languageOptions: { globals: { Deno: 'readonly' } } },
)
