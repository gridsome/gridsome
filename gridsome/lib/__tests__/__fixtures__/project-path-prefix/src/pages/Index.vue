<template>
  <Layout class="home">
    <h1>{{ $page.metadata.siteName }}</h1>
    <g-link class="g-link-home" to="/" active-class="test-active">Home</g-link>
    <g-link class="g-link-about" to="/about">About</g-link>
    <g-link class="g-link-missing" to="/missing">Missing</g-link>
    <g-link class="g-link-file" to="~/assets/dummy.pdf">Download</g-link>
    <g-image class="g-image-test" src="~/assets/test.png" alt="Test image" width="1000" />
  </Layout>
</template>

<page-query>
query Home {
  metadata {
    siteName
  }
}
</page-query>
