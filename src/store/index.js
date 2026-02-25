import { createStore } from "vuex";

import gateway from "./gateway";

const store = createStore({
  modules: {
    gateway
  }
});

export default store;
