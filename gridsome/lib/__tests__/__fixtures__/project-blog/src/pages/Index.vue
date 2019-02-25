<template>
  <Layout>
    <h1>Blog</h1>
    <span class="current-page">{{ $page.posts.pageInfo.currentPage }}</span>
    <ul>
      <li v-for="{ node } in $page.posts.edges" :key="node.id" :class="`post-${node.id}`">
        <span>{{ node.title }}</span>
        <g-link :to="node.path">Read more</g-link>
      </li>
    </ul>
    <Pager :info="$page.posts.pageInfo"/>
  </Layout>
</template>

<page-query>
query Blog ($page: Int) {
  posts: allPost (
    perPage: 2,
    page: $page,
    filter: {
      excluded: {
        ne: true
      }
    }
  ) @paginate {
    pageInfo {
      totalPages
      currentPage
    }
    edges {
      node {
        id
        title
        path
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
