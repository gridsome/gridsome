<template>
  <div>
    <h1>{{ $page.tag.title }}</h1>
    <ul>
      <li v-for="{ node } in $page.tag.belongsTo.edges" :key="node.id">
        {{ node.title }}
      </li>
    </ul>
    <Pager :info="$page.tag.belongsTo.pageInfo"/>
  </div>
</template>

<page-query>
query Tag ($path: String!, $page: Int, $perPage: Int = 5) {
  tag (path: $path) {
    title
    belongsTo (perPage: $perPage, page: $page) @paginate {
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
