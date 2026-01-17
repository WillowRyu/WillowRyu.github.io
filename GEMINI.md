# Project Overview

This is a Gatsby-based blog project, originally created from the `gatsby-starter-blog` template. It is a static site generator built with React and powered by GraphQL. The project is designed to be a personal blog, featuring Markdown-based content management, code highlighting, and SEO optimization.

## Key Technologies

*   **Framework:** [Gatsby](https://www.gatsbyjs.org/) (v2)
*   **UI Library:** [React](https://reactjs.org/) (v16)
*   **Styling:** Typography.js (`typography-theme-wordpress-2016`), custom CSS in `src/global-css.css`.
*   **Content:** Markdown (`gatsby-transformer-remark`) with support for images (`gatsby-remark-images`) and code highlighting (`gatsby-remark-prismjs`, `@deckdeckgo/highlight-code`).
*   **Deployment:** Likely deployed to GitHub Pages (implied by `homepage` in `package.json` pointing to `willowryu.github.io`).

# Building and Running

The project uses `npm` (or `yarn`) for dependency management and scripts.

## Key Commands

*   **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

*   **Start Development Server:**
    Starts the local development server at `http://localhost:8000`. Hot reloading is enabled.
    ```bash
    npm run develop
    # or
    npm start
    ```

*   **Build for Production:**
    Generates the static site in the `public/` directory.
    ```bash
    npm run build
    ```

*   **Serve Production Build:**
    Serves the locally built static site to test production behavior.
    ```bash
    npm run serve
    ```

*   **Clean Cache:**
    Deletes the `.cache` and `public` directories. Useful if you encounter build errors.
    ```bash
    npm run clean
    ```

*   **Format Code:**
    Runs Prettier on the codebase.
    ```bash
    npm run format
    ```

# Development Conventions

## Directory Structure

*   `content/blog/`: Contains the blog posts. Each post is typically in its own subdirectory (e.g., `YYYY-MM-DD/`) containing an `index.md` and associated assets (images).
*   `src/components/`: Reusable React components (Bio, Layout, SEO).
*   `src/pages/`: Top-level pages (Home, 404). `index.js` lists the blog posts.
*   `src/templates/`: Templates for generating pages programmatically (e.g., `blog-post.js` for individual blog entries).
*   `gatsby-*.js`: Configuration files for Gatsby (config, node, browser, ssr).

## Content Creation

*   Blog posts are written in Markdown.
*   Frontmatter in `index.md` files is used for metadata (title, date, description).
*   Images can be co-located with the markdown file and referenced relatively.

## Styling

*   Global styles are defined in `src/global-css.css`.
*   Typography is managed via `src/utils/typography.js` and `gatsby-plugin-typography`.
