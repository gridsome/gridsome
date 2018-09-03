import typography from '@/typography'

class TypographyPlugin {
  constructor () {
    this.cssString = typography.toString()
  }

  appendHead (head) {
    head.style.push({
      type: 'text/css',
      cssText: this.cssString
    })
  }
}

module.exports = TypographyPlugin
