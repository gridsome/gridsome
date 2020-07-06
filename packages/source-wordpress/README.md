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
        baseUrl: '<WEBSITE_URL>', // required
        apiBase: 'wp-json',
        typeName: 'WordPress',
        images: true
      }
    }
  ],
  templates: {
    WordPressPost: '/:year/:month/:day/:slug'
  }
}
```

## Options

| Option | Explanation | Default |
|-|-|-|
| `baseUrl` | The base URL of your WordPress instance. This is required, and must include the protocol used. |  |
| `apiBase` | The API base for your WordPress instance - this may change if you are using wordpress.com for example. | `wp-json` |
| `typeName` | The downloader will skip images that already exist locally, but you can force it to download every image if needed. | `false` |
| `hostingWPCOM` | Change this to `true` if your site is hosted on wordpress.com, and set `baseUrl` to your site name (e.g. `staticsitegeneration.wordpress.com`) | `false` |
| `perPage` | The amount of items that will be fetched per API call - minimum of 1, and maximum of 100. | `100` |
| `concurrent` | The amount of API calls that will run at once. | `8` |
| `images` | Whether to download images locally to be used with `g-image`. This can also be an object, with options to keep the original file path/name, cache images, and change the download folder. | `{ original: true, folder: '.images/wordpress', cache: true }` |
| `content` | Whether to transform content fields of posts, to update any internal links, and download any images in the post content. It can also be an object, with the option to set the fields to transform, or disable one of the two operations. | `{ links: ['content'], images: true }` |

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
        typeName: "Menu",
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
      normalize: true
    }
  ]
```

## Create Collections based on REST Endpoints

`customEndpoints` allow you to neatly create separate [Collections](https://gridsome.org/docs/collections/#collections) by querying different REST endpoints.

```js
  customEndpoints: [
    {
      typeName: "Collection1",
      route: "/wp/v2/posts?categories=<category_id>",
      normalize: true
    },
    {
      typeName: "Collection2",
      route: "/wp/v2/posts?tags=<tag_id>",
      normalize: true
    }
  ]
```
