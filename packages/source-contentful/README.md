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
@gridsome/souce-contentful currently works with all Contentful Content Types.

### Rich text
Contentful Rich text content types return a custom JSON response that can only be parsed to HTML with Contentful's package, https://www.npmjs.com/package/@contentful/rich-text-html-renderer

@gridsome/souce-contentful returns GraphQL queries for rich text fields from Contentful as a stringified JSON-to be parsed and passed to the contentful renderer on the Vue page/component.

#### Example
A query that returns Contentful Rich Text, where `richArticle` is the Rich text content type configured in the Contentful _Content model_:
```
<page-query>
query RichArticles {
articles: allContentfulArticle{
  edges{
    node{
      id,
      title,
      richArticle
    }
  }
}
}
</page-query>
```

The content from `richArticle` can then be passed to a Vue `method`: from the page `<template>`. In this case, the method name is `richtextToHTML`
```
 <div v-for="edge in $page.articles.edges" :key="edge.id">
      <p v-html="richtextToHTML(edge.node.richArticle)"></p>
   </div>
```

Finally, the method to convert the raw, stringified JSON from Contentful (in the most basic usage):
```
<script>
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
export default {
 methods: {
   richtextToHTML(content) {
     const richtextString = documentToHtmlString(JSON.parse(content));
     return richtextString
   }
 }
}
</script>
```
The Contentful renderer is imported, then used to convert a parsed version of the response from the page-query.

Custom parsing and more configuration details can be found on the [Contentful Rich Text HTML Render package documentation](https://www.npmjs.com/package/@contentful/rich-text-html-renderer)

#### Embeded Assets (images in Rich text)
The Contentful HTML renderer doesn't automatically render embeded assets, instead, you can configure how you want to render them using `BLOCK` types and the configuration options.

To do so, import `BLOCKS`
```
import { BLOCKS } from '@contentful/rich-text-types';
```
and setup a custom renderer before calling the `documentToHtmlString` method. Here, we're getting the image title and source url (contentful CDN src) and passing it to a string template.
```
  const options = {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: (node) => `<img src="${node.data.target.fields.file.url}" alt="${node.data.target.fields.title}" />`
    }
}
     const richtextString = documentToHtmlString(JSON.parse(content), options);

```

### Location
Contentful Location data is returned as JSON with `lat` and `lon`. You will need to query the field name and each field in the GraphQL query
```
<page-query>
query Location{
  allContentfulTestType{
    edges {
        node{
          geoLocation {
            lat,
            lon,
          }
        }
      }
    }
  }
</page-query>
```

### JSON
In Contentful JSON ContentTypes, rather than recieving the entire object when querying for the field, GraphQL requires that you query for each field that you need.
```
<page-query>
query Json {
  allContentfulTestType {
    edges {
      node {
        jsonFieldName{
          itemOne,
          itemTwo,
        }
      }
    }
  }
}
</page-query>
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
