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
        table: 'NAME_OF_MAIN_TABLE' // required
      }
    }
  ]
}
```

### Credentials

1. `apiKey`: This can be found when logged in to airtable.com, under "ACCOUNT > API".
1. `base`: This can be found by going to https://airtable.com/api, clicking on your workspace, and will be visible in the url: https://airtable.com/<YOUR_BASE_ID>/api/docs#curl/introduction
1. `table`: This is the full name of your first workspace table, for example "Furniture" is the first table in the example workspace "Product Catalog & Orders"
