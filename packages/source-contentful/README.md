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
@gridsome/souce-contentful currently works with all Contentful Content Types except the Rich Text [Beta] type.

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
