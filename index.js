import xmlrpc from "xmlrpc";
import { parseArgs } from "node:util";

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
      method("d.base_path", [infoHash]),
      method("d.message", [infoHash]),
      method("d.is_multi_file", [infoHash]),
    ]);

    const [[directory, basePath, message, isMultiFile]] = response;

    console.log(response);
    return {
      infoHash: infoHash,
      directory: isMultiFile ? path.dirname
    };
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
  const torrent = await rtorrent.getTorrent(downloadList[0]);
  console.log(torrent);
}

await main();
