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
        token: 'STORYBLOK_SPACE_API_TOKEN', // Storyblok token
        folder: 'STORYBLOK_FOLDER' // default `blog`
        version: 'VERSION_OF_CONTENT', // default `published`
        typeName: 'Post', // Required
        route: '/blog/:slug', // optional
      }
    }
  ]
}
```