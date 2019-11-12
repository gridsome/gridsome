const path = require("path");
const fs = require("fs");
const compiler = require("vue-template-compiler");
const { parse } = require("@vue/component-compiler-utils");

class VueComponents {
  static defaultOptions() {
    return {};
  }

  constructor(api) {
    api.transpileDependencies([path.resolve(__dirname, "lib", "loaders")]);

    api.chainWebpack(config => {
      this.createGraphQLRule(config, "page-query", "./lib/loaders/page-query");
      this.createGraphQLRule(
        config,
        "static-query",
        "./lib/loaders/static-query"
      );
    });

    api._app.pages.hooks.parseComponent
      .for("vue")
      .tap("VueComponentsPlugin", (source, { resourcePath }) => {
        const filename = path.parse(resourcePath).name;
        const dir = path.parse(resourcePath).dir;
        const { customBlocks } = parse({ filename, source, compiler });

        return {
          pageQuery: this.getPageQueryContent(dir, customBlocks)
        };
      });
  }

  getPageQueryContent(templateDirectory, customBlocks) {
    const firstPageQueryBlock = customBlocks.find(
      block => block.type === "page-query"
    );
    if (firstPageQueryBlock) {
      const hasAttributes = firstPageQueryBlock.attrs.hasOwnProperty("source");
      const hasContent = firstPageQueryBlock.content;
      if (hasAttributes) {
        return fs.readFileSync(
          path.resolve(templateDirectory, "..", "..") +
            path.normalize(firstPageQueryBlock.attrs["source"]),
          "utf8"
        );
      }
      hasContent = hasContent.trim().length === 0 ? null : hasContent;
      return hasContent;
    }
    return null;
  }

  createGraphQLRule(config, type, loader) {
    const re = new RegExp(`blockType=(${type})`);

    config.module
      .rule(type)
      .resourceQuery(re)
      .use("babel-loader")
      .loader("babel-loader")
      .options({
        presets: [require.resolve("@vue/babel-preset-app")]
      })
      .end()
      .use(`${type}-loader`)
      .loader(require.resolve(loader));
  }
}

module.exports = VueComponents;
