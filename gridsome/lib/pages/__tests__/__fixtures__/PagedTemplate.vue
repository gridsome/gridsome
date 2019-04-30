<template>
  <div></div>
</template>

<page-query>
query PagedTemplate ($id: String!, $page: Int) {
  post (id: $id) {
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
