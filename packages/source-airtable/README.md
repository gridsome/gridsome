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
        route: 'YOUR_OPTIONAL_ROUTE' // optional
      }
    }
  ]
}
```

### Credentials

1. `YOUR_API_KEY`: This can be found when logged in to airtable.com, under "ACCOUNT > API".
1. `YOUR_BASE_ID`: This can be found by going to https://airtable.com/api, clicking on your workspace, and will be visible in the url: https://airtable.com/<YOUR_BASE_ID>/api/docs#curl/introduction
1. `YOUR_TABLE_NAME`: This is the full name of your chosen workspace table, for example "Furniture" is the first and main table in the pre-defined workspace named "Product Catalog & Orders"
1. `YOUR_TYPE_NAME`: Your chosen type name. The type name "Product" is an example of an fitting route for the pre-defined airtable workspace named "Product Catalog & Orders"
1. `YOUR_OPTIONAL_ROUTE`: Your chosen optional route name. The route "/products/:Name" is an example of an fitting route for the pre-defined airtable workspace named "Product Catalog & Orders"
