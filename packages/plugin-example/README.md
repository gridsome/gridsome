# @gridsome/plugin-example

> An example plugin for Gridsome

Usage: 

```
module.exports = {
  plugins: [
  	 {
      use: '@gridsome/plugin-example',
      options: {
      	typeName: 'ExampleData',
      	route: '/example/:slug'
      }
    },
  ]
}
``