module.exports = () => {
  const os = require('os')
  const physical = require('physical-cpu-count')
  const cpus = os.cpus()

  return {
    type: os.type(),
    cpus: {
      model: cpus.length ? cpus[0].model : '',
      logical: cpus.length,
      physical
    }
  }
}
