// Bunny Storage (upload/delete) + Bunny CDN pull zone (delivery). Server only.
// Files are written to  https://{host}/{zone}/{path}  with the storage zone password as AccessKey.
import { getSettings } from "./settings";

/** Only a real Bunny storage host is used; anything else (an old free-text value) falls back to the main region. */
export const storageHost = (value: string) => (/^([a-z]{2,3}\.)?storage\.bunnycdn\.com$/.test(value) ? value : "storage.bunnycdn.com");

async function config() {
  const s = await getSettings();
  return { zone: s.BUNNY_STORAGE_ZONE, key: s.BUNNY_STORAGE_KEY, host: storageHost(s.BUNNY_STORAGE_HOST), cdn: s.BUNNY_CDN_URL.replace(/\/$/, "") };
}

export async function bunnyConfigured() {
  const { zone, key, cdn } = await config();
  return Boolean(zone && key && cdn);
}

export const cdnUrl = async (path: string) => `${(await config()).cdn}/${path}`;

/** Only plain, lower-case paths: no traversal, no surprises in URLs. */
export function safePath(folder: string, filename: string): string {
  const clean = (part: string) => part.toLowerCase().normalize("NFKD").replace(/[^a-z0-9.\-_/]+/g, "-").replace(/\.{2,}/g, ".").replace(/^[-/.]+|[-/]+$/g, "");
  return `${clean(folder).replace(/\/+/g, "/")}/${clean(filename).replace(/\//g, "-")}`;
}

export async function bunnyUpload(path: string, body: BodyInit, contentType: string): Promise<void> {
  const { zone, key, host } = await config();
  const res = await fetch(`https://${host}/${zone}/${path}`, {
    method: "PUT",
    headers: { AccessKey: key, "Content-Type": contentType },
    body,
    // Lets a large upload stream through instead of being buffered in memory.
    duplex: "half",
  } as RequestInit);
  if (!res.ok) throw new Error(`Bunny upload failed: HTTP ${res.status}`);
}

export async function bunnyDelete(path: string): Promise<void> {
  const { zone, key, host } = await config();
  const res = await fetch(`https://${host}/${zone}/${path}`, { method: "DELETE", headers: { AccessKey: key } });
  if (!res.ok && res.status !== 404) throw new Error(`Bunny delete failed: HTTP ${res.status}`);
}
