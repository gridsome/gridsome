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

## Options

#### transformInlineCode

- Type: `Boolean`
- Default: `false`

If you'd like to disable highlighting of inline code blocks, pass `transformInlineCode: false` in the plugin options

#### showLineNumbers

- Type: `Boolean`
- Default: `false`

If you'd like to add line numbers alongside the code. You can pass `showLineNumbers: true` in the plugin options and import a Prism CSS about line numbers to `main.js` file. like this:

```js
import 'prismjs/themes/prism.css'
// Prism default CSS about line numbers
import 'prismjs/plugins/line-numbers/prism-line-numbers.css'

export default function (Vue) {
  // ...
}
```

If you wish to only show line numbers on certain code blocks, you can leave `false` and use the `{ lineNumbers: true }` syntax below
