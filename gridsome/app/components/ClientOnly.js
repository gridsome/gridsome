import { getCurrentInstance, onMounted } from 'vue'

const ClientOnly = (props, { slots }) => {
  const instance = getCurrentInstance()

  onMounted(() => {
    instance.parent.proxy.$forceUpdate()
  }, instance.parent)

  if (instance.parent.isMounted) {
    return slots.default()
  }
}

export default ClientOnly
