# @gridsome/source-filesystem

> Transform files into content that can be fetched with GraphQL in your components.

## Install

- `yarn add @gridsome/source-filesystem`
- `npm install @gridsome/source-filesystem`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        typeName: 'BlogPost',
        path: './content/blog/**/*.md',
      }
    }
  ],
  templates: {
    BlogPost: '/blog/:year/:month/:day/:slug'
  }
}
```

A filesystem source will also require a transformer in order to parse the files. The example above is looking for a set of [Markdown](https://en.wikipedia.org/wiki/Markdown) files, so in order to let [Gridsome](https://gridsome.org) understand the content of the files, you must install [@gridsome/transformer-remark](https://www.npmjs.com/package/@gridsome/transformer-remark) as a dev dependency in your project. Gridsome will automatically transform the files for you as long as a transformer that supports your files is found in your `package.json`.

## Options

#### path

- Type: `string` *required*

Where to look for files. Should be a [glob](https://en.wikipedia.org/wiki/Glob_(programming)) pattern.

#### typeName

- Type: `string`
- Default: `'FileNode'`

The GraphQL type and template name. A `.vue` file in `src/templates` must match the `typeName` to have a template for it.

#### baseDir

- Type: `string`

The base directory for all files. The `baseDir` will not be included when routes are generated from the file paths. The option defaults to the project root directory if omitted.

The following example will look for all markdown files inside the `/content/blog` directory. A file located at `/content/blog/hello-world.md` will generate a `/hello-world` route.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        baseDir: './content/blog',
        path: '*.md'
      }
    }
  ]
}
```

#### pathPrefix

- Type: `string`

Prefix paths generated from the file location. The example below looks for markdown files inside `/content/blog/*.md`. And a file named `blog-post.md` in that folder will get a path like `/blog/my-post`. This option is excluded if a `route` is defined.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        baseDir: './content/blog',
        pathPrefix: '/blog',
        path: '*.md'
      }
    }
  ]
}
```

#### refs

- Type: `object`

Define fields that will have a reference to another node. The referenced `typeName` is expected to exist. But a content type can also be created automatically if you set `create: true`. Read more about [references](https://gridsome.org/docs/data-store-api#collectionaddreferencefieldname-typename).

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-filesystem',
      options: {
        refs: {
          // Reference to existing authors by id.
          author: 'Author',
          // Create a Tag content type and its nodes automatically.
          tags: {
            typeName: 'Tag',
            create: true
          }
        }
      }
    }
  ]
}
```

#### index

- Type: `Array`
- Default: `['index']`

Define which files to consider as index files. These files will not have their filename appear in its route path and will become the main `index.html` file of the directory. Make sure there is only one possible index file per directory if multiple index names are defined. This option is only used if there is no dynamic `route` defined.
