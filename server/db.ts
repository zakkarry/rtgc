import { JSONFilePreset } from "lowdb/node";
import { getRandomString } from "./utils.ts";
import type { Rule, DbUser, Settings } from "./types.ts";

type Database = {
  user?: DbUser;
  jwtSecret: string;
  rules: Rule[];
  settings: Settings;
};

const defaults: Database = {
  jwtSecret: getRandomString(),
  rules: [
    {
      ruleType: "keep",
      matchType: "substring",
      substring: "unable to parse bencoded data",
    },
    {
      ruleType: "drop",
      matchType: "substring",
      substring: "unregistered torrent",
    },
  ],
  settings: {
    rtorrentUrl: "http://localhost:8000",
    dataDirs: ["/path/to/data1", "/path/to/data2"],
  },
};

const db = await JSONFilePreset<Database>("db.json", defaults);

// simple db migration
await db.update((existingData) => ({ ...defaults, ...existingData }));

export function getUser() {
  return db.data.user;
}

export async function setUser(user: DbUser) {
  db.data.user = user;
  await db.write();
}

export function getJwtSecret() {
  return db.data.jwtSecret;
}

export function getRules() {
  return db.data.rules;
}

export function getSettings(): Settings {
  return db.data.settings;
}

export async function updateSettings(settings: Settings): Promise<void> {
  db.data.settings = settings;
  await db.write();
}
