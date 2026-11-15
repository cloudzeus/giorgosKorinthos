// Run with: npm test
import assert from "node:assert";
import { extractJson } from "./ai";

assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
assert.deepEqual(extractJson('```json\n{"a":{"b":"}"}}\n```'), { a: { b: "}" } }, "code fence and a brace inside a string");
assert.throws(() => extractJson("Sorry, I cannot do that."));

console.log("ai: ok");
