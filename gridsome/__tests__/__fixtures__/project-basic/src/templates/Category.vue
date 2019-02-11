<template>
  <div>
    <h1>{{ $page.category.title }}</h1>
    <ul>
      <li v-for="{ node } in $page.category.belongsTo.edges" :key="node.id">
        {{ node.title }}
      </li>
    </ul>
    <Pager :info="$page.category.belongsTo.pageInfo"/>
  </div>
</template>

<page-query>
query Tag ($path: String!, $page: Int, $showType: String) {
  category (path: $path) {
    title
    belongsTo (
      perPage: 2,
      page: $page,
      filter: {
        typeName: { regex: $showType }
      }
    ) @paginate {
      pageInfo {
        totalPages
        currentPage
      }
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

<script>
import { Pager } from 'gridsome'

export default {
  components: {
    Pager
  }
}
</script>
