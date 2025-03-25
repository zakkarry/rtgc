import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getRules, getSettings } from "../db.ts";
import { cleanupTorrents, scanTorrents } from "../rtgc.ts";
import { RTorrent } from "../rtorrent.ts";
import { protectedProcedure, router } from "../trpc.ts";
import type { ProblemType, Rule, TorrentInfo } from "../types.ts";

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
      const { rtorrentUrl, dataDirs } = getSettings();
      const rtorrent = new RTorrent(rtorrentUrl);
      return await scanTorrents(rtorrent, dataDirs);
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
            "orphaned",
            "missingFiles",
            "unknown",
            "timeout",
          ]),
          torrentInfo: z
            .object({
              infoHash: z.string(),
              name: z.string(),
              tracker: z.string(),
              directory: z.string(),
              basePath: z.string(),
              custom1: z.string(),
              message: z.string(),
            })
            .optional(),
          lastModified: z.number(),
        })
      )
    )
    .query(async ({ input }) => {
      try {
        const rules = getRules();
        return input.map((path) => {
          if (!path.torrentInfo) {
            return path; // Keep paths without torrent info as is
          }

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

  cleanupTorrents: protectedProcedure
    .input(z.object({ paths: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      try {
        const { rtorrentUrl, dataDirs } = getSettings();
        const rtorrent = new RTorrent(rtorrentUrl);
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
