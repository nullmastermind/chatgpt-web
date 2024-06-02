import * as localforage from "localforage";

const store = localforage.createInstance({
  name: "store",
  driver: localforage.INDEXEDDB,
});

export const messagesKey = (collectionId: string | number): string => {
  return `messages/${collectionId}`;
};

export default store;
