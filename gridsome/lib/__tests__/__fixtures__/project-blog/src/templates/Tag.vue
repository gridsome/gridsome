<template>
  <Layout :class="[`tag-${$page.tag.id}`, `tag-page-${$page.tag.belongsTo.pageInfo.currentPage}`]">
    <h1 class="tag-title">{{ $page.tag.title }}</h1>
    <ul>
      <li v-for="{ node } in $page.tag.belongsTo.edges" :key="node.id" :class="`post-${node.id}`">
        <g-link :class="`post-link-${node.id}`" :to="node.path">{{ node.title }}</g-link>
      </li>
    </ul>
    <Pager :info="$page.tag.belongsTo.pageInfo"/>
  </Layout>
</template>

<page-query>
query Tag ($path: String!, $page: Int, $perPage: Int = 5) {
  tag (path: $path) {
    id
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
