# @gridsome/vue-remark

## Install

- `yarn add @gridsome/vue-remark`
- `npm install @gridsome/vue-remark`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/vue-remark',
      options: {
        typeName: 'VueRemarkPage', // required
        baseDir: './src/pages', // required
        layout: './src/layouts/Default.vue'
      }
    }
  ]
}
```

## Example component

```jsx
---
title: A cool title
excerpt: Lorem Ipsum is simply dummy text.
---
import Youtube from '~/components/Youtube.vue'
import data from '~/data/youtube.json'

# {{ $frontmatter.title }}

> {{ $frontmatter.excerpt }}

<Youtube :id="data.id" />

<script>
export default {
  methods: {
    send () {
      // ...
    }
  }
}
</script>
```

## Options

#### baseDir

- Type: `string` *required*

The path to the directory which contains all `.md` files. A relative path will be resolved from the project root directory.

#### typeName

- Type: `string` *required*

The type name to give the pages in the GraphQL schema.

#### layout

- Type: `string | object`

Path to the Vue component that will be used as layout for all pages this plugin creates. The option can also be an object with `component` and `props`. Each page can also override this option in their front matter section.

```js
layout: './src/layouts/Default.vue'
```
```js
layout: {
  component: './src/layouts/Default.vue',
  props: {
    fullWidth: false
  }
}
```

#### includePaths

- Type: `Array`
- Default: `[]`

Paths or regex that should be parsed by this plugin. Use this option if you want to import `md` files as Vue components. Imported `md` components will not use the `layout` option above.

#### pathPrefix

- Type: `string`
- Default: `'/'`

The path for the first level index file in the directory specified by the `baseDir` option will become `/`. Use this option to prefix all paths.

#### route

- Type: `string`

Generate paths from a route. The `pathPrefix` option is ignored when using a `route`.

#### index

- Type: `Array`
- Default: `['index']`

Define which files to consider as index files. These files will not have their filename appear in its path and will become the main `index.html` file of the directory. Make sure there is only one possible index file per directory if multiple index names are defined.
