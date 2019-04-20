# @gridsome/source-strapi

> Strapi source for Gridsome. This package is under development and
API might change before v1 is released.

## Install
- `yarn add @gridsome/source-strapi`
- `npm install @gridsome/source-strapi`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-strapi',
      options: {
        apiUrl: 'Url_to_your_strapi_instance', //required
        typeName: 'Prefix for all data types',
        query: `GRAPHQL QUERY GOES HERE`
      }
    }
  ]
}
```

## Alpha Issues
@gridsome/souce-strapi is still alpha and is being worked on. This till needs testing and authentication needs to be implemented.