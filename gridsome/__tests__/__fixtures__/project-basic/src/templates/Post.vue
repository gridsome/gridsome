<template>
  <Layout>
    <h1>{{ $page.post.title }}</h1>
  </Layout>
</template>

<page-query>
query Post ($path: String!) {
  post (path: $path) {
    title
  }
}
</page-query>
