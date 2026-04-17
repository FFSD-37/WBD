import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const API_BASE = import.meta.env.VITE_MANAGER_API || "http://localhost:3001";

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: `${API_BASE}/graphql`,
    credentials: "include",
  }),
  cache: new InMemoryCache(),
});
