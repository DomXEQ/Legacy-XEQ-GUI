import { boot } from "quasar/wrappers";
import { createI18n } from "vue-i18n";
import messages from "src/i18n";
import { Quasar } from "quasar";

let i18n;

export default boot(({ app }) => {
  i18n = createI18n({
    locale: "en-us",
    fallbackLocale: "en-us",
    messages,
    legacy: true,
    globalInjection: true
  });

  app.use(i18n);
});

const langModules = import.meta.glob("../i18n/*.js");

const changeLanguage = lang => {
  return new Promise((resolve, reject) => {
    const loader = langModules[`../i18n/${lang}.js`];
    if (!loader) {
      reject(new Error("Language not found"));
      return;
    }
    loader()
      .then(({ default: langMessages }) => {
        i18n.global.locale = lang;
        i18n.global.setLocaleMessage(lang, langMessages);

        // Quasar language files use different naming (e.g., en-US not en-us)
        const quasarLangMap = {
          "en-us": "en-US",
          "pt-br": "pt-BR",
          "zh-cn": "zh-CN"
        };
        const quasarLang = quasarLangMap[lang] || lang;
        import(/* @vite-ignore */ `quasar/lang/${quasarLang}`)
          .then(resultLang => {
            Quasar.lang.set(resultLang.default);
          })
          .catch(() => {
            // Silently fail - English is the default anyway
          })
          .finally(() => {
            resolve(lang);
          });
      })
      .catch(() => {
        reject(new Error("Language not found"));
      });
  });
};

export { i18n, changeLanguage };
