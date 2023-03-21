<template>
  <Layout :class="['doc-extra-template', `doc-extra-template-${$page.testDoc.id}`]">
    <h1>{{ $page.testDoc.title }} (extra)</h1>
    <g-link class="doc-link" :to="$page.testDoc.path">Back</g-link>
  </Layout>
</template>

<page-query>
query TestDoc($id: ID!) {
  testDoc(id: $id) {
    id
    title
    path
  }
}
</page-query>
