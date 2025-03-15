import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc.ts";
import { createContext } from "./context.ts";
import { authorize, generateJwt, signUp } from "./auth.ts";
import { getRules, getUser } from "./db.ts";
import { TRPCError } from "@trpc/server";
import fastifyCookie from "@fastify/cookie";

const appRouter = router({
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
  logOut: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.deleteSession();
  }),
  getRules: protectedProcedure.query(getRules),
});

export type AppRouter = typeof appRouter;

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyCookie);

fastify.register(fastifyTRPCPlugin, {
  prefix: "/rtgc/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

(async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();
