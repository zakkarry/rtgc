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
      }
      throw new Error("Invalid credentials");
    }),
  authStatus: publicProcedure.query(async ({ ctx }) => {
    return {
      userExists: getUser() !== undefined,
      isLoggedIn: ctx.user !== undefined,
    };
  }),
  getRules: protectedProcedure.query(getRules),
});

export type AppRouter = typeof appRouter;

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
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
