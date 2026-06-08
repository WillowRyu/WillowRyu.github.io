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
