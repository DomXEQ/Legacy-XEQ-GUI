import { boot } from "quasar/wrappers";
import { Gateway } from "src/gateway/gateway";
import store from "src/store";

export default boot(({ app, router }) => {
  app.config.globalProperties.$gateway = new Gateway(app, router, store);
});
