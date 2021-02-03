const os = require('os')

// Fix paths when testing under windows
exports.unwinpath = function (path) {
  // Remove drive letter and change path seperator
  if (os.platform() === 'win32') {
    path = path.replace(/^\w:/, '').replaceAll('\\', '/')
  }
  return path
}

