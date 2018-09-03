import createApp from './app'

const { app } = createApp()

app.$router.onReady(() => {
  app.$mount('#app')

  // todo: register service worker
})
