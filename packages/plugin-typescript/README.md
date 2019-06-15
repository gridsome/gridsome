# @gridsome/plugin-typescript

> Typescript plugin for Gridsome

## Install

- `yarn add @gridsome/plugin-typescript`
- `npm install @gridsome/plugin-typescript`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: "@gridsome/plugin-typescript",
      options: {
        useThreads: require("os").cpus().length > 1,
        tsLoader: {},
        forkTsChecker: {}
      }
    }
  ]
};
```

_Note : The options represent the default values_

## Options

- `useThreads` (boolean): This define if typescript use threads or not
- `tsLoader` (object): This is options for [ts-loader](https://github.com/TypeStrong/ts-loader#loader-options)

  This have already options:

  ```js
  {
    transpileOnly: true,
    appendTsSuffixTo: [/\.vue$/],
    happyPackMode: options.useThreads
  }
  ```

- `forkTsChecker` (object): This is options for [fork-ts-checker-webpack-plugin](https://github.com/Realytics/fork-ts-checker-webpack-plugin/#options)

  This have already options:

  ```js
  {
    vue: true,
    tslint: true/false, // This is depend if 'tslint.json' file exist
    formatter: 'codeframe',
    checkSyntacticErrors: options.useThreads
  }
  ```
