# 뉴스 섹션 신설 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 블로그와 완전히 분리된 `/news` 섹션을 신설해 매일 AI 뉴스 요약글을 올린다.

**Architecture:** `content/news/`를 별도 `gatsby-source-filesystem` 소스로 등록하고, `onCreateNode`에서 각 마크다운에 `fields.collection`(`"blog"`/`"news"`)을 부여한다. 이 단일 필드로 홈·RSS·페이지 생성·뉴스 목록을 모두 분리한다. 뉴스 슬러그는 `/news/<date>/`로 접두사를 붙여 블로그 슬러그와 충돌을 막는다.

**Tech Stack:** Gatsby v5, React 18, `gatsby-transformer-remark`, `gatsby-plugin-feed`. **테스트 프레임워크 없음** — 검증은 `yarn build` 성공 + `public/` 산출물 확인으로 한다(`gatsby-node.js`/`gatsby-config.js` 변경 시 스키마 캐시 때문에 `yarn clean` 선행).

> 참고: 이 계획에는 의도적인 중간 상태가 있다. Task 1 직후엔 뉴스가 블로그 템플릿으로 렌더되고 홈에도 노출되지만, 각 커밋은 항상 **빌드 성공** 상태를 유지하며 Task 2(템플릿)·Task 4(홈/RSS 제외)에서 최종 동작으로 수렴한다.

---

### Task 1: 뉴스 소스 등록 + 노드 필드 (기반)

**Files:**
- Create: `content/news/2026-06-09/index.md`
- Modify: `gatsby-config.js` (filesystem 소스 추가)
- Modify: `gatsby-node.js:53-64` (`onCreateNode`)

- [ ] **Step 1: 예시 뉴스 글 시드 생성**

Create `content/news/2026-06-09/index.md`:

```markdown
---
title: "2026-06-09 AI 뉴스"
date: "2026-06-09"
description: "뉴스 섹션 첫 예시 글"
---

뉴스 섹션의 첫 예시 글입니다.

- 항목 1: 요약 내용
- 항목 2: 요약 내용
```

- [ ] **Step 2: `content/news`를 filesystem 소스로 등록**

In `gatsby-config.js`, `content/blog` 소스 객체 바로 다음에 추가. 기존:

```js
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/blog`,
        name: `blog`,
      },
    },
```

다음으로 변경 (새 객체를 아래에 삽입):

```js
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/blog`,
        name: `blog`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/news`,
        name: `news`,
      },
    },
```

- [ ] **Step 3: `onCreateNode`에 `collection` 필드 + 뉴스 슬러그 접두사 추가**

In `gatsby-node.js`, 기존 `onCreateNode` 전체를 교체. 기존:

```js
exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}
```

교체:

```js
exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const fileNode = getNode(node.parent)
    const collection = fileNode.sourceInstanceName

    createNodeField({
      name: `collection`,
      node,
      value: collection,
    })

    const filePath = createFilePath({ node, getNode })
    const slug = collection === `news` ? `/news${filePath}` : filePath

    createNodeField({
      name: `slug`,
      node,
      value: slug,
    })
  }
}
```

- [ ] **Step 4: 클린 빌드로 검증**

Run: `yarn clean && yarn build`
Expected: 에러 없이 완료. 뉴스 노드 슬러그가 `/news/2026-06-09/`가 되고, (createPages는 아직 미수정이라) 기존 blog-post 템플릿으로 페이지가 생성됨.

- [ ] **Step 5: 산출물 확인**

Run: `ls public/news/2026-06-09/index.html`
Expected: 파일 존재 (뉴스 페이지가 슬러그 `/news/2026-06-09/`로 생성됨).

- [ ] **Step 6: 커밋**

```bash
git add gatsby-config.js gatsby-node.js content/news
git commit -m "feat(news): content/news 소스 등록 및 collection 노드 필드 추가"
```

---

### Task 2: 뉴스 전용 템플릿 + 페이지 라우팅

**Files:**
- Create: `src/templates/news-post.js`
- Modify: `gatsby-node.js:4-51` (`createPages`)

- [ ] **Step 1: 뉴스 전용 경량 템플릿 생성**

Create `src/templates/news-post.js` (blog-post에서 Disqus·이전/다음 제거, "뉴스 목록으로" 링크 추가, Bio·SEO 유지):

```jsx
import React from "react"
import { Link, graphql } from "gatsby"

