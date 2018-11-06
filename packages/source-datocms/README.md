# @gridsome/source-datocms

> DatoCMS source for Gridsome. This package is under development and
API might change before v1 is released.

## Install
- `yarn add @gridsome/source-datocms`
- `npm install @gridsome/source-datocms`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-datocms',
      options: {
        apiToken: 'YOUR_READONLY_API_TOKEN', // required
        previewMode: false,
        apiUrl: 'https://site-api.datocms.com',
        typeName: 'DatoCms'
      }
    }
  ]
}
```
