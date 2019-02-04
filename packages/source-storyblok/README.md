# @gridsome/source-storyblok

## Install

- `yarn add @gridsome/source-storyblok`
- `npm install @gridsome/source-storyblok`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-storyblok',
      options: {
        typeName: 'Post', // Required
        route: '/blog/:slug', // Optional
        queryParams: {
          token: 'STORYBLOK_SPACE_API_TOKEN', // Required
          starts_with: 'STORYBLOK_FOLDER' // e.g `blog`
          version: 'VERSION_OF_CONTENT', // e.g `published`
        }
      }
    }
  ]
}
```

To see all query parameters visit [this page](https://www.storyblok.com/docs/api/content-delivery#core-resources/stories/retrieve-multiple-stories)
