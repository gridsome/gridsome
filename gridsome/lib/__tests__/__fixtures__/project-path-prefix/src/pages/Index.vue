<template>
  <div>
    <h1>{{ $page.metaData.siteName }}</h1>
    <g-link :to="{ name: 'about' }">About</g-link>
    <g-link :to="{ name: 'home' }" active-class="test-active">Home</g-link>
    <g-image src="~/assets/test.png" alt="Test image" width="1000" />
    <g-link to="~/assets/dummy.pdf">Download</g-link>
  </div>
</template>

<page-query>
query Home {
  metaData {
    siteName
  }
}
</page-query>
