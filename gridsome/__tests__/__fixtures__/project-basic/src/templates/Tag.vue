<template>
  <div>
    <h1>{{ $page.tag.title }}</h1>
    <ul>
      <li v-for="{ node } in $page.tag.belongsTo.edges" :key="node.id">
        {{ node.title }}
      </li>
    </ul>
  </div>
</template>

<page-query>
query Tag ($path: String!) {
  tag (path: $path) {
    title
    belongsTo (perPage: 2) {
      edges {
        node {
          ...on Post {
            id
            title
            path
          }
        }
      }
    }
  }
}
</page-query>
