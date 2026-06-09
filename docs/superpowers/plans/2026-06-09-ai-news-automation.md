# AI 뉴스 자동 생성·발행 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3일마다 GitHub Actions가 Gemini(검색 그라운딩)로 최신 AI 뉴스를 요약한 다이제스트 글을 자동 생성·커밋하고, 기존 배포 워크플로가 이를 발행한다.

**Architecture:** 순수 헬퍼(날짜·마크다운·파싱·최근제목)는 `scripts/news-lib.mjs`에 두고 Node 20 내장 `node:test`로 TDD. 네트워크/오케스트레이션은 `scripts/generate-news.mjs`(엔트리)에서 `@google/genai`로 Gemini를 호출해 파일을 쓴다. `.github/workflows/news-generate.yml`이 cron/수동으로 스크립트를 돌려 `develop`에 커밋하면, 기존 `main.yml`(push→develop)이 빌드·배포한다.

**Tech Stack:** Node 20 (ESM), `@google/genai`, `node:test`(내장), GitHub Actions, Gatsby v5(기존), yarn.

**Spec:** `docs/superpowers/specs/2026-06-09-ai-news-automation-design.md`

**테스트 현실:** 이 레포는 별도 테스트 러너가 없다. 순수 함수는 **Node 내장 `node --test`**로 검증한다(새 의존성 0). Gemini 호출·워크플로는 단위테스트가 불가하므로 **실제 실행/`workflow_dispatch`**로 통합 검증한다.

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|------|------|-----------|
| `scripts/news-lib.mjs` | 순수 헬퍼: `kstDateString`, `buildMarkdown`, `parseDigest`, `recentTitles` | 신규 |
| `scripts/news-lib.test.mjs` | 위 헬퍼들의 `node:test` 단위테스트 | 신규 |
| `scripts/generate-news.mjs` | 엔트리: env 로드 → 최근 제목 수집 → Gemini 그라운딩 호출 → 파싱 → 파일 쓰기 | 신규 |
| `.github/workflows/news-generate.yml` | cron(3일)·수동 트리거 → 스크립트 실행 → develop 커밋·push | 신규 |
| `package.json` / `yarn.lock` | `@google/genai` 의존성 + `test:news` 스크립트 | 수정 |

순수 로직(테스트 대상)과 부수효과(네트워크·파일·env)를 파일로 분리해, 테스트 가능한 코어를 격리한다.

---

## Task 1: 의존성 추가 & 스크립트 디렉터리 스캐폴드

**Files:**
- Modify: `package.json` (dependencies, scripts)
- Modify: `yarn.lock` (자동 갱신)

- [ ] **Step 1: `@google/genai` 설치**

Run:
```bash
yarn add @google/genai
```
Expected: `package.json`의 `dependencies`에 `@google/genai` 추가, `yarn.lock` 갱신.

- [ ] **Step 2: `test:news` 스크립트 추가**

`package.json`의 `scripts`에 한 줄 추가(기존 `"test": ...` 아래):
```json
    "test:news": "node --test scripts/",
```

- [ ] **Step 3: 설치 확인 (SDK export 점검)**

Run:
```bash
node -e "import('@google/genai').then(m => console.log('exports:', Object.keys(m).join(', ')))"
```
Expected: 출력에 `GoogleGenAI` 포함. (다음 태스크에서 사용할 클래스명 확인용.)

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock
git commit -m "chore(news): @google/genai 추가 및 test:news 스크립트"
```

---

## Task 2: `kstDateString` — KST 날짜 문자열 (TDD)

UTC 러너에서 `Asia/Seoul` 기준 `YYYY-MM-DD`를 구한다. `Date`를 인자로 받아 순수 함수로 만든다(현재시각 의존 제거 → 테스트 가능).

**Files:**
- Create: `scripts/news-lib.test.mjs`
- Create: `scripts/news-lib.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/news-lib.test.mjs`:
```js
import { test } from "node:test"
import assert from "node:assert/strict"
import { kstDateString } from "./news-lib.mjs"

test("kstDateString: UTC 자정 → KST 같은 날(09:00)", () => {
  assert.equal(kstDateString(new Date("2026-06-09T00:00:00Z")), "2026-06-09")
})

