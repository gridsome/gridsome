const Hook = require('tapable/lib/Hook')
const HookCodeFactory = require('tapable/lib/HookCodeFactory')

class SyncBailWaterfallHookCodeFactory extends HookCodeFactory {
  content ({ onError, onResult, resultReturns, rethrowIfPossible }) {
    return this.callTapsSeries({
      onError: (i, err) => onError(err),
      onResult: (i, result, next) => {
        let code = ''
        code += `if(${result} !== undefined) {\n`
        code += `${this._args[0]} = ${result};\n`
        code += `}\n`
        code += `if(${this._args[0]} !== null) {\n`
        code += next()
        code += `}\n`
        return code
      },
      onDone: () => onResult(this._args[0]),
      doneReturns: resultReturns,
      rethrowIfPossible
    })
  }
}

const factory = new SyncBailWaterfallHookCodeFactory()

class SyncBailWaterfallHook extends Hook {
  constructor (args) {
    super(args)
    if (args.length < 1)
      throw new Error('Waterfall hooks must have at least one argument')
  }

  tapAsync () {
    throw new Error('tapAsync is not supported on a SyncBailWaterfallHook')
  }

  tapPromise () {
    throw new Error('tapPromise is not supported on a SyncBailWaterfallHook')
  }

  compile (options) {
    factory.setup(this, options)
    return factory.create(options)
  }
}

module.exports = SyncBailWaterfallHook
