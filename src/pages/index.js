import React, { useState } from "react"
import { Link, graphql } from "gatsby"
import { defineCustomElements as deckDeckGoHighlightElement } from "@deckdeckgo/highlight-code/dist/loader"

import Bio from "../components/bio"
import Layout from "../components/layout"
import SEO from "../components/seo"
import { rhythm } from "../utils/typography"

const ALL = "전체"
const CATEGORIES = [ALL, "기술", "잡담", "후기"]
const TAG_CLASS = {
  기술: "tag-tech",
  잡담: "tag-talk",
  후기: "tag-review",
}

const BlogIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata.title
  const posts = data.allMarkdownRemark.edges
  const [selected, setSelected] = useState(ALL)
  deckDeckGoHighlightElement()

  const filteredPosts =
    selected === ALL
      ? posts
      : posts.filter(({ node }) => node.frontmatter.category === selected)

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="All posts" />
      <Bio />
      <nav className="category-filter">
        {CATEGORIES.map(category => (
          <button
            key={category}
            type="button"
            className={
              selected === category
                ? "category-button is-active"
                : "category-button"
            }
            onClick={() => setSelected(category)}
          >
            {category}
          </button>
        ))}
      </nav>
      {filteredPosts.map(({ node }) => {
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
                {node.frontmatter.category && (
                  <span
                    className={`post-tag ${TAG_CLASS[node.frontmatter.category] ||
                      ""}`}
                  >
                    {node.frontmatter.category}
                  </span>
                )}
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

export default BlogIndex

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
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
            category
          }
        }
      }
    }
  }
`
