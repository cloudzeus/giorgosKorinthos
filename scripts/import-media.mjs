// Imports a folder of source films and photographs into the media library.
//   node --env-file=.env scripts/import-media.mjs /path/to/folder
// Films become short, silent, web-sized MP4 loops with a poster; photographs become WebP.
// With BUNNY_* set, files go to Bunny Storage and the library stores CDN URLs.
// Without it, files go to public/media-local (git-ignored) so the site can be previewed. Run again after
// adding the Bunny keys: every asset is re-uploaded and its URL switched to the CDN.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

const { BUNNY_STORAGE_ZONE: zone, BUNNY_STORAGE_KEY: key, BUNNY_CDN_URL: cdn } = process.env;
const host = process.env.BUNNY_STORAGE_HOST ?? "storage.bunnycdn.com";
const remote = Boolean(zone && key && cdn);
const work = mkdtempSync(join(tmpdir(), "ephyria-media-"));
const db = new PrismaClient();
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
    // 16 s, 1280 wide, no sound: a background loop, not a film player.
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-t", "16", "-an", "-vf", "scale=1280:-2", "-c:v", "libx264", "-crf", "27", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output]);
    const still = `${output}.jpg`, webp = `${output}.webp`;
    run("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", input, "-frames:v", "1", "-vf", "scale=1280:-2", still]);
    run("cwebp", ["-quiet", "-q", "78", still, "-o", webp]);
    poster = await publish(webp, item.path.replace(/\.mp4$/, ".webp"), "image/webp");
  } else {
    run("cwebp", ["-quiet", "-q", "80", "-resize", "2000", "0", input, "-o", output]);
  }
  const url = await publish(output, item.path, kind === "VIDEO" ? "video/mp4" : "image/webp");
  const [width, height] = probe(output);
  const data = { kind, url, poster, title: item.title, bytes: statSync(output).size, width, height };
  if (item.slot) await db.mediaAsset.updateMany({ where: { slot: item.slot, NOT: { path: item.path } }, data: { slot: null } });
  await db.mediaAsset.upsert({ where: { path: item.path }, update: { ...data, slot: item.slot }, create: { ...data, path: item.path, slot: item.slot } });
  console.log(`${remote ? "bunny" : "local"}  ${(data.bytes / 1e6).toFixed(1)} MB  ${item.path}`);
}
await db.$disconnect();
