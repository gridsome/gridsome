# @gridsome/source-ghost

> ghost source for Gridsome. This package is under development and
API might change before v1 is released.

## Install
- `yarn add @gridsome/source-ghost`
- `npm install @gridsome/source-ghost`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-ghost',
      options: {
        url: 'http://localhost:2368',
        key: '0b7050113fba7147f358cc2f4d',
        perPage: 100,
        routes: {
          post: '/:year/:month/:day/:slug',
          post_tag: '/tag/:slug'
        }
      }
    }
  ]
}
```