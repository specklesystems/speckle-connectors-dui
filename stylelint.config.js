module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-recommended-vue'],
  // add your custom config here
  // https://stylelint.io/user-guide/configuration
  rules: {
    // Rules to make stylelint happy with tailwind syntax
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen']
      }
    ],
    'at-rule-no-deprecated': [true, { ignoreAtRules: ['apply'] }],
    'no-descending-specificity': null
  },
  overrides: [
    {
      files: '**/*.vue',
      rules: {
        'value-keyword-case': null
      }
    }
  ]
}
