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
        typeName: 'BlogPost',
        route: '/blog/:year/:month/:day/:slug'
      }
    }
  ]
}
```

## Options

#### path

- Type: `string` *required*

Where to look for files. Should be a glob path.

#### typeName

- Type: `string`
- Default: `'FileNode'`

The GraphQL type and template name. A `.vue` file in `src/templates` must match the `typeName` to have a template for it.

#### route

- Type: `string`

Define a dynamic route if your source is able to have a certain pathname structure. This will generate only a single route for all nodes from this source. Possible url params are `year`, `month`, `day` and `slug`. If omitted, a route for each file will be generated based on their path and filename.

#### index

- Type: `Array`
- Default: `['index']`

Define which files to consider as index files. These files will not have their filename appear in its route path and will become the main `index.html` file of the directory. Make sure there is only one possible index file per directory if multiple index names are defined.

