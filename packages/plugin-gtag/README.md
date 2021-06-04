# @gridsome/plugin-gtag

> Global Site Tag (gtag) plugin for Gridsome

See [vue-gtag](https://github.com/MatteoGabriele/vue-gtag) for available options.

## Install
- `yarn add @gridsome/plugin-gtag`
- `npm install @gridsome/plugin-gtag`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-gtag',
      options: {
        config: { id: "UA-XXXXXXXXX-X" },
      }
    }
  ]
}
```
