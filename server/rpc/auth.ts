import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorize, generateJwt, signUp } from "../auth.ts";
import { getUser } from "../db.ts";
import { publicProcedure, router } from "../trpc.ts";

export const auth = router({
  logIn: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (getUser() === undefined) {
        console.log("no user, signing up");
        await signUp(input);
      }
      if (authorize(input)) {
        ctx.setSession(generateJwt(input));
      } else {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }),
  authStatus: publicProcedure.query(async ({ ctx }) => {
    return {
      userExists: getUser() !== undefined,
      isLoggedIn: ctx.user !== undefined,
    };
  }),
  logOut: publicProcedure.mutation(async ({ ctx }) => {
    ctx.deleteSession();
  }),
});
