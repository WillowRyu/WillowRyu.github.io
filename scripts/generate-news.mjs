import { GoogleGenAI } from "@google/genai"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  kstDateString,
  buildMarkdown,
  parseDigest,
  recentTitles,
  parseRssItems,
} from "./news-lib.mjs"

const NEWS_DIR = path.resolve("content/news")
const MODEL = "gemini-3.1-flash-lite"
const FEED_URL =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("AI when:7d") +
  "&hl=ko&gl=KR&ceid=KR:ko"

async function fetchArticles(limit = 20) {
  const res = await fetch(FEED_URL, {
    headers: { "user-agent": "Mozilla/5.0 (news-digest-bot)" },
  })
  if (!res.ok) throw new Error(`뉴스 피드 요청 실패: HTTP ${res.status}`)
  const xml = await res.text()
  const items = parseRssItems(xml)
  if (items.length === 0) throw new Error("뉴스 피드에서 기사를 찾지 못함")
  return items.slice(0, limit)
}

function buildPrompt(recent, articles) {
  const list = articles
    .map(
      (a, i) => `${i + 1}. ${a.title} | ${a.source} | ${a.pubDate} | ${a.url}`
    )
    .join("\n")
  const avoid = recent.length
    ? `\n\n최근 게시한 다이제스트 제목(중복 주제 금지):\n- ${recent.join(
        "\n- "
      )}`
    : ""
  return (
    `너는 한국어 IT 뉴스 큐레이터다. 아래는 최근 AI 관련 뉴스 기사 목록이다.\n` +
    `이 중 가장 중요하고 서로 다른 3~5개를 골라 한국어로 요약하라.\n\n` +
    `기사 목록:\n${list}\n\n` +
    `규칙:\n` +
    `- 주로 지난 3일 내 소식을 우선. 광고·중복·단순 시세 기사는 제외.\n` +
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
  const articles = await fetchArticles(20)

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
  console.log(`작성 완료: ${outFile} (항목 ${digest.items.length}개)`)
}

main().catch(e => {
  console.error("뉴스 생성 실패:", e.message)
  process.exit(1)
})
