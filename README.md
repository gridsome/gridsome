<p align="center">
  <br>
  <a href="https://www.gridsome.org">
    <img src="https://raw.githubusercontent.com/gridsome/gridsome/master/.github/assets/logo.png" width="90"/>
  </a>
</p>

<h1 align="center">Gridsome</h1>
<h3 align="center">Build super fast, modern websites with Vue.js</h3>
<p align="center">
Gridsome is a <a href="//vuejs.org">Vue-powered</a> static site generator for building CDN-ready websites for any headless CMS, local files or APIs
</p>

<p align="center">
  <a title="Total downloads" href="https://www.npmjs.com/package/gridsome">
    <img src="https://img.shields.io/npm/dm/gridsome.svg?style=flat-square">
  </a>
  <a title="Current version" href="https://www.npmjs.com/package/gridsome">
    <img src="https://img.shields.io/npm/v/gridsome.svg?style=flat-square">
  </a>
  <a title="MIT License" href="LICENSE">
    <img src="https://img.shields.io/github/license/gridsome/gridsome.svg?style=flat-square">
  </a>
  <a title="Follow on Twitter" href="https://twitter.com/gridsome">
    <img src="https://img.shields.io/twitter/follow/gridsome.svg?style=social&label=Follow">
  </a>
  <br>
  <br>
</p>

> This project is under active development. Any feedback or contributions would be appreciated.

### Enjoy a modern development stack

Build websites with modern tools like Vue.js, webpack and Node.js. Get hot-reloading and access to any packages from npm and write CSS in your favorite preprocessor like Sass or Less with auto-prefixing.

### Connect to any CMS or data source

Use any CMS or data source for content. Pull data from WordPress, Contentful, local Markdown, or any other headless CMS or APIs and access it with GraphQL in your pages and components.

### PWA Offline-first architecture

Only critical HTML, CSS, and JavaScript get loaded first. The next pages are then prefetched so users can click around incredibly fast without page reloads, even when offline.

### Get perfect page speed scores

Gridsome automatically optimizes your frontend to load and perform blazing fast. You get code-splitting, image optimization, lazy-loading, and almost perfect lighthouse scores out-of-the-box.

### Build future ready websites

The future of the web is JavaScript, API's, and Markup - the [Jamstack](https://jamstack.org/). Gridsome uses the power of blazing-fast static site generator, JavaScript and APIs to create stunning dynamic web experiences.

### Ready for global domination

Gridsome sites are usually not connected to any database and can be hosted entirely on a global CDN. It can handle thousands to millions of hits without breaking - and no expensive server costs.

## Quick start

### 1. Install Gridsome CLI tool

- `npm install --global @gridsome/cli`
- `yarn global add @gridsome/cli`
- `pnpm install --global @gridsome/cli`

### 2. Create a Gridsome project

1. `gridsome create my-gridsome-site` to create a new project
2. `cd my-gridsome-site` to open the folder
3. `gridsome develop` to start a local dev server at `http://localhost:8080`
4. Happy coding 🎉🙌

### 3. Next steps

1. Create `.vue` components in the `./src/pages` directory to create pages
2. Use `gridsome build` to generate static files in a `./dist` folder

### Learn more

- [How it works](https://gridsome.org/docs/how-it-works/)
- [How to deploy](https://gridsome.org/docs/deployment/)

## How to Contribute

Install [Node.js ^12.13.0 || ^14.0.0 || >=16.0.0](https://nodejs.org/en/download/) or higher and [Yarn classic](https://classic.yarnpkg.com/en/docs/install/).

1. Clone this repository.
2. Create a new Gridsome project inside the `./projects` folder.
3. Enter the new project folder and run `yarn install`.
4. The project will now use the local packages when you run `gridsome develop`.

Make sure your test project has a version number in its `package.json` if you use an existing project.

To use the local version of `@gridsome/cli` as the global command, enter the `./packages/cli` folder and run `npm link`.

Yarn will add dependencies from your test projects to the root `yarn.lock` file. So you should not commit changes in that file unless you have added dependencies to any of the core packages. If you need to commit it, remove your projects from the `./projects` folder temporary and run `yarn install` in the root folder. Yarn will then clean up the lock file with only necessary dependencies. Commit the file and move your projects back and run `yarn install` again to start developing.

### Code of Conduct

In the interest of fostering an open and welcoming environment please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

Licensed under the [MIT License](./LICENSE).

## Roadmap for v1.0

Visit the [Gridsome Roadmap](https://github.com/gridsome/gridsome/projects/2) to keep track of which features we are currently working on.
