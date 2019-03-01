<template>
  <div :class="{ 'is-mounted': isMounted }">
    <slot />
    <Footer />
  </div>
</template>

<script>
import Footer from '~/components/Footer'

export default {
  components: {
    Footer
  },
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

<style>
.is-mounted {
  background: #f2f2f2;
}
</style>
