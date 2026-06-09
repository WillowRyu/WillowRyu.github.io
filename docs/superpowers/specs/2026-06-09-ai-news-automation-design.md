# AI 뉴스 자동 생성·발행 — 설계 문서

- **작성일**: 2026-06-09
- **대상 레포**: WillowRyu.github.io (Gatsby v5 블로그)
- **상태**: 설계 확정, 구현 대기
- **선행 작업**: [뉴스 섹션 신설](./2026-06-09-news-section-design.md) — 이 문서는 그 spec의 "향후: 뉴스 글 자동 생성 파이프라인"을 구현한다.

## 배경 / 목표

이미 만들어진 `/news` 섹션에, **3일마다 Gemini가 최신 AI 뉴스를 요약한 글을
자동으로 작성·발행**하는 파이프라인을 추가한다. 사람이 손대지 않아도 글이 쓰여서
배포까지 완료되는 것이 목표.

핵심 요구사항(사용자):
- "gemini api key로 한 3일마다 AI 관련 뉴스를 요약해서 글을 적도록."
- "GitHub 스케줄러로." → 별도 인프라 없이 GitHub Actions cron으로.
- 글 작성까지 **완전 자동** (수동 작성 불필요).

## 비목표 (Non-goals)

- **사람 검수 단계 없음** — PR/초안이 아니라 완전 자동 발행으로 결정.
- **단일 주제 심층 글 아님** — 핵심 3~5개를 모은 다이제스트 형식.
- 뉴스 전용 RSS / 페이지네이션 — 선행 spec대로 범위 밖.
- 다국어 — 한국어만.
- 자체 뉴스 DB·크롤러 구축 — 뉴스 수집은 Gemini 검색 그라운딩에 위임.

## 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| 뉴스 수집 | **Gemini + Google 검색 그라운딩** | API 키 하나로 최신 뉴스 검색·요약. 별도 RSS/뉴스 API 불필요 |
| 모델 | **`gemini-3.1-flash-lite`** | 무료 티어 ✅, 검색 그라운딩 지원 ✅ (근거: 비용 섹션) |
| 발행 방식 | **완전 자동** | 생성 → `develop` 커밋 → 기존 배포 워크플로가 자동 빌드·배포 |
| 글 형태 | **다이제스트** | 지난 3일 핵심 AI 뉴스 3~5개, 각 2~3문장 요약 + 출처 링크 |
| 주기 | **3일마다** | cron `0 0 */3 * *` (UTC 자정 = KST 09:00) + 수동 실행 버튼 |
| AI 고지 | **맨 아래 짧은 한 줄** | + 항목별 출처 링크로 정직성 확보 |
| 언어/톤 | 한국어, 블로그 기존 톤 | |
| 저장 위치 | `content/news/YYYY-MM-DD-ai-digest/index.md` | 선행 spec의 news 컬렉션 컨벤션 준수 |
| 푸시 인증 | 기존 `GH_PAT` 재사용 | PAT 푸시여야 기존 배포 워크플로가 트리거됨(아래 주의) |
| 커밋 author | 소유자 계정 `WillowRyu <stainer1004@gmail.com>` | 글이 본인 작성으로 표시 + 스케줄 keep-alive 확실 |

## 아키텍처

### 데이터 흐름

```
GitHub Actions: news-generate.yml
  trigger: schedule(cron, 3일마다) | workflow_dispatch(수동)
        │
        ├─ checkout develop  (token: GH_PAT)         ← 푸시가 배포를 트리거하려면 PAT 필요
        ├─ setup-node 20 + yarn install              ← @google/genai 포함
        ├─ node scripts/generate-news.mjs            ← env: GEMINI_API_KEY
        │     │
        │     ├─ 최근 news 글 제목 N개 읽기(중복 방지 컨텍스트)
        │     ├─ Gemini(gemini-3.1-flash-lite) + googleSearch 그라운딩 호출
        │     ├─ 그라운딩 인용(citations)에서 출처 URL 추출
        │     └─ content/news/<KST날짜>-ai-digest/index.md 작성
        │
        └─ 변경 있으면 git add/commit/push → develop
                        │
                        ▼
        기존 main.yml (on: push → develop) 가 감지
                        ▼
        gatsby build → master 배포  ✅
```

### 재귀 방지

`news-generate.yml`은 **`schedule` / `workflow_dispatch`로만** 트리거된다(push 트리거 없음).
따라서 develop에 커밋을 push해도 자기 자신은 재실행되지 않고, `main.yml`(push 트리거)만
실행되어 배포된다.

## 구현 상세 (파일별)

### 1. `.github/workflows/news-generate.yml` (신규)

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

> **주의(중요)**: checkout을 기본 `GITHUB_TOKEN`으로 하면 그 토큰으로 push된 커밋은
> 다른 워크플로(`main.yml`)를 트리거하지 않는다(무한루프 방지용 GitHub 정책). 반드시
> `GH_PAT`로 checkout해서 push해야 배포가 돈다.

### 2. `scripts/generate-news.mjs` (신규)

