import { test } from "node:test"
import assert from "node:assert/strict"
import { kstDateString } from "./news-lib.mjs"
import { buildMarkdown } from "./news-lib.mjs"
import { parseDigest } from "./news-lib.mjs"
import { recentTitles } from "./news-lib.mjs"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

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

const okItem = { title: "t", body: "b", url: "https://e.com/a" }

test("parseDigest: 순수 JSON 파싱", () => {
  const out = parseDigest(JSON.stringify({ summary: "s", items: [okItem] }))
  assert.equal(out.summary, "s")
  assert.equal(out.items.length, 1)
})

test("parseDigest: 코드펜스·산문에 둘러싸여도 추출", () => {
  const text = "다음은 결과입니다:\n```json\n" + JSON.stringify({ summary: "s", items: [okItem] }) + "\n```\n끝."
  assert.equal(parseDigest(text).items[0].url, "https://e.com/a")
})

test("parseDigest: URL 없는 항목은 거부", () => {
  const bad = JSON.stringify({ summary: "s", items: [{ title: "t", body: "b", url: "ftp://x" }] })
  assert.throws(() => parseDigest(bad), /url/)
})

test("parseDigest: JSON 없으면 거부", () => {
  assert.throws(() => parseDigest("뉴스가 없습니다"), /JSON/)
})

test("recentTitles: 최신 날짜 폴더부터 title 반환, 없으면 빈 배열", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "news-"))
  for (const [dir, title] of [
    ["2026-06-03-ai-digest", "오래된 글"],
    ["2026-06-06-ai-digest", "최신 글"],
  ]) {
    await mkdir(path.join(base, dir), { recursive: true })
    await writeFile(path.join(base, dir, "index.md"), `---\ntitle: "${title}"\ndate: "x"\n---\n본문`, "utf8")
  }
  const titles = await recentTitles(base, 10)
  assert.deepEqual(titles, ["최신 글", "오래된 글"])

  assert.deepEqual(await recentTitles(path.join(base, "nope"), 10), [])
})
