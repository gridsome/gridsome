# @gridsome/source-drupal

> Drupal source for Gridsome.

## Quick Overview

**BREAKING CHANGE FROM 0.2.1 to 0.3.0**
The shape for accessing relationships on a node via GraphQL has changed. See [Example Page Queries](#example-page-queries).

This is the source plugin for pulling in data from the Drupal content management system for Gridsome. The Drupal module [JSON:API](https://www.drupal.org/project/jsonapi) is required for this plugin to work correctly.

## Install

- `npm install @gridsome/source-drupal`
- `yarn add @gridsome/source-drupal`
- `pnpm install @gridsome/source-drupal`

## Usage

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
| `exclude` | *see lib/constants.js* | An array of entity types you want excluded from the [GraphQL conversion](#api-schema-to-graphql-conversion). Any length array will fully override the defaults. [See Excludes](#excludes).
`requestConfig` | `{}` | A config object that is passed directly to `axios` request. [See Auth](#auth).
`typeName` | `Drupal` | A String value to name space your GraphQL Types during conversion - this prevents collisions with other plugins. [See GraphQL Conversion](#api-schema-to-graphql-conversion).

### API Schema to GraphQL Conversion

The first operation this plugin performs is a request to the api root:

```js
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
> Note: JSON:API can return an attribute `path` that contains an object. This `path` attribute conflicts with Gridsome's GraphQL `path` field. To avoid conflict the Drupal data contained in `path` has been renamed to `drupal_path`.

The url `values` of the `links` object get looped over and requested via `axios` and each response becomes processed, converted into `nodes` on each respective GraphQL Type. Each entity response comes with a `relationship` object which is merged into each `node` - the Gridsome Core then intelligently creates all the GraphQL Connects. [See example page queries below](#example-page-queries).

Within your Gridsome project, run `gridsome develop` and access `http://localhost:8080/___explore` to see all the relationships.

### Routing

Use the `templates` option in `gridsome.config.js` to specify the url schema for each entity type individually:

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-drupal',
      options: {
        typeName: 'Drupal',
        baseUrl: 'https://somedrupalsite.pantheonsite.io'
      }
    }
  ],
  templates: {
    DrupalNodeArticle: '/articles/:title',
    DrupalTaxonomyTermTags: '/tags/:name'
  }
}
```

[Read more about templates in Gridsome](https://gridsome.org/docs/templates/)

Path parameters can be any GraphQL field on that node:
`DrupalNodeArticle: 'aritlces/:langcode/:title/' -> /aritcles/en/lorem-ipsum/`

### Contenta CMS

[Contenta CMS](https://github.com/contentacms/contenta_jsonapi#--contenta-cms--) should work out-of-the-box with @gridsome/source-drupal. The main difference being, Contenta CMS is by default already using [JSON:API Extras](https://www.drupal.org/project/jsonapi_extras). This gives the user more flexibility and control over resources returned by the api.

JSON:API has a clear finite list of features which are listed on its [Drupal project page](https://www.drupal.org/project/jsonapi_extras).

This has the biggest impact in regards to the [API Schema to GraphQL Conversion](#api-schema-to-graphql-conversion) mentioned above. Custom types/nodes won't be return with the prefixed `node--`, which will affect your `routes` configuration in `gridsome.config.js`. Look closely at the payload returned by `/api` and make adjustments accordingly.

Here is an [example `gridsome.config.js`](https://github.com/matt-e-king/gridsome-starter-drupal/blob/master/gridsome.config.js) in the Drupal Source Starter, see the commented out section at the bottom for Contenta CMS.

**NOTE:** This will also affect your GraphQL queries:

```
article -> DrupalArticle
recipies -> DrupalRecipes
```

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
        baseUrl: 'https://somedrupalsite.pantheon.io',
        exclude: [ ...defaultExcludes, 'user--user' ], // include the defaults
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
        baseUrl: 'https://somedrupalsite.pantheon.io',
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
    allDrupalNodeArticle(perPage:100) {
      edges {
        node {
          id
          title
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
  query Article($id: ID!) {
    drupalNodeArticle(id: $id) {
      title
      date
      body {
        processed
      }
      field_image {
        node {
          filename
          uri {
            url
          }
        }
        meta {
          alt
          title
        }
      }
      field_tags {
        node {
          name
          path
        }
      }
    }
  }
</page-query>
```

Note that you can also search through the resources by other filters such are `path` (so you can lookup based on the route, for example). Remember to explore the graphql schema to better see what you can gather, what you can filter on.

Any `relationships` containing a `meta` object in the JSON:API response will be merged as a sibling object alongside `node`. See `field_image` above as an example.

Taxonomy terms get a little trickier but you can use `Fragments` (and `Inline Fragments`) to generate a query that 'joins' between your node resource and your tag resource:

```
  query Tag($id: ID!) {
    tag: drupalTaxonomyTermTags(id: $id) {
      title
      belongsTo {
        edges {
          node {
            id
            ... on DrupalNodeArticle {
              title
              path
              date_path
              body {
                processed
              }
            }
          }
        }
      }
    }
  }
```

And everything within the `DrupalNodeArticle` can be treated the same as for a regular node query.