책임:
1. **중복 방지 컨텍스트 수집** — `content/news/*/index.md`에서 최근 N개(예: 10개) 글의
   `title`을 읽어 프롬프트에 "이 주제들과 겹치지 않게"로 전달.
2. **KST 날짜 계산** — 러너는 UTC이므로 `Asia/Seoul` 기준 `YYYY-MM-DD`를 구해 파일명·
   frontmatter `date`에 사용.
3. **Gemini 호출** — `@google/genai` SDK, 모델 `gemini-3.1-flash-lite`,
   `config.tools = [{ googleSearch: {} }]`. 프롬프트 요지:
   > 지난 3일간 가장 중요한 AI 뉴스 3~5개를 한국어로. 각 항목: 한 줄 제목 + 2~3문장 요약.
   > 각 항목에 출처 URL 포함. 아래 최근 게시 주제와 중복되는 내용은 제외.
4. **출처 URL 추출** — 응답의 `groundingMetadata`(groundingChunks/supports)에서 실제
   소스 URL을 받아, 모델이 본문에 넣은 링크의 신뢰 기준으로 사용.
5. **파일 작성** — `content/news/<KST날짜>-ai-digest/index.md` 생성(아래 형식).
6. **실패 처리** — API 오류·빈 결과면 파일을 만들지 않고 비정상 종료(워크플로가 커밋을
   생략). 다음 주기 또는 수동 실행에서 재시도.

> SDK 호출/그라운딩 툴 키(`googleSearch` vs `google_search`)·인용 메타데이터 경로의
> **정확한 시그니처는 구현 단계에서 현재 `@google/genai` 문서로 확정**한다. (설계 시점
> 확인: 모델 ID·그라운딩 지원·무료 티어는 공식 문서로 검증됨 — 비용 섹션 참조.)

### 3. 출력 파일 형식

```markdown
---
title: "AI 뉴스 다이제스트 — 2026-06-09"
date: "2026-06-09"
description: "<3일간 핵심을 한 줄로>"
---

### 1. <뉴스 제목>
2~3문장 요약. ([출처](https://...))

### 2. <뉴스 제목>
2~3문장 요약. ([출처](https://...))

…(3~5개)

---
*— 이 글은 Gemini가 자동 요약했습니다 · 사실은 출처를 확인하세요.*
```

- news 템플릿(`news-post.js`)·목록(`news.js`)은 frontmatter 중 **`title`/`date`/
  `description`만** 사용하므로 그 3개만 필수. `category`는 생략.
- 슬러그는 선행 spec의 `onCreateNode` 규칙에 따라 `/news/YYYY-MM-DD-ai-digest/`가 된다.

### 4. `package.json` (수정)

- `dependencies`에 `@google/genai` 추가(워크플로의 `yarn install --frozen-lockfile`이
  설치). `yarn.lock` 갱신 커밋 포함.

### 5. GitHub 설정 (레포 시크릿)

- **`GEMINI_API_KEY`** 신규 추가 — Google AI Studio에서 발급.
- **`GH_PAT`** — 기존 것 재사용(이미 `main.yml`에서 사용 중).

## 스케줄 & 안전장치

- **주기**: cron `0 0 */3 * *` → 매월 1·4·7…28·31일 09:00 KST. 월말(31→1, 28→31 등)에는
  간격이 약간 들쭉날쭉하지만 "대략 3일마다" 요구에 부합(허용). 정확한 72시간 간격이
  필요해지면 "매일 실행 + 상태파일로 건너뛰기"로 교체 가능(현재 범위 밖).
- **수동 실행**: `workflow_dispatch` 버튼으로 아무 때나 테스트·즉시 발행.
- **킬 스위치**:
  - 특정 글이 이상하면 해당 `content/news/<날짜>-ai-digest/` 폴더만 지워 커밋 → 사라짐.
  - 자동화 자체를 멈추려면 Actions에서 워크플로 비활성화.
- **정직성**: 맨 아래 한 줄 AI 고지 + 항목별 출처 링크.
- **부수효과(이점)**: 커밋 author를 소유자 계정(WillowRyu)으로 두고 PAT로 3일마다
  develop에 커밋하므로, "60일간 활동 없으면 스케줄 자동 중지" 정책도 자연히 예방됨.

## 비용 / 한도 (공식 문서로 검증, 2026-06)

| 항목 | 사실 | 우리 사용량 |
|------|------|-------------|
| `gemini-3.1-flash-lite` 무료 티어 | 입력/출력 토큰 "Free of charge" | 3일에 1회 호출 |
| 검색 그라운딩 무료 한도 | 월 5,000 prompt 무료(Gemini 3 계열 공유), 초과 시 $14/1,000 쿼리 | 월 약 10회 → **무료** |
| 무료 티어 레이트 리밋 | Flash 계열 분당 ~10건·일 1,500건 수준 | 3일에 1회 → 무여유 |

→ 실질 비용 **$0**. 단, (a) 무료 티어는 데이터가 구글 제품 개선에 쓰일 수 있음
(공개 뉴스 요약·게시 용도라 무관), (b) 무료 정책은 변동 가능(2026-04에 Pro 계열이 무료
티어에서 제외된 전례 — Flash-Lite는 유지). 모니터링 대상.

