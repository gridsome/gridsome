const physical = require('physical-cpu-count')
const logical = require('os').cpus().length

module.exports = {
  physical,
  logical
}
