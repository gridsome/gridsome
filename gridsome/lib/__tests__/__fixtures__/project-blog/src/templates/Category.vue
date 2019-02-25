<template>
  <div>
    <h1 class="category-title">{{ $page.category.title }}</h1>
    <ul>
      <li v-for="{ node } in $page.category.belongsTo.edges" :key="node.id" :class="`post-${node.id}`">
        <span>{{ node.title }}</span>
      </li>
    </ul>
    <Pager :info="$page.category.belongsTo.pageInfo"/>
  </div>
</template>

<page-query>
query Tag ($id: String!, $page: Int, $showType: String) {
  category (id: $id) {
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
