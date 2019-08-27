module.exports = {
  NORMAL_PLUGIN: 'plugin',
  SOURCE_PLUGIN: 'source',
  TRANSFORMER_PLUGIN: 'transformer',

  NOT_FOUND_NAME: '404',
  NOT_FOUND_PATH: '/404',

  SUPPORTED_IMAGE_TYPES: ['.png', '.jpeg', '.jpg', '.gif', '.svg', '.webp'],

  BOOTSTRAP_CONFIG: 'config',
  BOOTSTRAP_SOURCES: 'sources',
  BOOTSTRAP_GRAPHQL: 'graphql',
  BOOTSTRAP_PAGES: 'pages',
  BOOTSTRAP_CODE: 'code',

  internalRE: /^internal:\/\//,
  transformerRE: /(?:^@?gridsome[/-]|\/)transformer-([\w-]+)/,

  NODE_FIELDS: ['$uid', '$loki', 'internal', 'id', '_id'],

  SORT_ORDER: 'DESC',
  PER_PAGE: 25,

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