근거:
- 모델/무료 티어/그라운딩 지원: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- 그라운딩 동작/지원표: https://ai.google.dev/gemini-api/docs/google-search
- 무료 한도·그라운딩 가격: https://ai.google.dev/gemini-api/docs/pricing

## 엣지 케이스 / 에러 처리

- **API 실패/타임아웃**: 파일 미생성 → 워크플로 커밋 생략(빈 커밋·깨진 글 방지). 다음
  주기 또는 수동 실행에서 재시도.
- **중복 뉴스**: 최근 글 제목을 프롬프트에 넣어 회피. 그래도 겹치면 사소(허용).
- **빈 결과**: 모델이 유의미한 뉴스를 못 주면 파일 미생성·커밋 생략.
- **환각/오보**: 검색 그라운딩 + 출처 링크 + AI 고지 + 사람 킬 스위치로 완화. 완전 자동의
  의도된 트레이드오프.
- **타임존**: KST 기준 날짜로 파일명·`date` 생성(러너 UTC와 어긋나지 않게).
- **슬러그 충돌**: `-ai-digest` 접미사 + 날짜로 같은 날 수동 뉴스와도 충돌하지 않음.
- **재귀 트리거**: news 워크플로는 push로 트리거되지 않으므로 무한루프 없음.

## 검증 (이 레포는 별도 테스트 프레임워크 없음 — 수동 실행 + 빌드 확인)

1. (로컬) `GEMINI_API_KEY`를 넣고 `node scripts/generate-news.mjs` 실행 → `content/news/
   <날짜>-ai-digest/index.md`가 올바른 frontmatter·형식으로 생성되는지 확인.
2. (로컬) `yarn build`가 새 글 포함해 에러 없이 성공.
3. (CI) GitHub에서 `news-generate.yml`을 **수동 실행(workflow_dispatch)** → 글 커밋이
   develop에 올라가고, 이어서 `main.yml`이 돌아 master 배포까지 되는지 확인.
4. 배포 후 `/news`에 새 다이제스트가 보이고, 클릭 시 `/news/<날짜>-ai-digest/`가 렌더,
   항목별 출처 링크·맨 아래 AI 고지 한 줄이 보이는지 확인.
5. 일부러 잘못된 API 키로 실행 → 파일 미생성·커밋 생략(워크플로가 깨진 글을 올리지 않음)
   확인.

## 향후 (범위 밖)

- 정확한 72시간 간격(매일 실행 + 상태파일 스킵).
- 뉴스 카테고리·태그(예: 모델/연구/제품) 자동 분류.
- 생성 글 품질 로깅·요약 통계.
- 사람 검수 모드(PR 발행) 옵션 토글 — 신뢰가 쌓인 뒤 필요해지면.

## 구현 후 변경 (실측 반영, 2026-06-09)

설계 확정 후 구현·CI 검증에서 아래가 바뀌었다. **코드·git 이력이 최종 기준**이며, 위
"결정 사항"의 그라운딩 항목은 아래로 대체됨.

1. **뉴스 수집: Google 검색 그라운딩 → Google 뉴스 RSS + 무료 요약.**
   그라운딩은 무료(무결제) 티어에서 첫 호출부터 `429 RESOURCE_EXHAUSTED`였다(그라운딩
   쿼터가 결제 연결 Tier 1에서만 열림). 대신 `scripts/generate-news.mjs`가 Google 뉴스
   RSS(`q=AI when:7d`, ko/KR)에서 최근 기사를 가져와(`parseRssItems`) 그 목록을
   `gemini-3.1-flash-lite`의 **plain 호출**(tools 없음)로 골라 요약한다. 무료 티어로
   동작·결제 불필요·실비용 $0. 단, 출처 링크는 Google 뉴스 리다이렉트 URL(동작하지만 김),
   요약은 헤드라인 기반(본문 미수집).
2. **전제(필수): 기본 브랜치 = `develop`.**
   GitHub의 `schedule`·`workflow_dispatch`는 **기본 브랜치의 워크플로만** 실행한다. 배포
   결과 브랜치였던 `master` 대신 소스 브랜치 `develop`을 기본 브랜치로 변경(적용 완료).
   Pages는 `master`에서 계속 서빙되어 사이트·배포 영향 없음.
3. **E2E 검증 완료.** `workflow_dispatch`로 첫 다이제스트가 생성 → develop 커밋(author
   `WillowRyu`) → 배포 → `/news/2026-06-09-ai-digest/` 렌더까지 확인. 그라운딩 시도 시의
   실패 케이스에서 fail-safe(커밋 생략, 깨진 글 미발행)도 실측 확인.

### 향후 개선 후보(이번 변경에서 파생)
- 출처 URL 정리(리다이렉트 → 원문) 또는 publisher 직접 RSS 혼합으로 링크 품질 개선.
- 기사 본문 일부 수집 후 요약(헤드라인 기반 → 근거 기반)으로 요약 깊이 향상.
- 모델이 목록 밖 URL을 반환하지 않도록 화이트리스트 검증 추가.
