<template>
  <h1>{{ title }}</h1>
  <h4>Other Posts</h4>
  <ul>
    <li
      v-for="{ node } in $page.allPost.edges"
      :key="node.id"
    >
      <g-link :to="node.path">{{ node.title }}</g-link>
    </li>
  </ul>
</template>

<page-query>
query ($id: ID!) {
  post(id: $id) {
    title
  }
  allPost(limit: 10) {
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
import { defineComponent, computed } from 'vue'
import { usePageQuery } from 'gridsome'

export default defineComponent({
  setup() {
    const data = usePageQuery()
    const title = computed(() => data.post.title)
    return { title }
  }
})
</script>
