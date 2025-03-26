import { deleteTorrents, scanOrphanedPaths } from "../rtgc.ts";
import { getSettings } from "../db.ts";
import { protectedProcedure, router } from "../trpc.ts";
import { z } from "zod";
import { torrentInfoSchema } from "./torrents.ts";
import { RTorrent } from "../rtorrent.ts";
import { rm } from "fs/promises";

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
      const { rtorrentUrl, dataDirs } = getSettings();
      const rtorrent = new RTorrent(rtorrentUrl);

      for (const orphan of orphanedPaths) {
        if (!dataDirs.some((dir) => orphan.path.startsWith(dir))) {
          throw new Error(`Path ${orphan.path} is not inside any dataDir`);
        }
      }

      await deleteTorrents(
        rtorrent,
        orphanedPaths.flatMap((p) => p.relatedTorrents.map((t) => t.infoHash))
      );

      await Promise.all(
        orphanedPaths.map(async (orphan) => {
          await rm(orphan.path, { recursive: true });
        })
      );
    }),
});
