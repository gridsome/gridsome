<template>
  <div></div>
</template>

<page-query foo="bar">
query PageQuery {
  allPages {
    edges {
      node {
        title
      }
    }
  }
}
</page-query>

<script>
export default {}
</script>
