// Run with: npm test
import assert from "node:assert";
import { nightsBetween, parseDay, quote, validStay } from "./booking";

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

assert.deepEqual(quote([12000, 9000], 3, 100), { totalCents: 63000, dueCents: 63000 });
assert.deepEqual(quote([12000, 9000], 3, 30), { totalCents: 63000, dueCents: 18900 });
assert.deepEqual(quote([9999], 1, 30), { totalCents: 9999, dueCents: 3000 }, "rounds to a whole cent");

console.log("booking: ok");
