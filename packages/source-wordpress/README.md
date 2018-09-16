# @gridsome/source-wordpress

> WordPress source for Gridsome. This package is under development and
API might change before v1 is released.

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-contentful',
      options: {
        baseUrl: 'WEBSITE_URL', // required
        typeName: 'WordPress',
        perPage: 100,
        concurrent: 10,
        routes: {
          post: '/:year/:month/:day/:slug',
          post_tag: '/tag/:slug'
        }
      }
    }
  ]
}
```
