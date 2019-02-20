<template>
  <Layout>
    <h1>Gridsome</h1>
    <h2>{{ $page.metaData.myTest.value }}</h2>
    <g-link href="http://outsidelink1.com">External Links</g-link>
    <g-link href="https://outsidelink2.com">External Links</g-link>
    <g-link href="//outsidelink3.com">External Links</g-link>
    <g-link href="https://www.gridsome.org/docs">Internal Links</g-link>
    <g-link class="g-link-1" :to="{ name: 'blog' }">Blog</g-link>
    <g-link :class="{ 'g-link-2': true }" :to="{ name: 'home' }" active-class="test-active">Home</g-link>
    <g-image src="~/assets/logo.svg" class="g-image-1" alt="SVG logo" width="300" />
    <g-image src="~/assets/test.png" :class="{ 'g-image-2': true, 'g-image-false': false }" alt="Test image" width="1000" />
    <g-image src="https://www.example.com/assets/image.png" :class="['g-image-3']" alt="External image" immediate />
    <g-image src="~/assets/test.png" alt="Immediate image" immediate/>
    <g-image src="/uploads/test.png" alt="Static image" width="300" />
    <g-link to="~/assets/dummy.pdf">Download</g-link>
    <span>{{ $page.customRootValue }}</span>
    <span>{{ TEST_1 }}</span>
    <span>{{ TEST_2 }}</span>
    <span>{{ TEST_3 }}</span>
  </Layout>
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
export default {
  data () {
    return {
      TEST_1,
      TEST_2,
      TEST_3,
      GRIDSOME_PROD_VARIABLE: process.env.GRIDSOME_PROD_VARIABLE,
      PROD_VARIABLE: process.env.PROD_VARIABLE
    }
  },

  metaInfo () {
    return {
      meta: [
        {
          name: 'og:description',
          content: this.$page.metaData.myTest.value
        },
        {
          key: 'description',
          name: 'description',
          content: 'Index description'
        },
        {
          name: 'test',
          content: 'test-meta'
        }
      ]
    }
  }
}
</script>
