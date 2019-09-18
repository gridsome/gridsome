# @gridsome/source-wordpress

> WordPress source for Gridsome. This package is under development and
API might change before v1 is released.

This is a customised version of the original source-wordpress package.

It adds additional settings and allows you to create references to Nodes of custom fields and custom post types.

Adding the functionality to create node references for custom fields that contain a valid postID. It supports referencing either attachments or custom post types. References can be set on any post type, except on attachments (I didn't find a case where this would make sense, but this can be easily expanded).

Requires the `customPostTypeReferences` array to be defined in `gridsome.config.js` under the plugin settings
```
plugins: [{
    use: '@gridsome/source-wordpress',
    options: {
      baseUrl: 'https://example.com', // required
      apiBase: '?rest_route=/',
      typeName: 'WordPress',
      perPage: 100,
      concurrent: 10,
      routes: {
        post: '/:year/:month/:day/:slug',
        post_tag: '/tag/:slug'
      },
      customPostTypeReferences: [
        {
           type: 'attachment',
           sourceField: 'banner_image_id',
           targetField: 'bannerImage'
        },
        {
           type: 'car',
           sourceField: 'car_brand_id',
           targetField: 'carBrand'
        },
        ...
      ]
    }
}]
```

Example of a Query making use of a custom node reference:
```
query {
  allWordPressPost {
    edges {
      node {
        title
        bannerImage {
          id
    	  sourceUrl
          mediaDetails {
             width
          }
        }
      }
    }
  }
}
```

## Install
- `yarn add dynamic-node-source-wordpress`
- `npm install dynamic-node-source-wordpress`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: 'dynamic-node-source-wordpress',
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
