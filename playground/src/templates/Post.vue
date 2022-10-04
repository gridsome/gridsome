<script setup lang="ts">
import { useMetaInfo, usePageQuery } from 'gridsome'

const data = usePageQuery()

useMetaInfo(() => ({
  title: data?.post.title,
  meta: [
    {
      name: 'description',
      content: data?.post.excerpt
    }
  ],
  bodyAttrs: {
    class: ['foo', 'bar']
  }
}))
</script>

<template>
  <Layout>
    <h1>{{ data?.post.title }}</h1>
    <ul>
      <li v-for="{ node } of data?.allPost.edges || []" :key="node.id">
        <g-link :to="node.path">{{ node.title }}</g-link>
      </li>
    </ul>
  </Layout>
</template>

<page-query>
query ($id: ID!) {
  post(id: $id) {
    title
    excerpt
  }
  allPost(filter: { id: { nin: [$id] } }) {
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
