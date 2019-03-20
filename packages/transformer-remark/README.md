# @gridsome/transformer-remark

> Markdown transformer for Gridsome

## Install
- `yarn add @gridsome/transformer-remark`
- `npm install @gridsome/transformer-remark`

## Usage

```js
module.exports = {
  transformers: {
    remark: {
      externalLinksTarget: '_blank',
      externalLinksRel: ['nofollow', 'noopener', 'noreferrer'],
      anchorClassName: 'icon icon-link',
      createExcerpt: rawContent => rawContent.split('\n')[0],
      plugins: [
        // ...global plugins
      ]
    }
  },

  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: 'blog/**/*.md',
        typeName: 'Post',
        remark: {
          plugins: [
            // ...local plugins
          ]
        }
      }
    }
  ]
}
```

## Options

#### plugins

- Type: `array` Default: `[]`

Add additional plugins to the parser.

#### createExcerpt
- Type: `function` Default: `undefined`

Creates an excerpt from the raw markdown content.

#### useBuiltIns

- Type: `boolean` Default: `true`

Set this option to `false` to disable all built-in plugins.

## API

- `parse` Parse front matter data 
- `toAST` Parse markdown into a syntax tree
- `applyPlugins` Transform a syntax tree by applying plugins to it (async)
- `toHTML` Compile a syntax tree into HTML
