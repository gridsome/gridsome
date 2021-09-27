# @gridsome/source-ghost

> Ghost source for Gridsome. This package is under development and API might change before v1 is released.

## Install

- `npm install @gridsome/source-ghost`
- `yarn add @gridsome/source-ghost`
- `pnpm install @gridsome/source-ghost`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-ghost',
      options: {
        typeName: 'Ghost',
        baseUrl: 'http://localhost:2368',
        contentKey: '0b7050113fba7147f358cc2f4d',
        version: 'v3' // default
      }
    }
  ],
  templates: {
    GhostPost: '/:year/:month/:day/:slug',
    GhostTag: '/tag/:slug'
  }
}
```
