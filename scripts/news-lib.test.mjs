import { test } from "node:test"
import assert from "node:assert/strict"
import { kstDateString } from "./news-lib.mjs"
import { buildMarkdown } from "./news-lib.mjs"

test("kstDateString: UTC 자정 → KST 같은 날(09:00)", () => {
  assert.equal(kstDateString(new Date("2026-06-09T00:00:00Z")), "2026-06-09")
})

test("kstDateString: 늦은 UTC는 KST 다음 날로 넘어감", () => {
  // 2026-06-08T16:00Z == 2026-06-09T01:00 KST
  assert.equal(kstDateString(new Date("2026-06-08T16:00:00Z")), "2026-06-09")
})

test("buildMarkdown: frontmatter·번호항목·출처·고지 한 줄 포함", () => {
  const md = buildMarkdown({
    date: "2026-06-09",
    summary: `오늘의 "핵심"\n요약`,
    items: [
      { title: "모델 X 공개", body: "어떤 회사가 X를 냈다.", url: "https://ex.com/x" },
      { title: "연구 Y", body: "새 결과 Y.", url: "https://ex.com/y" },
    ],
  })
  assert.match(md, /^---\ntitle: "AI 뉴스 다이제스트 — 2026-06-09"\ndate: "2026-06-09"\n/)
  assert.match(md, /description: "오늘의 \\"핵심\\" 요약"/)
  assert.match(md, /### 1\. 모델 X 공개\n어떤 회사가 X를 냈다\. \(\[출처\]\(https:\/\/ex\.com\/x\)\)/)
  assert.match(md, /### 2\. 연구 Y/)
  assert.ok(md.includes("이 글은 Gemini가 자동 요약했습니다"))
  assert.ok(md.endsWith("\n"))
})
