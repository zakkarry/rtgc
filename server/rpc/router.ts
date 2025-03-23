import { rules } from "./rules.ts";
import { router } from "../trpc.ts";
import { auth } from "./auth.ts";
import { settings } from "./settings.ts";
import { torrents } from "./torrents.ts";

export const appRouter = router({
  auth,
  settings,
  torrents,
  rules,
});

export type AppRouter = typeof appRouter;
