# @gridsome/source-wordpress

> WordPress source for Gridsome. This package is under development and
API might change before v1 is released.

## Install
- `yarn add @gridsome/source-wordpress`
- `npm install @gridsome/source-wordpress`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-wordpress',
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
