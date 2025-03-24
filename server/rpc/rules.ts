import { z } from "zod";
import { getRules, updateRules } from "../db.ts";
import { protectedProcedure, router } from "../trpc.ts";
import { type ProblemType } from "../types.ts";

const ruleSchema = z.object({
  matchType: z.literal("substring"),
  substring: z.string(),
  type: z.enum([
    "healthy",
    "unregistered",
    "orphaned",
    "missingFiles",
    "unknown",
  ] as const satisfies readonly ProblemType[]),
});

export const rules = router({
  getRules: protectedProcedure.query(getRules),
  updateRules: protectedProcedure
    .input(z.array(ruleSchema))
    .mutation((t) => updateRules(t.input)),
});
