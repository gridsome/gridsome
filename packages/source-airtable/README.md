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
        base: 'YOUR_BASE_ID', // required
        route: 'YOUR_CHOSEN_ROUTE', // required
        table: 'NAME_OF_MAIN_TABLE' // required
        typeName: 'YOUR_CHOSEN_TYPE_NAME' // required
      }
    }
  ]
}
```

### Credentials

1. `apiKey`: This can be found when logged in to airtable.com, under "ACCOUNT > API".
1. `base`: This can be found by going to https://airtable.com/api, clicking on your workspace, and will be visible in the url: https://airtable.com/<YOUR_BASE_ID>/api/docs#curl/introduction
1. `route`: Your own chosen route name. The route "products" is an example of an fitting route for the pre-defined  airtable workspace named "Product Catalog & Orders"
1. `table`: This is the full name of your first workspace table, for example "Furniture" is the first table in the pre-defined workspace named "Product Catalog & Orders"
1. `typeName`: Your own chosen type name. The type name "Product" is an example of an fitting route for the pre-defined airtable workspace named "Product Catalog & Orders"
