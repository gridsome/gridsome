const physical = require('physical-cpu-count')
const os = require('os')
const cpus = os.cpus()

module.exports = {
  cpus: {
    logical: parseInt(process.env.GRIDSOME_CPU_COUNT || cpus.length, 10),
    physical: parseInt(process.env.GRIDSOME_CPU_COUNT || physical || 1, 10)
  }
}
