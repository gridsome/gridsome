# @gridsome/plugin-sitemap

> Generate sitemap for Gridsome sites

## Install

- `yarn add @gridsome/plugin-sitemap`
- `npm install @gridsome/plugin-sitemap`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-sitemap',
      options: {
        cacheTime: 600000,
        exclude: ['/exlude-me'],
        config: {
          '/articles/*': {
            changefreq: 'weekly',
            priority: 0.5,
          },
          '/page/*': {
            changefreq: 'monthly',
            priority: 0.7,
          },
        },
      },
    },
  ],
}
```
