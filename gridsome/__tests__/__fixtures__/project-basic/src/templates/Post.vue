<template>
  <div>
    <h1>{{ $page.post.title }}</h1>
  </div>
</template>

<page-query>
query Post ($path: String!) {
  post (path: $path) {
    title
  }
}
</page-query>