test("kstDateString: 늦은 UTC는 KST 다음 날로 넘어감", () => {
  // 2026-06-08T16:00Z == 2026-06-09T01:00 KST
  assert.equal(kstDateString(new Date("2026-06-08T16:00:00Z")), "2026-06-09")
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: FAIL — `news-lib.mjs`가 없거나 `kstDateString` 미정의로 import 에러.

- [ ] **Step 3: 최소 구현**

`scripts/news-lib.mjs`:
```js
// KST(UTC+9) 기준 YYYY-MM-DD. date를 받아 순수 함수로 둔다.
export function kstDateString(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const d = String(kst.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/news-lib.mjs scripts/news-lib.test.mjs
git commit -m "feat(news): kstDateString 헬퍼 (TDD)"
```

---

## Task 3: `buildMarkdown` — 다이제스트 마크다운 생성 (TDD)

스펙의 출력 형식(frontmatter + 번호 항목 + 출처 링크 + 하단 AI 고지 한 줄)을 정확히 만든다. `description`은 YAML 안전을 위해 큰따옴표 이스케이프·개행 제거.

**Files:**
- Modify: `scripts/news-lib.test.mjs`
- Modify: `scripts/news-lib.mjs`

- [ ] **Step 1: 실패하는 테스트 추가**

`scripts/news-lib.test.mjs` 하단에 추가:
```js
import { buildMarkdown } from "./news-lib.mjs"

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
  // description: 큰따옴표 이스케이프 + 개행 1줄화
  assert.match(md, /description: "오늘의 \\"핵심\\" 요약"/)
  assert.match(md, /### 1\. 모델 X 공개\n어떤 회사가 X를 냈다\. \(\[출처\]\(https:\/\/ex\.com\/x\)\)/)
  assert.match(md, /### 2\. 연구 Y/)
  assert.ok(md.includes("이 글은 Gemini가 자동 요약했습니다"))
  assert.ok(md.endsWith("\n"))
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: FAIL — `buildMarkdown` 미정의.

- [ ] **Step 3: 구현 추가**

`scripts/news-lib.mjs`에 추가:
```js
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/news-lib.mjs scripts/news-lib.test.mjs
git commit -m "feat(news): buildMarkdown 다이제스트 렌더러 (TDD)"
```

---

## Task 4: `parseDigest` — 모델 JSON 응답 파싱 (TDD)

그라운딩(tools) 사용 시 구조화출력(responseSchema)을 함께 못 쓰는 경우가 있어, **모델이 텍스트로 낸 JSON을 방어적으로 추출**한다(코드펜스·주변 산문 허용). 항목 검증(제목/본문/URL) 포함.

**Files:**
- Modify: `scripts/news-lib.test.mjs`
- Modify: `scripts/news-lib.mjs`

- [ ] **Step 1: 실패하는 테스트 추가**

`scripts/news-lib.test.mjs` 하단에 추가:
```js
import { parseDigest } from "./news-lib.mjs"

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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: FAIL — `parseDigest` 미정의.

- [ ] **Step 3: 구현 추가**

`scripts/news-lib.mjs`에 추가:
```js
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/news-lib.mjs scripts/news-lib.test.mjs
git commit -m "feat(news): parseDigest 모델 응답 파서 (TDD)"
```

---

## Task 5: `recentTitles` — 최근 다이제스트 제목 수집 (TDD)

중복 주제 방지용으로 `content/news/*/index.md`의 최근 N개 `title`을 읽는다. 디렉터리 없으면 `[]`.

**Files:**
- Modify: `scripts/news-lib.test.mjs`
- Modify: `scripts/news-lib.mjs`

- [ ] **Step 1: 실패하는 테스트 추가**

`scripts/news-lib.test.mjs` 하단에 추가:
```js
import { recentTitles } from "./news-lib.mjs"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: FAIL — `recentTitles` 미정의.

- [ ] **Step 3: 구현 추가**

`scripts/news-lib.mjs` 상단에 import 추가:
```js
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
```
그리고 함수 추가:
```js
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test scripts/news-lib.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/news-lib.mjs scripts/news-lib.test.mjs
git commit -m "feat(news): recentTitles 최근 제목 수집 (TDD)"
```

---

## Task 6: `generate-news.mjs` — Gemini 그라운딩 호출 + 엔트리 (통합 검증)

순수 헬퍼를 조립해 실제 Gemini를 호출하고 파일을 쓴다. 네트워크 의존이라 단위테스트 대신 실제 API 키로 1회 실행해 검증한다.

**Files:**
- Create: `scripts/generate-news.mjs`

- [ ] **Step 1: `@google/genai` 그라운딩 호출 시그니처 확정**

구현 전 현재 SDK 사용법을 확인한다(버전에 따라 키 이름이 다를 수 있음):
- 확인 대상: ① 클래스 `GoogleGenAI` 생성자(`{ apiKey }`), ② `ai.models.generateContent({ model, contents, config })`, ③ 그라운딩 툴 키 `tools: [{ googleSearch: {} }]`, ④ 응답 텍스트 접근 `response.text`.
- 방법: context7로 `@google/genai` 문서 조회하거나, 설치된 패키지 README 확인:
  ```bash
  node -e "import('@google/genai').then(m=>console.log(Object.keys(m)))"   # GoogleGenAI 존재 확인
  ```
  그리고 공식 가이드 `https://ai.google.dev/gemini-api/docs/google-search`(그라운딩)·SDK README로 위 4개를 확정.
- 아래 Step 2 코드에서 시그니처가 다르면 그 부분만 확정값으로 교체한다(구조는 동일).

- [ ] **Step 2: 엔트리 구현**

`scripts/generate-news.mjs`:
```js
import { GoogleGenAI } from "@google/genai"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { kstDateString, buildMarkdown, parseDigest, recentTitles } from "./news-lib.mjs"

const NEWS_DIR = path.resolve("content/news")
const MODEL = "gemini-3.1-flash-lite"

function buildPrompt(recent) {
  const avoid = recent.length
    ? `\n\n최근 게시한 다이제스트 제목(이 주제들과 중복 금지):\n- ${recent.join("\n- ")}`
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
  const md = buildMarkdown({ date: today, summary: digest.summary, items: digest.items })

  const outDir = path.join(NEWS_DIR, `${today}-ai-digest`)
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, "index.md")
  await writeFile(outFile, md, "utf8")
  console.log(`작성 완료: ${outFile} (항목 ${digest.items.length}개)`)
}

main().catch((e) => {
  console.error("뉴스 생성 실패:", e.message)
  process.exit(1)
})
```

- [ ] **Step 3: 실제 API 키로 통합 실행**

Run (본인 키 사용):
```bash
GEMINI_API_KEY=<발급받은_키> node scripts/generate-news.mjs
```
Expected: `작성 완료: .../content/news/<오늘날짜>-ai-digest/index.md (항목 N개)` 출력, 해당 파일 생성.

- [ ] **Step 4: 산출물 형식 확인**

Run: `cat content/news/$(node -e "import('./scripts/news-lib.mjs').then(m=>process.stdout.write(m.kstDateString(new Date())))")-ai-digest/index.md`
Expected: frontmatter(`title`/`date`/`description`) + `### 1.`~ 번호 항목 + 항목별 `([출처](http...))` + 하단 `*— 이 글은 Gemini가 자동 요약했습니다 …*`.

- [ ] **Step 5: 빌드로 렌더 확인**

Run: `yarn build`
Expected: 에러 없이 빌드 성공(새 뉴스 글 포함).

- [ ] **Step 6: 실패 경로 확인 (깨진 글 방지)**

Run: `GEMINI_API_KEY=invalid node scripts/generate-news.mjs; echo "exit=$?"`
Expected: `뉴스 생성 실패: ...` 출력, `exit=1`(0 아님). 파일 미생성.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-news.mjs
git commit -m "feat(news): generate-news 엔트리 (Gemini 그라운딩 호출)"
```

> 참고: Step 3에서 만들어진 테스트용 글은 그대로 커밋해도 되고(첫 발행), 지우고 워크플로로 만들고 싶으면 `git rm -r content/news/<날짜>-ai-digest` 후 별도 커밋.

---

## Task 7: `news-generate.yml` — 스케줄 워크플로 (신규)

**Files:**
- Create: `.github/workflows/news-generate.yml`

- [ ] **Step 1: 워크플로 작성**

`.github/workflows/news-generate.yml`:
```yaml
name: AI News Generate
on:
  schedule:
    - cron: "0 0 */3 * *"   # UTC 자정 = KST 09:00, 매월 1·4·7…일
  workflow_dispatch:         # 수동 실행(테스트/즉시 발행)
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: develop
          token: ${{ secrets.GH_PAT }}   # GITHUB_TOKEN이면 배포 워크플로가 안 돈다
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: yarn install --frozen-lockfile
      - run: node scripts/generate-news.mjs
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      - name: Commit & push if changed
        run: |
          git config user.name "WillowRyu"
          git config user.email "stainer1004@gmail.com"
          if [ -n "$(git status --porcelain content/news)" ]; then
            git add content/news
            git commit -m "feat(news): AI 뉴스 다이제스트 자동 생성"
            git push origin develop
          else
            echo "변경 없음 — 커밋 생략"
          fi
```

- [ ] **Step 2: YAML 유효성 확인**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/news-generate.yml','utf8');if(!/workflow_dispatch/.test(s)||!/cron: \"0 0 \*\/3/.test(s))throw new Error('워크플로 내용 누락');console.log('OK')"`
Expected: `OK`. (cron·수동 트리거 라인 존재 확인. 정밀 검증은 Task 8의 실제 디스패치에서.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/news-generate.yml
git commit -m "ci(news): 3일마다 AI 뉴스 자동 생성 워크플로 추가"
```

---

## Task 8: 시크릿 등록 & 엔드투엔드 검증 (사용자 수동 + 관찰)

> 이 태스크는 **사용자 직접 작업**(시크릿 등록)과 GitHub Actions 관찰을 포함한다.

- [ ] **Step 1: `GEMINI_API_KEY` 시크릿 등록 (사용자)**

GitHub 레포 → Settings → Secrets and variables → Actions → New repository secret:
- Name: `GEMINI_API_KEY`
- Value: Google AI Studio에서 발급한 키
(기존 `GH_PAT`는 그대로 둔다.)

- [ ] **Step 2: 변경사항을 원격 develop에 push**

Run:
```bash
git push origin develop
```
Expected: Task 1~7 커밋이 원격 `develop`에 올라가고, 기존 `main.yml`이 빌드·배포(코드 변경 반영).

- [ ] **Step 3: 워크플로 수동 실행 (workflow_dispatch)**

GitHub 레포 → Actions → "AI News Generate" → Run workflow (branch: develop).
Expected:
- 잡 성공.
- `develop`에 `WillowRyu`가 author인 "feat(news): AI 뉴스 다이제스트 자동 생성" 커밋 생성.
- 그 push가 `main.yml`을 트리거 → 빌드·배포.

- [ ] **Step 4: 발행 결과 확인**

배포 완료 후 `https://willowryu.github.io/news/` 접속:
Expected:
- 새 다이제스트가 목록 최상단.
- 클릭 시 `/news/<날짜>-ai-digest/` 렌더, 항목별 출처 링크 동작, 하단 AI 고지 한 줄 표시.

- [ ] **Step 5: 빈/실패 경로 무해성 확인 (선택)**

(이미 글이 있어 변경이 없으면) 워크플로 재실행 시 "변경 없음 — 커밋 생략" 로그로 빈 커밋이 생기지 않음을 확인.

- [ ] **Step 6: 마무리**

3일 주기 cron이 자동 동작하도록 둔다. 이상한 글이 올라오면 해당 `content/news/<날짜>-ai-digest/` 폴더를 지워 커밋(킬 스위치). 자동화를 멈추려면 Actions에서 워크플로 비활성화.

---

## Self-Review

**1. 스펙 커버리지**
- 뉴스 수집(Gemini 그라운딩) → Task 6. ✅
- 모델 `gemini-3.1-flash-lite` → Task 6 `MODEL`. ✅
- 완전 자동 발행(develop 커밋→기존 배포) → Task 7 + Task 8. ✅
- 다이제스트 형식(3~5개, 요약, 출처) → Task 3 `buildMarkdown` + Task 6 프롬프트/`parseDigest`. ✅
- 3일 주기 cron + 수동 → Task 7. ✅
- AI 고지 한 줄 → Task 3 footer. ✅
- 저장 위치 `content/news/<날짜>-ai-digest/index.md` → Task 6. ✅
- 푸시 인증 GH_PAT + 커밋 author=WillowRyu → Task 7. ✅
- 중복 방지(최근 제목) → Task 5 + Task 6 프롬프트. ✅
- KST 날짜 → Task 2. ✅
- 비용/무료티어 → 코드 변경 아님(런타임 사용량). 검증 불필요.
- 엣지(API 실패 시 미커밋) → Task 6 Step 6 + Task 7 조건부 커밋. ✅

**2. 플레이스홀더 스캔:** "TBD/TODO/적절히 처리" 없음. 모든 코드 스텝에 완전한 코드 포함. (Task 6 Step 1은 "구현 전 SDK 시그니처 확정"이라는 구체적 검증 절차이며 플레이스홀더가 아님.)

**3. 타입/명칭 일관성:** `kstDateString`/`buildMarkdown({date,summary,items})`/`parseDigest`→`{summary,items}`/`recentTitles(dir,limit)` — Task 2~5 정의와 Task 6 사용처가 일치. 항목 shape `{title,body,url}`도 `parseDigest` 검증·`buildMarkdown` 렌더·프롬프트 JSON에서 동일.
