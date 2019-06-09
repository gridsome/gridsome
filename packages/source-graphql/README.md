# @gridsome/source-graphql

> Pull a remote GraphQL schema in locally

## Install

- `yarn add @gridsome/source-graphql`
- `npm install @gridsome/source-graphql`

## Usage

```js
module.exports = {
  plugins: [
    {
      use: '@gridsome/source-graphql',
      options: {
        url: 'https://example.com/api',
        fieldName: 'puppies',
        typeName: 'puppyTypes',

        headers: {
          Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
        },
      },
    },
  ],
}
```

## Options

#### url

- Type: `string` _required_

The URL of a GraphQL API endpoint to request your schema from.

#### fieldName

- Type: `string` _required_

The name that should be used to namespace your remote schema when it's merged in, so that it doesn't conflict with any local data.

For instance, if you put "puppies" your remote schema's data will be available by querying like so:

```
query {
  puppies {
    helloWorld
  }
}
```

#### typeName

- Type: `string`
- Defaults: `fieldName`

The prefix to be used for your imported schema's field types.

#### headers

- Type: `object`

An object of headers to be passed along with your request to the API endpoint. This will generally be used to authenticate your request.

**Note**: For safety, you should pass any sensitive tokens/passwords as environmental variables. To learn more, see the [Gridsome Docs on Environmental Variables](https://gridsome.org/docs/environment-variables/).
