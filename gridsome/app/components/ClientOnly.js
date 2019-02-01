export default {
  name: 'NoSsr',
  functional: true,
  props: {
    placeholder: String,
    placeholderTag: {
      type: String,
      default: 'div'
    }
  },
  render(h, { parent, slots, props }) {
    const { default: defaultSlot = [], placeholder: placeholderSlot } = slots()

    if (parent._isMounted) {
      return defaultSlot
    }

    parent.$once('hook:mounted', () => {
      parent.$forceUpdate()
    })

    if (props.placeholderTag && (props.placeholder || placeholderSlot)) {
      return h(
        props.placeholderTag,
        {
          class: ['clientonly']
        },
        props.placeholder || placeholderSlot
      )
    }
    
    return defaultSlot.length > 0 ? defaultSlot.map(() => h(false)) : h(false)
  }
}
