# @gridsome/source-drupal

> Drupal source for Gridsome.

### Quick Overview

This is the source plugin for pulling in data from the Drupal content management system for Gridsome. The Drupal module [JSON:API](https://www.drupal.org/project/jsonapi) is required for this plugin to work correctly. 

### Install
* `yarn add @gridsome/source-drupal`
* `npm install @gridsome/source-drupal`

### Usage
Depending on your Drupal and JSON:API configuration, you only need to specify `baseUrl` to get up and running:

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-drupal',
      options: {
        baseUrl: 'https://somedrupalsite.pantheon.io'
      }
    }
  ]
}
```

Here are all supported options:

Property |Default Value | Notes
---|---|---
`apiBase` | `jsonapi` | This value is appended to the `baseUrl` to create the root url for your api. The JSON:API default value is `jsonapi` but can be changed using [JSON:API Extras](https://www.drupal.org/project/jsonapi_extras)
`baseUrl` | *none*, **required** | This is the base url of your Drupal instance. (`https://somedrupalsite.pantheon.io`)
| `exclude` | *see lib/constants.js* | An array of entity types you want excluded from the [GraphQL conversion](#api-schema-to-graphql-conversion). Any length array will fully override the defaults. [See Excludes](#exclude).
`requestConfig` | `{}` | A config object that is passed directly to `axios` request. [See Auth](#auth).
`routes` | `{}`| An object keyed by entity type that specifies a `path` value override used for dynamic routing. [See Routing](#routing).
`typeName` | `Drupal` | A String value to name space your GraphQL Types during conversion - this prevents collisions with other plugins. [See GraphQL Conversion](#api-schema-to-graphql-conversion).

### API Schema to GraphQL Conversion
The first operation this plugin performs is a request to the api root:
```
axios.get(url, config) // url is baseUrl and apiBase combined
```
The JSON:API returns a manifest of available endpoints for all the entities in Drupal. It typically looks something like this (this is a shortened version):

```json
{
  "data": [],
  "links": {
    ...
    "self": "https://somedrupalsite.pantheion.io/jsonapi",
    "block--block": "https://somedrupalsite.pantheion.io/jsonapi/block/block",
    "block_content--basic": "https://somedrupalsite.pantheion.io/jsonapi/block_content/basic",
    "comment_type--comment_type": "https://somedrupalsite.pantheion.io/jsonapi/comment_type/comment_type",
    "comment--comment": "https://somedrupalsite.pantheion.io/jsonapi/comment/comment",
    "file--file": "https://somedrupalsite.pantheion.io/jsonapi/file/file",
    "filter_format--filter_format": "https://somedrupalsite.pantheion.io/jsonapi/filter_format/filter_format",
    "image_style--image_style": "https://somedrupalsite.pantheion.io/jsonapi/image_style/image_style",
    "node_type--node_type": "https://somedrupalsite.pantheion.io/jsonapi/node_type/node_type",
    "node--article": "https://somedrupalsite.pantheion.io/jsonapi/node/article",
    "node--page": "https://somedrupalsite.pantheion.io/jsonapi/node/page",
    "menu--menu": "https://somedrupalsite.pantheion.io/jsonapi/menu/menu",
    "taxonomy_term--category": "https://somedrupalsite.pantheion.io/jsonapi/taxonomy_term/category",
    "taxonomy_term--tags": "https://somedrupalsite.pantheion.io/jsonapi/taxonomy_term/tags",
    "taxonomy_vocabulary--taxonomy_vocabulary": "https://somedrupalsite.pantheion.io/jsonapi/taxonomy_vocabulary/taxonomy_vocabulary",
    "user--user": "https://somedrupalsite.pantheion.io/jsonapi/user/user",
    ...
  }
}
```

All `keys` in the `links` object of this response become the GraphQL Type prepended by the `typeName` (and with a little bit of clean up):

```
node--article -> DrupalNodeArticle
taxonomy_term--tags -> DrupalTaxonomyTermTags
user--user -> DrupalUser
```

> The `keys` above are the defaults, but can be changed using [JSON:API
> Extras](https://www.drupal.org/project/jsonapi_extras) (i.e. `node--article` can become just `article`

The url `values` of the `links` object get looped over and requested via `axios` and each response becomes processed, converted into `nodes` on each respective GraphQL Type. Each entity response comes with a `relationship` object which is merged into each `node` - the Gridsome Core then intelligently creates all the GraphQL Connects. [See example page queries below](#example-page-queries).

Within your Gridsome project, run `gridsome develop` and access `http://localhost:8080/___explore` to see all the relationships.

### Routing
Use the `routes` option in `gridsome.config.js` to specify the url schema for each entity type individually:

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-drupal',
      options: {
        baseUrl: 'https://somedrupalsite.pantheonsite.io',
        routes: {
          'node--article': '/articles/:slug',
          'taxonomy_term--tags': '/tags/:slug'
        }
      }
    }
  ]
}
```

Path parameters can be any GraphQL field on that node:
`node--article: 'aritlces/:langcode/:slug' -> /aritcles/en/lorem-ipsum`

### Excludes
A majority of the endpoints returned in the api schema are not necessary so `@gridsome/source-drupal` exclude some by default. See those defaults in `lib/constants.js`.

> WARNING: A majority of JSON:API endpoints will throw 401/403s unless permissions are granted
> If you provide your own excludes, the defaults will not be used

```js
// default exclude can be imported
const { defaultExcludes } = require('@gridsome/source-drupal')

module.exports = {
  plugins: [
    {
      use: '@gridsome/source-drupal',
      options: {
        baseUrl: 'https://dev-cctd8.pantheonsite.io',
        exclude: [ ...defaultExcludes, 'user--user' ], // include the defaults
        routes: {
          'node--article': '/articles/:slug',
          'taxonomy_term--tags': '/tags/:slug'
        }
      }
    }
  ]
}
```

### Auth
Currently `@gridsome/source-drupal` only supports Basic Auth:

```js
require('dotenv').config() // use dotenv for env variables

// requestConfig is passed directly to axios
// { auth: { username, password } } is how axios accepts basic auth

module.exports = {
  plugins: [
    {
      use: '@gridsome/source-drupal',
      options: {
        baseUrl: 'https://dev-cctd8.pantheonsite.io',
        requestConfig: {
          auth: {
            username: process.env.BASIC_AUTH_USERNAME,
            password: process.env.BASIC_AUTH_PASSWORD
          }
        }
      }
    }
  ]
}
```

Cookie Auth and OAuth coming soon...

### Example Page Queries
List all `DrupalNodeArticle` using `<page-query>` in a Gridsome page:

```
<page-query>
  query Articles {
    allDrupalNodeArticle (perPage:100) {
      edges {
        node {
          id,
          title,
          path
        }
      }
    }
  }
</page-query>
```

Get the details of an individual `DrupalNodeArticle` using `<page-query>` in a Gridsome template. GraphQL Connections are named after the relationship `key` in the XHR response:

```
<page-query>
  query Article ($path: String!) {
    drupalNodeArticles (path: $path) {
      title,
      date,
      body {
        processed
      },
      fieldImage {
        title,
        filename,
        uri {
          url
        }
      },
      fieldTags {
        name,
        path
      }
    }
  }
</page-query>
```

### Starter project

Coming soon...
