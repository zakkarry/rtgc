import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "../../server/server";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: "/rtgc/trpc" })],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
