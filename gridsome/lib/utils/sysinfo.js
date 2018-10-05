const physical = require('physical-cpu-count')
const os = require('os')
const cpus = os.cpus()

module.exports = {
  type: os.type(),
  cpus: {
    model: cpus.length ? cpus[0].model : '',
    logical: cpus.length,
    physical
  }
}
