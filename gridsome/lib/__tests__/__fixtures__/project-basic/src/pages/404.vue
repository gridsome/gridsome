<template>
  <div>
    <h1>Custom 404 - not found</h1>
    <span class="page-query-value">
      {{ $page.customRootValue }}
    </span>
  </div>
</template>

<page-query>
query Page404 {
  customRootValue
}
</page-query>
