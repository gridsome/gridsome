export default function (Vue, options, { head }) {
  head.meta.push({
    name: 'og:title',
    content: options.ogTitle
  })
}
