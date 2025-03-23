import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getRules } from "../db.ts";
import { auth } from "./auth.ts";
import { scanTorrents, cleanupTorrents } from "../rtgc.ts";
import { rtorrent, dataDirs } from "../server.ts";
import { router, protectedProcedure } from "../trpc.ts";

export const appRouter = router({
  auth: auth,
  getRules: protectedProcedure.query(getRules),
  scanTorrents: protectedProcedure.query(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await scanTorrents(rtorrent, dataDirs);
    } catch (error) {
      console.error("Error scanning torrents:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
  cleanupTorrents: protectedProcedure
    .input(z.object({ paths: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      try {
        return await cleanupTorrents(rtorrent, dataDirs, input.paths);
      } catch (error) {
        console.error("Error cleaning up torrents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
});
export type AppRouter = typeof appRouter;
