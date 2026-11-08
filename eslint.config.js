export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module"
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "warn"
    }
  }
];
