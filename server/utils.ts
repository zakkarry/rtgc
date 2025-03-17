import { randomBytes } from "node:crypto";

export function getRandomString() {
  return randomBytes(16).toString("hex");
}

export async function* inBatches<T, R>(
  items: T[],
  batchSize: number,
  callback: (batch: T[], batchIndex: number) => Promise<R>
): AsyncGenerator<R> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    yield await callback(batch, i / batchSize);
  }
}
