# @gridsome/extension-remark

> Remark extension for GraphQL schema.

## Install

- `yarn add @gridsome/extension-remark`
- `npm install @gridsome/extension-remark`

## Usage

This example assumes the project has a collection named `Documentation`. First, install this package and add it to the `plugins` option in `gridsome.config.js`.

```js
module.exports = {
  plugins: [
    '@gridsome/extension-remark'
  ]
}
```

Then, use the extension on a field you want to transform from Markdown to HTML.

```js
module.exports = api => {
  api.createSchema(({ addSchemaTypes }) => {
    addSchemaTypes(`
      type Documentation implements Node {
        content: String @remark
      }
    `)
  })
}
```

```html
<template>
  <div v-html="$page.documentation.content" />
</template>

<page-query>
query Documentation ($id: ID!) {
  documentation(id: $id) {
    content
  }
}
</page-query>
```

#### name

Set a custom extension name. Defaults to `remark`.

#### plugins

Add additional [Remark](https://remark.js.org/) plugins. [Read more](https://github.com/remarkjs/remark/blob/master/doc/plugins.md#list-of-plugins).

#### parserOptions

Custom [Remark](https://remark.js.org/) parser options. [Read more](https://github.com/remarkjs/remark/tree/master/packages/remark-parse#options).

#### compilerOptions

Custom [Remark](https://remark.js.org/) compiler options. [Read more](https://github.com/remarkjs/remark-html#options).

