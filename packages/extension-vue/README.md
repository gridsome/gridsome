# @gridsome/extension-vue

> Vue extension for GraphQL schema.

## Install

- `yarn add @gridsome/extension-vue`
- `npm install @gridsome/extension-vue`

## Usage

This example assumes the project has a collection named `Documentation`. First, install this package and add it to the `plugins` option in `gridsome.config.js`.

```js
module.exports = {
  plugins: [
    '@gridsome/extension-vue'
  ]
}
```

Then, use the extension on a field you want to transform to a Vue component.

```js
module.exports = api => {
  api.createSchema(({ addSchemaTypes }) => {
    addSchemaTypes(`
      type Documentation implements Node {
        content: String @vue
      }
    `)
  })
}
```

```html
<template>
  <div>
    <VueRenderer
      :source="$page.documentation.content"
      :components="components"
      :data="{ id }"
    />
  </div>
</template>

<page-query>
query Documentation ($id: ID!) {
  documentation(id: $id) {
    content
  }
}
</page-query>

<script>
import { VueRenderer } from '@gridsome/extension-vue'

export default {
  components: {
    VueRenderer
  },
  data: () => ({
    components: {}
  })
}
</script>
```

#### name

Set a custom extension name. Defaults to `vue`.
