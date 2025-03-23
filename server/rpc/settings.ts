import { z } from "zod";
import { getSettings, updateSettings } from "../db.ts";
import { protectedProcedure, router } from "../trpc.ts";

export const settings = router({
  getSettings: protectedProcedure.query(getSettings),
  updateSettings: protectedProcedure
    .input(
      z.object({
        rtorrentUrl: z.string(),
        dataDirs: z.array(z.string()),
      })
    )
    .mutation((t) => updateSettings(t.input)),
});
