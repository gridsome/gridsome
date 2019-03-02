# @gridsome/source-cockpit

> Cockpit source for Gridsome. This package is under development and
API might change before v1 is released.

## Install
- `yarn add @gridsome/source-cockpit`
- `npm install @gridsome/source-cockpit`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-cockpit',
      options: {
        accessToken: process.env.ACCESSTOKEN,
        host: process.env.APIHOST
      }
    }
  ]
}
```

You will need to provide the ACCESSTOKEN and APIHOST environment variables in a `.env` or similar file at the root of your project. Gridsome will automatically read this and pass in the variables to the source plugin.

For example:

```
APIHOST=https://my-cockpit-cms.com
ACCESSTOKEN=b90d9080711bab6e9af34fbea754c5
```

## API limit

You can also set a limit per request if you have thousands of collections or assets and want to pull in a paged set of results. To do this set the `APILIMIT` environment variable, for example:                                      │

```
APILIMIT=100
```

You will also need to add a config option in your `gridsome.config.js` file:

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-cockpit',
      options: {
        options: {
          accessToken: process.env.ACCESSTOKEN,
          host: process.env.APIHOST
          apiLimit: process.env.APILIMIT
        }
      }
    }
  ]
}
```

## Routes

You can configure a route per collection type by defining them in `gridsome.config.js`. The key is the name of the collection and the value is the path you'd like for that collection. For example:

```javascript
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-cockpit',
      options: {
        accessToken: process.env.ACCESSTOKEN,
        host: process.env.APIHOST
        routes: {
          page: '/:slug',
          blogpost: '/blog/:year/:month/:slug',
        }
      }
    }
  ]
}

```

## i18n

Fields in Cockpit can be localized into different languages. This plugin is able to import localized versions of fields. To import each language you need to specify the language code in a `languages` array in the plugin options, something like this:

```
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-cockpit',
      options: {
        accessToken: process.env.ACCESSTOKEN,
        host: process.env.APIHOST
        languages: [
          'it',
          'de'
        ]
      }
    }
  ]
}
```

In the example above, this plugin will add fields (if they exist and are localized) to GraphQL. Each localized field will have the two letter code appended, for example, if you have a field called `intro` which is localized and you have `it` and `de` as your languages you will see three fields added to GraphQL called `intro`, `introIt` and `introDe`

## Cockpit API configuration

Cockpit CMS must be configured to allow access to the API using a token. To set this up visit `/restadmin/index` and configure the `Custom keys` section. You may need to generate a key and also allow access to specific api paths, for example:

```
/api/collections/get
/api/cockpit/assets
/api/cockpit/image
/api/collections/collection
/api/collections/listCollections
/api/singletons/get
/api/singletons/listSingletons
```

Once configured hit `Save` at the bottom. You can test access by visiting an endpoint in your browser, for example:

```
https://my-cockpit-cms.com/api/collections/get/page?token=b90d9080711bab6e9af34fbea754c5
```

If you get an access denied message you'll need to check your configuration.

## Cockpit Collection fields

@gridsome/souce-cockpit currently works with all collection fields with some caveats:

- Repeater fields are added to Gridsome as JSON fields. This provides the full tree of information under a repeater field. Without it being a JSON field only repeater fields composed of a single field type would be pulled into GraphQL properly.
- Only repeater fields at the top level are added as JSON fields. If there is a nested repeater field inside a `set` field this may be added properly but only if the repeater is composed of instances of a single field type.
- Only reference fields at the top level will work as Gridsome references. If a reference field is nested inside a repeater or set field it won't work in Gridsome as a reference, although its original subfields will be available.

## Future enhancements

- Deeper field processing: Walk the entire entry tree processing deeper fields than just the top level ones to get nested `reference`, `repeater` and `set` fields fully working.
- Support singletons: Currently `singletons` are not processed by this source plugin
