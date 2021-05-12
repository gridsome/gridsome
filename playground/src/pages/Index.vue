<script setup>
import { computed, onMounted } from 'vue'
import { Pager, usePageQuery, useStaticQuery, useFetch, useHead } from 'gridsome'
import ClientOnlyComponent from '../components/ClientOnlyComponent.vue'

const fetch = useFetch()

useHead({
  title: 'Hello, world!'
})

onMounted(() => {
  fetch('/blog/post-10').then(({ data }) => {
    console.log(data)
  })
})

const pageQuery = usePageQuery()
const staticQuery = useStaticQuery()

const posts = computed(() => {
  return pageQuery.allPost.edges.map(({ node }) => node)
})
</script>

<template>
  <g-image
    alt="Example image"
    src="~/favicon.png"
    width="135"
  />

  <h1>{{ staticQuery.metadata.siteName }}</h1>

  <teleport to="#endofbody">
    <div>Teleported #endofbody</div>
  </teleport>

  <p>
    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur excepturi labore tempore expedita, et iste tenetur suscipit explicabo! Dolores, aperiam non officia eos quod asperiores.
  </p>

  <ClientOnly>
    <ClientOnlyComponent />
  </ClientOnly>

  <h3>Posts:</h3>
  <ul>
    <li
      v-for="post in posts"
      :key="post.id"
    >
      <g-link :to="post.path">{{ post.title }}</g-link>
    </li>
  </ul>
  <Pager class="pagination" :info="pageQuery.allPost.pageInfo" />
</template>

<static-query>
query {
  metadata {
    siteName
  }
}
</static-query>

<page-query>
query ($page: Int) {
  allPost(page: $page, perPage: 3) @paginate {
    pageInfo {
      currentPage
      totalPages
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

<style>
.home-links a {
  margin-right: 1rem;
}
.pagination > a {
  padding: 0 0.5rem;
}
#endofbody {
  padding: 1.0rem;
  text-align: center;
}
</style>
