<template>
  <div class="custom-child-route">
    <span class="custom-child-route-heading">
      {{ $static.metadata.siteName }}
    </span>
  </div>
</template>

<static-query>
query {
  metadata {
    siteName
  }
}
</static-query>
