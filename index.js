import { promises as fs } from "fs";
import { readdir, rm } from "fs/promises";
import { dirname, join } from "node:path";
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

async function main() {
  const { values: cliArgs } = parseArgs({
    options: {
      rpc: { type: "string" },
      dataDirs: { short: "d", type: "string", multiple: true },
      unregistered: { type: "boolean" },
      orphaned: { type: "boolean" },
    },
  });
  const rtorrent = new RTorrent(cliArgs.rpc);
  const downloadList = await rtorrent.downloadList();
  console.log(downloadList);

  const session = [];
  for (const [i, infoHash] of downloadList.entries()) {
    printProgress(i, downloadList.length);
    const torrent = await rtorrent.getTorrent(infoHash);

    if (torrent.message.toLowerCase().includes("unregistered")) {
      if (cliArgs.unregistered) {
        await rtorrent.removeTorrent(infoHash);
      } else {
        console.log("Would remove unregistered torrent:", torrent);
        session.push(torrent);
      }
    }
  }

  const allPaths = [];
  for (const dataDir of cliArgs.dataDirs) {
    const entries = await readdir(dataDir);
    const paths = entries.map((entry) => join(dataDir, entry));
    allPaths.push(...paths);
  }

  const activePaths = session.map((e) => e.basePath);

  const orphanedPaths = allPaths.filter((path) => !activePaths.includes(path));

  for (const orphan of orphanedPaths) {
    if (cliArgs.orphaned) {
      await rm(orphan, { recursive: true });
      console.log("Removed orphan:", orphan);
    } else {
      console.log("Would remove orphan:", orphan);
    }
  }
}

await main();
