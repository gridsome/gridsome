<template>
  <Layout :class="['doc-template', `doc-template-${$page.testDoc.id}`, `page-${$page.testDoc.belongsTo.pageInfo.currentPage}`]">
    <h1>{{ $page.testDoc.title }}</h1>
    <g-link class="page-link-1" to="/pages/1">Page 1</g-link>
    <g-link class="page-link-2" to="/pages/2">Page 2</g-link>
    <ul>
      <li v-for="{ node } in $page.testDoc.belongsTo.edges" :key="node.id" :class="`doc-${node.id}`">
        <g-link :to="node.path" :class="`doc-link-${node.id}`">
          {{ node.title }}
        </g-link>
      </li>
    </ul>
    <Pager :info="$page.testDoc.belongsTo.pageInfo"/>
  </Layout>
</template>

<page-query>
query TestDoc($id: String!, $page: Int, $perPage: Int) {
  testDoc(id: $id) {
    id
    title
    belongsTo(page: $page, perPage: $perPage) @paginate {
      pageInfo {
        totalPages
        currentPage
      }
      edges {
        node {
          ... on TestDoc {
            id
            path
            title
          }
        }
      }
    }
  }
}
</page-query>

<script>
import { Pager } from 'gridsome'

export default {
  components: {
    Pager
  }
}
</script>
