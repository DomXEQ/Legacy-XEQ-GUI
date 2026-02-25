import { createRouter, createWebHashHistory } from "vue-router";
import routes from "./routes";

const Router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes
});

export default Router;
