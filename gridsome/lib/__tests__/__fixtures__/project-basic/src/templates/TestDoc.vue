<template>
  <Layout>
    <h1>{{ $page.testDoc.title }}</h1>
    <ul>
      <li v-for="{ node } in $page.testDoc.belongsTo.edges" :key="node.id" :class="`doc-${node.id}`">
        <span>{{ node.title }}</span>
      </li>
    </ul>
    <Pager :info="$page.testDoc.belongsTo.pageInfo"/>
  </Layout>
</template>

<page-query>
query TestDoc($id: String!, $page: Int, $perPage: Int) {
  testDoc(id: $id) {
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
