<template>
  <Layout>
    <h1 class="post-title">{{ $page.post.title }}</h1>
    <span class="post-date">{{ $page.post.date }}</span>
  </Layout>
</template>

<page-query>
query Post ($path: String!, $dateFormat: String) {
  post (path: $path) {
    title
    date (format: $dateFormat)
  }
}
</page-query>

<script>
export default {
  metaInfo () {
    return {
      title: this.$page.post.title
    }
  }
}
</script>
