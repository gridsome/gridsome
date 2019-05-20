# @gridsome/transformer-remark

> Markdown transformer for Gridsome

## Install
- `yarn add @gridsome/transformer-remark`
- `npm install @gridsome/transformer-remark`

## Basic usage

```js
//gridsome.config.js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: 'blog/**/*.md',
        typeName: 'Post',
        remark: {
          externalLinksTarget: '_blank',
          externalLinksRel: ['nofollow', 'noopener', 'noreferrer'],
          anchorClassName: 'icon icon-link',
          plugins: [
            // ...remark plugins
          ]
        }
      }
    }
  ]
}
```

## Add additional plugins
By default this plugin comes with...
TODO: Write something about included plugins and how to add other external plugins

## Add global remark options

```js
//gridsome.config.js

module.exports = {
  transformers: {
    remark: {
      externalLinksTarget: '_blank',
      externalLinksRel: ['nofollow', 'noopener', 'noreferrer'],
      anchorClassName: 'icon icon-link',
      plugins: [
        // ...global remark plugins
      ]
    }
  },
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: 'blog/**/*.md',
        typeName: 'Post',
      }
    }
  ]
}
```


## Options

#### plugins

- Type: `array` Default: `[]`

Add additional plugins to the parser. Any Remark plugin can be added here.


#### useBuiltIns

- Type: `boolean` Default: `true`

Set this option to `false` to disable all built-in plugins.
