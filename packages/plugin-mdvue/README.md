# @gridsome/plugin-mdvue

## Install

- `yarn add @gridsome/plugin-mdvue @gridsome/transformer-remark`
- `npm install @gridsome/plugin-mdvue @gridsome/transformer-remark`

This plugin requires the Remark transformer. Install [@gridsome/transformer-remark](https://www.npmjs.com/package/@gridsome/transformer-remark) as a dev dependency in your project. Gridsome will automatically transform the files for you as long as the transformer is found in your `package.json`.

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-mdvue',
      options: {
        baseDir: './src/pages',
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
---
import Message from '~/components/Message.md'
import Button from '~/components/Button.vue'
import labels from '~/data/labels.json'

# {{ $frontmatter.title }}

<Message>Lorem ipsum dolor sit amet...</Message>
<Button @click="send">{{ labels.send }}</Button>

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

- Type: `string`
- Default: `'VueMarkdownPage'`

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