import Bio from "../components/bio"
import Layout from "../components/layout"
import SEO from "../components/seo"
import { rhythm, scale } from "../utils/typography"

const NewsPostTemplate = ({ data, location }) => {
  const post = data.markdownRemark
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout location={location} title={siteTitle}>
      <SEO
        title={post.frontmatter.title}
        description={post.frontmatter.description || post.excerpt}
      />
      <article>
        <header>
          <h1
            style={{
              marginTop: rhythm(1),
              marginBottom: 0,
            }}
          >
            {post.frontmatter.title}
          </h1>
          <p
            style={{
              ...scale(-1 / 5),
              display: `block`,
              marginBottom: rhythm(1),
            }}
          >
            {post.frontmatter.date}
          </p>
        </header>
        <section dangerouslySetInnerHTML={{ __html: post.html }} />
        <hr
          style={{
            marginBottom: rhythm(1),
          }}
        />
        <footer>
          <Bio />
        </footer>
      </article>

      <nav>
        <Link to="/news/" rel="up">
          ← 뉴스 목록으로
        </Link>
      </nav>
    </Layout>
  )
}

export default NewsPostTemplate

export const pageQuery = graphql`
  query NewsPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      html
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        description
      }
    }
  }
`
```

- [ ] **Step 2: `createPages`를 컬렉션별로 분기**

In `gatsby-node.js`, 기존 `createPages` 전체를 교체. 기존:

```js
exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions

  const blogPost = path.resolve(`./src/templates/blog-post.js`)
  const result = await graphql(
    `
      {
        allMarkdownRemark(
          sort: { frontmatter: { date: DESC } }
          limit: 1000
        ) {
          edges {
            node {
              fields {
                slug
              }
              frontmatter {
                title
              }
            }
          }
        }
      }
    `
  )

  if (result.errors) {
    throw result.errors
  }

  // Create blog posts pages.
  const posts = result.data.allMarkdownRemark.edges

  posts.forEach((post, index) => {
    const previous = index === posts.length - 1 ? null : posts[index + 1].node
    const next = index === 0 ? null : posts[index - 1].node

    createPage({
      path: post.node.fields.slug,
      component: blogPost,
      context: {
        slug: post.node.fields.slug,
        previous,
        next,
      },
    })
  })
}
```

교체:

```js
exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions

  const blogPost = path.resolve(`./src/templates/blog-post.js`)
  const newsPost = path.resolve(`./src/templates/news-post.js`)
  const result = await graphql(
    `
      {
        allMarkdownRemark(
          sort: { frontmatter: { date: DESC } }
          limit: 1000
        ) {
          edges {
            node {
              fields {
                slug
                collection
              }
              frontmatter {
                title
              }
            }
          }
        }
      }
    `
  )

  if (result.errors) {
    throw result.errors
  }

  const allPosts = result.data.allMarkdownRemark.edges

  // Blog posts: 이전/다음은 블로그 글끼리만 연결.
  const blogPosts = allPosts.filter(
    ({ node }) => node.fields.collection === `blog`
  )

  blogPosts.forEach((post, index) => {
    const previous =
      index === blogPosts.length - 1 ? null : blogPosts[index + 1].node
    const next = index === 0 ? null : blogPosts[index - 1].node

    createPage({
      path: post.node.fields.slug,
      component: blogPost,
      context: {
        slug: post.node.fields.slug,
        previous,
        next,
      },
    })
  })

  // News posts: 이전/다음 네비 없음.
  const newsPosts = allPosts.filter(
    ({ node }) => node.fields.collection === `news`
  )

  newsPosts.forEach(post => {
    createPage({
      path: post.node.fields.slug,
      component: newsPost,
      context: {
        slug: post.node.fields.slug,
      },
    })
  })
}
```

- [ ] **Step 3: 클린 빌드로 검증**

Run: `yarn clean && yarn build`
Expected: 에러 없이 완료.

- [ ] **Step 4: 뉴스 페이지가 뉴스 템플릿으로 렌더되는지 확인**

Run: `grep -c "뉴스 목록으로" public/news/2026-06-09/index.html`
Expected: `1` 이상 (뉴스 전용 템플릿 적용됨).

Run: `grep -ci disqus public/news/2026-06-09/index.html`
Expected: `0` (뉴스 페이지엔 댓글 없음).

- [ ] **Step 5: 커밋**

```bash
git add src/templates/news-post.js gatsby-node.js
git commit -m "feat(news): 뉴스 전용 템플릿(news-post) 및 컬렉션별 페이지 라우팅"
```

---

### Task 3: `/news` 목록 페이지

**Files:**
- Create: `src/pages/news.js`

- [ ] **Step 1: 뉴스 목록 페이지 생성**

Create `src/pages/news.js` (홈과 동일한 `.link-post` 스타일 재사용, 필터 버튼 없음, 빈 상태 처리):

```jsx
import React from "react"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"
import { rhythm } from "../utils/typography"

const NewsIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title
  const posts = data.allMarkdownRemark.edges

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="뉴스" />
      <h2
        style={{
          marginTop: rhythm(1),
          marginBottom: rhythm(1),
        }}
      >
        뉴스
      </h2>
      {posts.length === 0 && (
        <p className="link-desc">아직 뉴스가 없습니다.</p>
      )}
      {posts.map(({ node }) => {
        const title = node.frontmatter.title || node.fields.slug
        return (
          <article key={node.fields.slug} className="link-post">
            <header>
              <h3
                style={{
                  marginBottom: rhythm(1 / 4),
                }}
              >
                <Link
                  className="link-title"
                  style={{
                    boxShadow: `none`,
                    textDecoration: `none`,
                    marginBottom: rhythm(1 / 4),
                  }}
                  to={node.fields.slug}
                >
                  {title}
                </Link>
              </h3>
              <small className="link-desc post-meta">
                {node.frontmatter.date}
              </small>
            </header>
            <section>
              <p
                className="link-desc"
                dangerouslySetInnerHTML={{
                  __html: node.frontmatter.description || node.excerpt,
                }}
              />
            </section>
          </article>
        )
      })}
    </Layout>
  )
}

export default NewsIndex

export const pageQuery = graphql`
  query NewsListQuery {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      filter: { fields: { collection: { eq: "news" } } }
      sort: { frontmatter: { date: DESC } }
    ) {
      edges {
        node {
          excerpt
          fields {
            slug
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            description
          }
        }
      }
    }
  }
`
```

- [ ] **Step 2: 빌드로 검증**

Run: `yarn build`
Expected: 에러 없이 완료.

- [ ] **Step 3: 목록 페이지 산출물 확인**

Run: `grep -c "2026-06-09 AI 뉴스" public/news/index.html`
Expected: `1` 이상 (목록에 예시 글이 노출됨).

- [ ] **Step 4: 커밋**

```bash
git add src/pages/news.js
git commit -m "feat(news): /news 목록 페이지 추가"
```

---

### Task 4: 홈·RSS에서 뉴스 제외

**Files:**
- Modify: `src/pages/index.js:107` (`pageQuery`)
- Modify: `gatsby-config.js:96` (RSS 피드 쿼리)

- [ ] **Step 1: 홈 쿼리에서 뉴스 제외**

In `src/pages/index.js`, `pageQuery`의 `allMarkdownRemark` 호출에 필터 추가. 기존:

```js
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
```

교체:

```js
    allMarkdownRemark(
      filter: { fields: { collection: { eq: "blog" } } }
      sort: { frontmatter: { date: DESC } }
    ) {
```

(`CATEGORIES`·필터 버튼·`TAG_CLASS`는 변경하지 않는다.)

- [ ] **Step 2: 메인 RSS에서 뉴스 제외**

In `gatsby-config.js`, `gatsby-plugin-feed`의 피드 `query` 안 `allMarkdownRemark`에 필터 추가. 기존:

```js
              {
                allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
                  nodes {
```

교체:

```js
              {
                allMarkdownRemark(
                  filter: { fields: { collection: { eq: "blog" } } }
                  sort: { frontmatter: { date: DESC } }
                ) {
                  nodes {
```

- [ ] **Step 3: 클린 빌드로 검증**

Run: `yarn clean && yarn build`
Expected: 에러 없이 완료.

- [ ] **Step 4: 홈·RSS에 뉴스가 없는지 확인**

Run: `grep -c "2026-06-09 AI 뉴스" public/index.html`
Expected: `0` (홈 어떤 필터에도 뉴스 미노출).

Run: `grep -c "2026-06-09 AI 뉴스" public/rss.xml`
Expected: `0` (메인 RSS에 뉴스 없음).

- [ ] **Step 5: 커밋**

```bash
git add src/pages/index.js gatsby-config.js
git commit -m "feat(news): 홈/메인 RSS에서 뉴스 글 제외"
```

---

### Task 5: 전역 헤더 "뉴스" 링크 + 스타일

**Files:**
- Modify: `src/components/layout.js:55-68` (반환 JSX)
- Modify: `src/global-css.css` (말미에 `.site-nav` 추가)

- [ ] **Step 1: 헤더에 뉴스 링크 추가**

In `src/components/layout.js`, 반환부의 `<header>`/`<main>` 부분을 교체. 기존:

```jsx
      <header>{header}</header>
      <main className="link-title">{children}</main>
```

교체:

```jsx
      <header>
        {header}
        <nav className="site-nav">
          <Link to="/news/">뉴스</Link>
        </nav>
      </header>
      <main className="link-title">{children}</main>
```

(`Link`는 이미 `layout.js` 상단에서 import 되어 있다.)

- [ ] **Step 2: `.site-nav` 스타일 추가**

In `src/global-css.css`, 파일 맨 끝(line 105 이후)에 추가:

```css
.site-nav {
  margin-bottom: var(--gap);
  font-size: 0.85rem;
}

.site-nav a {
  color: var(--secondary);
  text-decoration: none;
}

.site-nav a:hover {
  color: var(--pblue);
}
```

- [ ] **Step 3: 빌드로 검증**

Run: `yarn build`
Expected: 에러 없이 완료.

- [ ] **Step 4: 헤더 링크 산출물 확인**

Run: `grep -c 'href="/news/"' public/index.html`
Expected: `1` 이상 (홈 헤더에 뉴스 링크 존재).

Run: `grep -c 'href="/news/"' public/2026-04-21/index.html`
Expected: `1` 이상 (블로그 글 페이지에도 전역 헤더 링크 존재).

- [ ] **Step 5: 커밋**

```bash
git add src/components/layout.js src/global-css.css
git commit -m "feat(news): 전역 헤더에 뉴스 링크 추가"
```

---

## Definition of Done (spec 검증 매핑)

최종적으로 `yarn clean && yarn build` 후 아래가 모두 성립해야 한다:

1. **빌드 성공** — `yarn build` 무에러 (모든 Task Step에서 확인).
2. **홈에 뉴스 미노출** — `grep -c "2026-06-09 AI 뉴스" public/index.html` → `0` (Task 4).
3. **`/news` 목록 노출** — `grep -c "2026-06-09 AI 뉴스" public/news/index.html` → `1+` (Task 3).
4. **뉴스 상세 = 경량 템플릿** — `public/news/2026-06-09/index.html`에 "뉴스 목록으로" 존재, disqus 없음 (Task 2).
5. **블로그 이전/다음 = 블로그끼리만** — createPages가 `collection==='blog'`만으로 prev/next 계산 (Task 2). 수동 확인: 임의 블로그 글 하단 네비에 뉴스 글 미포함.
6. **메인 RSS에 뉴스 없음** — `grep -c "2026-06-09 AI 뉴스" public/rss.xml` → `0` (Task 4).
7. **전역 헤더 뉴스 링크** — 홈·블로그 글 페이지 모두 `href="/news/"` 존재 (Task 5).

추가 인터랙티브 확인(선택): `yarn develop` 후 `http://localhost:8000/news/` 및 홈/뉴스 상세 시각 확인.

## 일일 뉴스 작성 워크플로우 (구현 후 운영)

1. `content/news/YYYY-MM-DD/index.md` 생성.
2. frontmatter: `title`, `date`, `description` (spec 문서 참조).
3. 본문에 그날 요약 작성 → 커밋 → 배포.

## 범위 밖 (이번 계획 미포함)

- 뉴스 전용 RSS(`/news/rss.xml`), 뉴스 목록 페이지네이션/월·연 그룹핑, 뉴스 자동 생성 파이프라인.
