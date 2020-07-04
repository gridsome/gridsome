# @gridsome/source-contentful

> Contentful source for Gridsome. This package is under development and
API might change before v1 is released.

## Install

- `yarn add @gridsome/source-contentful`
- `npm install @gridsome/source-contentful`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-contentful',
      options: {
        space: 'YOUR_SPACE', // required
        accessToken: 'YOUR_ACCESS_TOKEN', // required
        host: 'cdn.contentful.com',
        environment: 'master',
        typeName: 'Contentful'
      }
    }
  ]
}
```

### Custom Routes

To add custom routes use the [`templates`](https://gridsome.org/docs/templates/) config with the collection type name as the key and the custom route as the value.

If you have Contentful ContentTypes named BlogPost and Article you can add new routes like this:

```js
module.exports = {
  templates: {
    ContentfulBlogPost: '/blog/:slug',
    ContentfulArticle: '/articles/:slug'
  }
}
```

## Contentful Content Types

`@gridsome/souce-contentful` currently works with all Contentful Content Types.

### Rich text

Contentful Rich text content types return a custom JSON response that can only be parsed to HTML with Contentful's package, https://www.npmjs.com/package/@contentful/rich-text-html-renderer

#### Example

A query that returns Contentful Rich Text, where `richArticle` is the Rich Text content type configured in the Contentful _Content model_:

```graphql
query RichArticles {
  allContentfulArticle {
    edges {
      node {
        id
        title
        richArticle
      }
    }
  }
}
```

Rich Text fields returns a JSON document which can be used with `@contentful/rich-text-html-renderer` to generate HTML. The content from `richArticle` can then be passed to a Vue `method` from the page `<template>`. In this case, the method name is `richtextToHTML`:

```html
<div v-for="edge in $page.articles.edges" :key="edge.node.id">
  <p v-html="richtextToHTML(edge.node.richArticle)"></p>
</div>
```

Finally, the method to convert the JSON document into HTML (in the most basic usage):

```js
import { documentToHtmlString } from '@contentful/rich-text-html-renderer'

export default {
  methods: {
    richtextToHTML (content) {
      return documentToHtmlString(content)
    }
  }
}
```

The Contentful renderer is imported, then used to convert the JSON response from the `page-query`.

Custom parsing and more configuration details can be found on the [Contentful Rich Text HTML Render package documentation](https://www.npmjs.com/package/@contentful/rich-text-html-renderer)

#### Embedded Assets (images in Rich text)

The Contentful HTML renderer doesn't automatically render embedded assets, instead, you can configure how you want to render them using `BLOCK` types and the configuration options.

To do so, import `BLOCKS` and setup a custom renderer before calling the `documentToHtmlString` method. Here, we're getting the image title and source url (contentful CDN src) and passing it to a string template.

```js
import { BLOCKS } from '@contentful/rich-text-types'
import { documentToHtmlString } from '@contentful/rich-text-html-renderer'

export default {
  methods: {
    richTextToHTML (content) {
      return documentToHtmlString(content, {
        renderNode: {
          [BLOCKS.EMBEDDED_ASSET]: (node) => {
            return `<img src="${node.data.target.fields.file.url}" alt="${node.data.target.fields.title}" />`
          }
        }
      })
    }
  }
}
```

#### Return generated HTML from Rich Text field:

Rich Text fields can take an `html` argument to return generated HTML instead of a Rich Text document. The generated HTML can simply be passed in to an element with `v-html`.

```graphql
query Article($id: String!) {
  contentfulArticle(id: $id) {
    id
    title
    richArticle(html: true)
  }
}
```

```html
<div v-html="$page.contentfulArticle.richArticle" />
```

### Location

Contentful Location data is returned as JSON with `lat` and `lon`. You will need to query the field name and each field in the GraphQL query.

```graphql
query Location {
  allContentfulTestType {
    edges {
      node {
        geoLocation {
          lat
          lon
        }
      }
    }
  }
}
```

### JSON

In Contentful JSON ContentTypes, rather than receiving the entire object when querying for the field, GraphQL requires that you query for each field that you need.

```graphql
query Json {
  allContentfulTestType {
    edges {
      node {
        jsonFieldName {
          itemOne
          itemTwo
        }
      }
    }
  }
}
```
