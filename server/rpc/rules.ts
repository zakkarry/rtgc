import { getRules } from "../db.ts";
import { protectedProcedure, router } from "../trpc.ts";

export const rules = router({
  getRules: protectedProcedure.query(getRules),
});
