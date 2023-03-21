<template>
  <div></div>
</template>

<page-query>
query PagedPage ($page: Int!, $perPage: Int!) {
  allPost(page: $page, perPage: $perPage) @paginate {
    edges {
      node {
        id
      }
    }
  }
}
</page-query>
