import { omit } from 'lodash-es'
import withNuxt from './.nuxt/eslint.config.mjs'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import globals from 'globals'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import prettierConfig from 'eslint-config-prettier'
import js from '@eslint/js'

/**
 * Feed in import.meta.url in your .mjs module to get the equivalent of __dirname
 * @param {string} importMetaUrl
 */
export const getESMDirname = (importMetaUrl) => {
  return dirname(fileURLToPath(importMetaUrl))
}

const configs = await withNuxt([
  {
    rules: {
      camelcase: [
        'error',
        {
          properties: 'always',
          allow: ['^[\\w]+_[\\w]+Fragment$']
        }
      ],
      'no-alert': 'error',
      eqeqeq: ['error', 'always', { null: 'always' }],
      'no-console': 'off',
      'no-var': 'error'
    }
  },
  {
    files: ['**/*.{ts,vue,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        extraFileExtensions: ['.vue'],
        tsconfigRootDir: getESMDirname(import.meta.url)
      }
    }
  },
  {
    files: ['**/*.test.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },
  {
    files: ['./{components|pages|store|lib}/*.{js,ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      '@typescript-eslint/no-explicit-any': ['error'],
      '@typescript-eslint/no-unsafe-argument': ['error'],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-for-in-array': ['error'],
      '@typescript-eslint/restrict-plus-operands': ['error'],
      '@typescript-eslint/await-thenable': ['warn'],
      '@typescript-eslint/no-restricted-types': ['warn'],
      'require-await': 'off',
      '@typescript-eslint/require-await': 'error',
      'no-undef': 'off',

      '@typescript-eslint/no-empty-object-type': 'off', // too restrictive
      '@typescript-eslint/unified-signatures': 'off', // DX sucks in vue event definitions
      '@typescript-eslint/no-dynamic-delete': 'off', // too restrictive
      '@typescript-eslint/restrict-template-expressions': 'off', // too restrictive
      '@typescript-eslint/no-invalid-void-type': 'off' // too restrictive
    }
  },
  ...pluginVueA11y.configs['flat/recommended'].map((c) => ({
    ...c,
    files: [...(c.files || []), '**/*.vue'],
    languageOptions: c.languageOptions
      ? omit(c.languageOptions, ['parserOptions', 'parser']) // Prevent overriding parser
      : undefined
  })),
  {
    files: ['**/*.vue'],
    rules: {
      'vue/block-order': ['error', { order: ['docs', 'template', 'script', 'style'] }],
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        { registeredComponentsOnly: false }
      ],
      'vuejs-accessibility/label-has-for': [
        'error',
        {
          required: {
            some: ['nesting', 'id']
          }
        }
      ],
      'vue/html-self-closing': 'off' // messes with prettier
    }
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-var': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-restricted-types': 'off'
    }
  }
]).prepend([
  {
    ignores: [
      '**/node_modules/**',
      '**/templates/*',
      './lib/common/generated/**/*',
      'storybook-static',
      '.nuxt/**',
      '.output/**',
      '**/dist/**',
      '**/dist-*/**',
      '**/public/**',
      '**/events.json',
      '**/generated/**/*'
    ]
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module'
    }
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs'
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}', '**/.*.{js,mjs,cjs}'],
    ...js.configs.recommended
  },
  prettierConfig,
  {
    rules: {
      camelcase: [
        1,
        {
          properties: 'always'
        }
      ],
      'no-var': 'error',
      'no-alert': 'error',
      eqeqeq: 'error',
      'prefer-const': 'warn',
      'object-shorthand': 'warn'
    }
  }
])

export default configs
