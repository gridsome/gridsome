# @gridsome/plugin-sitemap

> Generate sitemap for Gridsome sites

## Install

- `yarn add @gridsome/plugin-sitemap`
- `npm install @gridsome/plugin-sitemap`

## Usage

Make sure [`siteUrl`](https://gridsome.org/docs/config/#siteurl) is set in your project config. All rendered pages (except `/404`) are included in the resulting XML. The `config` option can be used to set a custom `changefreq` or `priority` per path or a glob pattern for multiple paths.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-sitemap',
      options: {
        exclude: ['/exclude-me'],
        config: {
          '/articles/*': {
            changefreq: 'weekly',
            priority: 0.5,
            lastmod: '2020-02-19',
          },
          '/about': {
            changefreq: 'monthly',
            priority: 0.7,
            lastmod: '2020-05-12',
          }
        }
      }
    }
  ]
}
```

### Options

#### output

- Type: `string`
- Default `/sitemap.xml`

Your sitemap will be available at `/sitemap.xml`.

#### config

- Type: `object`

Set custom config for specific URLs.

```js
config: {
  '/articles/*': {
    changefreq: 'weekly',
    priority: 0.5,
    lastmod: '2020-02-19',
  },
  '/about': {
    changefreq: 'monthly',
    priority: 0.7,
    lastmod: '2020-05-12',
  }
}
```

#### include

- Type: `string[]`

Specify which paths to include in the sitemap. Each path can be a glob pattern.

```js
include: ['/blog', '/blog/**']
```

#### exclude

- Type: `string[]`

Specify which paths to exclude from the sitemap. Each path can be a glob pattern. The `/404` path is always excluded.

#### staticUrls

- Type: `Array`

Add custom URLs to the sitemap.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-sitemap',
      options: {
        staticUrls: [
          {
            url: '/images/',
            img: [
              {
                url: '/images/img1.jpg',
                caption: 'Image One',
                title: 'The Title of Image One',
                geoLocation: 'Trondheim, Norway',
                license: 'https://creativecommons.org/licenses/by/4.0/'
              },
              {
                url: '/images/img2.jpg',
                caption: 'Image Two',
                title: 'The Title of Image Two',
                geoLocation: 'Trondheim, Norway',
                license: 'https://creativecommons.org/licenses/by/4.0/'
              }
            ]
          }
        ]
      }
    }
  ]
}
```
