# @gridsome/remark-prismjs

> Syntax highlighter for markdown code blocks

## Install
- `yarn add @gridsome/remark-prismjs`
- `npm install @gridsome/remark-prismjs`

## Usage

In your `main.js` file, import a Prism CSS theme:

```js
import 'prismjs/themes/prism.css'

export default function (Vue) {
  // ...
}
```

In `gridsome.config.js`, add syntax highlighter to a single markdown source:

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

Or add syntax highlighter to all markdown sources:

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
