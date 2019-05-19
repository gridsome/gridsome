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
        accessToken: 'STORYBLOK_SPACE_API_TOKEN', // Required
        stories: {
          article: {
            typeName: 'Article',
            route: '/blog/:year/:month/:day/:slug'
          }
        }
      }
    }
  ]
}
```

To see all query parameters visit [this page](https://www.storyblok.com/docs/api/content-delivery#core-resources/stories/retrieve-multiple-stories)
