import { test } from "node:test"
import assert from "node:assert/strict"
import {
  kstDateString,
  buildMarkdown,
  parseDigest,
  recentTitles,
  parseRssItems,
} from "./news-lib.mjs"
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
      {
        title: "모델 X 공개",
        body: "어떤 회사가 X를 냈다.",
        url: "https://ex.com/x",
      },
      { title: "연구 Y", body: "새 결과 Y.", url: "https://ex.com/y" },
    ],
  })
  assert.match(
    md,
    /^---\ntitle: "AI 뉴스 다이제스트 — 2026-06-09"\ndate: "2026-06-09"\n/
  )
  assert.match(md, /description: "오늘의 \\"핵심\\" 요약"/)
  assert.match(
    md,
    /### 1\. 모델 X 공개\n어떤 회사가 X를 냈다\. \(\[출처\]\(https:\/\/ex\.com\/x\)\)/
  )
  assert.match(md, /### 2\. 연구 Y/)
  assert.ok(md.includes("이 글은 Gemini가 자동 요약했습니다"))
  assert.ok(md.endsWith("\n"))
})

test("buildMarkdown: description 백슬래시·따옴표 이스케이프", () => {
  const md = buildMarkdown({
    date: "2026-06-09",
    summary: 'a\\b "c"',
    items: [{ title: "t", body: "b", url: "https://e.com/a" }],
  })
  assert.match(md, /description: "a\\\\b \\"c\\""/)
})

const okItem = { title: "t", body: "b", url: "https://e.com/a" }

test("parseDigest: 순수 JSON 파싱", () => {
  const out = parseDigest(JSON.stringify({ summary: "s", items: [okItem] }))
  assert.equal(out.summary, "s")
  assert.equal(out.items.length, 1)
})

test("parseDigest: 코드펜스·산문에 둘러싸여도 추출", () => {
  const text =
    "다음은 결과입니다:\n```json\n" +
    JSON.stringify({ summary: "s", items: [okItem] }) +
    "\n```\n끝."
  assert.equal(parseDigest(text).items[0].url, "https://e.com/a")
})

test("parseDigest: URL 없는 항목은 거부", () => {
  const bad = JSON.stringify({
    summary: "s",
    items: [{ title: "t", body: "b", url: "ftp://x" }],
  })
  assert.throws(() => parseDigest(bad), /url/)
})

test("parseDigest: JSON 없으면 거부", () => {
  assert.throws(() => parseDigest("뉴스가 없습니다"), /JSON/)
})

test("parseDigest: JSON 뒤 산문에 중괄호가 있어도 진짜 끝에서 멈춤", () => {
  const text =
    JSON.stringify({ summary: "s", items: [okItem] }) + " 출처: 예시 {참고} 끝"
  assert.equal(parseDigest(text).items.length, 1)
})

test("parseDigest: 문자열 값 안의 중괄호는 무시", () => {
  const text = `{"summary":"s","items":[{"title":"f(x)={y}","body":"b","url":"https://e.com/a"}]}`
  assert.equal(parseDigest(text).items[0].title, "f(x)={y}")
})

test("recentTitles: 최신 날짜 폴더부터 title 반환, 없으면 빈 배열", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "news-"))
  for (const [dir, title] of [
    ["2026-06-03-ai-digest", "오래된 글"],
    ["2026-06-06-ai-digest", "최신 글"],
  ]) {
    await mkdir(path.join(base, dir), { recursive: true })
    await writeFile(
      path.join(base, dir, "index.md"),
      `---\ntitle: "${title}"\ndate: "x"\n---\n본문`,
      "utf8"
    )
  }
  const titles = await recentTitles(base, 10)
  assert.deepEqual(titles, ["최신 글", "오래된 글"])

  assert.deepEqual(await recentTitles(path.join(base, "nope"), 10), [])
})

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>feed</title>
<item>
<title>OpenAI, 새 모델 공개 &amp; 가격 인하 - 한국경제</title>
<link>https://news.google.com/rss/articles/CBMiabc123?oc=5</link>
<guid isPermaLink="false">CBMiabc123</guid>
<pubDate>Mon, 09 Jun 2026 01:23:45 GMT</pubDate>
<description>&lt;a href="x"&gt;OpenAI&lt;/a&gt;</description>
<source url="https://www.hankyung.com">한국경제</source>
</item>
<item>
<title>구글 제미나이 업데이트 - ZDNet Korea</title>
<link>https://news.google.com/rss/articles/CBMixyz789?oc=5</link>
<pubDate>Sun, 08 Jun 2026 22:00:00 GMT</pubDate>
<source url="https://zdnet.co.kr">ZDNet Korea</source>
</item>
<item>
<title>잘못된 항목(링크 없음)</title>
<link>not-a-url</link>
</item>
</channel></rss>`

test("parseRssItems: item 파싱(엔티티 디코드·source·pubDate), 잘못된 링크는 제외", () => {
  const items = parseRssItems(SAMPLE_RSS)
  assert.equal(items.length, 2)
  assert.equal(items[0].title, "OpenAI, 새 모델 공개 & 가격 인하 - 한국경제")
  assert.equal(
    items[0].url,
    "https://news.google.com/rss/articles/CBMiabc123?oc=5"
  )
  assert.equal(items[0].source, "한국경제")
  assert.ok(items[0].pubDate.startsWith("Mon, 09 Jun 2026"))
  assert.equal(items[1].source, "ZDNet Korea")
})

test("parseRssItems: 빈/비XML은 빈 배열", () => {
  assert.deepEqual(parseRssItems(""), [])
  assert.deepEqual(parseRssItems("<rss></rss>"), [])
})
