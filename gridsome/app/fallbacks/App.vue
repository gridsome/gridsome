<template>
  <router-view />
</template>

<static-query>
query {
  metadata {
    siteName
    siteDescription
  }
}
</static-query>

<script>
export default {
  metaInfo () {
    const metaInfo = { meta: [] }
    const { siteName, siteDescription } = this.$static.metadata

    if (siteName) {
      metaInfo.title = siteName
    }

    if (siteDescription) {
      metaInfo.meta.push({
        key: 'description',
        name: 'description',
        content: siteDescription
      })
    }

    return metaInfo
  }
}
</script>

