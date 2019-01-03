# @gridsome/plugin-analytics

> Adds Google Analytics to the Page

See [VueAnalytics](https://github.com/MatteoGabriele/vue-analytics/blob/master/README.md) for possible options.

## Install
- `yarn add @gridsome/plugin-analytics`
- `npm install @gridsome/plugin-analytics`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-analytics',
      options: {
        id: 'UA-XXX-XX',
      }
    }
  ]
}
```
