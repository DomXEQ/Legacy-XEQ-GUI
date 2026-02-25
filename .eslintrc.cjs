module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: ["plugin:vue/vue3-recommended", "eslint:recommended"],
  globals: {
    __statics: true,
    __ryo_bin: true
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "vue/multi-word-component-names": "off",
    "vue/no-v-model-argument": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
  }
};
