export interface TorrentInfo {
  infoHash: string;
  name: string;
  tracker: string;
  directory: string;
  basePath: string;
  custom1: string;
  message: string;
}

export type Rule = {
  matchType: "substring";
  substring: string;
  type: ProblemType;
};

export type DbUser = {
  username: string;
  passwordHash: string;
};

export interface Settings {
  rtorrentUrl: string;
  dataDirs: string[];
  failPastThreshold: number;
}

export type ProblemType =
  | "healthy"
  | "unregistered"
  | "missingFiles"
  | "timeout"
  | "unknown";

export interface ProblemTorrent {
  path: string;
  size: number;
  type: ProblemType;
  torrentInfo: TorrentInfo;
  // unix timestamp but in milliseconds
  lastModified: number;
}

export interface OrphanedPath {
  path: string;
  size: number;
  type: "orphaned";
  lastModified: number;
  relatedTorrents: TorrentInfo[];
}
