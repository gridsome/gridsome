const path = require('path')
const VueRemark = require('..')
const App = require('gridsome/lib/app/App')

test('parse simple title', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('# Test', { onlyTemplate: true })

  expect(res).toMatchSnapshot()
})

test('parse simple Vue component', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('<MyComponent />', { onlyTemplate: true })

  expect(res).toMatchSnapshot()
})

test('parse simple Vue component after heading', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
# Heading

<MyComponent />
`, { onlyTemplate: true })

  expect(res).toMatchSnapshot()
})

test('parse Vue component in paragraph', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
Lorem <MyComponent /> impsum...
`, { onlyTemplate: true })

  expect(res).toMatch('<p>Lorem <MyComponent /> impsum...</p>')
})

test('parse nested Vue components', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
<MyComponent v-on:click="test" @event="test">
  <AnotherComponent>
    Some text...
  </AnotherComponent>
</MyComponent>
`, { onlyTemplate: true })

  expect(res).toMatchSnapshot()
})

test('don\'t wrap end tag in paragraph', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
<GridCol col="span-4">

Some text...
</GridCol>
`, { onlyTemplate: true })

  expect(res).toMatchSnapshot()
})

test('add v-pre to fenced code blocks', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
\`\`\`html
<div id="test">
# title
</div>
\`\`\`
`, { onlyTemplate: true })

  expect(res).toMatchSnapshot()
})

test('add v-pre to inline code', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('`{{ test }}`', { onlyTemplate: true })

  expect(res).toMatch('<code v-pre>{{ test }}</code>')
})

test('parse inline code with tag-like syntax', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('`<test>.example.com`', { onlyTemplate: true })

  expect(res).toMatch('<code v-pre>&lt;test>.example.com</code>')
})

test('parse markdown inside Vue component', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
<MyComponent :is="test">

## Test 2
> Quote

</MyComponent>`, {
    onlyTemplate: true
  })

  expect(res).toMatchSnapshot()
})

test('parse Vue components in headings', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('# Heading <Tag />', { onlyTemplate: true })

  expect(res).toMatch('Heading <Tag />')
})

test('parse images as g-image', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('![Test](./image.png)', { onlyTemplate: true })

  expect(res).toMatch('<p><g-image src="./image.png" alt="Test"></g-image></p>')
})

test('parse image options', async () => {
  const plugin = await createPlugin({
    remark: {
      imageQuality: 10,
      imageBlurRatio: 5,
      imageBackground: 'red'
    }
  })
  const res = await plugin.parse('![](./image.png)', { onlyTemplate: true })

  expect(res).toMatch('blur="5"')
  expect(res).toMatch('quality="10"')
  expect(res).toMatch('background="red"')
})

test('disable image lazy loading', async () => {
  const plugin = await createPlugin({
    remark: {
      lazyLoadImages: false
    }
  })
  const res = await plugin.parse('![](./image.png)', { onlyTemplate: true })

  expect(res).toMatch('immediate')
})

test('disable image processing', async () => {
  const plugin = await createPlugin({
    remark: {
      processImages: false
    }
  })
  const res = await plugin.parse('![](./image.png)', { onlyTemplate: true })

  expect(res).toMatch('<p><img src="./image.png"></p>')
})

test('parse local files as g-link', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('[Test](./document.pdf)', { onlyTemplate: true })

  expect(res).toMatch('<p><g-link to="./document.pdf">Test</g-link></p>')
})

test('disable g-link for files', async () => {
  const plugin = await createPlugin({
    remark: {
      processFiles: false
    }
  })
  const res = await plugin.parse('[Test](./document.pdf)', { onlyTemplate: true })

  expect(res).toMatch('<p><a href="./document.pdf">Test</a></p>')
})

test('disable g-link for urls', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('[External](https://example.com)', { onlyTemplate: true })

  expect(res).toMatch(
    '<p><a href="https://example.com"'
  )
})

test('use named entities when encoding attributes', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('[External](https://example.com/?x&y)', { onlyTemplate: true })

  expect(res).toMatch('href="https://example.com/?x&amp;y"')
})

test('keep italic text in links', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('[*Italic link*](https://example.com)', { onlyTemplate: true })

  expect(res).toMatch('<em>Italic link</em></a>')
})

test('image inside external link', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('[![Image Alt](https://placehold.it/300x250)](http://imagelink.com)', { onlyTemplate: true })

  expect(res).toMatchSnapshot()
})

test('don\'t use g-link for mailto links', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('[mailto](mailto:email@example.com)', { onlyTemplate: true })

  expect(res).not.toMatch('g-link')
  expect(res).toMatch('href="mailto:email@example.com"')
})

test('don\'t use g-link for email address', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('<email@example.com>', { onlyTemplate: true })

  expect(res).not.toMatch('g-link')
  expect(res).toMatch('href="mailto:email@example.com"')
})

test('don\'t use g-link for phone links', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('[phone](tel:12345678)', { onlyTemplate: true })

  expect(res).not.toMatch('g-link')
  expect(res).toMatch('href="tel:12345678"')
})

test('parse frontmatter', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
---
title: Test
---
`)

  expect(res).toMatch('const data = {"excerpt":null,"title":"Test"}')
})

