

## @gridsome/source-drupal
> Drupal source for Gridsome. This package is under development and API might change before v1 is released. 

### Quick Overview

Currently, Drupal doesn't have a standardized way for retrieving collections of content through an API without developer intervention. [Drupal 8 is making great strides](https://www.drupal.org/docs/8/core/modules/rest/javascript-and-drupal-8-restful-web-services), however, it seems to be designed with single entities/nodes at a time.

Utilizing [Views](https://www.valuebound.com/resources/blog/how-to-use-REST-Export-with-Views-in-Drupal-8), [Resource Plugins](https://www.drupal.org/docs/8/api/restful-web-services-api/restful-web-services-api-overview) or popular modules ([Drupal GraphQL](https://www.drupal.org/project/graphql), [Drupal JSON:API](https://www.drupal.org/project/jsonapi)) are great ways to produce a more traditional REST interface for your Drupal site.

This plugin aims to accommodate any of these strategies, by associating URL endpoints with GraphQL types. It's all about the URLs, not about how the URLs are created.

***This is purely a jumping off point as Gridsome starts to mature - lots of common Drupal features that haven't been considered.*** 

### Install
* `yard add @gridsome/source-drupal`
* `npm install @gridsome/source-drupal`

### Usage
Add the following to your Gridsome project's `gridsome.config.js` file:
```
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-drupal',
      options: {
        baseUrl: 'http://some.drupalsite.com/',
        format: 'json',
        types: [
          { 
	        name: 'Articles',
	        restPath: 'api/articles'
	      },
          { 
	        name: 'BasicPages',
	        route: '/:slug',
	        restPath: 'api/pages'
	      }
        ]
      }
    }
  ]
}
```
|Property  | Default Value |Notes  |
|--|--|--|
| `baseUrl` | *none*, **required** |This is the base url of your Drupal instance. If you leave a trailing slash on this URL, be sure to NOT include an opening slash on the `restPath` urls in the  |
| `format` | json |This value is appended to the API url to inform Drupal which format to be returned. This requires additional configuration through the Drupal admin using the [REST UI module](https://www.drupal.org/project/restui).  |
| `types` | [] |This array of config objects is the *meat* of this plugin. The plugin will loop through this array and associate the response of each of these endpoints with a GraphQL type.  |

Each object in the `types` array supports the following:

|Property  | Default Value |Notes  |
|--|--|--|
| `name` | *none*, **required** |becomes the name of GraphQL type and used in the URL path if this type is associated directly with a Gridsome Template. For instance `name: 'Articles'` will generate a URL for a Drupal Article node with the title 'Article One' into `/article/article-one`.  |
| `restPath` | *none*, **required** |The path that is appended to `baseUrl` when content is fetched. If this values is `restPath: api/articles`, then the URL to be fetched would be `http://some.drupalsite.com/api/articles/?_format=json` (notice `format` is appended at the end)|
| `route` | `${name}/:slug` |The URL schema if this type is associated with a Gridsome Template. It also provides a "pass-through" so you can use any property from your response in the URL. Unfortunately, Gridsome only supports `:year, :month, :day or :slug` at the moment. So if your response contains any of those properties, you can specify your URL schema with them. For instance `route: /foo/bar/:year/:slug` should generate a path for each node that looks something like `/foo/var/2018/title-of-article`. See below for a breakdown of how the response object is utilized. |

### Response Objects
When creating a node in the [Gridsome Data Store](https://gridsome.org/docs/data-store-api/#collectionaddnodeoptions), the following properties are supported:
```
{ id, title, slug, path, date, content, excerpt, fields }
```
To simply things, this plugin attempts to take the response object and pass it right along to the `addNode` function with minimal transformation. An ideal response from the data source should look like:
```
{
  id: 'abc-123-efd-456', // required
  title: 'Article One', // required
  slug: 'article-one', // by default this slugifies the title
  date: '2018-12-01', // **see supported dates below
  content: 'Long content', // or "body", which is pretty standard in Drupal
  excerpt: 'Short content',
  ... // any other properties provided will be under "fields"
}
```
** [supported dates](https://github.com/gridsome/gridsome/blob/6be019a2e7d9c04b1d25218aa6f0acc7de311906/gridsome/lib/graphql/schema/types/date.js)
** `path` is provide the dynamic value of the `route` param (see above)

The above will look like this in a `<page-query>` in a Gridsome template:
```
<page-query>
  query Article ($path: String!) {
    articles (path: $path) {
      title,
      content,
      date
    }
  }
</page-query>
```
As long as you provide `id` and `title`, you can pass whatever data you want and it will all be captured as a \<GraphQLType>Fields. Example:
```
<page-query>
  query Article ($path: String!) {
    articles (path: $path) {
      title,
      fields {
        customField,
        anotherField
      }
    }
  }
</page-query>
```

### Example project
coming soon...
### Setup Views exported as REST
Good example here: https://www.valuebound.com/resources/blog/how-to-use-REST-Export-with-Views-in-Drupal-8 