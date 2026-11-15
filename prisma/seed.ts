// npm run db:seed  — creates the rooms and the first administrator. Safe to run again.
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
    if (ADMIN_PASSWORD.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
    const email = ADMIN_EMAIL.trim().toLowerCase();
    await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name: ADMIN_NAME || "Administrator", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) },
    });
    console.log(`Admin ready: ${email}`);
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin user created.");
  }
  console.log(`Villas ready: ${units.length}`);
}

main().finally(() => db.$disconnect());
