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
