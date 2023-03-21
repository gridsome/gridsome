<template>
  <Layout :class="[`category-${$page.category.id}`, `category-page-${$page.category.belongsTo.pageInfo.currentPage}`]">
    <h1 class="category-title">{{ $page.category.title }}</h1>
    <ul>
      <li v-for="{ node } in $page.category.belongsTo.edges" :key="node.id" :class="`post-${node.id}`">
        <g-link :class="`post-link-${node.id}`" :to="node.path">{{ node.title }}</span>
      </li>
    </ul>
    <Pager :info="$page.category.belongsTo.pageInfo"/>
  </Layout>
</template>

<page-query>
query Category ($id: ID!, $page: Int, $showType: TypeName) {
  category (id: $id) {
    id
    title
    belongsTo (
      perPage: 2,
      page: $page,
      filter: {
        typeName: { eq: $showType }
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
