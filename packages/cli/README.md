# @gridsome/cli

> A command line tool for creating new Gridsome projects.

## Installation

Install globally with `npm install --global @gridsome/cli` or `yarn global add @gridsome/cli`

## Creating new projects

Run `gridsome create {name} {starter}` to create a new Gridsome project.

- **name** - directory name to create the project in
- **starter** - optional starter kit name

| Official starter kits |                                         |
| --------------------- | --------------------------------------- |
| Default               | `gridsome create my-website`            |
| WordPress             | `gridsome create my-blog wordpress`     |

## Start local development

Run `gridsome develop` inside the project directory to start a local development server.
The server will start at `http://localhost:8080/` with hot-reloading etc.

## Explore GraphQL schema and data

Run `gridsome explore` to start [GraphQL Playground](https://github.com/prisma/graphql-playground)
and explore your schema or data. Open your browser and go to `http://localhost:8080/___explore`
to start exploring.

## Build for production

Run `gridsome build` to generate a static site inside a `dist` directory in your project.
