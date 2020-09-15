# @gridsome/plugin-google-analytics

> Google Analytics plugin for Gridsome

See [VueAnalytics](https://github.com/MatteoGabriele/vue-analytics/blob/master/README.md) for possible options.

## Install
- `yarn add @gridsome/plugin-google-analytics`
- `npm install @gridsome/plugin-google-analytics`

## Usage

Add the below config in your `gridsome.config.js`

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-google-analytics',
      options: {
        id: 'UA-XXXXXXXXX-X'
      }
    }
  ]
}
```
