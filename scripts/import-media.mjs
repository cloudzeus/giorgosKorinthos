// Imports a folder of source films and photographs into the media library.
//   node --env-file=.env scripts/import-media.mjs /path/to/folder
// Films become silent full-HD MP4 loops with a poster; photographs become WebP. The site's own photographs
// (public/images) are uploaded too, so everything is served by the CDN and listed in the media library.
// Bunny credentials come from the environment or, failing that, from the admin Settings (database).
// Without them, files go to public/media-local (git-ignored) so the site can be previewed.
// Every run rewrites prisma/media-manifest.json; `npm run db:seed` registers that list in another database.
import { execFileSync } from "node:child_process";
import { createDecipheriv, createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { PrismaClient } from "@prisma/client";

const source = process.argv[2];
if (!source) throw new Error("Usage: node --env-file=.env scripts/import-media.mjs <folder>");

// Which source file (matched by the start of its name) becomes which library entry.
const PLAN = [
  { match: "aerial-view-of-corinth-canal-with-beautiful-bridge", path: "videos/places/corinth-canal.mp4", slot: "place.corinth-canal.video", title: "Διώρυγα Κορίνθου, αεροφωτογράφιση με τη γέφυρα" },
  { match: "aerial-view-of-famous-corinth-canal", path: "videos/explore-hero.mp4", slot: "explore.hero.video", title: "Διώρυγα Κορίνθου, αεροφωτογράφιση Ισθμού" },
  { match: "temple-of-apollo", path: "videos/places/ancient-corinth.mp4", slot: "place.ancient-corinth.video", title: "Ναός του Απόλλωνα, Αρχαία Κόρινθος" },
  { match: "panoramic-view-of-ancient-ruins-of-corinth", path: "videos/places/acrocorinth.mp4", slot: "place.acrocorinth.video", title: "Αρχαία Κόρινθος με τον Ακροκόρινθο" },
  { match: "forward-aerial-pan-of-loutraki", path: "videos/places/loutraki.mp4", slot: "place.loutraki.video", title: "Λουτράκι, αεροφωτογράφιση" },
  { match: "the-archeological-site-of-ancient-corinth", path: "videos/home-region.mp4", slot: "home.region.video", title: "Αρχαιολογικός χώρος Αρχαίας Κορίνθου" },
  { match: "ancient-corinth-archaeological-site-ruins", path: "videos/ancient-corinth-ruins.mp4", slot: null, title: "Ερείπια Αρχαίας Κορίνθου" },
  { match: "lighthouse-stand-out-next-to-archaeological-site-o-2026-09-21", path: "images/places/heraion.webp", slot: "place.heraion.photo", title: "Ακρωτήριο Μελαγκάβι και Ηραίο από ψηλά" },
  { match: "lighthouse-stand-out-next-to-archaeological-site-o-2026-09-23-22", path: "images/places/melagavi-lighthouse-aerial.webp", slot: null, title: "Φάρος Μελαγκάβι από ψηλά" },
  { match: "lighthouse-stand-out-next-to-archaeological-site-o-2026-09-23-16", path: "images/places/melagavi-lighthouse.webp", slot: null, title: "Φάρος Μελαγκάβι" },
  { match: "embankment-in-loutraki", path: "images/places/loutraki.webp", slot: "place.loutraki.photo", title: "Παραλιακή Λουτρακίου το απόγευμα" },
  { match: "small-beach-cafe", path: "images/places/loutraki-cove.webp", slot: null, title: "Όρμος κοντά στο Λουτράκι" },
];

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
const setting = (name) => stored.get(name) || process.env[name] || "";
const zone = setting("BUNNY_STORAGE_ZONE"), key = setting("BUNNY_STORAGE_KEY"), cdn = setting("BUNNY_CDN_URL");
const host = /^([a-z]{2,3}\.)?storage\.bunnycdn\.com$/.test(setting("BUNNY_STORAGE_HOST")) ? setting("BUNNY_STORAGE_HOST") : "storage.bunnycdn.com";
const remote = Boolean(zone && key && cdn);
const work = mkdtempSync(join(tmpdir(), "ephyria-media-"));
const manifest = [];
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "ignore", "inherit"] });
const probe = (file) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]).toString().trim().split(",").map(Number);

