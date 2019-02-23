<template>
  <Layout>
    <h1 v-html="$page.post.title"/>
  </Layout>
</template>

<page-query>
query Post ($id: String!) {
  post (id: $id) {
    title
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
