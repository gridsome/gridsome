<template>
  <Layout class="page-template">
    <h1>{{ $page.testPage.title }}</h1>
    <h2>{{ $page.allTestDoc.edges[0].node.title }}</h2>
    <g-link class="home-link" to="/">Home</g-link>
  </Layout>
</template>

<page-query src="../queries/TestPage.gql" />
