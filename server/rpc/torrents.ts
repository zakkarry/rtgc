import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSettings } from "../db.ts";
import { scanTorrents, cleanupTorrents } from "../rtgc.ts";
import { protectedProcedure, router } from "../trpc.ts";
import { RTorrent } from "../rtorrent.ts";

export const torrents = router({
  scanTorrents: protectedProcedure.query(async () => {
    try {
      const { rtorrentUrl, dataDirs } = getSettings();
      const rtorrent = new RTorrent(rtorrentUrl);
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
        const { rtorrentUrl, dataDirs } = getSettings();
        const rtorrent = new RTorrent(rtorrentUrl);
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
