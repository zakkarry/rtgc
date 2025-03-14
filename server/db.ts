import { JSONFilePreset } from "lowdb/node";
import { getRandomString } from "./utils.ts";
import type { Rule, DbUser } from "./types.ts";

type Database = {
  user?: DbUser;
  jwtSecret: string;
  rules: Rule[];
};

const db = await JSONFilePreset<Database>("db.json", {
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
