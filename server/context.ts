import { type CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { type FastifyRequest } from "fastify";
import { verifyJwt } from "./auth.ts";

async function getUserFromCookie(req: FastifyRequest) {
  const token = req.cookies.rtgc_token;
  console.log(req.cookies.rtgc_token);
  if (!token) return undefined;
  const user = verifyJwt(token);
  return user;
}

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const user = await getUserFromCookie(req);
  return {
    user,
    setSession(value: string) {
      res.setCookie("rtgc_token", value, {
        httpOnly: true,
        path: "/rtgc/",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30,
        expires: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000),
      });
    },
    deleteSession() {
      res.setCookie("rtgc_token", "foo", {
        httpOnly: true,
        path: "/rtgc/",
        sameSite: "strict",
        maxAge: 0,
        expires: new Date(0),
      });
    },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