test('keep interpolation', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse('{{ $frontmatter.title }}')

  expect(res).toMatch('<p>{{ $frontmatter.title }}</p>')
})

describe('process SFC blocks', () => {
  test('extract <script> tag', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`
# Test
<script>
export default {
  mounted() {}
}
</script>`, {
      onlyBlocks: true
    })

    expect(res).toMatchSnapshot()
  })

  test('extract <style> tag', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`
# Test
<style lang="scss">
body {}
</style>`, {
      onlyBlocks: true
    })

    expect(res).toMatchSnapshot()
  })

  test('extract <style> tag after component', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`
<MyComponent></MyComponent>

<style scoped>
body {}
</style>`, {
      withImport: false,
      withFrontMatter: false
    })

    expect(res).toMatchSnapshot()
  })

  test('extract <page-query> tag', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`
# Test
<page-query>
query {
  metadata {
    siteName
  }
}
</page-query>`, {
      onlyBlocks: true
    })

    expect(res).toMatchSnapshot()
  })

  test('extract <static-query> tag', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`
# Test
<static-query>
query {
  metadata {
    siteName
  }
}
</static-query>`, {
      onlyBlocks: true
    })

    expect(res).toMatchSnapshot()
  })
})

describe('don\'t touch normal HTML tags', () => {
  test('<sup>1</sup> Lorem ipsum', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse('<sup>1</sup> Lorem ipsum', { onlyTemplate: true })

    expect(res).toMatch('<p><sup>1</sup> Lorem ipsum</p>')
  })

  test('Lorem <sup>1</sup> ipsum', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse('Lorem <sup>1</sup> ipsum', { onlyTemplate: true })

    expect(res).toMatch('<p>Lorem <sup>1</sup> ipsum</p>')
  })

  test('<img src="..."/> Lorem ipsum', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse('<img src="..."/> Lorem ipsum', { onlyTemplate: true })

    expect(res).toMatch('<p><img src="..."/> Lorem ipsum</p>')
  })

  test('multiple sections', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`
# Heading

<MyComponent>

## Sub heading
<sup>1</sup> Lorem ipsum

</MyComponent>

<img src="..."/> Lorem ipsum
<sup>1</sup> Lorem ipsum

Lorem <sup>1</sup> ipsum
`, { onlyTemplate: true })

    expect(res).toMatchSnapshot()
  })
})

describe('process import statements', () => {
  test('import default statement', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`import A from '~/components/A.vue'\n<A/>`)

    expect(res).toMatch('import A from \'~/components/A.vue\'')
    expect(res).toMatch('const imported = {A, VueRemarkRoot}')
    expect(res).toMatch('<A/>')
  })

  test('import as statement', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`import A, { B, C as D } from '~/components'`)

    expect(res).toMatch('const imported = {A, B, D, VueRemarkRoot}')
  })

  test('import default as statement', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`import { default as D } from '~/components/Button.vue'`)

    expect(res).toMatch('const imported = {D, VueRemarkRoot}')
  })

  test('skip sentences starting with import*', async () => {
    const plugin = await createPlugin()
    const res = await plugin.parse(`important notice`)

    expect(res).toMatch('<p>important notice</p>')
  })
})

async function createPlugin (options = {}) {
  const app = new App(path.resolve(__dirname, './__fixtures__'), {
    plugins: [{
      use: require.resolve('..'),
      options: { typeName: 'Test', baseDir: '.', ...options }
    }]
  })

  await app.init()

  return app.plugins._plugins.find(p => {
    return p.instance instanceof VueRemark
  }).instance
}
