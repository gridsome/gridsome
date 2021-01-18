// Fix paths when testing under windows
exports.unwinpath = function (path) {
  // Remove drive letter and change path seperator
  return path.replace(/^\w:/, '').replaceAll('\\', '/')
}
