/* Cloud sync over Supabase.

   The local store (IndexedDB) stays the source the app reads from, so the
   clock works with no signal. Every local write is also queued in an
   outbox and pushed when there's a connection; a pull asks the server for
   anything changed since the last look and folds it into the local store.

   Key routing:
     gac:punches:YYYY-MM   -> `punches` table, one row per event, tombstoned
     gac:photo:* / gac:signature:*  -> Storage bucket "media"
     everything else       -> `kv` table, last write wins

   Nothing in here touches React. The storage module wires it up. */
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/cloudConfig.js";

const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const OUTBOX_KEY = "_cloud:outbox";
const SHOP_KEY = "_cloud:shop";
const SYNC_KEY = "_cloud:sync";
const EPOCH = "1970-01-01T00:00:00Z";
const PAGE = 1000;
const PUNCH_PREFIX = "gac:punches:";

/* ---------- pure helpers (tested in node) ---------- */
export const keyKind = (key) =>
  key.startsWith(PUNCH_PREFIX) ? "punch" : /^gac:(photo|signature):/.test(key) ? "media" : "kv";

/* gac:photo:<ts>:<id>          -> <shop>/photo/<ts>_<id>.jpg
   gac:signature:<week>:<emp>   -> <shop>/signature/<week>_<emp>.png */
export function mediaPath(shopId, key) {
  const [, kind, a, b] = key.split(":");
  return `${shopId}/${kind}/${a}_${b}.${kind === "photo" ? "jpg" : "png"}`;
}
export function mediaKey(kind, filename) {
  const base = filename.replace(/\.(jpg|png)$/, "");
  const i = base.indexOf("_");
  return i < 0 ? null : `gac:${kind}:${base.slice(0, i)}:${base.slice(i + 1)}`;
}

/* What changed between two versions of a month's punch list. */
export function diffPunches(prev, next) {
  const before = new Map((prev || []).map((e) => [e.id, e]));
  const upserts = [];
  for (const e of next || []) {
    const old = before.get(e.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(e)) upserts.push(e);
    before.delete(e.id);
  }
  return { upserts, deletes: [...before.keys()] };
}

/* Fold pulled rows into a month list. Ids in `pending` are local edits
   that haven't uploaded yet; they win over whatever the server has. */
