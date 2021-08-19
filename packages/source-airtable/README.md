# @gridsome/source-airtable

> Airtable source for Gridsome.

## Install

- `npm install @gridsome/source-airtable`
- `yarn add @gridsome/source-airtable`
- `pnpm install @gridsome/source-airtable`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-airtable',
      options: {
        apiKey: 'YOUR_API_KEY', // required
        base: 'YOUR_BASE_ID', // required
        tables: [
            {
                name: 'YOUR_TABLE_NAME', // required
                typeName: 'YOUR_TYPE_NAME', // required
                select: {}, // optional,
                links: [ // optional
                    {
                        fieldName: 'Case Sensitive Field Name',
                        typeName: 'TYPE_NAME_FROM_LINKED_TABLE',
                        linkToFirst: false // optional
                    }
                ]
            },
            {
                name: 'YOUR_LINKED_TABLE_NAME', // required
                typeName: 'YOUR_LINKED_TYPE_NAME', // required
            }
        ],
        tableName: 'YOUR_TABLE_NAME', // required
      },
    },
  ],
  templates: {
    YOUR_TYPE_NAME: 'YOUR_OPTIONAL_ROUTE', // optional
  },
}
```

### Options

1. `apiKey`: This can be found when logged in to airtable.com, under "ACCOUNT > API"
2. `base`: This can be found by going to <https://airtable.com/api>, clicking on your workspace, and will be visible in the url: <https://airtable.com/{YOUR_BASE_ID}/api/docs#curl/introduction>
3. `tables`: This is where you configure one or more tables that should be loaded as a data source
    1. `name`:  This is the full name of your chosen workspace table, for example "Furniture" is the first and main table in the pre-defined workspace named "Product Catalog & Orders"
    2. `typeName`: Your chosen type name. The type name "Product" is an example of an fitting route for the pre-defined airtable workspace named "Product Catalog & Orders"
    3. `select`: Your select options. These can be found by going to <https://airtable.com/api>, clicking on your workspace, and will be visible under the _List records_ of your table
    4. `links`: When links to another record are set in airtable, they need to be also mapped so we can return them as a sub-object
        1. `fieldName`: This is the case sensitive full name of the field that has been set as a "Link to another record type"
        2. `typeName`: This is the type name of the linked table that has been added to the "tables" config
        3. `linkToFirst`: Airtable always returns linked records as an array of records, but there is sometimes a case when you have only one record linked. This is the convenient option that will extract the first record from array and return an object. It emulates the "one to one" relation from RDBMS
