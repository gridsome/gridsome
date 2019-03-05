module.exports = {
  PAGED_ROUTE: 'paged',
  STATIC_ROUTE: 'static',
  PAGED_TEMPLATE: 'paged_template',
  PAGED_STATIC_TEMPLATE: 'paged_static_template',
  STATIC_TEMPLATE_ROUTE: 'static_template',
  DYNAMIC_TEMPLATE_ROUTE: 'dynamic_template',
  NOT_FOUND_ROUTE: '404',

  NORMAL_PLUGIN: 'plugin',
  SOURCE_PLUGIN: 'source',
  TRANSFORMER_PLUGIN: 'transformer',

  PER_PAGE: 25,

  SUPPORTED_IMAGE_TYPES: ['.png', '.jpeg', '.jpg', '.gif', '.svg', '.webp'],

  BOOTSTRAP_CONFIG: 0,
  BOOTSTRAP_PLUGINS: 1,
  BOOTSTRAP_GRAPHQL: 2,
  BOOTSTRAP_ROUTES: 3,
  BOOTSTRAP_FULL: Number.MAX_SAFE_INTEGER,

  internalRE: /^internal\:\/\//,
  transformerRE: /(?:^@?gridsome[/-]|\/)transformer-([\w-]+)/,

  NODE_FIELDS: ['id', 'typeName', 'title', 'slug', 'path', 'date', 'content', 'excerpt'],
  PAGE_FIELDS: ['id', 'typeName', 'path', 'slug'],

  ISO_8601_FORMAT: [
    'YYYY',
    'YYYY-MM',
    'YYYY-MM-DD',
    'YYYYMMDD',

    // Local Time
    'YYYY-MM-DDTHH',
    'YYYY-MM-DDTHH:mm',
    'YYYY-MM-DDTHHmm',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DDTHHmmss',
    'YYYY-MM-DDTHH:mm:ss.SSS',
    'YYYY-MM-DDTHHmmss.SSS',

    // Coordinated Universal Time (UTC)
    'YYYY-MM-DDTHHZ',
    'YYYY-MM-DDTHH:mmZ',
    'YYYY-MM-DDTHHmmZ',
    'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-MM-DDTHHmmssZ',
    'YYYY-MM-DDTHH:mm:ss.SSSZ',
    'YYYY-MM-DDTHHmmss.SSSZ',

    'YYYY-[W]WW',
    'YYYY[W]WW',
    'YYYY-[W]WW-E',
    'YYYY[W]WWE',
    'YYYY-DDDD',
    'YYYYDDDD'
  ]
}

