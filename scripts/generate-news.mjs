import { GoogleGenAI } from "@google/genai"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  kstDateString,
  buildMarkdown,
  parseDigest,
  recentTitles,
} from "./news-lib.mjs"

const NEWS_DIR = path.resolve("content/news")
const MODEL = "gemini-3.1-flash-lite"

function buildPrompt(recent) {
  const avoid = recent.length
    ? `\n\n최근 게시한 다이제스트 제목(이 주제들과 중복 금지):\n- ${recent.join(
        "\n- "
      )}`
    : ""
  return (
    `너는 한국어 IT 뉴스 큐레이터다. Google 검색을 사용해 지난 3일간 가장 중요한 ` +
    `AI 관련 뉴스 3~5개를 찾아 한국어로 요약하라.\n` +
    `반드시 아래 JSON "한 개"만 출력하라(코드펜스·다른 설명 금지):\n` +
    `{"summary":"3일간 핵심을 한 문장","items":[{"title":"한 줄 제목","body":"2~3문장 한국어 요약","url":"기사 원문 URL"}]}\n` +
    `- items는 3~5개, url은 실제 기사 원문 링크(http/https).` +
    avoid
  )
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("환경변수 GEMINI_API_KEY 미설정")

  const today = kstDateString(new Date())
  const recent = await recentTitles(NEWS_DIR, 10)

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(recent),
    config: { tools: [{ googleSearch: {} }], temperature: 0.4 },
  })

  const digest = parseDigest(response.text)
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
