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

// 모델 텍스트에서 첫 번째 JSON 오브젝트를 추출·검증한다.
export function parseDigest(text) {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) {
    throw new Error("모델 응답에서 JSON 오브젝트를 찾지 못함")
  }
  const obj = JSON.parse(text.slice(start, end + 1))
  if (!obj || !Array.isArray(obj.items) || obj.items.length < 1) {
    throw new Error("digest에 items가 없음")
  }
  for (const it of obj.items) {
    if (!it || !it.title || !it.body || !/^https?:\/\//.test(it.url || "")) {
      throw new Error("digest 항목에 title/body/url(http) 누락")
    }
  }
  return { summary: typeof obj.summary === "string" ? obj.summary : "", items: obj.items }
}

// newsDir 하위 날짜 폴더의 index.md에서 title을 최신순으로 최대 limit개 수집.
export async function recentTitles(newsDir, limit = 10) {
  let entries
  try {
    entries = await readdir(newsDir, { withFileTypes: true })
  } catch {
    return []
  }
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse()
    .slice(0, limit)
  const titles = []
  for (const d of dirs) {
    try {
      const md = await readFile(path.join(newsDir, d, "index.md"), "utf8")
      const m = md.match(/^title:\s*"?(.+?)"?\s*$/m)
      if (m) titles.push(m[1])
    } catch {
      // 폴더에 index.md가 없으면 건너뜀
    }
  }
  return titles
}
