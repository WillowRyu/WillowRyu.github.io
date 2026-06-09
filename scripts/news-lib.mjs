import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

// KST(UTC+9) 기준 YYYY-MM-DD. date를 받아 순수 함수로 둔다.

export function kstDateString(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const d = String(kst.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// YAML 큰따옴표 문자열용: 따옴표 이스케이프 + 공백/개행 1줄화
function yamlInline(s) {
  return String(s).replace(/\s+/g, " ").trim().replace(/"/g, '\\"')
}

// items: [{ title, body, url }]
export function buildMarkdown({ date, summary, items }) {
  const front =
    `---\n` +
    `title: "AI 뉴스 다이제스트 — ${date}"\n` +
    `date: "${date}"\n` +
    `description: "${yamlInline(summary)}"\n` +
    `---`
  const body = items
    .map((it, i) => `### ${i + 1}. ${it.title.trim()}\n${it.body.trim()} ([출처](${it.url}))`)
    .join("\n\n")
  const footer = `*— 이 글은 Gemini가 자동 요약했습니다 · 사실은 출처를 확인하세요.*`
  return `${front}\n\n${body}\n\n---\n${footer}\n`
}
