// Run with: npm test
import assert from "node:assert";
import { depositOf, nightsBetween, parseDay, stayPrice, validStay } from "./booking";

assert.equal(parseDay("2026-02-30"), null, "impossible date");
assert.equal(parseDay("1/2/2026"), null, "wrong format");
const checkIn = parseDay("2026-07-01")!;
const checkOut = parseDay("2026-07-04")!;
assert.equal(nightsBetween(checkIn, checkOut), 3);

const today = new Date("2026-06-30T15:00:00Z");
assert.ok(validStay(checkIn, checkOut, today));
assert.ok(!validStay(checkOut, checkIn, today), "check-out before check-in");
assert.ok(!validStay(checkIn, checkIn, today), "zero nights");
assert.ok(!validStay(parseDay("2026-06-29"), checkOut, today), "past check-in");
assert.ok(validStay(parseDay("2026-06-30"), checkOut, today), "same-day check-in");

assert.equal(depositOf(63000, 100), 63000);
assert.equal(depositOf(63000, 30), 18900);
assert.equal(depositOf(9999, 30), 3000, "rounds to a whole cent");

// Seasonal rates: base 100, July 150 (min 3 nights), a weekend special on 3-4 July at 200.
const d = (value: string) => parseDay(value)!;
const rates = [
  { from: d("2026-07-01"), to: d("2026-07-31"), priceCents: 15000, minNights: 3 },
  { from: d("2026-07-03"), to: d("2026-07-04"), priceCents: 20000, minNights: 1 },
];
assert.deepEqual(stayPrice(10000, [], checkIn, checkOut), { totalCents: 30000, minNights: 1 }, "no rates: base price");
assert.deepEqual(stayPrice(10000, rates, d("2026-06-29"), d("2026-07-02")), { totalCents: 10000 + 10000 + 15000, minNights: 1 }, "crosses into the season");
assert.deepEqual(stayPrice(10000, rates, d("2026-07-01"), d("2026-07-05")), { totalCents: 15000 + 15000 + 20000 + 20000, minNights: 3 }, "later period wins on overlap");
assert.deepEqual(stayPrice(10000, rates, d("2026-07-31"), d("2026-08-02")), { totalCents: 15000 + 10000, minNights: 3 }, "period end is inclusive");

console.log("booking: ok");
