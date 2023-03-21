<template>
  <div :class="{ 'is-mounted': isMounted }">
    <h1>Index.vue</h1>
  </div>
</template>

<script>
export default {
  data () {
    return {
      isMounted: false
    }
  },
  mounted () {
    this.isMounted = true
  }
}
</script>
