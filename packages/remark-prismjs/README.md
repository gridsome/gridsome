# @gridsome/remark-prismjs

> Syntax highlighter for markdown code blocks

## Install
- `yarn add @gridsome/remark-prismjs`
- `npm install @gridsome/remark-prismjs`

## Usage

Add syntax highlighter to a single markdown source:

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: 'blog/**/*.md',
        route: '/blog/:year/:month/:day/:slug',
        remark: {
          plugins: [
            '@gridsome/remark-prismjs'
          ]
        }
      }
    }
  ]
}
```

Add syntax highlighter to all markdown sources:

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {}
    }
  ],

  transformers: {
    remark: {
      plugins: [
        '@gridsome/remark-prismjs'
      ]
    }
  }
}
```
