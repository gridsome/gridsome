<template>
  <div></div>
</template>

<page-query>
query DefaultTemplate ($id: String!, $page: Int, $author: String) {
  post (id: $id) {
    id
    belongsTo (page: $page, perPage: 2) @paginate {
      edges {
        node {
          __typename
        }
      }
    }
  }
}
</page-query>
