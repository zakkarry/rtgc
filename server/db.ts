import { JSONFilePreset } from "lowdb/node";
import { getRandomString } from "./utils.ts";
import type { DbUser, Settings, Rule } from "./types.ts";

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
      matchType: "substring",
      substring: "unregistered",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "not registered",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "this torrent does not exist",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "trumped",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "infohash not found",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "complete season uploaded",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "torrent not found",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "nuked",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "dupe",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "see: ",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "has been deleted",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "problem with file: ",
      type: "unregistered",
    },
    {
      matchType: "substring",
      substring: "specifically banned",
      type: "unregistered",
    },
  ],
  settings: {
    rtorrentUrl: "http://localhost:8000",
    dataDirs: ["/path/to/data1", "/path/to/data2"],
  },
};

const db = await JSONFilePreset<Database>("db.json", defaults);

// simple db migration
await db.update((existingData) => {
  for (const key in defaults) {
    if (!Object.hasOwn(existingData, key)) {
      // @ts-ignore
      existingData[key] = defaults[key];
    }
  }
  return existingData;
});

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

export async function updateRules(rules: Rule[]): Promise<void> {
  db.data.rules = rules;
  await db.write();
}

export function getSettings(): Settings {
  return db.data.settings;
}

export async function updateSettings(settings: Settings): Promise<void> {
  db.data.settings = settings;
  await db.write();
}
