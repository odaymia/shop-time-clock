/* The one storage module. Everything in the app reads and writes through
   here, so moving to a server later means changing this file and nothing
   else. The backend is a small async key-value API — get(key), set(key,
   value), delete(key), list(prefix). Inside a Claude artifact the host
   hands us window.storage; anywhere else (the shop iPad) it's IndexedDB. */
import { createIndexedDbStorage } from "./indexeddb.js";

export const storage = window.storage || createIndexedDbStorage();

export async function sGet(key, fallback) {
  try {
    const r = await storage.get(key);
    if (!r || r.value == null) return fallback;
    return JSON.parse(r.value);
  } catch {
    return fallback;
  }
}
export async function sSet(key, value) {
  try {
    await storage.set(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("storage write failed", key, e);
    return false;
  }
}

export async function sDel(key) {
  try {
    await storage.delete(key);
  } catch {
    /* already gone */
  }
}
export async function sList(prefix) {
  try {
    const r = await storage.list(prefix);
    return (r && r.keys) || [];
  } catch {
    return [];
  }
}

/* Photos live in their own keys so punch records stay small.
   The key carries the timestamp, which is what lets us expire them. */
export async function purgePhotos(retentionDays) {
  if (!retentionDays) return 0;
  const cutoff = Date.now() - retentionDays * 86400000;
  const keys = await sList("gac:photo:");
  let n = 0;
  for (const k of keys) {
    const ts = Number(String(k).split(":")[2]);
    if (Number.isFinite(ts) && ts < cutoff) {
      await sDel(k);
      n++;
    }
  }
  return n;
}
