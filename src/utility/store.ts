import * as localforage from "localforage";

const store = localforage.createInstance({
  name: "store",
  driver: localforage.INDEXEDDB,
});

export default store;
