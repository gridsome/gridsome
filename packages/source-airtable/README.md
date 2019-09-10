# @gridsome/source-airtable

> Airtable source for Gridsome.

## Install
- `yarn add @gridsome/source-airtable`
- `npm install @gridsome/source-airtable`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-airtable',
      options: {
        apiKey: 'YOUR_API_KEY', // required
        baseId: 'YOUR_BASE_ID', // required
        tableName: 'YOUR_TABLE_NAME', // required
        typeName: 'YOUR_TYPE_NAME', // required
      }
    }
  ],
  templates: {
    YOUR_TYPE_NAME: 'YOUR_OPTIONAL_ROUTE' // optional
  }
}
```

## Options

1. `apiKey`: This can be found when logged in to airtable.com, under "ACCOUNT > API".
1. `baseId`: This can be found by going to https://airtable.com/api, clicking on your workspace, and will be visible in the url: https://airtable.com/{YOUR_BASE_ID}/api/docs#curl/introduction
1. `tableName`: This is the full name of your chosen workspace table, for example "Furniture" is the first and main table in the pre-defined workspace named "Product Catalog & Orders"
1. `typeName`: Your chosen type name. The type name "Product" is an example of an fitting route for the pre-defined airtable workspace named "Product Catalog & Orders"
