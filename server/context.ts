import { type CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { type FastifyRequest } from "fastify";
import { verifyJwt } from "./auth.ts";

async function getUserFromCookie(req: FastifyRequest) {
  const token = req.headers.cookie
    ?.split(";")
    .find((c) => c.trim().startsWith("rtgc_token="))
    ?.split("=")[1];
  if (!token) return undefined;
  const user = verifyJwt(token);
  return user;
}

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const user = await getUserFromCookie(req);
  return {
    user,
    setSession(value: string) {
      res.header("set-cookie", `rtgc_token=${value}`);
    },
    deleteSession() {
      res.header("set-cookie", "rtgc_token=; Max-Age=0; Path=/;");
    },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
