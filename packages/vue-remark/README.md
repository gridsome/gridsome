# @gridsome/vue-remark

> Create pages with Vue components in markdown. Perfect for building Documentation, Design Systems, Portfolios, Blogs, etc.

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
        typeName: 'MarkdownPage', // required
        baseDir: './src/pages', // required
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
layout: ~/layouts/Default.vue
---
import YouTube from '~/components/YouTube.vue'
import data from '~/data/youtube.json'

# {{ $frontmatter.title }}

<YouTube :id="data.id" />

> {{ $frontmatter.excerpt }}
```

## Options

#### typeName

- Type: `string` *required*

The type name to give the pages in the GraphQL schema.

#### baseDir

- Type: `string` *required*

The path to the directory which contains all the `.md` files. A relative path will be resolved from the project root directory.

#### component

- Type: `string`

Use a custom component as template for every page created by this plugin. This option is useful if you for example need to have a shared `page-query` or want to wrap every page in the same layout component. Insert the `VueRemarkContent` component where you want to show the Markdown content.

```html
<template>
  <Layout>
    <h1>{{ $page.vueRemarkPage.title }}</h1>
    <VueRemarkContent />
  </Layout>
</template>

<page-query>
query VueRemarkPage($id: String!) {
  vueRemarkPage(id: $id) {
    title
  }
}
</page-query>
```

It is also possible to use slots inside `VueRemarkContent`.

```html
<VueRemarkContent>
  <template v-slot:tags>
    <ul>
      <li v-for="tag in $page.post.tags" :key="tag.id">
        <g-link to="tag.path">{{ tag.name }}</g-link>
      </li>
    </ul>
  </template>
</VueRemarkContent>
```

```md
# Post title

<slot name="tags">
```

#### includePaths

- Type: `Array`
- Default: `[]`

Paths or regex that should be parsed by this plugin. Use this option if you want to import `md` files as Vue components.

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

#### remark

Custom [Remark](https://remark.js.org/) options. [Read more](https://github.com/gridsome/gridsome/tree/master/packages/transformer-remark#options).

## Set layout for specific page in front matter

The generated Vue template has a simple `div` element as root component. Use a special `layout` option in front matter to specify a custom element to use as root component.

```yaml
---
layout: ~/layouts/Default.vue
---
```

Passing `props` to the component:

```yaml
---
layout:
  component: ~/layouts/Default.vue
  props:
    fullWidth: true
---
```
