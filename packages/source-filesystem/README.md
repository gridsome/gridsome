# Filesystem source for Gridsome

> Transform files into content that can be fetched with GraphQL in your components.

### Usage

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

### Options

- **path** required
- **route** optional
- **type** optional, default: node
- **index** optional, default: ['index']
- **typeNamePrefix** optional, default: 'Filesystem'
