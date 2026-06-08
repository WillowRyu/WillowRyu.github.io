# 뉴스 섹션 신설 — 설계 문서

- **작성일**: 2026-06-09
- **대상 레포**: WillowRyu.github.io (Gatsby v5 블로그)
- **상태**: 설계 확정, 구현 대기

## 배경 / 목표

매일 AI 뉴스를 요약한 글을 올릴 **뉴스 섹션**을 신설한다. 기존 블로그
글(기술·잡담·후기)과는 **완전히 분리**하여, 매일 쌓이는 뉴스가 기존 글 피드를
덮어버리지 않게 한다.

핵심 요구사항: "기존 메뉴(전체/기술/잡담/후기)와 별개로 넣고 싶다."

## 비목표 (Non-goals)

- 뉴스 글 자동 생성/스크래핑 — 글은 수동으로 작성한다.
- 뉴스 페이지 페이지네이션 — 분량이 커지기 전까지는 전체 나열(YAGNI).
- 뉴스 RSS 피드 — 만들지 않는다(필요해지면 추후).
- 뉴스 글 댓글 기능.

## 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| 분리 방식 | 별도 페이지 `/news` | 홈과 완전 분리, 전역 헤더 링크로 진입 |
| 저장 위치 | `content/news/YYYY-MM-DD/index.md` | 별도 폴더 + 별도 filesystem 소스(`name: "news"`) |
| 파일 구조 | 날짜 폴더 + `index.md` | 블로그 컨벤션과 통일, 추후 이미지 첨부 가능 |
| 슬러그 | `/news/YYYY-MM-DD/` | `/news` 접두사로 블로그 슬러그와 충돌 방지 |
| 상세 페이지 | 뉴스 전용 경량 템플릿 `news-post.js` | Disqus 댓글·이전/다음 네비 제거, SEO·고유 URL 유지 |
| 네비게이션 | 전역 헤더에 "뉴스" 링크 | 기존 필터 버튼 메뉴와는 별개의 전역 링크 |
| 홈 필터링 | 홈/전체 쿼리에 `collection=blog` 필터 | 뉴스가 홈·전체 목록에 절대 안 섞임 |
| RSS | 메인 피드=블로그만, 뉴스=RSS 없음 | 메인 `/rss.xml`에 `collection=blog` 필터 추가 |

## 아키텍처

### 컬렉션 구분 메커니즘

Gatsby는 `gatsby-source-filesystem`의 소스가 달라도 모든 마크다운을 동일한
`MarkdownRemark` 노드로 변환한다. 따라서 폴더만으로는 쿼리에서 구분되지 않는다.
이를 해결하기 위해 **`collection` 노드 필드**를 도입한다.

- `onCreateNode`에서 마크다운 노드의 부모 File 노드(`getNode(node.parent)`)의
  `sourceInstanceName`(`"blog"` 또는 `"news"`)을 읽어 `fields.collection`으로 저장.
- 이후 모든 GraphQL 쿼리는 `filter: { fields: { collection: { eq: "blog" | "news" } } }`로
  컬렉션을 분리한다.

이 단일 필드가 홈·뉴스 페이지·RSS·페이지 생성의 분리 기준이 된다.

### 데이터 흐름

```
content/blog/<date>/index.md  ──source(blog)──┐
                                              ├─► MarkdownRemark + fields.collection
content/news/<date>/index.md  ──source(news)──┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────┐
        │ collection=blog                      │ collection=news                  │
        ▼                                      ▼                                  ▼
  index.js (홈, 필터 버튼)            news.js (/news 목록)              gatsby-node createPages
  blog-post.js 상세 (댓글·네비)       news-post.js 상세 (경량)          → 슬러그/템플릿 분기
  /rss.xml (블로그만)                 (RSS 없음)
```

## 구현 상세 (파일별)

### 1. `gatsby-config.js`
- `gatsby-source-filesystem` 소스 추가:
  ```js
  { resolve: `gatsby-source-filesystem`,
    options: { path: `${__dirname}/content/news`, name: `news` } }
  ```
- RSS 피드 쿼리(`gatsby-plugin-feed`)의 `allMarkdownRemark`에
  `filter: { fields: { collection: { eq: "blog" } } }` 추가, 쿼리에 `fields { collection }` 포함.

### 2. `gatsby-node.js`
- **`onCreateNode`**: 기존 slug 생성에 더해
  - 부모 File 노드의 `sourceInstanceName`을 `fields.collection`으로 저장.
  - `collection === "news"`이면 slug 앞에 `/news`를 붙여 `fields.slug`를 `/news/<date>/`로 설정.
- **`createPages`**:
  - 쿼리에 `fields { slug collection }` 추가.
  - `collection === "blog"`인 글 → `blog-post.js`, 이전/다음은 **블로그 글 목록 내에서만** 계산.
  - `collection === "news"`인 글 → `news-post.js`, `context: { slug }`만 전달(이전/다음 없음).