async function publish(file, path, type) {
  if (remote) {
    const res = await fetch(`https://${host}/${zone}/${path}`, { method: "PUT", headers: { AccessKey: key, "Content-Type": type }, body: readFileSync(file) });
    if (!res.ok) throw new Error(`Bunny upload failed for ${path}: HTTP ${res.status}`);
    return `${cdn.replace(/\/$/, "")}/${path}`;
  }
  const target = join("public/media-local", path);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(file, target);
  return `/media-local/${path}`;
}

const files = readdirSync(source);
for (const item of PLAN) {
  const name = files.find((file) => file.startsWith(item.match));
  if (!name) { console.log(`skip (not found): ${item.match}`); continue; }
  const input = join(source, name);
  const output = join(work, item.path.replace(/\//g, "_"));
  let poster = null, kind = "IMAGE";
  if (item.path.endsWith(".mp4")) {
    kind = "VIDEO";
    // Full length, full HD, no sound. CRF 23 with the slow preset is visually the same as the source at a fraction of the size.
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-an", "-vf", "scale='min(1920,iw)':-2", "-c:v", "libx264", "-crf", "23", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output]);
    const still = `${output}.png`, webp = `${output}.webp`;
    run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", input, "-frames:v", "1", "-vf", "scale='min(1920,iw)':-2", still]);
    run("cwebp", ["-quiet", "-q", "82", still, "-o", webp]);
    poster = await publish(webp, item.path.replace(/\.mp4$/, ".webp"), "image/webp");
  } else {
    run("cwebp", ["-quiet", "-q", "82", "-resize", "2400", "0", input, "-o", output]);
  }
  const url = await publish(output, item.path, kind === "VIDEO" ? "video/mp4" : "image/webp");
  const [width, height] = probe(output);
  const data = { kind, url, poster, title: item.title, bytes: statSync(output).size, width, height };
  if (item.slot) await db.mediaAsset.updateMany({ where: { slot: item.slot, NOT: { path: item.path } }, data: { slot: null } });
  await db.mediaAsset.upsert({ where: { path: item.path }, update: { ...data, slot: item.slot }, create: { ...data, path: item.path, slot: item.slot } });
  manifest.push({ path: item.path, kind, title: item.title, slot: item.slot, bytes: data.bytes, width, height, poster: poster ? item.path.replace(/\.mp4$/, ".webp") : null });
  console.log(`${remote ? "bunny" : "local"}  ${(data.bytes / 1e6).toFixed(1)} MB  ${item.path}`);
}

// The site's own photographs, already WebP. A file the plan above has replaced is left alone.
const walk = (dir) => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : name.endsWith(".webp") ? [join(dir, name)] : []));
const label = (path) => {
  const name = path.split("/").pop().replace(".webp", "");
  if (path.includes("/places/")) return `Περιοχή: ${name}`;
  return `${name.startsWith("outdoor") ? "Βίλα, εξωτερικός χώρος" : "Βίλα, εσωτερικός χώρος"} ${name.replace(/^[a-z]+-/, "")}`;
};
for (const file of remote ? walk("public/images") : []) {
  const path = `images/${relative("public/images", file).replace(/\\/g, "/")}`;
  if (manifest.some((row) => row.path === path)) continue;
  const url = await publish(file, path, "image/webp");
  const [width, height] = probe(file);
  const data = { kind: "IMAGE", url, title: label(path), bytes: statSync(file).size, width, height };
  await db.mediaAsset.upsert({ where: { path }, update: { url, bytes: data.bytes, width, height }, create: { ...data, path } });
  manifest.push({ path, kind: "IMAGE", title: data.title, slot: null, bytes: data.bytes, width, height, poster: null });
  console.log(`bunny  ${(data.bytes / 1e6).toFixed(1)} MB  ${path}`);
}
if (remote) writeFileSync("prisma/media-manifest.json", `${JSON.stringify(manifest, null, 1)}\n`);
console.log(remote ? `\n${manifest.length} files on ${cdn.replace(/\/$/, "")}` : "\nNo Bunny credentials: files were written to public/media-local.");
await db.$disconnect();
