# @gridsome/source-wordpress

> WordPress source for Gridsome. This package is under development and
API might change before v1 is released.

## Install
- `yarn add @gridsome/source-wordpress`
- `npm install @gridsome/source-wordpress`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-wordpress',
      options: {
        baseUrl: 'WEBSITE_URL', // required
        apiBase: 'wp-json',
        typeName: 'WordPress',
        perPage: 100,
        concurrent: 10
      }
    }
  ],
  templates: {
    WordPressPost: '/:year/:month/:day/:slug'
  }
}
```

## Use with Advanced Custom Fields

Install the [ACF to REST API](https://github.com/airesvsg/acf-to-rest-api) plugin to make ACF fields available in the GraphQL schema.

### Tips

**Exclude unnecessary data from ACF fields**

Gridsome needs the `Return format` set to `Post Object` for `Post Object` relations in order to resolve references automatically. But Gridsome only need the `post_type` and `id` to set up a working GraphQL reference. Use the filter below to exclude all other fields.

```php
add_filter( 'acf/format_value', function ( $value ) {
  if ( $value instanceof WP_Post ) {
    return [
      'post_type' => $value->post_type,
      'id'        => $value->ID,
    ];
  }

  return $value;
}, 100 );
```

## Use Custom REST Endpoints

To use REST endpoints from plugins or defined in your theme add a `customEndpoints` array to source-wordpress options.


```js
  use: '@gridsome/source-wordpress',
  options: {
    ... // other source-wordpress options
    customEndpoints: [
      {
        typeName: "WPMenu",
        route: 'myApi/v1/menus',
      }
    ]
  }
```

If you are trying to query posts, you will need to add the `normalize: true` option to make sure the data is properly added:

```js
    customEndpoints: [
        {
            typeName: "Posts",
            route: "/wp/v2/posts",
            normalize: true,
        },
    ]
```

## Create Collections based on REST Endpoints

`customEndpoints` allow you to neatly create separate [Collections](https://gridsome.org/docs/collections/#collections) by querying different REST endpoints.

```js
    customEndpoints: [
        {
            typeName: "Collection1",
            route: "/wp/v2/posts?categories=<category_id>",
            normalize: true,
        },
        {
            typeName: "Collection2",
            route: "/wp/v2/posts?tags=<tag_id>",
            normalize: true,
        },
    ]
```

## Authentication

### JSON Web Token

If you add a `jwtAuth` object to the options, the plugin will first authenticate with the username and password provided. All data fetched afterwards will use the JWT in the header.

1. Install and activate a JWT wordpress plugin (tested with `https://github.com/usefulteam/jwt-auth`) 
2. Add the following fields to gridsome.config.js

```js
  use: '@gridsome/source-wordpress',
  options: {
    ... // other source-wordpress options
    jwtAuth: {
      route: 'jwt-auth/v1/token',
      username: process.env.WP_BUILD_USER,
      password: process.env.WP_BUILD_PW
	},
  }
```

