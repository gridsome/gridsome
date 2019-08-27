<template>
  <Layout :class="`home-${$page.posts.pageInfo.currentPage}`">
    <h1>Blog</h1>
    <span class="current-page">{{ $page.posts.pageInfo.currentPage }}</span>
    <g-link class="not-found-link" to="/asdf">Show /404</g-link>
    <ul>
      <li v-for="{ node } in $page.posts.edges" :key="node.id" :class="`post-${node.id}`">
        <span>{{ node.title }}</span>
        <g-link :class="`post-link-${node.id}`" :to="node.path">Read more</g-link>
      </li>
    </ul>
    <Pager :linkClass="{ 'pager-link': true }" :info="$page.posts.pageInfo"/>
  </Layout>
</template>

<page-query>
query Blog ($page: Int) {
  posts: allPost (
    skip: 1
    limit: 4
    perPage: 2
    page: $page
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
