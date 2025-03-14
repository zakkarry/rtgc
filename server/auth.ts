import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret, getUser, setUser } from "./db.ts";

interface User {
  username: string;
  password: string;
}

export async function signUp({ username, password }: User): Promise<void> {
  await setUser({ username, passwordHash: bcrypt.hashSync(password, 10) });
}

export function authorize({ username, password }: User): boolean {
  const user = getUser();
  if (!user) return false;
  return (
    username === user.username &&
    bcrypt.compareSync(password, user.passwordHash)
  );
}

export function generateJwt({ username }: { username: string }): string {
  return jwt.sign({ username }, getJwtSecret(), { expiresIn: "10w" });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, getJwtSecret()) as { username: string };
}
