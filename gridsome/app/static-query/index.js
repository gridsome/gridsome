import Vue from 'vue'

const { computed } = Vue.config.optionMergeStrategies

export default ({ options }, data) => {
  if (options.__staticData) {
    options.__staticData.data = data
    return
  }

  options.__staticData = Vue.observable({ data })

  options.computed = computed({
    $static: () => options.__staticData.data
  }, options.computed)
}
