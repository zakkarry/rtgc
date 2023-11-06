import du from "du";
import { filesize } from "filesize";
import { readdir, realpath, rm, stat } from "fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import xmlrpc from "xmlrpc";

function method(methodName, params = []) {
  return { methodName, params };
}

class RTorrent {
  constructor(rpc) {
    const url = new URL(rpc);
    const clientCreator =
      url.protocol === "https:"
        ? xmlrpc.createSecureClient
        : xmlrpc.createClient;
    this.client = clientCreator({
      url: url.origin + url.pathname,
      basic_auth: { user: url.username, pass: url.password },
    });
  }

  #call(method, ...params) {
    return new Promise((resolve, reject) => {
      this.client.methodCall(method, params, (err, data) => {
        if (err) return reject(err);
        return resolve(data);
      });
    });
  }

  downloadList() {
    return this.#call("download_list");
  }

  async getTorrent(infoHash) {
    const response = await this.#call("system.multicall", [
      method("d.directory", [infoHash]),
      method("d.message", [infoHash]),
      method("d.is_multi_file", [infoHash]),
      method("d.name", [infoHash]),
    ]);

    const [[directory], [message], [isMultiFile], [name]] = response;

    return {
      infoHash,
      name,
      directory: isMultiFile === "1" ? dirname(directory) : directory,
      basePath: isMultiFile === "1" ? directory : join(directory, name),
      message,
    };
  }

  async removeTorrent(infoHash) {
    await this.#call("d.erase", infoHash);

    for (let i = 0; i < 5; i++) {
      if (!(await this.downloadList()).includes(infoHash)) return;
      await new Promise((r) => void setTimeout(r, 100 * Math.pow(2, i)));
    }
    throw new Error("Failed to remove torrent");
  }
}

function printProgress(i, total) {
  const ratio = Math.floor((i * 100) / total);
  const lastRatio = Math.floor(((i - 1) * 100) / total);
  if (ratio > lastRatio) {
    console.log(`${ratio}%`);
  }
}

async function getChildPaths(dataDir) {
  const entries = await readdir(dataDir);
  return entries.map((entry) => join(dataDir, entry));
}

async function getSymbolicLinksRecursive(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  return Promise.all(
    dirents.flatMap(async (dirent) => {
      const child = join(dir, dirent.name);
      if (dirent.isDirectory()) {
        return getSymbolicLinksRecursive(child);
      } else if (dirent.isSymbolicLink() && (await stat(child)).isDirectory()) {
        return getSymbolicLinksRecursive(child);
      } else if (dirent.isSymbolicLink()) {
        return [child];
      } else {
        return [];
      }
    }),
  );
}

async function findSymlinkTargetPaths(dataDirs, symlinkSourceRoots) {
  const symlinks = await Promise.all(
    symlinkSourceRoots.flatMap(getSymbolicLinksRecursive),
  );
  console.log(symlinks);
  const realPaths = await Promise.all(symlinks.map((s) => realpath(s)));
  const roots = realPaths.reduce((roots, filePath) => {
    const dataDir = dataDirs.find((dataDir) =>
      normalize(filePath).startsWith(resolve(dataDir)),
    );
    roots.add(
      filePath
        .split(sep)
        .slice(0, dataDir.split(sep).length + 1)
        .join(sep),
    );
    return roots;
  }, new Set());
}

async function main() {
  const { values: Args } = parseArgs({
    options: {
      rpc: { type: "string" },
      dataDir: { short: "d", type: "string", multiple: true },
      unregistered: { type: "boolean" },
      orphaned: { type: "boolean" },
      symlinkSource: { type: "string", multiple: true },
    },
  });
  const rtorrent = new RTorrent(Args.rpc);

  const downloadList = await rtorrent.downloadList();

  const session = [];
  // for (const [i, infoHash] of downloadList.entries()) {
  //   printProgress(i, downloadList.length);
  //   const torrent = await rtorrent.getTorrent(infoHash);
  //
  //   if (torrent.message.toLowerCase().includes("unregistered")) {
  //     if (Args.unregistered) {
  //       await rtorrent.removeTorrent(infoHash);
  //     } else {
  //       console.log("Would remove unregistered torrent:", torrent);
  //       session.push(torrent);
  //     }
  //   }
  // }

  const allPaths = await Promise.all(Args.dataDir.flatMap(getChildPaths));

  const pathsInSession = session.map((e) => e.basePath);

  const pathsHoldingSymlinkTargets = await findSymlinkTargetPaths(
    Args.dataDir,
    Args.symlinkSource,
  );

  const orphanedPaths = allPaths.filter(
    (path) =>
      !pathsInSession.includes(path) &&
      !pathsHoldingSymlinkTargets.includes(path),
  );

  let totalSize = 0;
  for (const orphan of orphanedPaths) {
    const size = await du(orphan);
    totalSize += size;
    if (Args.orphaned) {
      await rm(orphan, { recursive: true });
      console.log("Removed orphan", filesize(size), orphan);
    } else {
      console.log("Would remove orphan", filesize(size), orphan);
    }
  }

  console.log(
    `Found ${orphanedPaths.length} orphaned paths totaling ${filesize(
      totalSize,
    )}`,
  );
}

await main();
