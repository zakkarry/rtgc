import du from "du";
import { filesize } from "filesize";
import { readdir, rm, stat } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { RTorrent, isUnregistered, TorrentInfo } from "./rtorrent.ts";

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

export interface RTGCOptions {
  rpc: string;
  dataDirs: string[];
  fixUnregistered?: boolean;
  fixOrphaned?: boolean;
  fixMissingFiles?: boolean;
  safetyThreshold?: number;
  force?: boolean;
}

export interface OrphanedPath {
  path: string;
  size: number;
}

export interface RTGCResult {
  orphanedPaths: OrphanedPath[];
  totalSize: number;
  removedTorrents: TorrentInfo[];
}

export async function cleanTorrents(options: RTGCOptions): Promise<RTGCResult> {
  const {
    rpc,
    dataDirs,
    fixUnregistered = false,
    fixOrphaned = false,
    fixMissingFiles = false,
    safetyThreshold = 1,
    force = false,
  } = options;

  const rtorrent = new RTorrent(rpc);
  const downloadList = await rtorrent.downloadList();

  const session: TorrentInfo[] = [];
  const removedTorrents: TorrentInfo[] = [];

  if (fixUnregistered || fixMissingFiles) {
    for (const [i, infoHash] of downloadList.entries()) {
      printProgress(i, downloadList.length);
      const torrent = await rtorrent.getTorrent(infoHash);

      if (isUnregistered(torrent)) {
        if (fixUnregistered) {
          await rtorrent.removeTorrent(infoHash);
          console.log("Removed unregistered torrent:", torrent);
          removedTorrents.push(torrent);
        } else {
          console.log("Would remove unregistered torrent:", torrent);
        }
      } else if (
        torrent.message.trim() ===
        "Download registered as completed, but hash check returned unfinished chunks."
      ) {
        if (fixMissingFiles) {
          await rtorrent.removeTorrent(infoHash);
          console.log("Removed missing files torrent:", torrent);
          removedTorrents.push(torrent);
        } else {
          console.log("Would remove missing files torrent:", torrent);
        }
      } else {
        session.push(torrent);
      }
    }
  }

  const allPaths = (await Promise.all(dataDirs.map(getChildPaths))).flat();

  const pathsInSession = new Set(session.map((e) => e.basePath));
  const pathsHoldingHardlinkTargets = await findHardlinkTargetPaths(dataDirs);

  const orphanedPaths = allPaths.filter(
    (path) =>
      !(pathsInSession.has(path) || pathsHoldingHardlinkTargets.has(path))
  );

  if (
    fixOrphaned &&
    !force &&
    (orphanedPaths.length / allPaths.length) * 100 > safetyThreshold
  ) {
    throw new Error(
      `Orphans to delete (${
        orphanedPaths.length
      }) exceeded ${safetyThreshold}% of total (${allPaths.length}).
To execute, rerun with force=true and safetyThreshold=${Math.ceil(
        (orphanedPaths.length / allPaths.length) * 100
      )}.`
    );
  }

  let totalSize = 0;
  const result: OrphanedPath[] = [];

  for (const orphan of orphanedPaths) {
    const size = await du(orphan);
    totalSize += size;
    result.push({ path: orphan, size });

    if (fixOrphaned) {
      await rm(orphan, { recursive: true });
      console.log("Removed orphan", filesize(size), orphan);
    } else {
      console.log("Would remove orphan", filesize(size), orphan);
    }

    for (const torrent of session.filter((t) => t.basePath === orphan)) {
      if (fixOrphaned) {
        await rtorrent.removeTorrent(torrent.infoHash);
        console.log("\tRemoved dangling torrent", torrent);
        removedTorrents.push(torrent);
      } else {
        console.log("\tWould remove dangling torrent", torrent);
      }
    }
  }

  console.log(
    `Found ${orphanedPaths.length} orphaned paths totaling ${filesize(
      totalSize
    )}`
  );

  return {
    orphanedPaths: result,
    totalSize,
    removedTorrents,
  };
}
