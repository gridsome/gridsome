<template>
  <div>Should only render in the browser</div>
</template>

<script>
export default {
  created() {
    console.log(window.innerWidth)
  }
}
</script>
