<template>
  <Layout :class="`post-${$page.post.id}`">
    <h1 class="post-title">{{ $page.post.title }}</h1>
    <span class="post-date">{{ $page.post.date }}</span>
    <g-link class="home-link" to="/">Home</g-link>
    <g-link
      v-if="$page.post.category"
      :class="`category-link-${$page.post.category.id}`"
      :to="$page.post.category.path"
    >
      {{ $page.post.category.title }}
    </g-link>
    <ul>
      <li v-for="tag in $page.post.tags" :key="tag.id">
        <g-link :class="`tag-link-${tag.id}`" :to="tag.path">{{ tag.title }}</g-link>
      </li>
    </ul>
  </Layout>
</template>

<page-query>
query Post ($id: ID!, $dateFormat: String) {
  post (id: $id) {
    id
    title
    date (format: $dateFormat)
    tags {
      id
      title
      path
    }
    category {
      id
      title
      path
    }
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
