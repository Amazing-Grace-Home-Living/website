export default [
  {
    ignores: [
      "**/vendor/**",
      "**/dist/**",
      "**/node_modules/**"
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
  }
];
