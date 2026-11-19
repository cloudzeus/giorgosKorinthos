// Uploads single files to Bunny Storage with the credentials saved in the admin Settings (or the environment).
//   node --env-file=.env scripts/bunny-put.mjs <local file> <remote path> [<local file> <remote path> ...]
import { createDecipheriv, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const TYPES = { pdf: "application/pdf", webp: "image/webp", jpg: "image/jpeg", png: "image/png", svg: "image/svg+xml", mp4: "video/mp4" };
const args = process.argv.slice(2);
if (!args.length || args.length % 2) throw new Error("Usage: node --env-file=.env scripts/bunny-put.mjs <local file> <remote path> ...");

const db = new PrismaClient();
// Same scheme as src/lib/settings.ts: AES-256-GCM, key = sha256(AUTH_SECRET).
const stored = new Map((await db.setting.findMany({ where: { key: { startsWith: "BUNNY_" } } })).map((row) => {
  try {
    const [iv, tag, body] = row.value.split(".").map((part) => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(process.env.AUTH_SECRET ?? "").digest(), iv);
    decipher.setAuthTag(tag);
    return [row.key, Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8")];
  } catch { return [row.key, ""]; }
}));
await db.$disconnect();
const setting = (name) => stored.get(name) || process.env[name] || "";
const zone = setting("BUNNY_STORAGE_ZONE"), key = setting("BUNNY_STORAGE_KEY"), cdn = setting("BUNNY_CDN_URL").replace(/\/$/, "");
const host = /^([a-z]{2,3}\.)?storage\.bunnycdn\.com$/.test(setting("BUNNY_STORAGE_HOST")) ? setting("BUNNY_STORAGE_HOST") : "storage.bunnycdn.com";
if (!zone || !key || !cdn) throw new Error("Bunny is not configured (admin Settings or BUNNY_* in the environment).");

for (let i = 0; i < args.length; i += 2) {
  const [file, path] = [args[i], args[i + 1]];
  const type = TYPES[path.split(".").pop()];
  if (!type) throw new Error(`Unknown file type: ${path}`);
  const res = await fetch(`https://${host}/${zone}/${path}`, { method: "PUT", headers: { AccessKey: key, "Content-Type": type }, body: readFileSync(file) });
  if (!res.ok) throw new Error(`Bunny upload failed for ${path}: HTTP ${res.status}`);
  console.log(`${cdn}/${path}`);
}
