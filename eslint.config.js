// ESLint v9 flat configuration. The project uses ES modules ("type": "module").
export default [
  {
    ignores: [
      "**/vendor/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/.firebase/**",
      "**/.vs/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module"
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "off"
    }
  },
  {
    files: ["chrome-extension/**/*.{js,mjs}", "toolbox/**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        chrome: "readonly"
      }
    }
  }
];
