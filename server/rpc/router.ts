import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getRules, getSettings, updateSettings } from "../db.ts";
import { auth } from "./auth.ts";
import { scanTorrents, cleanupTorrents } from "../rtgc.ts";
import { rtorrent, dataDirs } from "../server.ts";
import { router, protectedProcedure } from "../trpc.ts";

// Settings schema
const settingsSchema = z.object({
  rtorrentUrl: z.string(),
  dataDirs: z.array(z.string()),
});

export const appRouter = router({
  auth: auth,
  getRules: protectedProcedure.query(getRules),
  getSettings: protectedProcedure.query(() => {
    return getSettings();
  }),
  updateSettings: protectedProcedure
    .input(settingsSchema)
    .mutation(async ({ input }) => {
      await updateSettings(input);
      // Note: Changes won't apply until server restart
      return {
        success: true,
        message: "Settings updated. Restart server to apply changes.",
      };
    }),
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
