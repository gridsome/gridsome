const Joi = require('@hapi/joi')

const schemas = {
  route: Joi.object()
    .label('Route options')
    .keys({
      id: Joi.string(),
      type: Joi.string().valid('static', 'dynamic').default('static'),
      name: Joi.string(),
      path: Joi.string()
        .regex(/^\//, 'missing leading slash')
        .required(),
      component: Joi.string().required(),
      meta: Joi.object().default(null).allow(null)
    }),

  page: Joi.object()
    .label('Page options')
    .keys({
      id: Joi.string(),
      path: Joi.string().regex(/^\//, 'leading slash').required(),
      component: Joi.string().required(),
      context: Joi.object().default({}),
      queryVariables: Joi.object().default(null).allow(null),
      route: Joi.object().default({}).keys({
        name: Joi.string().allow(null),
        meta: Joi.object().default({}).allow(null)
      }),

      name: Joi.string().allow(null),
      chunkName: Joi.string().allow(null)
    }),

  routePage: Joi.object()
    .label('Page options')
    .keys({
      id: Joi.string(),
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

module.exports = validate
