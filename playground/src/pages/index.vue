<script lang="ts" setup>
import { useMetaInfo, usePageQuery } from 'gridsome'

const data = usePageQuery()

useMetaInfo({
  title: `Hello, ${data?.metadata.siteName}!`,
  bodyAttrs: {
    class: ['dark-mode', 'mobile']
  }
})
</script>

<template>
  <Layout>
    <g-image alt="Example image" src="~/favicon.png" width="135" />
    <h1>Hello, world!</h1>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur excepturi labore tempore expedita, et iste tenetur suscipit explicabo! Dolores, aperiam non officia eos quod asperiores
    </p>
    <ul>
      <li v-for="{ node } of data?.allPost.edges" :key="node.id">
        <g-link :to="node.path">{{ node.title }}</g-link>
      </li>
    </ul>
  </Layout>
</template>

<page-query>
query {
  metadata {
    siteName
  }
  allPost {
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
