import { scanOrphanedPaths } from "../rtgc.ts";
import { getSettings } from "../db.ts";
import { protectedProcedure, router } from "../trpc.ts";

export const paths = router({
  scanForOrphans: protectedProcedure.query(async () => {
    const { dataDirs } = getSettings();
    return await scanOrphanedPaths(dataDirs);
  }),
});
