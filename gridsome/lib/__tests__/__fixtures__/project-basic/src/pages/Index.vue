<template>
  <Layout class="home">
    <h1>Gridsome</h1>
    <h2 class="meta-data">{{ $page.metaData.myTest.value }}</h2>
    
    <g-link href="http://outsidelink1.com">External Links</g-link>
    <g-link href="https://outsidelink2.com">External Links</g-link>
    <g-link href="//outsidelink3.com">External Links</g-link>
    <g-link href="https://www.gridsome.org/docs">Internal Links</g-link>
    <g-link :class="{ 'g-link-2': true }" :to="{ name: 'home' }" active-class="test-active">Home</g-link>
    <g-link class="not-found-link" to="/asdf">Show /404</g-link>
    <g-link class="g-link-file" to="~/assets/dummy.pdf">Download</g-link>
    
    <g-image class="g-image-1" src="~/assets/logo.svg" alt="SVG logo" width="300" />
    <g-image :class="{ 'g-image-2': true, 'g-image-false': false }" src="~/assets/test.png" alt="Test image" width="1000" />
    <g-image :class="['g-image-external']" src="https://www.example.com/assets/image.png" alt="External image" immediate />
    <g-image class="g-image-immediate" src="~/assets/test.png" alt="Immediate image" immediate/>
    <g-image class="g-image-static" src="/uploads/test.png" alt="Static image" width="300" />
    
    <span class="from-custom-root-field">{{ $page.customRootValue }}</span>
    <span class="from-env-production">{{ TEST_1 }}</span>
    <span class="from-plugin">{{ TEST_2 }}</span>
    <span class="from-chain-webpack">{{ TEST_3 }}</span>

    <ul>
      <li v-for="edge in $page.allTestDoc.edges" :key="edge.node.id">
        <g-link :to="edge.node.path" :class="`doc-link-${edge.node.id}`">
          {{ edge.node.title }}
        </g-link>
      </li>
    </ul>

    <g-image />
    <g-link />
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
  allTestDoc {
    edges {
      node {
        id
        title
        path
      }
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

<style>
.is-mounted {
  background-color: #f2f2f2;
}
</style>
