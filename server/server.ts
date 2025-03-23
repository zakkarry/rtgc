import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext } from "./context.ts";
import { RTorrent } from "./rtorrent.ts";
import { type AppRouter } from "./rpc/router.ts";
import { appRouter } from "./rpc/router.ts";
import { getSettings } from "./db.ts";

const BASE_URL = "/rtgc";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load settings from database
const settings = getSettings();
export const rtorrent = new RTorrent(settings.rtorrentUrl);
export const dataDirs = settings.dataDirs;

const fastify = Fastify({ logger: true });
fastify.register(fastifyCookie);

process.on("SIGTERM", () => {
  console.log("SIGTERM");
  process.exit(0);
});

fastify.register(
  async (instance) => {
    instance.register(fastifyTRPCPlugin, {
      prefix: `/trpc`,
      trpcOptions: {
        router: appRouter,
        createContext,
      } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
    });

    instance.register(fastifyStatic, {
      root: join(__dirname, "../dist"),
      prefix: undefined, // No prefix here since parent plugin has prefix
      decorateReply: true,
      wildcard: false,
    });
    instance.setNotFoundHandler((_, reply) => {
      return reply.sendFile("index.html");
    });
  },
  { prefix: BASE_URL }
);
fastify.get("/*", (req, reply) => {
  // Don't redirect if already at the base URL or if it's the base URL with trailing slash
  if (
    req.url === BASE_URL ||
    req.url === `${BASE_URL}/` ||
    req.url.startsWith(`${BASE_URL}/`)
  ) {
    return reply.callNotFound();
  }
  return reply.redirect(BASE_URL);
});

await fastify.listen({ host: "0.0.0.0", port: 6014 });
