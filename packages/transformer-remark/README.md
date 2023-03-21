# @gridsome/transformer-remark

> Markdown transformer for Gridsome with [Remark](https://remark.js.org/).

## Install

- `yarn add @gridsome/transformer-remark`
- `npm install @gridsome/transformer-remark`

## Basic usage

The transformer is automatically used if installed in your project. Custom transformer options can either be set for each source plugin or globally.

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
          // remark options
        }
      }
    }
  ],
  transformers: {
    remark: {
      // global remark options
    }
  }
}
```

## Add additional plugins

By default this plugin comes with `remark-slug`, `remark-autolink-headings`, `remark-external-links`, `remark-squeeze-paragraphs` and `remark-fix-guillemets` included. Add any additional [Remark plugin](https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins) with a `plugins` option. Included plugins can also be disabled if needed. See more info below.

The following example adds the `remark-attr` plugin globally if it is installed in your project.

```js
{
  remark: {
    plugins: [
      'remark-attr'
    ]
  }
}
```

## Options

#### plugins

- Type: `Array`
- Default: `[]`

Add additional [Remark plugins](https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins).

```js
{
  remark: {
    plugins: [
      // add plugin without options
      'remark-plugin',
      // require plugin manually
      require('remark-plugin'),
      // add plugin with options
      ['remark-plugin', { /* plugin options */ }]
    ]
  }
}
```

#### useBuiltIns

- Type: `boolean`
- Default: `true`

Set this option to `false` to disable all built-in plugins.

#### grayMatter

- Type: `object` 
- Default: `{}`

Options to pass through to [gray-matter][] for parsing front matter.

[gray-matter]: https://github.com/jonschlinkert/gray-matter#options

#### squeezeParagraphs

- Type: `boolean`
- Default: `true`

Remove empty (or white-space only) paragraphs.

#### externalLinks

- Type: `boolean`
- Default: `true`

Add target and rel attributes to external links.

#### externalLinksTarget

- Type: `string`
- Default: `'_blank'`

#### externalLinksRel

- Type: `Array | string`
- Default: `['nofollow', 'noopener', 'noreferrer']`

#### slug

- Type: `boolean`
- Default: `true`

Add anchors to heading.

#### autolinkHeadings

- Type: `boolean`
- Default: `true`

Automatically add links to headings. Disabled if `slug` is `false`.

#### autolinkClassName

- Type: `string`
- Default: `'icon icon-link'`

#### fixGuillemets

- Type: `boolean`
- Default: `true`

Support ASCII guillements (`<<`, `>>`) and mapping them to HTML.

#### imageQuality

- Type: `number`
- Default: `75`

#### imageBlurRatio

- Type: `number`
- Default: `40`

#### imageBackground

- Type: `string`

#### lazyLoadImages

- Type: `boolean`
- Default: `true`

#### config

- Type: `Object`
- Default: `{}`

Add additional [Remark options](https://github.com/remarkjs/remark/blob/main/packages/remark-parse/readme.md#options).

This allows you to enable/disable `gfm`, `commonmark`, `footnotes`,  `pedantic` and `blocks`.

* gfm
  * Type: `boolean`
  * Default: `true`

* commonmark
  * Type: `boolean`
  * Default: `false`
  
* footnotes
  * Type: `boolean`
  * Default: `false`
  
* pedantic
  * Type: `boolean`
  * Default: `false`
  
* blocks
  * Type: `Array | string`
  * Default: list of [block HTML elements](https://github.com/remarkjs/remark/blob/main/packages/remark-parse/lib/block-elements.js)

```js
{
  remark: {
    plugins: [
      //...
    ],
    config: {
      footnotes: true
    }
  }
}
```