export function mergePunches(list, rows, pending) {
  const map = new Map((list || []).map((e) => [e.id, e]));
  for (const r of rows) {
    if (pending && pending.has(r.id)) continue;
    if (r.deleted) map.delete(r.id);
    else map.set(r.id, { ...r.data, id: r.id, empId: r.emp_id, type: r.type, ts: Number(r.ts) });
  }
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = String(dataUrl).split(",");
  const mime = (head.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
const isNetworkError = (e) =>
  (typeof navigator !== "undefined" && !navigator.onLine) ||
  /fetch|network|load failed|timed? ?out/i.test(String(e?.message || e));

/* ---------- state ---------- */
let local = null; // raw backend: get/set/delete/list on JSON strings
let applyRemote = null; // (key, value) => writes local WITHOUT queueing
const listeners = new Set();
const state = {
  configured,
  user: null,
  shopId: null,
  shopName: "",
  linked: false,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  pending: 0,
  lastSync: null,
  syncing: false,
  error: "",
};
function emit(type, extra) {
  for (const fn of listeners) {
    try {
      fn({ type, ...extra });
    } catch (e) {
      console.error(e);
    }
  }
}
function setState(patch) {
  Object.assign(state, patch);
  emit("state");
}
async function lget(key, fallback) {
  try {
    const r = await local.get(key);
    return r && r.value != null ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
const lset = (key, v) => local.set(key, JSON.stringify(v));

/* ---------- outbox ---------- */
let outbox = [];
let chain = Promise.resolve();
const withOutbox = (fn) => (chain = chain.then(fn, fn));
async function enqueue(item, quiet) {
  await withOutbox(async () => {
    outbox.push({ ...item, at: Date.now() });
    await lset(OUTBOX_KEY, outbox);
    setState({ pending: outbox.length });
  });
  if (!quiet) flush();
}
function pendingPunchIds() {
  const s = new Set();
  for (const it of outbox) {
    if (it.kind !== "punch") continue;
    for (const e of it.upserts) s.add(e.id);
    for (const id of it.deletes) s.add(id);
  }
  return s;
}
function pendingKvKeys() {
  return new Set(outbox.filter((it) => it.kind === "kv").map((it) => it.key));
}

async function push(item) {
  const shop_id = state.shopId;
  if (item.kind === "kv") {
    const q = supabase.from("kv");
    const { error } =
      item.op === "del"
        ? await q.delete().match({ shop_id, key: item.key })
        : await q.upsert({ shop_id, key: item.key, value: item.value });
    if (error) throw error;
  } else if (item.kind === "punch") {
    if (item.upserts.length) {
      const rows = item.upserts.map((e) => ({
        shop_id,
        id: e.id,
        emp_id: e.empId,
        type: e.type,
        ts: e.ts,
        month: item.month,
        data: e,
        deleted: false,
      }));
      const { error } = await supabase.from("punches").upsert(rows);
      if (error) throw error;
    }
    if (item.deletes.length) {
      const { error } = await supabase
        .from("punches")
        .update({ deleted: true })
        .eq("shop_id", shop_id)
        .in("id", item.deletes);
      if (error) throw error;
    }
  } else if (item.kind === "media") {
    const bucket = supabase.storage.from("media");
    const path = mediaPath(shop_id, item.key);
    const { error } =
      item.op === "del"
        ? await bucket.remove([path])
        : await bucket.upload(path, dataUrlToBlob(item.value), { upsert: true });
    if (error) throw error;
  }
}

let flushing = false;
let retryTimer = null;
async function flush() {
  if (!state.linked || flushing || !outbox.length) return;
  flushing = true;
  setState({ syncing: true });
  try {
    while (outbox.length) {
      const item = outbox[0];
      try {
        await push(item);
      } catch (e) {
        if (isNetworkError(e)) {
          setState({ error: "Offline — changes will upload when the connection is back" });
          clearTimeout(retryTimer);
          retryTimer = setTimeout(flush, 15000);
          return;
        }
        /* a change the server refuses would block everything behind it forever */
        console.error("cloud rejected a change, dropping it", item, e);
        setState({ error: `Cloud rejected a change: ${e.message || e}` });
      }
      await withOutbox(async () => {
        outbox.shift();
        await lset(OUTBOX_KEY, outbox);
        setState({ pending: outbox.length });
      });
    }
    if (/Offline/.test(state.error)) setState({ error: "" });
  } finally {
    flushing = false;
    setState({ syncing: false });
  }
}

/* ---------- pull ---------- */
let pulling = false;
let pullAgain = false;
let pullTimer = null;
function schedulePull(ms = 400) {
  clearTimeout(pullTimer);
  pullTimer = setTimeout(pull, ms);
}
async function pull() {
  if (!state.linked) return;
  if (pulling) {
    pullAgain = true;
    return;
  }
  pulling = true;
  const changed = new Set();
  try {
    const sync = await lget(SYNC_KEY, { kv: EPOCH, punches: EPOCH });
    const skipKv = pendingKvKeys();
    let since = sync.kv;
    for (;;) {
      const { data, error } = await supabase
        .from("kv")
        .select("key,value,updated_at")
        .eq("shop_id", state.shopId)
        .gt("updated_at", since)
        .order("updated_at")
        .limit(PAGE);
      if (error) throw error;
      for (const r of data) {
        since = r.updated_at;
        if (skipKv.has(r.key)) continue;
        await applyRemote(r.key, r.value);
        changed.add(r.key);
      }
      if (data.length < PAGE) break;
    }
    sync.kv = since;

    const pending = pendingPunchIds();
    since = sync.punches;
    for (;;) {
      const { data, error } = await supabase
        .from("punches")
        .select("id,emp_id,type,ts,month,data,deleted,updated_at")
        .eq("shop_id", state.shopId)
        .gt("updated_at", since)
        .order("updated_at")
        .limit(PAGE);
      if (error) throw error;
      const byMonth = {};
      for (const r of data) {
        since = r.updated_at;
        (byMonth[r.month] ||= []).push(r);
      }
      for (const [month, rows] of Object.entries(byMonth)) {
        const key = PUNCH_PREFIX + month;
        const merged = mergePunches(await lget(key, []), rows, pending);
        await applyRemote(key, merged);
        changed.add(key);
      }
      if (data.length < PAGE) break;
    }
    sync.punches = since;
    await lset(SYNC_KEY, sync);
    setState({ lastSync: Date.now(), error: /Offline|Sync error/.test(state.error) ? "" : state.error });
  } catch (e) {
    if (!isNetworkError(e)) console.error("cloud pull failed", e);
    setState({ error: isNetworkError(e) ? "Offline — showing what's on this device" : `Sync error: ${e.message || e}` });
  } finally {
    pulling = false;
    if (changed.size) emit("data", { keys: [...changed] });
    if (pullAgain) {
      pullAgain = false;
      schedulePull(100);
    }
  }
}

/* ---------- live updates + loops ---------- */
let channel = null;
let pollTimer = null;
function start() {
  setState({ linked: true });
  if (!channel) {
    const filter = `shop_id=eq.${state.shopId}`;
    channel = supabase
      .channel(`shop-${state.shopId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "punches", filter }, () => schedulePull())
      .on("postgres_changes", { event: "*", schema: "public", table: "kv", filter }, () => schedulePull())
      .subscribe();
  }
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    flush();
    pull();
  }, 60000);
  flush();
  pull();
}
function stop() {
  setState({ linked: false });
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  clearInterval(pollTimer);
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    setState({ online: true });
    flush();
    pull();
  });
  window.addEventListener("offline", () => setState({ online: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      flush();
      pull();
    }
  });
}

/* ---------- account + shop ---------- */
const userOf = (session) =>
  session?.user ? { id: session.user.id, email: session.user.email } : null;

async function init(backend, apply) {
  local = backend;
  applyRemote = apply;
  outbox = await lget(OUTBOX_KEY, []);
  setState({ pending: outbox.length });
  if (!configured) return;
  const shop = await lget(SHOP_KEY, null);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  setState({ user: userOf(session), shopId: shop?.id || null, shopName: shop?.name || "" });
  supabase.auth.onAuthStateChange((event, sess) => {
    setState({ user: userOf(sess) });
    if (event === "SIGNED_OUT") stop();
  });
  if (session && shop) start();
  else if (session) await linkShop();
}

/* Join the shop this account belongs to, or create one from local
   settings. Whatever this device has locally is queued for upload, so
   the first device you link (the iPad) seeds the cloud copy. */
async function linkShop() {
  const { data: rows, error } = await supabase
    .from("shop_members")
    .select("shop_id, shops(name)")
    .order("created_at")
    .limit(1);
  if (error) throw error;
  let id;
  let name;
  if (rows && rows.length) {
    id = rows[0].shop_id;
    name = rows[0].shops?.name || "";
  } else {
    const cfg = await lget("gac:config", null);
    name = (cfg && cfg.shopName) || "My shop";
    const { data, error: e2 } = await supabase.rpc("create_shop", { shop_name: name });
    if (e2) throw e2;
    id = data;
  }
  await lset(SHOP_KEY, { id, name });
  await lset(SYNC_KEY, { kv: EPOCH, punches: EPOCH });
  setState({ shopId: id, shopName: name });
  await uploadEverything();
  start();
}
async function uploadEverything() {
  const r = await local.list("gac:");
  for (const key of (r && r.keys) || []) {
    const value = await lget(key, null);
    if (value == null) continue;
    const kind = keyKind(key);
    if (kind === "kv") await enqueue({ kind, op: "put", key, value }, true);
    else if (kind === "punch")
      await enqueue({ kind, month: key.slice(PUNCH_PREFIX.length), upserts: value, deletes: [] }, true);
    else await enqueue({ kind, op: "put", key, value }, true);
  }
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await linkShop();
}
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.session) {
    await linkShop();
    return "signedIn";
  }
  return "confirm";
}
async function signOut() {
  stop();
  await supabase.auth.signOut();
  await local.delete(SHOP_KEY);
  setState({ user: null, shopId: null, shopName: "" });
}

/* ---------- called by the storage module ---------- */
async function recordWrite(key, value, prev) {
  if (!state.linked) return;
  const kind = keyKind(key);
  if (kind === "kv") return enqueue({ kind, op: "put", key, value });
  if (kind === "punch") {
    const d = diffPunches(prev, value);
    if (d.upserts.length || d.deletes.length)
      return enqueue({ kind, month: key.slice(PUNCH_PREFIX.length), ...d });
    return;
  }
  return enqueue({ kind, op: "put", key, value });
}
async function recordDelete(key) {
  if (!state.linked) return;
  const kind = keyKind(key);
  if (kind === "punch") return;
  return enqueue({ kind, op: "del", key });
}
async function fetchMedia(key) {
  if (!state.linked) return null;
  const { data, error } = await supabase.storage.from("media").download(mediaPath(state.shopId, key));
  if (error || !data) return null;
  return blobToDataUrl(data);
}
async function listMedia(prefix) {
  if (!state.linked) return [];
  const kind = prefix.split(":")[1];
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from("media")
      .list(`${state.shopId}/${kind}`, { limit: 1000, offset });
    if (error || !data) break;
    for (const f of data) {
      const k = mediaKey(kind, f.name);
      if (k) out.push(k);
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return out;
}

export const cloud = {
  configured,
  init,
  getState: () => ({ ...state }),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  signIn,
  signUp,
  signOut,
  linkShop,
  syncNow() {
    flush();
    pull();
  },
  recordWrite,
  recordDelete,
  fetchMedia,
  listMedia,
};
