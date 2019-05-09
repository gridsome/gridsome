<template>
  <div></div>
</template>

<page-query>
query DefaultTemplate ($path: String!, $page: Int, $author: String) {
  post (path: $path) {
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
