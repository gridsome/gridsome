# @gridsome/vue-remark

> Create pages with Vue components in Markdown. Perfect for building Documentation, Design Systems, Portfolios, Blogs, etc.

## Install

- `npm install @gridsome/vue-remark`
- `yarn add @gridsome/vue-remark`
- `pnpm install @gridsome/vue-remark`

## Usage

**1.** Add configs to `gridsome.config.js`.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/vue-remark',
      options: {
        typeName: 'Documentation', // Required
        baseDir: './content/docs', // Where .md files are located
        pathPrefix: '/docs', // Add route prefix. Optional
        template: './src/templates/Documentation.vue' // Optional
      }
    }
  ]
}
```

In this example `/content/docs/index.md` will be `website.com/docs/`,
and `/content/docs/install-guide.md` will be `website.com/docs/install-guide/`.

By default it takes any **.md** files in `baseDir` folder and uses them for file-based routing like [Pages](/docs/pages/) works. You can override this by using a `route` config.

**2.** Setup a template and include the `<VueRemarkContent />` component:

```html
<template>
  <Layout>
    <h1>{{ $page.documentation.title }}</h1>
    <p class="intro">{{ $page.documentation.excerpt }}</p>
    <VueRemarkContent />
  </Layout>
</template>

<!-- Front-matter fields can be queried from GraphQL layer -->
<page-query>
query Documentation ($id: ID!) {
  documentation(id: $id) {
    title
    excerpt
  }
}
</page-query>
```

### Example Markdown file

```jsx
---
title: A cool title
excerpt: Lorem Ipsum is simply dummy text.
---
// Import any Vue Component. Even other .md files!
import YouTube from '~/components/YouTube.vue'
import AboutUs from '~/sections/AboutUs.md'

// Import any JSON if you need data.
import data from '~/data/youtube.json'

// Use front-matter fields anywhere.
# {{ $frontmatter.title }}
> {{ $frontmatter.excerpt }}

// Use your imported Vue Components.
<YouTube :id="data.id" />
<AboutUs />
```

### Options

#### typeName

- Type: `string` *required*

The type name to give the pages in the GraphQL schema.

#### baseDir

- Type: `string` *required*

The path to the directory which contains all the `.md` files. A relative path will be resolved from the project root directory.

#### template

- Type: `string`

Use a template for every page created by this plugin. This option is useful if you for example need to have a shared `page-query` or want to wrap every page in the same layout component. Insert the `<VueRemarkContent>` component where you want to show the Markdown content.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/vue-remark',
      options: {
        typeName: 'MarkdownPage',
        baseDir: './content',
        template: './src/templates/MarkdownPage.vue'
      }
    }
  ]
}
```

```html
<template>
  <Layout>
    <h1>{{ $page.vueRemarkPage.title }}</h1>
    <VueRemarkContent />
  </Layout>
</template>

<page-query>
query VueRemarkPage ($id: ID!) {
  vueRemarkPage(id: $id) {
    title
  }
}
</page-query>
```

It is also possible to use slots inside `<VueRemarkContent>`.

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

#### route

- Type: `string`

By default, each markdown file will get a path based on the file location. Use this option to generate paths based on a route pattern instead. Any front matter field is available to use in the path.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/vue-remark',
      options: {
        typeName: 'MarkdownPage',
        baseDir: './content',
        route: '/pages/:slug'
      }
    }
  ]
}
```

#### ignore

- Type: `Array`
- Default: `[]`

List of glob patterns that should be ignored when searching for markdown files.

#### includePaths

- Type: `Array`
- Default: `[]`

Paths or regex that should be parsed by this plugin. Use this option if you want to import `md` files as Vue components.

#### pathPrefix

- Type: `string`
- Default: `'/'`

The path for the first level index file in the directory specified by the `baseDir` option will become `/`. Use this option to prefix all paths.

#### index

- Type: `Array`
- Default: `['index']`

Define which files to consider as index files. These files will not have their filename appear in its path and will become the main `index.html` file of the directory. Make sure there is only one possible index file per directory if multiple index names are defined.

#### plugins

Add additional [Remark](https://remark.js.org/) plugins. [Read more](https://github.com/remarkjs/remark/blob/master/doc/plugins.md#list-of-plugins).

#### refs

- Type: `object`

Define fields that will have a reference to another node. The referenced `typeName` is expected to exist. But a content type can also be created automatically if you set `create: true`. Read more about [references](https://gridsome.org/docs/data-store-api#collectionaddreferencefieldname-typename).

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/vue-remark',
      options: {
        typeName: 'Documentation',
        baseDir: './docs',
        refs: {
          // Example 1: Create a Author collection by reference `author` field
          author: 'Author',
          // Example 2: Create a Tag collection by reference `tags` field.
          tags: {
            typeName: 'Tag',
            create: true
          }
        }
      }
    }
  ]
}
```

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
