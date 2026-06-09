import { test } from "node:test"
import assert from "node:assert/strict"
import { kstDateString } from "./news-lib.mjs"

test("kstDateString: UTC 자정 → KST 같은 날(09:00)", () => {
  assert.equal(kstDateString(new Date("2026-06-09T00:00:00Z")), "2026-06-09")
})

test("kstDateString: 늦은 UTC는 KST 다음 날로 넘어감", () => {
  // 2026-06-08T16:00Z == 2026-06-09T01:00 KST
  assert.equal(kstDateString(new Date("2026-06-08T16:00:00Z")), "2026-06-09")
})
