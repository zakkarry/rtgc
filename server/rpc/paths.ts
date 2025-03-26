import { scanOrphanedPaths } from "../rtgc.ts";
import { getSettings } from "../db.ts";
import { protectedProcedure, router } from "../trpc.ts";
import { z } from "zod";
import { torrentInfoSchema } from "./torrents.ts";

export const paths = router({
  scanForOrphans: protectedProcedure
    .input(z.object({ allTorrents: z.array(torrentInfoSchema) }))
    .query(async ({ input: { allTorrents } }) => {
      const { dataDirs } = getSettings();
      return await scanOrphanedPaths(dataDirs, allTorrents);
    }),
});
