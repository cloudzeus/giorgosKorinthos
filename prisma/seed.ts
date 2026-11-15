// npm run db:seed  — creates the rooms and the first administrator. Safe to run again.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// The five rooms from the owner's text. Prices are PLACEHOLDERS: set the real ones in Admin > Δωμάτια και τιμές.
const units = [
  { slug: "a1", building: "A", sort: 1, capacity: 3, priceCents: 15000 },
  { slug: "a2", building: "A", sort: 2, capacity: 2, priceCents: 12000 },
  { slug: "a3", building: "A", sort: 3, capacity: 2, priceCents: 12000 },
  { slug: "b1", building: "B", sort: 4, capacity: 3, priceCents: 15000 },
  { slug: "b2", building: "B", sort: 5, capacity: 1, priceCents: 9000 },
];

async function main() {
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
  console.log(`Rooms ready: ${units.length}`);
}

main().finally(() => db.$disconnect());
