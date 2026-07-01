import { test } from "node:test"
import assert from "node:assert/strict"
import {
  kstDateString,
  buildMarkdown,
  parseDigest,
  recentTitles,
  parseFeed,
  generateDigestWithRetry,
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

const goodText = JSON.stringify({ summary: "s", items: [okItem] })

test("generateDigestWithRetry: 첫 시도가 비JSON이면 재시도해서 성공", async () => {
  const outputs = ["죄송하지만 요약할 수 없습니다.", goodText]
  let calls = 0
  const retries = []
  const digest = await generateDigestWithRetry(() => outputs[calls++], {
    tries: 3,
    onRetry: (a, t, e) => retries.push([a, e.message]),
  })
  assert.equal(calls, 2)
  assert.equal(digest.items.length, 1)
  assert.equal(retries.length, 1) // 1회차만 실패 로그
  assert.match(retries[0][1], /JSON/)
})

test("generateDigestWithRetry: 빈 응답도 재시도 대상", async () => {
  const outputs = ["", null, goodText]
  let calls = 0
  const digest = await generateDigestWithRetry(() => outputs[calls++], {
    tries: 3,
  })
  assert.equal(calls, 3)
  assert.equal(digest.summary, "s")
})

test("generateDigestWithRetry: 전부 실패하면 마지막 오류를 던짐", async () => {
  let calls = 0
  await assert.rejects(
    generateDigestWithRetry(
      () => {
        calls++
        return "JSON 아님"
      },
      { tries: 3 }
    ),
    /JSON/
  )
  assert.equal(calls, 3) // 정확히 tries회 시도
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

test("parseFeed(RSS): item 파싱 — 엔티티/CDATA·excerpt·source, 비http 링크 제외", () => {
  const rss = `<rss><channel>
<item><title>OpenAI 새 모델 &amp; 가격 인하</title>
<link>https://techcrunch.com/2026/06/09/openai-new/</link>
<pubDate>Tue, 09 Jun 2026 01:00:00 +0000</pubDate>
<description><![CDATA[<p>OpenAI <b>launched</b> a new model.</p>]]></description></item>
<item><title>링크 없음</title><link>not-a-url</link></item>
</channel></rss>`
  const items = parseFeed(rss, "TechCrunch")
  assert.equal(items.length, 1)
  assert.equal(items[0].title, "OpenAI 새 모델 & 가격 인하")
  assert.equal(items[0].url, "https://techcrunch.com/2026/06/09/openai-new/")
  assert.equal(items[0].source, "TechCrunch")
  assert.ok(items[0].pubDate.startsWith("Tue, 09 Jun 2026"))
  assert.equal(items[0].excerpt, "OpenAI launched a new model.")
})

test("parseFeed(Atom): entry 파싱 — link rel=alternate href·summary", () => {
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Apple AI update</title>
<link rel="edit" href="https://example.com/edit"/>
<link rel="alternate" href="https://www.theverge.com/tech/123/apple-ai"/>
<published>2026-06-08T18:40:37-04:00</published>
<summary>Apple is using AI to fix Safari extensions.</summary></entry>
</feed>`
  const items = parseFeed(atom, "The Verge")
  assert.equal(items.length, 1)
  assert.equal(items[0].url, "https://www.theverge.com/tech/123/apple-ai")
  assert.equal(items[0].source, "The Verge")
  assert.equal(items[0].excerpt, "Apple is using AI to fix Safari extensions.")
})

test("parseFeed(Atom): href가 rel보다 먼저·작은따옴표여도 alternate 링크 추출", () => {
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>t</title>
<link rel="self" href="https://site.com/self"/>
<link href='https://site.com/a' rel='alternate'/>
<summary>x</summary></entry>
</feed>`
  const items = parseFeed(atom, "S")
  assert.equal(items.length, 1)
  assert.equal(items[0].url, "https://site.com/a")
})

test("parseFeed: excerpt는 300자로 절단, 빈 입력은 빈 배열", () => {
  const long = "x".repeat(500)
  const rss = `<rss><channel><item><title>t</title><link>https://e.com/a</link><description>${long}</description></item></channel></rss>`
  assert.equal(parseFeed(rss, "S")[0].excerpt.length, 300)
  assert.deepEqual(parseFeed("", "S"), [])
})
