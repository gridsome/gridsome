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
        table: 'YOUR_CHOSEN_TABLE' // required
        typeName: 'YOUR_CHOSEN_TYPE_NAME' // required
      }
    }
  ]
}
```

### Credentials

1. `YOUR_API_KEY`: This can be found when logged in to airtable.com, under "ACCOUNT > API".
1. `YOUR_BASE_ID`: This can be found by going to https://airtable.com/api, clicking on your workspace, and will be visible in the url: https://airtable.com/<YOUR_BASE_ID>/api/docs#curl/introduction
1. `YOUR_CHOSEN_ROUTE`: Your own chosen route name. The route "products" is an example of an fitting route for the pre-defined  airtable workspace named "Product Catalog & Orders"
1. `YOUR_CHOSEN_TABLE`: This is the full name of your chosen workspace table, for example "Furniture" is the first and main table in the pre-defined workspace named "Product Catalog & Orders"
1. `YOUR_CHOSEN_TYPE_NAME`: Your own chosen type name. The type name "Product" is an example of an fitting route for the pre-defined airtable workspace named "Product Catalog & Orders"
