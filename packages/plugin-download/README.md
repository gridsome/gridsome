# @gridsome/plugin-download

> Download additional files before building your Gridsome site

## Install

- `yarn add @gridsome/plugin-download`
- `npm install @gridsome/plugin-download`

## Usage

Add as many files as you want to download in the `files` array in options.

Existing files **WILL BE** replaced as it is assumed the latest file is always downloaded.

If the parent directory (in `dest`) does not exist, it's created

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/plugin-download',
      options: {
        files: [
          {
            url: 'https://server.com/strings.json',
            dest: '/src/strings.json'
          },
          // Make use of env variable
          {
            url: `https://server.com/${process.env.GRIDSOME_LOCALE}.json`,
            dest: '/src/lang.json'
          }
        ]
      }
    }
  ]
}
```

### Options

#### files

- Type: `array<file>`
- Default `null`

#### file

- Type: `object`

```js
{
  url: 'https://...',
  dest: 'path'
}
```
