const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)

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

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const fileNode = getNode(node.parent)
    if (!fileNode || fileNode.internal.type !== `File`) return

    const collection = fileNode.sourceInstanceName

    createNodeField({
      name: `collection`,
      node,
      value: collection,
    })

    const filePath = createFilePath({ node, getNode })
    // Only the news collection gets a path prefix; blog slugs stay at root.
    const slug = collection === `news` ? `/news${filePath}` : filePath

    createNodeField({
      name: `slug`,
      node,
      value: slug,
    })
  }
}
