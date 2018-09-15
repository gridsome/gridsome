# @gridsome/source-wordpress

> WordPress source for Gridsome

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-contentful',
      options: {
        baseUrl: 'WEBSITE_URL', // required
        perPage: 100,
        concurrent: 10,
        namespace: 'WordPress',
        routes: {
          post: '/:year/:month/:day/:slug',
          post_tag: '/tag/:slug'
        }
      }
    }
  ]
}
```
