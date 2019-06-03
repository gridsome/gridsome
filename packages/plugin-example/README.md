# @gridsome/plugin-example

> An example plugin for Gridsome

### Usage
In `gridsome.config.js`:

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
```