### 3. `src/templates/news-post.js` (신규)
- `blog-post.js`를 복제 후:
  - `DiscussionEmbed`(Disqus) 제거.
  - 이전/다음 글 `<nav>` 제거.
  - 본문 하단에 `<Link to="/news/">← 뉴스 목록으로</Link>` 추가.
  - `SEO`(title/description), 제목, 날짜, `dangerouslySetInnerHTML` 본문, **`Bio` 푸터는 유지**
    (제거 대상은 Disqus·이전/다음 네비만).
- `pageQuery`는 `BlogPostBySlug`와 동일하게 `markdownRemark(fields: { slug: { eq: $slug } })`
  기반(title, date, html, excerpt). previous/next는 `pageContext`에서 받지 않음.

### 4. `src/pages/news.js` (신규)
- `Layout`으로 감싸고 상단에 "뉴스" 제목.
- `pageQuery`: `allMarkdownRemark(filter: { fields: { collection: { eq: "news" } } }, sort: { frontmatter: { date: DESC } })`.
- 각 글을 기존 `.link-post` / `.link-title` / `.link-desc` 스타일로 나열, `node.fields.slug`(=`/news/<date>/`)로 링크.
- 카테고리 필터 버튼 없음(전부 뉴스).
- **빈 상태 처리**: 글이 0개면 "아직 뉴스가 없습니다" 안내 문구 표시.

### 5. `src/pages/index.js` (수정)
- `pageQuery`의 `allMarkdownRemark`에 `filter: { fields: { collection: { eq: "blog" } } }` 추가.
- `CATEGORIES` 배열·필터 UI·`TAG_CLASS`는 변경 없음.

### 6. `src/components/layout.js` (수정)
- 헤더(title 아래)에 전역 네비 추가: `<nav className="site-nav"><Link to="/news">뉴스</Link></nav>`.
- 모든 페이지에 노출. 사이트 제목은 기존대로 홈(`/`) 링크.

### 7. `src/global-css.css` (수정)
- `.site-nav` 최소 스타일 추가(기존 `--secondary`/`--pblue` 토큰 재사용, 다크 테마 일관성 유지).

### 8. `content/news/` 디렉터리 시드
- `gatsby-source-filesystem`은 대상 경로가 없으면 경고하므로 디렉터리를 생성한다.
- 빌드·동작 확인을 위해 예시 뉴스 글 1개(`content/news/2026-06-09/index.md`)를 시드.

## 엣지 케이스 / 에러 처리

- **슬러그 충돌**: 같은 날짜의 블로그/뉴스 글이 둘 다 있어도 `/2026-06-09/` vs
  `/news/2026-06-09/`로 분리되어 충돌하지 않음.
- **뉴스 0개**: `/news` 페이지가 빈 목록 안내를 렌더(빌드는 성공).
- **홈 누수 방지**: 홈 쿼리 필터가 없으면 뉴스가 `allMarkdownRemark`에 섞여 들어오므로,
  `collection=blog` 필터는 필수.
- **블로그 이전/다음 누수**: `createPages`에서 prev/next를 블로그 목록 내에서만 계산해야
  뉴스 글이 블로그 네비에 끼지 않음.

## 검증 (이 레포는 별도 테스트 프레임워크 없음 — 빌드 + 수동 확인)

1. `gatsby build`(또는 `yarn build`)가 에러 없이 성공.
2. 홈(`/`): 뉴스 글이 **전체 포함 어떤 필터에도** 안 보임.
3. `/news`: 뉴스 글이 날짜 내림차순으로 보임.
4. 뉴스 글 클릭 → `/news/<date>/` 렌더, 댓글·이전/다음 네비 없음, "뉴스 목록으로" 링크 동작.
5. 블로그 글 상세의 이전/다음이 **블로그 글끼리만** 연결(뉴스 미포함).
6. `/rss.xml`에 뉴스 글이 **없음**.
7. 전역 헤더 "뉴스" 링크가 홈·블로그 글·뉴스 페이지 어디서든 동작.

## 일일 뉴스 작성 워크플로우

1. `content/news/YYYY-MM-DD/index.md` 생성.
2. frontmatter 작성:
   ```yaml
   ---
   title: "YYYY-MM-DD AI 뉴스"
   date: "YYYY-MM-DD"
   description: "그날의 핵심 요약 한 줄"
   ---
   ```
3. 본문에 요약 항목 작성(자유 형식 — 마크다운 불릿/소제목 등).
4. 커밋 & 배포.

## 향후 (범위 밖)

- 뉴스 전용 RSS 피드(`/news/rss.xml`).
- 뉴스 목록 페이지네이션 / 월·연 단위 그룹핑.
- 뉴스 글 자동 생성 파이프라인.
