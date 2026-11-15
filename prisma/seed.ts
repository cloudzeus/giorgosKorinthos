// npm run db:seed  — creates the rooms and the first administrator. Safe to run again.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// The two villas of the estate. Each is rented whole. Prices are PLACEHOLDERS: set the real ones in Admin > Βίλες και τιμές.
const units = [
  { slug: "a", building: "A", sort: 1, capacity: 7, priceCents: 45000 },
  { slug: "b", building: "B", sort: 2, capacity: 4, priceCents: 30000 },
];

async function main() {
  // Rows from the earlier per-room model are hidden, not deleted: old reservations may point at them.
  await db.unit.updateMany({ where: { slug: { notIn: units.map((unit) => unit.slug) } }, data: { active: false } });
  for (const unit of units) await db.unit.upsert({ where: { slug: unit.slug }, update: {}, create: unit });
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    if (ADMIN_PASSWORD.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    const email = ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.user.upsert({
      where: { email },
      // Re-running the seed resets this account to the .env password and to super admin.
      update: { role: "SUPER_ADMIN", passwordHash },
      create: { email, name: ADMIN_NAME || "Administrator", role: "SUPER_ADMIN", passwordHash },
    });
    console.log(`Admin ready: ${email}`);
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin user created.");
  }
  console.log(`Villas ready: ${units.length}`);

  // Material already uploaded to the CDN by scripts/import-media.mjs: list it in the media library.
  const cdn = (process.env.NEXT_PUBLIC_CDN_URL || process.env.BUNNY_CDN_URL || "").replace(/\/$/, "");
  const file = join(__dirname, "media-manifest.json");
  if (cdn && existsSync(file)) {
    const rows = JSON.parse(readFileSync(file, "utf8")) as { path: string; kind: "IMAGE" | "VIDEO"; title: string; slot: string | null; bytes: number; width: number; height: number; poster: string | null }[];
    for (const row of rows) {
      const data = { url: `${cdn}/${row.path}`, poster: row.poster ? `${cdn}/${row.poster}` : null, bytes: row.bytes, width: row.width, height: row.height };
      // An existing entry keeps the title and the place on the site that the admin gave it.
      const taken = row.slot ? await db.mediaAsset.findUnique({ where: { slot: row.slot } }) : null;
      await db.mediaAsset.upsert({ where: { path: row.path }, update: data, create: { ...data, path: row.path, kind: row.kind, title: row.title, slot: taken ? null : row.slot } });
    }
    console.log(`Media library ready: ${rows.length} files from ${cdn}`);
  }
}

main().finally(() => db.$disconnect());
