const Joi = require('joi')

const schemas = {
  route: Joi.object()
    .label('Route options')
    .keys({
      name: Joi.string(),
      path: Joi.string().regex(/^\//, 'missing leading slash').required(),
      component: Joi.string().required()
    }),

  page: Joi.object()
    .label('Page options')
    .keys({
      path: Joi.string().regex(/^\//, 'leading slash').required(),
      context: Joi.object().default({}),
      queryVariables: Joi.object().default(null).allow(null)
    }),

  component: Joi.object()
    .label('Parsed component results')
    .keys({
      pageQuery: Joi.string().allow(null)
    })
}

function validate (schema, options) {
  const { error, value } = Joi.validate(options, schemas[schema])

  if (error) {
    throw new Error(error.message)
  }

  return value
}

module.exports = {
  validate
}
