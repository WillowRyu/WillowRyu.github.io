/**
 * Bio component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from "react"
import { useStaticQuery, graphql } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"

import { rhythm } from "../utils/typography"

const Bio = () => {
  const data = useStaticQuery(graphql`
    query BioQuery {
      site {
        siteMetadata {
          author {
            name
            summary
            email
          }
          social {
            twitter
          }
        }
      }
    }
  `)

  const { author } = data.site.siteMetadata
  return (
    <div
      style={{
        display: `flex`,
        alignItems: `center`,
        marginBottom: rhythm(2.5),
      }}
    >
      <StaticImage
        src="../../content/assets/whoami.jpeg"
        alt={author.name}
        layout="fixed"
        width={50}
        height={50}
        style={{
          marginRight: rhythm(1 / 2),
          marginBottom: 0,
          flexShrink: 0,
          borderRadius: `50%`,
        }}
        imgStyle={{
          borderRadius: `50%`,
        }}
      />

      <p className="link-title" style={{ marginBottom: 0 }}>
        <a href={`mailto:${author.email}`}>Send Email</a>
      </p>
    </div>
  )
}

export default Bio
