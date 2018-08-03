module.exports = (api, options, rootOptions) => {
  api.extendPackage({
    scripts: {
      'develop': 'vue-cli-service gridsome:develop',
      'build': 'vue-cli-service gridsome:build',
      'explore': 'vue-cli-service gridsome:explore'
    },
    dependencies: {
      'vue-server-renderer': '^2.5.16'
    }
  })
}
