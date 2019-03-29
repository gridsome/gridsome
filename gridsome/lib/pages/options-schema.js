const Joi = require('joi')

module.exports = Joi.object()
  .label('Page options')
  .keys({
    path: Joi.string().regex(/^\//, 'leading slash').required(),
    component: Joi.string().required(),
    chunkName: Joi.string(),
    route: Joi.string(),
    name: Joi.string(),
    context: Joi.object(),
    queryContext: Joi.object()
  })
