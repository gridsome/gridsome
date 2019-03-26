<template>
  <div></div>
</template>

<page-query>
query MovieTemplate ($id: String!) {
  movie (id: $id) {
    id
  }
}
</page-query>
