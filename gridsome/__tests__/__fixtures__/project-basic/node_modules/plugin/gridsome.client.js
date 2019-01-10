import './test-es6-1'
import './test-es6-2'

export default function (Vue, options, { head }) {
  head.meta.push({
    name: 'og:title',
    content: options.ogTitle
  })
}
