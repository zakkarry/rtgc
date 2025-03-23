export interface TorrentInfo {
  infoHash: string;
  name: string;
  tracker: string;
  directory: string;
  basePath: string;
  custom1: string;
  message: string;
}

export type SubstringRule = {
  matchType: "substring";
  substring: string;
};

export type RegexRule = {
  matchType: "regex";
  regex: string;
};

export type BaseRule = SubstringRule | RegexRule;
export type KeepRule = BaseRule & { ruleType: "keep" };
export type DropRule = BaseRule & { ruleType: "drop" };
export type Rule = KeepRule | DropRule;

export type DbUser = {
  username: string;
  passwordHash: string;
};

export interface Settings {
  rtorrentUrl: string;
  dataDirs: string[];
}

export type ProblemType = "unregistered" | "orphaned" | "missingFiles";
export interface ProblemPath {
  path: string;
  size: number;
  type: ProblemType;
  torrentInfo?: TorrentInfo;
  lastModified: Date;
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
