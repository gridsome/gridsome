# @gridsome/source-strapi

> [Strapi](https://strapi.io/) source for Gridsome

## Install

- `yarn add @gridsome/source-strapi`
- `npm install @gridsome/source-strapi`

## Usage

```js
export default {
  plugins: [
    {
      use: '@gridsome/source-strapi',
      options: {
        apiURL: 'http://localhost:1337',
        queryLimit: 1000, // Defaults to 100
        contentTypes: ['article', 'user'],
        singleTypes: ['impressum'],
        // Possibility to login with a Strapi user,
        // when content types are not publicly available (optional).
        loginData: {
          identifier: '',
          password: ''
        }
      }
    }
  ]
}
```
