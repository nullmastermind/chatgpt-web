import { createGlobalState } from "react-use";
import { CollectionItem } from "@/components/layouts/MainLayout/MainLayout";

export const useCurrentTool = createGlobalState<string | undefined | null>(
  localStorage.getItem(":currentTool") || "settings"
);
export const useCollections = createGlobalState<CollectionItem[]>([]);
export const useGraphqlServer = createGlobalState<string>(
  localStorage.getItem(":graphqlServer") || "http://192.168.50.229:8080/v1/graphql"
);
export const useOpenaiAPIKey = createGlobalState<string>(localStorage.getItem(":openaiKey") || "");
export const useAddCollectionAction = createGlobalState<() => any | undefined>();
