const Joi = require('joi')

const schema = Joi.object()
  .label('Page options')
  .keys({
    path: Joi.string().regex(/^\//, 'leading slash').required(),
    component: Joi.string().required(),
    chunkName: Joi.string(),
    route: Joi.string(),
    name: Joi.string(),
    context: Joi.object(),
    queryVariables: Joi.object()
  })

module.exports = function vaidateOptions (options) {
  const { error, value } = Joi.validate(options, schema)

  if (error) {
    throw new Error(error.message)
  }

  return value
}
