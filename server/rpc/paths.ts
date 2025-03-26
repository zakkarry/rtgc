import { z } from "zod";
import { getSettings } from "../db.ts";
import { deleteOrphanedPaths, scanOrphanedPaths } from "../rtgc.ts";
import { RTorrent } from "../rtorrent.ts";
import { protectedProcedure, router } from "../trpc.ts";
import { torrentInfoSchema } from "./torrents.ts";

export const orphanedPathSchema = z.object({
  path: z.string(),
  size: z.number(),
  type: z.literal("orphaned"),
  lastModified: z.number(),
  relatedTorrents: z.array(torrentInfoSchema),
});

export const paths = router({
  scanForOrphans: protectedProcedure
    .input(z.object({ allTorrents: z.array(torrentInfoSchema) }))
    .query(async ({ input: { allTorrents } }) => {
      const { dataDirs } = getSettings();
      return await scanOrphanedPaths(dataDirs, allTorrents);
    }),

  deleteOrphans: protectedProcedure
    .input(z.object({ orphanedPaths: z.array(orphanedPathSchema) }))
    .mutation(async ({ input: { orphanedPaths } }) => {
      const { rtorrentUrl, dataDirs, failPastThreshold } = getSettings();
      const rtorrent = new RTorrent(rtorrentUrl);
      return await deleteOrphanedPaths(
        orphanedPaths,
        rtorrent,
        dataDirs,
        failPastThreshold
      );
    }),
});
