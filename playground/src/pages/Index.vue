<template>
  <g-image
    alt="Example image"
    src="~/favicon.png"
    width="135"
  />

  <h1>{{ $page.metadata.siteName }}</h1>

  <teleport to="#endofbody">
    <div>Teleported #endofbody</div>
  </teleport>

  <p>
    Lorem ipsum dolor sit amet, consectetur adipisicing elit. Pariatur excepturi labore tempore expedita, et iste tenetur suscipit explicabo! Dolores, aperiam non officia eos quod asperiores.
  </p>

  <h3>Posts:</h3>
  <ul>
    <li
      v-for="post in posts"
      :key="post.id"
    >
      <g-link :to="post.path">{{ post.title }}</g-link>
    </li>
  </ul>
  <Pager class="pagination" :info="$page.allPost.pageInfo" />
</template>

<page-query>
query ($page: Int) {
  metadata {
    siteName
  }
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

<script setup>
import { computed, onMounted } from 'vue'
import { usePageQuery, useFetch } from 'gridsome'

const fetch = useFetch()
const data = usePageQuery()

onMounted(() => {
  fetch('/blog/post-10').then(({ data }) => {
    console.log(data)
  })
})

export { Pager } from 'gridsome'

export const posts = computed(() => {
  return data.allPost.edges.map(({ node }) => node)
})
</script>

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
