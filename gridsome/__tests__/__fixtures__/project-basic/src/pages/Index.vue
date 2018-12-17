<template>
  <div>
    <h1>Gridsome</h1>
    <h2>{{ $page.metaData.myTest.value }}</h2>
    <g-link :to="{ name: 'blog' }">Blog</g-link>
    <g-link :to="{ name: 'home' }" active-class="test-active">Home</g-link>
    <g-image src="~/assets/test.png" alt="Test image" width="1000" />
    <g-link to="~/assets/dummy.pdf">Download</g-link>
    <span>{{ $page.customRootValue }}</span>
    <span>{{ TEST_1 }}</span>
    <span>{{ TEST_2 }}</span>
    <span>{{ TEST_3 }}</span>
    <Footer />
  </div>
</template>

<page-query>
query Home {
  customRootValue
  metaData {
    myTest {
      value
    }
  }
}
</page-query>

<script>
import Footer from '~/components/Footer'

export default {
  components: {
    Footer
  },

  data () {
    return {
      TEST_1,
      TEST_2,
      TEST_3
    }
  },

  metaInfo () {
    return {
      meta: [{
        name: 'og:description',
        content: this.$page.metaData.myTest.value
      }]
    }
  }
}
</script>
