import du from "du";
import { filesize } from "filesize";
import { readdir, rm, stat } from "node:fs/promises";
import { join, normalize, resolve, sep } from "node:path";
import { RTorrent } from "./rtorrent.ts";
import type {
  CleanupResult,
  ProblemPath,
  ScanResult,
  TorrentInfo,
} from "./types.ts";

function printProgress(i: number, total: number): void {
  const ratio = Math.floor((i * 100) / total);
  const lastRatio = Math.floor(((i - 1) * 100) / total);
  if (ratio > lastRatio) {
    console.log(`${ratio}%`);
  }
}

async function getChildPaths(dataDir: string): Promise<string[]> {
  const entries = await readdir(dataDir);
  return entries.map((entry) => join(dataDir, entry));
}

async function isDirOrDirSymlink(dirent: any, child: string): Promise<boolean> {
  if (dirent.isDirectory()) return true;
  if (dirent.isSymbolicLink()) {
    try {
      const stats = await stat(child);
      return stats.isDirectory();
    } catch (e) {
      return false;
    }
  }
  return false;
}

async function getHardlinkedFilesRecursive(dir: string): Promise<string[]> {
  const dirents = await readdir(dir, { withFileTypes: true });
  const children = await Promise.all(
    dirents.map(async (dirent) => {
      const child = join(dir, dirent.name);
      if (await isDirOrDirSymlink(dirent, child)) {
        return getHardlinkedFilesRecursive(child);
      } else if ((await stat(child)).nlink > 1) {
        return [child];
      } else {
        return [];
      }
    })
  );
  return children.flat();
}

function getDedupedBasePathsFromFiles(
  files: string[],
  dataDirs: string[]
): Set<string> {
  return files.reduce((acc: Set<string>, filePath: string) => {
    const dataDir = dataDirs.find((d: string) =>
      normalize(filePath).startsWith(resolve(d))
    );
    if (dataDir) {
      acc.add(
        filePath
          .split(sep)
          .slice(0, dataDir.split(sep).length + 1)
          .join(sep)
      );
    } else {
      console.log("Skipping escaping file:", filePath);
    }
    return acc;
  }, new Set<string>());
}

async function findHardlinkTargetPaths(
  dataDirs: string[]
): Promise<Set<string>> {
  const allHardlinks = (
    await Promise.all(dataDirs.map(getHardlinkedFilesRecursive))
  ).flat();
  return getDedupedBasePathsFromFiles(allHardlinks, dataDirs);
}

