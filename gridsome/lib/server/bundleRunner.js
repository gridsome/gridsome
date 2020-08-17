const vm = require('vm')
const path = require('path')
const NativeModule = require('module')

exports.createBundleRunner = (bundle) => {
  const compiledScripts = {}
  const evaluatedFiles = {}

  function getCompiledScript(filename) {
    if (compiledScripts[filename]) {
      return compiledScripts[filename]
    }

    const displayErrors = true
    const code = bundle.files[filename]
    const wrapper = NativeModule.wrap(code)
    const script = new vm.Script(wrapper, { filename, displayErrors })

    compiledScripts[filename] = script

    return script
  }

  function evaluateModule(filename) {
    if (evaluatedFiles[filename]) {
      return evaluatedFiles[filename]
    }

    const resolve = file => {
      file = path.posix.join('.', file)
      if (bundle.files[file]) {
        return evaluateModule(file)
      }
      return require(file)
    }

    const mod = { exports: {} }

    getCompiledScript(filename)
      .runInThisContext()
      .call(mod.exports, mod.exports, resolve, mod)

    const res = mod.exports.default || mod.exports

    evaluatedFiles[filename] = res

    return res
  }

  return evaluateModule(bundle.entry)
}

