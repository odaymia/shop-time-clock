/* The one storage module. Everything in the app reads and writes through
   here. The backend is a small async key-value API — get(key), set(key,
   value), delete(key), list(prefix). Inside a Claude artifact the host
   hands us window.storage; anywhere else (the shop iPad) it's IndexedDB.

   Reads always come from the local store, so the clock never waits on the
   network. Writes land locally first and are then mirrored to the cloud
   by src/storage/cloud.js when the device is signed in to a shop. */
import { createIndexedDbStorage } from "./indexeddb.js";
import { cloud, keyKind } from "./cloud.js";

export { cloud };
export const storage = window.storage || createIndexedDbStorage();

/* the cloud layer writes pulled data through here, bypassing the outbox */
const applyRemote = async (key, value) => {
  if (value == null) await storage.delete(key);
  else await storage.set(key, JSON.stringify(value));
};

let readyPromise = null;
export function storageReady() {
  if (!readyPromise) {
    readyPromise = cloud.init(storage, applyRemote).catch((e) => console.error("cloud init failed", e));
  }
  return readyPromise;
}

async function readLocal(key, fallback) {
  try {
    const r = await storage.get(key);
    return r && r.value != null ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}

export async function sGet(key, fallback) {
  try {
    const r = await storage.get(key);
    if (r && r.value != null) return JSON.parse(r.value);
    /* photos and signatures aren't synced ahead of time; fetch on demand */
    if (keyKind(key) === "media") {
      const data = await cloud.fetchMedia(key);
      if (data != null) {
        await storage.set(key, JSON.stringify(data));
        return data;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}
export async function sSet(key, value) {
  try {
    const prev = keyKind(key) === "punch" ? await readLocal(key, []) : null;
    await storage.set(key, JSON.stringify(value));
    cloud.recordWrite(key, value, prev).catch((e) => console.error("cloud queue failed", key, e));
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
  cloud.recordDelete(key).catch((e) => console.error("cloud queue failed", key, e));
}
export async function sList(prefix) {
  let keys = [];
  try {
    const r = await storage.list(prefix);
    keys = (r && r.keys) || [];
  } catch {
    keys = [];
  }
  if (keyKind(prefix + "x") === "media") {
    try {
      keys = [...new Set([...keys, ...(await cloud.listMedia(prefix))])];
    } catch {
      /* offline: local list is enough */
    }
  }
  return keys;
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
