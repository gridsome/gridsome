<p align="center">
  <br>
  <a href="https://www.gridsome.org">
    <img src="https://raw.githubusercontent.com/gridsome/gridsome/master/assets/logo.png" width="90"/>
  </a>
</p>

<h2 align="center">Gridsome</h2>

<p align="center">
  Build blazing fast websites for any CMS or data with <a href="//vuejs.org">Vue.js</a>
</p>

<p align="center">
  <a title="Total downloads" href="https://www.npmjs.com/package/gridsome">
    <img src="https://img.shields.io/npm/dt/gridsome.svg?style=flat-square">
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

### Enjoy modern dev stack
Build websites using latest web tech tools that developers love - Vue.js, GraphQL and Webpack. Get hot-reloading and all the power of Node.js. Gridsome makes building websites fun again.

### Bring your own data
Gridsome lets you use any CMS or data source for content. Pull data from WordPress, Contentful or any other headless CMS or APIs and access it with GraphQL in your components and pages.

### Mobile-first architecture
Only critical HTML, CSS and JavaScript are loaded at first, and then the next pages are prefetched in the background so users can click around extremely fast without page reloads and even offline

### Extremely fast loading
Gridsome automatically optimises your frontend to load and perform blazing fast. You get code-splitting, asset optimisation, lazy-loading, and almost perfect Lighthouse scores out-of-the-box.

### Scale globally at no cost
Gridsome sites can be entirely hosted on a CDN and can handle thousands to millions of hits without breaking - and no expensive server costs. 

### The frontend for the headless
Design and build websites that are decoupled from the CMS. This means you can easily change the CMS later or test a complete redesign without breaking your site.

## Quick start

### 1. Install Gridsome CLI tool
`npm install --global @gridsome/cli`

### 2. Create a Gridsome project
1. `gridsome create my-gridsome-site` to create a new project </li>
2. `cd my-gridsome-site` to open folder
3. `gridsome develop` to start local dev server at `http://localhost:8080`
4. Happy coding 🎉🙌

### 3. Next steps
1. Add `.vue` files to `/pages` directory to create pages.
2. Use `gridsome build` to generate static files in a `/dist` folder
3. Use `gridsome serve` for server-side rendering

### Learn more...

- [How it works](https://gridsome.org/docs/how-it-works)
- [How to deploy](https://gridsome.org/docs/deployment)

## How to contribute

Install [Node.js 8.3](https://nodejs.org/en/download/) or higher and [Yarn](https://yarnpkg.com/lang/en/docs/install/). It's also recommended to install [Lerna](https://www.npmjs.com/package/lerna) globally.

1. Clone this repository.
2. Create a new Gridsome project inside the `/projects` folder.
3. Enter the new project folder and run `yarn` (or `lerna bootstrap` if installed).
4. The project will now use the local packages when you run `gridsome develop`

To use `@gridsome/cli` in the repo as a global command. Enter the `/packages/cli` folder and run `npm link`.

Yarn will add dependencies from your test projects to the root `yarn.lock` file. So you should not commit changes in that file unless you have added dependencies to any of the core packages. If you need to commit it, remove your projects from the `/projects` folder temporary and run `yarn` or `lerna bootstrap` in the root folder. Yarn will then clean up the lock file with only core dependencies. Commit the file and move your projects back and run `yarn` or `lerna bootstrap` again to start developing.

## Roadmap for v1.0

- [x] `*.vue` pages and templates
- [x] GraphQL data layer
- [x] Multi-process image processing
- [x] Multi-process HTML rendering
- [x] Lazy-loading images and pages
- [x] Pagination
- [ ] Plugin API
- [ ] Taxonomies
- [ ] Service Worker
- [ ] Documentation
- [ ] Guides
- [ ] Tests
