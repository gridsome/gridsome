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
        cacheTime: 600000, // default
        exclude: ['/exclude-me'],
        config: {
          '/articles/*': {
            changefreq: 'weekly',
            priority: 0.5
          },
          '/about': {
            changefreq: 'monthly',
            priority: 0.7
          }
        }
      }
    }
  ]
}
```

Your sitemap will be available at `/sitemap.xml` after your site is built.
