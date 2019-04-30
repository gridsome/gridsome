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

Rich Text fields returns a JSON document which can be used with '@contentful/rich-text-html-renderer' to generate HTML. If you need to handle different types of content, or render them with a Vue component, e.g., images or other `Embeded Asset Blocks`. See example below.

The content from `richArticle` can then be passed to a Vue `method` from the page `<template>`. In this case, the method name is `richtextToHTML`:

```html
<div v-for="edge in $page.articles.edges" :key="edge.id">
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

The Contentful renderer is imported, then used to convert a parsed version of the response from the `page-query`.

Custom parsing and more configuration details can be found on the [Contentful Rich Text HTML Render package documentation](https://www.npmjs.com/package/@contentful/rich-text-html-renderer)

#### Embeded Assets (images in Rich text)
The Contentful HTML renderer doesn't automatically render embeded assets, instead, you can configure how you want to render them using `BLOCK` types and the configuration options.

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
query Article ($id: String!) {
  contentfulArticle (id: $id) {
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
In Contentful JSON ContentTypes, rather than recieving the entire object when querying for the field, GraphQL requires that you query for each field that you need.

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

### Custom Routes
To add custom routes use the `routes` option with the ContentType name as the key and the custom route as the value.

If you have Contentful ContentTypes named BlogPost and Article you can add new routes like this.
```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-contentful',
      options: {
        routes: {
          'BlogPost': '/blog/:slug',
          'Article': '/articles/:slug'
        }
      }
    }
  ]
}
```
