<template>
  <Layout :class="{ [a]: true, [b]: true }">
    <h1 class="custom-route-title">
      {{ $static.metadata.siteName }}
    </h1>
    <router-view />
    <g-link class="home-link" to="/">Home</g-link>
  </Layout>
</template>

<static-query>
query {
  metadata {
    siteName
  }
}
</static-query>

<script>
export default {
  props: {
    a: String,
    b: String
  }
}
</script>
