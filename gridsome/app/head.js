import Vue from 'vue'
import Meta from 'vue-meta'
import icons from '~/.temp/icons.js'
import config from '~/.temp/config.js'

Vue.use(Meta, {
  attribute: 'data-vue-tag',
  ssrAttribute: 'data-html-server-rendered',
  tagIDKeyName: 'key'
})

const head = {
  titleTemplate: config.titleTemplate,
  __dangerouslyDisableSanitizers: ['style', 'script', 'noscript'],
  __dangerouslyDisableSanitizersByTagID: {},
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    { charset: 'utf-8' },
    { name: 'generator', content: `Gridsome v${config.version}` },
    { key: 'viewport', name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },

    // do not convert telephone numbers
    // into hypertext links because it
    // will cause hydration errors
    {
      key: 'format-detection',
      name: 'format-detection',
      content: 'telephone=no'
    }
  ],
  base: {},
  noscript: [],
  script: [],
  style: [],
  link: []
}

if (icons.favicons.length) {
  // prevent unnecessary request for /favicon.ico
  head.link.push({ rel: 'icon', href: 'data:,' })
}

icons.favicons.forEach(({ width, height = width, src: href }) => {
  head.link.push({
    rel: 'icon',
    type: icons.faviconMimeType,
    sizes: `${width}x${height}`,
    href
  })
})

icons.touchicons.forEach(({ width, height = width, src: href }) => {
  head.link.push({
    rel: `apple-touch-icon${icons.precomposed ? '-precomposed' : ''}`,
    type: icons.touchiconMimeType,
    sizes: `${width}x${height}`,
    href
  })
})

head.noscript.push({
  innerHTML: `<style>.g-image--loading{display:none;}</style>`
})

export default head
