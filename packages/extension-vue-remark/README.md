# @gridsome/extension-vue-remark

> Vue Remark extension for GraphQL schema.

## Install

- `yarn add @gridsome/extension-vue-remark`
- `npm install @gridsome/extension-vue-remark`

## Usage

```js
module.exports = {
  plugins: [
    '@gridsome/extension-vue-remark'
  ]
}
```

```js
module.exports = api => {
  api.createSchema(({ addSchemaTypes }) => {
    addSchemaTypes(`
      type Documentation implements Node @infer {
        content: String @vueRemark
      }
    `)
  })
}
```

#### plugins

Add additional [Remark](https://remark.js.org/) plugins. [Read more](https://github.com/remarkjs/remark/blob/master/doc/plugins.md#list-of-plugins).

#### remark

Custom [Remark](https://remark.js.org/) options. [Read more](https://github.com/gridsome/gridsome/tree/master/packages/transformer-remark#options).
