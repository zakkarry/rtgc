import { dirname, join } from "node:path";
import xmlrpc from "xmlrpc";

interface MethodCall {
  methodName: string;
  params: any[];
}

function method(methodName: string, params: any[] = []): MethodCall {
  return { methodName, params };
}

export interface TorrentInfo {
  infoHash: string;
  name: string;
  tracker: string;
  directory: string;
  basePath: string;
  custom1: string;
  message: string;
}

export class RTorrent {
  private client: any;

  constructor(rpc: string) {
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

  #call(method: string, ...params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.methodCall(method, params, (err: Error, data: any) => {
        if (err) return reject(err);
        return resolve(data);
      });
    });
  }

  async downloadList(): Promise<string[]> {
    return this.#call("download_list") as Promise<string[]>;
  }

  async getTorrent(infoHash: string): Promise<TorrentInfo> {
    const response = await this.#call("system.multicall", [
      method("d.directory", [infoHash]),
      method("d.message", [infoHash]),
      method("d.is_multi_file", [infoHash]),
      method("d.name", [infoHash]),
      method("t.url", [`${infoHash}:t0`]),
      method("d.custom1", [infoHash]),
    ]);

    const [
      [directory],
      [message],
      [isMultiFile],
      [name],
      [announce],
      [custom1],
    ] = response as [
      [string],
      [string],
      [string],
      [string],
      [string],
      [string]
    ];

    return {
      infoHash,
      name,
      tracker: new URL(announce).hostname,
      directory: isMultiFile === "1" ? dirname(directory) : directory,
      basePath: isMultiFile === "1" ? directory : join(directory, name),
      custom1,
      message,
    };
  }

  async removeTorrent(infoHash: string): Promise<void> {
    await this.#call("d.erase", infoHash);

    for (let i = 0; i < 5; i++) {
      const downloadList = await this.downloadList();
      if (!downloadList.includes(infoHash)) return;
      await new Promise((r) => void setTimeout(r, 100 * Math.pow(2, i)));
    }
    throw new Error("Failed to remove torrent");
  }
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
