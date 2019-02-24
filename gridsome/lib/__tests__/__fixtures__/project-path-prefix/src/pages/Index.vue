<template>
  <div>
    <h1>{{ $page.metaData.siteName }}</h1>
    <g-link class="g-link-home" :to="{ name: 'home' }" active-class="test-active">Home</g-link>
    <g-link class="g-link-about" :to="{ name: 'about' }">About</g-link>
    <g-link class="g-link-file" to="~/assets/dummy.pdf">Download</g-link>
    <g-image class="g-image-test" src="~/assets/test.png" alt="Test image" width="1000" />
  </div>
</template>

<page-query>
query Home {
  metaData {
    siteName
  }
}
</page-query>
