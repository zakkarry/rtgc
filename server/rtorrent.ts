import { dirname, join } from "node:path";
import xmlrpc from "xmlrpc";
import type { TorrentInfo } from "./types.ts";
import { inBatches } from "./utils.ts";

interface MethodCall {
  methodName: string;
  params: any[];
}

function method(methodName: string, params: any[] = []): MethodCall {
  return { methodName, params };
}

function getTorrentMetadataCalls(infoHash: string): MethodCall[] {
  return [
    method("d.directory", [infoHash]),
    method("d.message", [infoHash]),
    method("d.is_multi_file", [infoHash]),
    method("d.name", [infoHash]),
    method("t.url", [`${infoHash}:t0`]),
    method("d.custom1", [infoHash]),
  ];
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
      // basic_auth: { user: url.username, pass: url.password },
    });
  }

  private call(method: string, ...params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.methodCall(method, params, (err: Error, data: any) => {
        if (err) return reject(err);
        return resolve(data);
      });
    });
  }

  async downloadList(): Promise<string[]> {
    return this.call("download_list") as Promise<string[]>;
  }

  async getTorrent(infoHash: string): Promise<TorrentInfo> {
    const response = await this.call(
      "system.multicall",
      getTorrentMetadataCalls(infoHash)
    );

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

  /**
   * Get metadata for an arbitrary number of torrents.
   * Should be used via getTorrentsBatched for better performance.
   * @param infoHashes
   * @returns
   */
  private async getTorrents(infoHashes: string[]): Promise<TorrentInfo[]> {
    const response = await this.call(
      "system.multicall",
      infoHashes.flatMap(getTorrentMetadataCalls)
    );
    const responseBatches: TorrentInfo[] = [];
    for (const [i, infoHash] of infoHashes.entries()) {
      const chunk = response.slice(i * 6, (i + 1) * 6) as string[][];
      const [
        [directory],
        [message],
        [isMultiFile],
        [name],
        [announce],
        [custom1],
      ] = chunk;

      responseBatches.push({
        infoHash,
        name,
        tracker: new URL(announce).hostname,
        directory: isMultiFile === "1" ? dirname(directory) : directory,
        basePath: isMultiFile === "1" ? directory : join(directory, name),
        custom1,
        message,
      });
    }

    return responseBatches;
  }

  async getTorrentsBatched(infoHashes: string[]): Promise<TorrentInfo[]> {
    const responses = inBatches(infoHashes, 500, (batch, batchIndex) => {
      console.log("Batch", batchIndex);
      return this.getTorrents(batch);
    });
    const all = await Array.fromAsync(responses);
    return all.flat();
  }

  async removeTorrent(infoHash: string): Promise<void> {
    await this.call("d.erase", infoHash);

    for (let i = 0; i < 5; i++) {
      const downloadList = await this.downloadList();
      if (!downloadList.includes(infoHash)) return;
      await new Promise((r) => void setTimeout(r, 100 * Math.pow(2, i)));
    }
    throw new Error("Failed to remove torrent");
  }
}
