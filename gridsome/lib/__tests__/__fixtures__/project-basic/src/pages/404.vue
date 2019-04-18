<template>
  <Layout class="not-found">
    <h1>Custom 404 - not found</h1>
    <g-link class="home-link" to="/">Home</g-link>
    <span class="page-query-value">
      {{ $page.customRootValue }}
    </span>
  </Layout>
</template>

<page-query>
query Page404 {
  customRootValue
}
</page-query>
