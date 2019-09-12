const path = require('path')
const chalk = require('chalk')
const columnify = require('columnify')
const stackTrace = require('stack-trace')
const { log: logUtil } = require('./log')

const warned = new Map()
const warnings = new Set()
const noop = function() {}

const callSiteLocation = callSite => {
  const line = callSite.getLineNumber()
  const colm = callSite.getColumnNumber()

  let file = callSite.getFileName() || '<anonymous>'

  if (callSite.isEval()) {
    file = callSite.getEvalOrigin() + ', ' + file
  }

  return [file, line, colm]
}

const convertDataDescriptorToAccessor = (obj, prop) => {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop)
  let value = descriptor.value

  descriptor.get = function getter() { return value }

  if (descriptor.writable) {
    descriptor.set = function setter(val) { return (value = val) }
  }

  delete descriptor.value
  delete descriptor.writable

  Object.defineProperty(obj, prop, descriptor)

  return descriptor
}

const wrapProperty = namespace => {
  return (obj, prop, message, options = {}) => {
    if (process.env.GRIDSOME_TEST) {
      return
    }

    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
      throw new TypeError('Argument obj must be an object.')
    }

    let descriptor = Object.getOwnPropertyDescriptor(obj, prop)

    if (!descriptor) {
      throw new TypeError('Must call property on owner object.')
    }

    if (!descriptor.configurable) {
      throw new TypeError('Property must be configurable.')
    }

    if ('value' in descriptor) {
      descriptor = convertDataDescriptorToAccessor(obj, prop)
    }

    const get = descriptor.get
    const set = descriptor.set
    const { stackIndex = 1 } = options

    if (typeof get === 'function') {
      descriptor.get = function () {
        log(namespace, message, { stackIndex })
        return get(...arguments)
      }
    }

    if (typeof set === 'function') {
      descriptor.set = function () {
        log(namespace, message, { stackIndex })
        return set(...arguments)
      }
    }

    Object.defineProperty(obj, prop, descriptor)
  }
}

const log = (namespace, message, options = {}) => {
  const { stackIndex = 2, customCaller, url } = options

  const stack = stackTrace.get()
  const depSite = callSiteLocation(stack[stackIndex])
  const depFile = depSite[0]

  let seen = false
  let caller = null
  let callFile = null
  let file = depFile

  for (let i = stackIndex; i < stack.length; i++) {
    caller = callSiteLocation(stack[i])
    callFile = caller[0]

    if (callFile === file) {
      seen = true
    } else if (callFile === depFile) {
      file = depFile
    } else if (seen) {
      break
    }
  }

  const key = customCaller || caller
    ? (customCaller || caller).join(':') + '__' + caller.join(':')
    : undefined

  if (key && warned.has(key)) {
    return
  }

  warned.set(key, true)

  warnings.add({ namespace, message, caller, customCaller, url })
}

exports.createDeprecator = namespace => {
  if (!namespace) {
    throw new TypeError('Namespace is required')
  }

  if (process.env.GRIDSOME_TEST) {
    noop.property = noop
    return noop
  }

  function deprecate(message, options = {}) {
    return log(namespace, message, options)
  }

  deprecate.property = wrapProperty(namespace)

  return deprecate
}

exports.hasWarnings = () => {
  return warnings.size > 0
}

exports.logAllWarnings = context => {
  const columns = []

  warnings.forEach(warning => {
    const { caller, customCaller, url } = warning
    let { message } = warning

    if (url) {
      message += `\nDocumentation: ${chalk.cyan(url)}`
    }

    if (customCaller || caller) {
      const currentCaller = customCaller || caller
      const [fileName, line, column] = currentCaller
      const relativePath = path.relative(context, fileName)
      const location = line && column ? `:${line}:${column}` : ''

      message += `\n${chalk.gray(`./${relativePath}${location}`)}`
    }

    message += '\n'

    columns.push({ message })
    columns.push({}) // empty line between messages
  })

  const renderedColumns = columnify(columns, {
    maxWidth: Math.min(80, process.stdout.columns || Infinity),
    preserveNewLines: true,
    showHeaders: false
  })

  logUtil(renderedColumns)
}

exports.deprecate = exports.createDeprecator('gridsome')

