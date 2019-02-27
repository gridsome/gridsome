<template>
  <div :class="{ 'is-mounted': isMounted }">
    <slot />
  </div>
</template>

<script>
export default {
  data () {
    return {
      isMounted: false
    }
  },
  mounted (){
    this.isMounted = true
  }
}
</script>
