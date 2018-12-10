module.exports = {
  PAGED_ROUTE: 'paged',
  STATIC_ROUTE: 'static',
  STATIC_TEMPLATE_ROUTE: 'static_template',
  DYNAMIC_TEMPLATE_ROUTE: 'dynamic_template',

  NORMAL_PLUGIN: 'plugin',
  SOURCE_PLUGIN: 'source',
  TRANSFORMER_PLUGIN: 'transformer',

  SUPPORTED_IMAGE_TYPES: ['.png', '.jpeg', '.jpg', '.gif', '.svg', '.webp'],

  BOOTSTRAP_CONFIG: 0,
  BOOTSTRAP_PLUGINS: 1,
  BOOTSTRAP_GRAPHQL: 2,
  BOOTSTRAP_FULL: Number.MAX_SAFE_INTEGER,

  internalRE: /^internal\:\/\//,
  transformerRE: /(?:^@?gridsome[/-]|\/)transformer-([\w-]+)/
}

