import { GoogleGenAI } from "@google/genai"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  kstDateString,
  buildMarkdown,
  parseDigest,
  recentTitles,
  parseFeed,
} from "./news-lib.mjs"

const NEWS_DIR = path.resolve("content/news")
const MODEL = "gemini-3.1-flash-lite"
const MAX_AGE_DAYS = 5
const PER_FEED = 12

const FEEDS = [
  { name: "AI타임스", url: "https://www.aitimes.com/rss/allArticle.xml" },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  },
  {
    name: "MIT Tech Review",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
  },
]

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { "user-agent": "Mozilla/5.0 (news-digest-bot)" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []
    return parseFeed(await res.text(), feed.name).slice(0, PER_FEED)
  } catch {
    return []
  }
}

function recentOnly(items) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return items.filter(it => {
    const t = Date.parse(it.pubDate)
    return Number.isNaN(t) || t >= cutoff
  })
}

function dedupe(items) {
  const seen = new Set()
  const out = []
  for (const it of items) {
    const key = it.url.split("?")[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

async function gatherArticles() {
  const lists = await Promise.all(FEEDS.map(fetchFeed))
  const merged = dedupe(recentOnly(lists.flat()))
  if (merged.length === 0)
    throw new Error("모든 뉴스 피드에서 기사를 가져오지 못함")
  return merged.slice(0, 30)
}

function buildPrompt(recent, articles) {
  const list = articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.source}] ${a.title} (${a.pubDate})\n   ${
          a.excerpt
        }\n   ${a.url}`
    )
    .join("\n")
  const avoid = recent.length
    ? `\n\n최근 게시한 다이제스트 제목(중복 주제 금지):\n- ${recent.join(
        "\n- "
      )}`
    : ""
  return (
    `너는 한국어 IT 뉴스 큐레이터다. 아래는 여러 매체의 최근 기사 목록(번호. [매체] 제목 (날짜) / 발췌 / URL)이다.\n` +
    `이 중 AI·인공지능과 직접 관련된 가장 중요하고 서로 다른 3~5개를 골라 한국어로 요약하라.\n\n` +
    `기사 목록:\n${list}\n\n` +
    `규칙:\n` +
    `- AI와 무관한 기사(일반 사회·지역·비AI 비즈니스 등)는 반드시 제외.\n` +
    `- 같은 사건을 다룬 기사는 하나로 합치고, 주로 지난 3일 내 소식을 우선.\n` +
    `- 품질을 해치지 않는 선에서 여러 매체에 골고루 분산. 한국 매체(AI타임스)에 의미 있는 AI 소식이 있으면 포함.\n` +
    `- 요약은 제공된 '발췌' 내용에 근거해 2~3문장으로 작성(추측 금지).\n` +
    `- 각 항목 url은 반드시 위 목록의 URL을 그대로 사용(새 URL 생성 금지).\n` +
    `- 반드시 아래 JSON "한 개"만 출력(코드펜스·다른 설명 금지):\n` +
    `{"summary":"3일간 핵심을 한 문장","items":[{"title":"한 줄 제목","body":"2~3문장 한국어 요약","url":"목록의 기사 URL"}]}` +
    avoid
  )
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("환경변수 GEMINI_API_KEY 미설정")

  const today = kstDateString(new Date())
  const recent = await recentTitles(NEWS_DIR, 10)
  const articles = await gatherArticles()

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(recent, articles),
    config: { temperature: 0.4 },
  })

  const text = response.text
  if (!text) throw new Error("모델이 텍스트를 반환하지 않음 (필터/빈 응답)")
  const digest = parseDigest(text)
  const md = buildMarkdown({
    date: today,
    summary: digest.summary,
    items: digest.items,
  })

  const outDir = path.join(NEWS_DIR, `${today}-ai-digest`)
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, "index.md")
  await writeFile(outFile, md, "utf8")
  console.log(
    `작성 완료: ${outFile} (항목 ${digest.items.length}개, 후보 ${articles.length}건)`
  )
}

main().catch(e => {
  console.error("뉴스 생성 실패:", e.message)
  process.exit(1)
})
