const Joi = require('joi')

const schema = Joi.object()
  .label('Page options')
  .keys({
    path: Joi.string().regex(/^\//, 'leading slash').required(),
    component: Joi.string().required(),
    chunkName: Joi.string().allow(null),
    route: Joi.string().allow(null),
    name: Joi.string().allow(null),
    context: Joi.object().default({}),
    queryVariables: Joi.object().allow(null),
    _meta: Joi.object()
  })

module.exports = function vaidateOptions (options) {
  const { error, value } = Joi.validate(options, schema)

  if (error) {
    throw new Error(error.message)
  }

  return value
}
