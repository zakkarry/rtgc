import fastifyCookie from "@fastify/cookie";
import { TRPCError } from "@trpc/server";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { z } from "zod";
import { createContext } from "./context.ts";
import { getRules } from "./db.ts";
import { auth } from "./rpc/auth.ts";
import { cleanupTorrents, scanTorrents } from "./rtgc.ts";
import { RTorrent } from "./rtorrent.ts";
import { protectedProcedure, router } from "./trpc.ts";
// Initialize RTorrent instance and configuration
const rtorrent = new RTorrent("http://localhost:8000");
const dataDirs = ["/path/to/data1", "/path/to/data2"]; // Replace with your actual data directories

const appRouter = router({
  auth: auth,
  getRules: protectedProcedure.query(getRules),
  scanTorrents: protectedProcedure.query(async () => {
    try {
      return await scanTorrents(rtorrent, dataDirs);
    } catch (error) {
      console.error("Error scanning torrents:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
  cleanupTorrents: protectedProcedure
    .input(z.object({ paths: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      try {
        return await cleanupTorrents(rtorrent, dataDirs, input.paths);
      } catch (error) {
        console.error("Error cleaning up torrents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
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
