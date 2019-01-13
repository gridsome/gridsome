# @gridsome/sass-resources-loader

This module does all the hard work of configuring sass-resources-loader for your Gridsome application.

## Install

- `yarn add @gridsome/sass-resources-loader`
- `npm install @gridsome/sass-resources-loader`

## Usage

### Basic

You can use the [Gridsome aliases](https://gridsome.org/docs/directory-structure/#aliases) and modules directory(e.g node_modules) to resolve the file path.

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/sass-resources-loader',
      options: {
        // provide path to the file with resources
        resources: '@/path/to/resources.scss',

        // or array of paths
        resources: ['@/path/to/first-resources.sass', '@/path/to/second-resources.scss'],

        // or from the npm package
        resources: ['my-package/sass/resources.scss']
      }
    }
  ]
}
```

### TIPS

You can also use resolve from node to indicate the relative path of the file:

```js
const resolve = require('path').resolve
...
resources: resolve(__dirname, './path/to/resources.scss')
...
```

You can specify glob patterns to match your all of your files in the same directory.

```js
// Specify a single path
resources: './path/to/resources/**/*.scss', // will match all files in folder and subdirectories
// or an array of paths
resources: [ './path/to/resources/**/*.scss', './path/to/another/**/*.scss' ]
```

Note that sass-resources-loader will resolve your files in order. If you want your variables to be accessed across all of your mixins you should specify them in first place.

```js
resources: [ './path/to/variables/vars.scss', './path/to/mixins/**/*.scss' ]
```
