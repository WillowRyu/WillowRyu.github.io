import React from "react"
import { Link, graphql } from "gatsby"

import Layout from "../components/layout"
import SEO from "../components/seo"
import { rhythm } from "../utils/typography"

const NewsIndex = ({ data, location, pageContext }) => {
  const siteTitle = data.site.siteMetadata.title
  const posts = data.allMarkdownRemark.edges
  const { currentPage, numPages } = pageContext
  const pagePath = page => (page === 1 ? `/news/` : `/news/${page}/`)

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title={currentPage === 1 ? "뉴스" : `뉴스 - ${currentPage}페이지`} />
      <h2
        style={{
          marginTop: rhythm(1),
          marginBottom: rhythm(1),
        }}
      >
        뉴스
      </h2>
      {posts.length === 0 && <p className="link-desc">아직 뉴스가 없습니다.</p>}
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
      {numPages > 1 && (
        <nav className="pagination" aria-label="뉴스 페이지">
          {currentPage > 1 && (
            <Link to={pagePath(currentPage - 1)} rel="prev">
              ← 이전
            </Link>
          )}
          {Array.from({ length: numPages }, (_, index) => {
            const page = index + 1
            return page === currentPage ? (
              <span
                key={page}
                className="pagination-current"
                aria-current="page"
                aria-label={`${page}페이지`}
              >
                {page}
              </span>
            ) : (
              <Link key={page} to={pagePath(page)} aria-label={`${page}페이지`}>
                {page}
              </Link>
            )
          })}
          {currentPage < numPages && (
            <Link to={pagePath(currentPage + 1)} rel="next">
              다음 →
            </Link>
          )}
        </nav>
      )}
    </Layout>
  )
}

export default NewsIndex

export const pageQuery = graphql`
  query NewsListQuery($skip: Int!, $limit: Int!) {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      filter: { fields: { collection: { eq: "news" } } }
      sort: { frontmatter: { date: DESC } }
      skip: $skip
      limit: $limit
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
