<template>
  <div>
    <h1>Welcome to my blog</h1>
    <span class="current-page">{{ $page.posts.pageInfo.currentPage }}</span>
    <Pager :info="$page.posts.pageInfo"/>
    <ul>
      <li v-for="{ node } in $page.posts.edges" :key="node.id">
        <h2 v-html="node.title"/>
        <router-link :to="node.path">
          Read more
        </router-link>
      </li>
    </ul>
  </div>
</template>

<page-query>
query Home ($page: Int) {
  posts: allPost (perPage: 10, page: $page) @paginate {
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
