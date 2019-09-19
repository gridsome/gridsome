const VueRemark = require('..')
const App = require('../../../gridsome/lib/app/App')

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

test('add v-pre to fenced code blocks', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`
\`\`\`html
<div>
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

  expect(res).toMatch('<code v-pre>&#x3C;test>.example.com</code>')
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

test('parse import statements', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`import A from '~/components/A.vue'\n<A/>`)

  expect(res).toMatch('import A from \'~/components/A.vue\'')
  expect(res).toMatch('const imported = {A, VueRemarkRoot}')
  expect(res).toMatch('<A/>')
})

test('parse import as statements', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`import A, { B, C as D } from '~/components'`)

  expect(res).toMatch('const imported = {A, B, D, VueRemarkRoot}')
})

test('parse import default as statements', async () => {
  const plugin = await createPlugin()
  const res = await plugin.parse(`import { default as D } from '~/components/Button.vue'`)

  expect(res).toMatch('const imported = {D, VueRemarkRoot}')
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

async function createPlugin (options = {}) {
  const app = new App('/', {
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
