import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getRules, getSettings } from "../db.ts";
import { deleteTorrents, scanTorrents } from "../rtgc.ts";
import { RTorrent } from "../rtorrent.ts";
import { protectedProcedure, router } from "../trpc.ts";
import type { ProblemType, Rule, TorrentInfo } from "../types.ts";

export const torrentInfoSchema = z.object({
  infoHash: z.string(),
  name: z.string(),
  tracker: z.string(),
  directory: z.string(),
  basePath: z.string(),
  custom1: z.string(),
  message: z.string(),
  complete: z.boolean(),
});

function classifyTorrent(torrent: TorrentInfo, rules: Rule[]): ProblemType {
  const message = torrent.message.toLowerCase();

  // Check for missing files first
  if (
    message.trim() ===
    "Download registered as completed, but hash check returned unfinished chunks."
  ) {
    return "missingFiles";
  }

  // Check against rules
  for (const rule of rules) {
    if (
      rule.matchType === "substring" &&
      message.includes(rule.substring.toLowerCase())
    ) {
      return rule.type;
    }
  }

  // If there's a non-timeout message, mark as unknown
  if (message && !message.includes("Timed out")) {
    return "unknown";
  }

  return "healthy";
}

export const torrents = router({
  scanTorrents: protectedProcedure.query(async () => {
    try {
      const { rtorrentUrl } = getSettings();
      const rtorrent = new RTorrent(rtorrentUrl);
      return await scanTorrents(rtorrent);
    } catch (error) {
      console.error("Error scanning torrents:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),

  classifyTorrents: protectedProcedure
    .input(
      z.array(
        z.object({
          path: z.string(),
          size: z.number(),
          type: z.enum([
            "healthy",
            "unregistered",
            "missingFiles",
            "unknown",
            "timeout",
          ]),
          torrentInfo: torrentInfoSchema,
          lastModified: z.number(),
        })
      )
    )
    .query(async ({ input }) => {
      try {
        const rules = getRules();
        return input.map((path) => {
          return {
            ...path,
            type: classifyTorrent(path.torrentInfo, rules),
          };
        });
      } catch (error) {
        console.error("Error classifying torrents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),

  deleteTorrents: protectedProcedure
    .input(z.object({ infoHashes: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      try {
        const { rtorrentUrl, failPastThreshold } = getSettings();
        const rtorrent = new RTorrent(rtorrentUrl);
        return await deleteTorrents(
          rtorrent,
          input.infoHashes,
          failPastThreshold
        );
      } catch (error) {
        console.error("Error deleting torrents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
});
