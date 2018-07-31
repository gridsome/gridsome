import Vue from 'vue'

const { computed } = Vue.config.optionMergeStrategies

export default ({ options }, data) => {
  if (options.__staticData) {
    options.__staticData = data
    return
  }

  options.__staticData = data

  options.computed = computed({
    $static: () => data
  }, options.computed)
}
