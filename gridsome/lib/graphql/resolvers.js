const { dateType } = require('./types/date')
const { fileType } = require('./types/file')
const { imageType } = require('./types/image')

const scalarTypeResolvers = {
  Date: dateType,
  File: fileType,
  Image: imageType
}

module.exports = {
  scalarTypeResolvers
}