export async function scanTorrents(
  rtorrent: RTorrent,
  dataDirs: string[]
): Promise<ScanResult> {
  if (process.env.NODE_ENV !== "production") {
    return {
      problemPaths: [
        {
          path: "/downloads/test",
          size: 100,
          type: "orphaned",
          lastModified: Date.now(),
        },
        {
          path: "/downloads/test2",
          size: 200,
          type: "orphaned",
          lastModified: Date.now(),
        },
      ],
      totalSize: 0,
      totalPaths: 0,
      percentageOfTotalPaths: 0,
      percentageOfTotalSize: 0,
    };
  }

  const downloadList = await rtorrent.downloadList();
  const torrents = await rtorrent.getTorrentsBatched(downloadList);

  const problemPaths: ProblemPath[] = [];
  const session: TorrentInfo[] = [];

  // Scan torrents first
  for (const [i, torrent] of torrents.entries()) {
    printProgress(i, torrents.length);
    const stats = await stat(torrent.basePath).catch(() => null);
    const size = await du(torrent.basePath);

    if (isUnregistered(torrent)) {
      problemPaths.push({
        path: torrent.basePath,
        size,
        type: "unregistered",
        torrentInfo: torrent,
        lastModified: stats?.mtime ? stats.mtime.getTime() : Date.now(),
      });
    } else if (
      torrent.message.trim() ===
      "Download registered as completed, but hash check returned unfinished chunks."
    ) {
      problemPaths.push({
        path: torrent.basePath,
        size,
        type: "missingFiles",
        torrentInfo: torrent,
        lastModified: stats?.mtime ? stats.mtime.getTime() : Date.now(),
      });
    } else {
      session.push(torrent);

      if (!torrent.message.includes("Timed out")) {
        problemPaths.push({
          path: torrent.basePath,
          size,
          type: "unknown",
          torrentInfo: torrent,
          lastModified: stats?.mtime ? stats.mtime.getTime() : Date.now(),
        });
      }
    }
  }

  // Then scan for orphaned paths
  const allPaths = (await Promise.all(dataDirs.map(getChildPaths))).flat();
  const pathsInSession = new Set(session.map((e) => e.basePath));
  const pathsHoldingHardlinkTargets = await findHardlinkTargetPaths(dataDirs);

  const orphanedPaths = allPaths.filter(
    (path) =>
      !(pathsInSession.has(path) || pathsHoldingHardlinkTargets.has(path))
  );

  // Add orphaned paths to problem paths
  for (const path of orphanedPaths) {
    const stats = await stat(path);
    const size = await du(path);
    problemPaths.push({
      path,
      size,
      type: "orphaned",
      lastModified: stats.mtime.getTime(),
    });
  }

  const totalSize = problemPaths.reduce((sum, p) => sum + p.size, 0);
  const totalPathSize = (await Promise.all(allPaths.map((p) => du(p)))).reduce(
    (sum, size) => sum + size,
    0
  );

  return {
    problemPaths,
    totalSize,
    totalPaths: allPaths.length,
    percentageOfTotalPaths: (problemPaths.length / allPaths.length) * 100,
    percentageOfTotalSize: (totalSize / totalPathSize) * 100,
  };
}

export async function cleanupTorrents(
  rtorrent: RTorrent,
  dataDirs: string[],
  pathsToRemove: string[]
): Promise<CleanupResult> {
  const removedPaths: string[] = [];
  const removedTorrents: TorrentInfo[] = [];
  let totalSizeRemoved = 0;

  // Validate all paths are within dataDirs
  const resolvedDataDirs = dataDirs.map((dir) => resolve(dir));
  const invalidPaths = pathsToRemove.filter(
    (path) => !resolvedDataDirs.some((dir) => normalize(path).startsWith(dir))
  );
  if (invalidPaths.length > 0) {
    throw new Error(
      `Cannot remove paths outside data directories:\n${invalidPaths.join(
        "\n"
      )}`
    );
  }

  // Build path-to-torrent map once
  const downloadList = await rtorrent.downloadList();
  const pathToTorrent = new Map<string, TorrentInfo>();
  for (const infoHash of downloadList) {
    const torrent = await rtorrent.getTorrent(infoHash);
    pathToTorrent.set(torrent.basePath, torrent);
  }

  for (const path of pathsToRemove) {
    // Get size before removal
    const size = await du(path);
    totalSizeRemoved += size;

    // Check if there's an associated torrent using our map
    const torrent = pathToTorrent.get(path);
    if (torrent) {
      await rtorrent.removeTorrent(torrent.infoHash);
      removedTorrents.push(torrent);
    }

    // Remove the path
    await rm(path, { recursive: true });
    removedPaths.push(path);
    console.log("Removed path:", path, "size:", filesize(size));
  }

  return {
    removedPaths,
    removedTorrents,
    totalSizeRemoved,
  };
}
export function isUnregistered(torrent: TorrentInfo): boolean {
  const message = torrent.message.toLowerCase();
  const keywords = [
    "unregistered",
    "not registered",
    "this torrent does not exist",
    "trumped",
    "infohash not found",
    "complete season uploaded",
    "torrent not found",
    "nuked",
    "dupe",
    "see: ",
    "has been deleted",
  ].map((e) => e.toLowerCase()); // just to be safe

  return keywords.some((keyword) => message.includes(keyword));
}
