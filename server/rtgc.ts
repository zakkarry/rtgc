import du from "du";
import { readdir, stat } from "node:fs/promises";
import { join, normalize, resolve, sep } from "node:path";
import { RTorrent } from "./rtorrent.ts";
import type { OrphanedPath, ProblemTorrent, TorrentInfo } from "./types.ts";
import { getSettings } from "./db.ts";

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

/**
 * Given a list of paths like
 *
 * /data/downloads/test/file.txt
 * /data/downloads/test/file2.txt
 *
 * and a list of data dirs like
 * /data/downloads
 *
 * This function will return a set of base paths like
 * /data/downloads/test
 *
 * This gets the root of each download/torrent so we can delete the entire thing.
 */
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

async function getBasePathsWithLinks(dataDirs: string[]): Promise<Set<string>> {
  const allHardlinks = (
    await Promise.all(dataDirs.map(getHardlinkedFilesRecursive))
  ).flat();
  return getDedupedBasePathsFromFiles(allHardlinks, dataDirs);
}

export async function scanTorrents(
  rtorrent: RTorrent
): Promise<ProblemTorrent[]> {
  if (process.env.NODE_ENV !== "production") {
    return [
      {
        path: "/downloads/testthisIsAlsoReallyLongAndShouldBeTruncated  ",
        size: 100,
        type: "unknown",
        torrentInfo: {
          message:
            "This is a really long message that should be truncated and it needs to be even longer and longer and longer and longer and longer",
          infoHash: "test",
          name: "test",
          tracker: "test",
          directory: "test",
          basePath: "test",
          custom1: "test",
        },
        lastModified: Date.now(),
      },
      {
        path: "/downloads/test2thisIsAlsoReallyLongAndShouldBeTruncated",
        size: 200,
        type: "unregistered",
        torrentInfo: {
          message: "This is a really long message that should be truncated",
          infoHash: "test",
          name: "test",
          tracker: "test",
          directory: "test",
          basePath: "test",
          custom1: "test",
        },
        lastModified: Date.now(),
      },
    ];
  }

  const downloadList = await rtorrent.downloadList();
  const torrents = await rtorrent.getTorrentsBatched(downloadList);

  const torrentPaths = await Promise.all(
    torrents.map(async (torrent) => {
      const [stats, size] = await Promise.all([
        stat(torrent.basePath).catch(() => null),
        du(torrent.basePath),
      ]);

      return {
        path: torrent.basePath,
        size,
        type: "unknown" as const,
        torrentInfo: torrent,
        lastModified: stats?.mtime ? stats.mtime.getTime() : Date.now(),
      };
    })
  );
  return torrentPaths;
}

export async function scanOrphanedPaths(
  dataDirs: string[],
  allTorrents: TorrentInfo[]
): Promise<OrphanedPath[]> {
  const allBasePaths = (await Promise.all(dataDirs.map(getChildPaths))).flat();
  const pathsHoldingHardlinkTargets = await getBasePathsWithLinks(dataDirs);
  const orphanedPaths = allBasePaths.filter(
    (path) => !pathsHoldingHardlinkTargets.has(path)
  );

  const torrentsByBasePath = Object.groupBy(
    allTorrents,
    (torrent) => torrent.basePath
  );

  return await Promise.all(
    orphanedPaths.map(async (path) => {
      const [stats, size] = await Promise.all([stat(path), du(path)]);
      return {
        type: "orphaned",
        path,
        size,
        lastModified: stats.mtime.getTime(),
        relatedTorrents: torrentsByBasePath[path] ?? [],
      };
    })
  );
}

export async function deleteTorrents(
  rtorrent: RTorrent,
  infoHashes: string[]
): Promise<void> {
  const { failPastThreshold } = getSettings();
  await rtorrent.removeTorrents(infoHashes, failPastThreshold);
}
