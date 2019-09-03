<template>
  <router-view />
</template>

<static-query>
query {
  metaData {
    siteName
    siteDescription
  }
}
</static-query>

<script>
export default {
  metaInfo () {
    const metaInfo = { meta: [] }
    const { siteName, siteDescription } = this.$static.metaData

    metaInfo.title = siteName + ' [basic]'

    metaInfo.meta.push({
      key: 'description',
      name: 'description',
      content: siteDescription
    })

    return metaInfo
  }
}
</script>
