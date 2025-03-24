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
}

export type ProblemType =
  | "healthy"
  | "unregistered"
  | "orphaned"
  | "missingFiles"
  | "unknown";

export interface ProblemPath {
  path: string;
  size: number;
  type: ProblemType;
  torrentInfo?: TorrentInfo;
  // unix timestamp but in milliseconds
  lastModified: number;
}

export interface ScanResult {
  problemPaths: ProblemPath[];
  totalSize: number;
  totalPaths: number;
  percentageOfTotalPaths: number;
  percentageOfTotalSize: number;
}

export interface CleanupResult {
  removedPaths: string[];
  removedTorrents: TorrentInfo[];
  totalSizeRemoved: number;
}
