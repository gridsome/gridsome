<template>
  <div>
    <h1>Custom 404 - not found</h1>
    <span>{{ $page.customRootValue }}</span>
  </div>
</template>

<page-query>
query Page404 {
  customRootValue
}
</page-query>
