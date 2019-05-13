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

#### useBuiltIns

- Type: `boolean` Default: `true`

Set this option to `false` to disable all built-in plugins.
