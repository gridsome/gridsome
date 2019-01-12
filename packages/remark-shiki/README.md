# @gridsome/remark-shiki

> Syntax highlighter for markdown code blocks using [shiki](https://shiki.matsu.io/)

## Install
- `yarn add @gridsome/remark-shiki`
- `npm install @gridsome/remark-shiki`

## Usage

Add syntax highlighter to a single markdown source using the given options:

```js
{
  // Can be any of
  // https://github.com/octref/shiki/tree/master/packages/themes
  // and will default to 'nord'
  theme: 'nord'
}
```

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
            [ '@gridsome/remark-shiki', { theme: 'nord' } ]
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
        [ '@gridsome/remark-shiki', { theme: 'nord' } ]
      ]
    }
  }
}
```
