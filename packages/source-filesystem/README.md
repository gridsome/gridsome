# @gridsome/source-filesystem

> Transform files into content that can be fetched with GraphQL in your components.

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        path: 'blog/**/*.md',
        route: '/blog/:year/:month/:day/:slug'
      }
    }
  ]
}
```

## Options

#### path

- Type: `string` *required*

#### route

- Type: `string`

#### type

- Type: `string`
- Default: `'node'`

#### index

- Type: `Array`
- Default: `['index']`

#### typeName

- Type: `string`
- Default: `'Filesystem'`
