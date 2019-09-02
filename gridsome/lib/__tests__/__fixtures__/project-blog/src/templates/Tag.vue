<template>
  <Layout :class="[`tag-${$page.tag.id}`, `tag-page-${$page.tag.belongsTo.pageInfo.currentPage}`]">
    <h1 class="tag-title">{{ $page.tag.title }}</h1>
    <g-link class="tag-default-link" :to="$page.tag.path">default</g-link>
    <g-link class="tag-extra-link" :to="`/tag/${$page.tag.id}/extra`">extra</g-link>
    <ul>
      <li v-for="{ node } in $page.tag.belongsTo.edges" :key="node.id" :class="`post-${node.id}`">
        <g-link :class="`post-link-${node.id}`" :to="node.path">{{ node.title }}</g-link>
      </li>
    </ul>
    <Pager :info="$page.tag.belongsTo.pageInfo"/>
  </Layout>
</template>

<page-query>
query Tag (
  $id: ID!
  $page: Int
  $perPage: Int = 5
  $skip: Int = 0
  $limit: Int = 10
) {
  tag (id: $id) {
    id
    title
    path
    belongsTo (
      perPage: $perPage
      page: $page
      skip: $skip
      limit: $limit
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
