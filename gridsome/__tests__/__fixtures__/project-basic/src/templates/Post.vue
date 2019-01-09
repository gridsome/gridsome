<template>
  <div>
    <h1>{{ $page.post.title }}</h1>
    <span>{{ $page.post.date }}</span>
  </div>
</template>

<page-query>
query Post ($path: String!, $dateFormat: String) {
  post (path: $path) {
    title
    date (format: $dateFormat)
  }
}
</page-query>
