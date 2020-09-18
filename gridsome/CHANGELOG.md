# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.7.21](https://github.com/gridsome/gridsome/compare/gridsome@0.7.20...gridsome@0.7.21) (2020-09-18)


### Bug Fixes

* **graphql:** convert to input type correctly ([#1338](https://github.com/gridsome/gridsome/issues/1338)) ([09478fc](https://github.com/gridsome/gridsome/commit/09478fc16b8701581e339aec8e09e6e5ab384d7f))
* **graphql:** prevent infinite loop while creating input types ([7e5f863](https://github.com/gridsome/gridsome/commit/7e5f863199d86b9d0eeb288719cbe96765cbc7ac))





## [0.7.20](https://github.com/gridsome/gridsome/compare/gridsome@0.7.19...gridsome@0.7.20) (2020-08-20)


### Bug Fixes

* **app:** clear cache if the request fails ([#1312](https://github.com/gridsome/gridsome/issues/1312)) ([f3f473e](https://github.com/gridsome/gridsome/commit/f3f473e9883bc7879f21b3c69522cf2c9a32a82f))
* **app:** decode anchor hash value ([#1281](https://github.com/gridsome/gridsome/issues/1281)) ([#1293](https://github.com/gridsome/gridsome/issues/1293)) ([b93eb39](https://github.com/gridsome/gridsome/commit/b93eb39ec41384f9ec1869650e29d783d93a5d48))
* **develop:** ensure dynamic page loads on first run ([6357f19](https://github.com/gridsome/gridsome/commit/6357f1934510e8fae2d950c6074818b35e70fcba))
* **g-image:** exclude base64 data when not lazy loading ([#1318](https://github.com/gridsome/gridsome/issues/1318)) ([be15ba8](https://github.com/gridsome/gridsome/commit/be15ba89518d73178613ca50d19cbe091363e6d0))





## [0.7.19](https://github.com/gridsome/gridsome/compare/gridsome@0.7.18...gridsome@0.7.19) (2020-07-08)


### Bug Fixes

* **g-image:** option for disabling compression ([#1256](https://github.com/gridsome/gridsome/issues/1256)) ([7e6691f](https://github.com/gridsome/gridsome/commit/7e6691febd5ba7de40b33a15de6940fead8316cd))
* **g-image:** prevent increased image sizes ([#1256](https://github.com/gridsome/gridsome/issues/1256)) ([20776c9](https://github.com/gridsome/gridsome/commit/20776c90e8ad48bbb653ed5358e303d44093750e))





## [0.7.18](https://github.com/gridsome/gridsome/compare/gridsome@0.7.17...gridsome@0.7.18) (2020-07-02)


### Bug Fixes

* **app:** redirect to fallback route if not found ([#1239](https://github.com/gridsome/gridsome/issues/1239)) ([41f2b0f](https://github.com/gridsome/gridsome/commit/41f2b0ff411b319cd2a018c5d1b8d256088d9e57))
* **app:** set custom classes for <Pager> links ([#1234](https://github.com/gridsome/gridsome/issues/1234)) ([f2ba2a3](https://github.com/gridsome/gridsome/commit/f2ba2a385591cf09bd07b64652ee314febd431ee))
* **build:** ensure routes always have the same order ([#1247](https://github.com/gridsome/gridsome/issues/1247)) ([da5674f](https://github.com/gridsome/gridsome/commit/da5674fd248fd518963328628d578c0c93451d95))
* **build:** keep webpack hash between builds ([#1247](https://github.com/gridsome/gridsome/issues/1247)) ([e184813](https://github.com/gridsome/gridsome/commit/e1848132f0466cb4bf2dc0a4bfe621cc9599e1ad))
* **develop:** audio/video playback issues in Chrome ([#1220](https://github.com/gridsome/gridsome/issues/1220)) ([3a3c235](https://github.com/gridsome/gridsome/commit/3a3c235331449011a05117667215b71f71b2416d))
* **develop:** fallback to url when no key param is set ([809aaf8](https://github.com/gridsome/gridsome/commit/809aaf8a8b40d07ef89c34c32bfe783e33b61f43))
* **graphql:** add missing ref exists functions ([#1252](https://github.com/gridsome/gridsome/issues/1252)) ([83b0f96](https://github.com/gridsome/gridsome/commit/83b0f966fcdd3ae6a1e0231985d45c3f2e74a308))
* **graphql:** ensure inferred fields are added to filters ([#718](https://github.com/gridsome/gridsome/issues/718)) ([18d0091](https://github.com/gridsome/gridsome/commit/18d009168c01955a1f006a1cbf95073e33634afc))


### Performance Improvements

* **build:** improve page-query runner ([e3a88be](https://github.com/gridsome/gridsome/commit/e3a88be673b58fd563c4528038e6dca77d5ec7fa))





## [0.7.17](https://github.com/gridsome/gridsome/compare/gridsome@0.7.16...gridsome@0.7.17) (2020-06-07)


### Performance Improvements

* **build:** improve page-query output performance ([#1190](https://github.com/gridsome/gridsome/issues/1190)) ([2d81133](https://github.com/gridsome/gridsome/commit/2d811337bb61627ebb51e90404fcb24425bffd1d))
* **g-image:** get dimensions from sharp metadata ([4f8ed20](https://github.com/gridsome/gridsome/commit/4f8ed20c30608fe624f3e3dad87174f600b50e1d))
* **graphql:** improve path argument performance ([#1190](https://github.com/gridsome/gridsome/issues/1190)) ([8f15b4c](https://github.com/gridsome/gridsome/commit/8f15b4c01e650476c174b3e1c8b0f00ee66dd739))
* **store:** disable adaptive indices for node index ([#1190](https://github.com/gridsome/gridsome/issues/1190)) ([52f90e4](https://github.com/gridsome/gridsome/commit/52f90e4196971411b1559e601b38abf798c63198))
* **templates:** cache date while generating paths ([#1190](https://github.com/gridsome/gridsome/issues/1190)) ([c4f17a0](https://github.com/gridsome/gridsome/commit/c4f17a020491d1d7238e416a9911f543aac4b3e1))





## [0.7.16](https://github.com/gridsome/gridsome/compare/gridsome@0.7.15...gridsome@0.7.16) (2020-06-03)


### Bug Fixes

* **graphql:** calculate pagination in dev mode ([#1198](https://github.com/gridsome/gridsome/issues/1198)) ([39e9381](https://github.com/gridsome/gridsome/commit/39e9381e764a634dd6af7e17fc085e66f7f1a674))





## [0.7.15](https://github.com/gridsome/gridsome/compare/gridsome@0.7.14...gridsome@0.7.15) (2020-05-26)


### Bug Fixes

* **app:** add extra debugging output on hash mismatch failure ([#1150](https://github.com/gridsome/gridsome/issues/1150)) ([dc1a3fe](https://github.com/gridsome/gridsome/commit/dc1a3fe528f61c97b1dab0b34fb93076a33cdf08))
* **app:** reduce generated code in routes.js ([#724](https://github.com/gridsome/gridsome/issues/724)) ([5e1d49a](https://github.com/gridsome/gridsome/commit/5e1d49ad1f0069bc4e7e73b05e2e3be72a31fbbe))
* **config:** skip undefined plugins ([3dc6b0f](https://github.com/gridsome/gridsome/commit/3dc6b0f74ddf20aacb774056d7c2e66e05a72209))
* **g-image:** rotate based on exif orientation ([#1178](https://github.com/gridsome/gridsome/issues/1178)) ([9e6e118](https://github.com/gridsome/gridsome/commit/9e6e1186ea3f06913a8843062dc86b0969b34d85))
* **graphql:** add exists filter query operator ([4777d0c](https://github.com/gridsome/gridsome/commit/4777d0ccd9b04201d63bc17bda520b622df4b304))
* **graphql:** allow GET request with query param ([#1127](https://github.com/gridsome/gridsome/issues/1127)) ([5a28064](https://github.com/gridsome/gridsome/commit/5a280646a368dd8b29ffa648405b6953451aa81a))
* **graphql:** exclude undefined variables in page-query ([f753a47](https://github.com/gridsome/gridsome/commit/f753a47f247828538dbb803a2b28bddc230e194c))
* **graphql:** use correct type for store.addReference() ([5b71d04](https://github.com/gridsome/gridsome/commit/5b71d04ddd23eaf0a5ba40fc56a93db77999cf87))





## [0.7.14](https://github.com/gridsome/gridsome/compare/gridsome@0.7.13...gridsome@0.7.14) (2020-04-18)


### Bug Fixes

* **app:** add trailing slash to paths in Pager component ([#1073](https://github.com/gridsome/gridsome/issues/1073)) ([a559bb8](https://github.com/gridsome/gridsome/commit/a559bb8138f5021c22d00777c7b6021c5a4f36dd))
* **app:** include pathPrefix when hard reloading app ([#1044](https://github.com/gridsome/gridsome/issues/1044)) ([4d22712](https://github.com/gridsome/gridsome/commit/4d2271222cb44e94b9e6f7c0ca04740226c0a7ce))
* **graphql:** pass operationName argument to graphql method ([#1047](https://github.com/gridsome/gridsome/issues/1047)) ([a5c2d3b](https://github.com/gridsome/gridsome/commit/a5c2d3b1b812f8f80f3f96b7fa30d30e1ed64035))





## [0.7.13](https://github.com/gridsome/gridsome/compare/gridsome@0.7.12...gridsome@0.7.13) (2020-02-18)


### Bug Fixes

* **app:** allow pascal cased g-link and g-image ([#985](https://github.com/gridsome/gridsome/issues/985)) ([b4805eb](https://github.com/gridsome/gridsome/commit/b4805eb3b01806fea53ced94e91a55b6754879a2))
* **app:** option for disabling global link catcher ([#959](https://github.com/gridsome/gridsome/issues/959)) ([3acbada](https://github.com/gridsome/gridsome/commit/3acbada56288327dee7118bde7b0d1e9b898bd5c))
* **build:** allow overriding cpu count with env var ([#923](https://github.com/gridsome/gridsome/issues/923)) ([12c4865](https://github.com/gridsome/gridsome/commit/12c486545170feb4096ffd88600e618873884a9a))
* **build:** handle some webpack errors properly ([#932](https://github.com/gridsome/gridsome/issues/932)) ([63bd6a3](https://github.com/gridsome/gridsome/commit/63bd6a3966db687fce74c5e13564d33451fe4748))
* **pages:** add missing find* API methods ([#927](https://github.com/gridsome/gridsome/issues/927)) ([bfc1104](https://github.com/gridsome/gridsome/commit/bfc1104b332c62f7c948c2e5bc14541df44099e5))
* **pages:** return if no page is found in `removePage()` ([#926](https://github.com/gridsome/gridsome/issues/926)) ([9d8aef7](https://github.com/gridsome/gridsome/commit/9d8aef77b5eae5be7776af93a72d1b336a58e8d1))
* **webpack:** ignore missing default export in main.js ([a81ed0e](https://github.com/gridsome/gridsome/commit/a81ed0e99a6cf78dffb5a42e5cfc0293b76f069e))





## [0.7.12](https://github.com/gridsome/gridsome/compare/gridsome@0.7.11...gridsome@0.7.12) (2019-12-13)


### Bug Fixes

* **build:** option for disabling hash in asset filenames ([#840](https://github.com/gridsome/gridsome/issues/840)) ([6765782](https://github.com/gridsome/gridsome/commit/6765782723ae1646a96903eebc15f045df062692))
* **webpack:** use devServer.watchOptions for dev middleware ([#865](https://github.com/gridsome/gridsome/issues/865)) ([0bedcdb](https://github.com/gridsome/gridsome/commit/0bedcdbf7abd02f340bd94b3a905325eda3c996f))





## [0.7.11](https://github.com/gridsome/gridsome/compare/gridsome@0.7.10...gridsome@0.7.11) (2019-11-19)


### Bug Fixes

* **app:** ensure favicon height is set ([5164258](https://github.com/gridsome/gridsome/commit/5164258))
* **g-image:** option for setting default blur ([#760](https://github.com/gridsome/gridsome/issues/760)) ([71421f3](https://github.com/gridsome/gridsome/commit/71421f3))
* **g-image:** set blank src if sets is empty ([#824](https://github.com/gridsome/gridsome/issues/824)) ([8ab30fc](https://github.com/gridsome/gridsome/commit/8ab30fc))
* **graphql:** createEnumType schema method ([#814](https://github.com/gridsome/gridsome/issues/814)) ([b09b116](https://github.com/gridsome/gridsome/commit/b09b116))





## [0.7.10](https://github.com/gridsome/gridsome/compare/gridsome@0.7.9...gridsome@0.7.10) (2019-11-06)


### Bug Fixes

* **app:** allow custom routes from router.addRoutes ([fc78a59](https://github.com/gridsome/gridsome/commit/fc78a59))
* **g-image:** include wanted width in srcset ([#797](https://github.com/gridsome/gridsome/issues/797)) ([26dc27b](https://github.com/gridsome/gridsome/commit/26dc27b))
* **g-image:** resize correctly when reusing image ([#797](https://github.com/gridsome/gridsome/issues/797)) ([8c2d834](https://github.com/gridsome/gridsome/commit/8c2d834))
* **graphql:** convert field to union if multiple typeNames ([8bf2931](https://github.com/gridsome/gridsome/commit/8bf2931))
* **store:** resolve absolute paths in fields correctly ([#792](https://github.com/gridsome/gridsome/issues/792)) ([beb9084](https://github.com/gridsome/gridsome/commit/beb9084))





## [0.7.9](https://github.com/gridsome/gridsome/compare/gridsome@0.7.8...gridsome@0.7.9) (2019-10-25)


### Bug Fixes

* **app:** don’t resolve constructor components ([#552](https://github.com/gridsome/gridsome/issues/552)) ([a4e22d6](https://github.com/gridsome/gridsome/commit/a4e22d6))
* **g-image:** always crop by given dimensions ([#759](https://github.com/gridsome/gridsome/issues/759)) ([97ca9db](https://github.com/gridsome/gridsome/commit/97ca9db))
* **g-link:** don't use router-link for mailto and tel links ([#755](https://github.com/gridsome/gridsome/issues/755)) ([d1b5779](https://github.com/gridsome/gridsome/commit/d1b5779))





## [0.7.8](https://github.com/gridsome/gridsome/compare/gridsome@0.7.7...gridsome@0.7.8) (2019-10-15)


### Bug Fixes

* **graphql:** apply extensions once per usage ([91f346e](https://github.com/gridsome/gridsome/commit/91f346e))
* **graphql:** filter collection by reference id ([#745](https://github.com/gridsome/gridsome/issues/745)) ([cbb009a](https://github.com/gridsome/gridsome/commit/cbb009a))
* **graphql:** keep extensions for third party fields ([b0e3cfb](https://github.com/gridsome/gridsome/commit/b0e3cfb))
* **graphql:** prevent overriding built-in directives ([878e947](https://github.com/gridsome/gridsome/commit/878e947))
* **store:** ensure reference node id’s are strings ([98a3edf](https://github.com/gridsome/gridsome/commit/98a3edf))
* **store:** require unique paths for templates only ([91225f1](https://github.com/gridsome/gridsome/commit/91225f1))





## [0.7.7](https://github.com/gridsome/gridsome/compare/gridsome@0.7.6...gridsome@0.7.7) (2019-10-01)


### Bug Fixes

* **assets:** better error message for broken images ([59919aa](https://github.com/gridsome/gridsome/commit/59919aa))
* **build:** validate page-query during build ([5fff97a](https://github.com/gridsome/gridsome/commit/5fff97a))
* **graphql:** don’t create empty fields in objects ([#713](https://github.com/gridsome/gridsome/issues/713)) ([b4776e2](https://github.com/gridsome/gridsome/commit/b4776e2))
* **graphql:** don’t create fields for lists with invalid values ([f635e8b](https://github.com/gridsome/gridsome/commit/f635e8b))
* **graphql:** set sdl type def with addReference ([619b510](https://github.com/gridsome/gridsome/commit/619b510))
* **graphql:** validate static queries ([b9e79f2](https://github.com/gridsome/gridsome/commit/b9e79f2))





## [0.7.6](https://github.com/gridsome/gridsome/compare/gridsome@0.7.5...gridsome@0.7.6) (2019-09-27)


### Bug Fixes

* **app:** don’t resolve links without path prefix ([66eb650](https://github.com/gridsome/gridsome/commit/66eb650))
* **app:** ignore NavigationDuplicated error ([#703](https://github.com/gridsome/gridsome/issues/703)) ([a000bfb](https://github.com/gridsome/gridsome/commit/a000bfb))
* **app:** prevent request to favicon.ico ([#711](https://github.com/gridsome/gridsome/issues/711)) ([28278f7](https://github.com/gridsome/gridsome/commit/28278f7))
* **graphql:** don’t create input types for unions ([c4ba3c5](https://github.com/gridsome/gridsome/commit/c4ba3c5))





## [0.7.5](https://github.com/gridsome/gridsome/compare/gridsome@0.7.4...gridsome@0.7.5) (2019-09-22)


### Bug Fixes

* **graphql:** add schema.createScalarType() method ([5f59747](https://github.com/gridsome/gridsome/commit/5f59747))
* **graphql:** don’t fix variables for other types ([#689](https://github.com/gridsome/gridsome/issues/689)) ([35cfd2b](https://github.com/gridsome/gridsome/commit/35cfd2b))





## [0.7.4](https://github.com/gridsome/gridsome/compare/gridsome@0.7.3...gridsome@0.7.4) (2019-09-20)


### Bug Fixes

* **develop:** show original error when no filename ([eb702d8](https://github.com/gridsome/gridsome/commit/eb702d8))
* **graphql:** auto create missing reference fields ([9a4d24c](https://github.com/gridsome/gridsome/commit/9a4d24c))
* **graphql:** don’t process invalid references ([b88960e](https://github.com/gridsome/gridsome/commit/b88960e))
* **graphql:** don’t transform missing input types ([6e2f28e](https://github.com/gridsome/gridsome/commit/6e2f28e))
* **graphql:** fix union fields by addReference() ([99e2ce8](https://github.com/gridsome/gridsome/commit/99e2ce8))
* **graphql:** ignore trailing slash for path argument ([2b5d17f](https://github.com/gridsome/gridsome/commit/2b5d17f))
* **pages:** show an error if component is not found ([654d075](https://github.com/gridsome/gridsome/commit/654d075))





## [0.7.3](https://github.com/gridsome/gridsome/compare/gridsome@0.7.2...gridsome@0.7.3) (2019-09-16)


### Bug Fixes

* **api:** allow arrow function as default export ([44d13bc](https://github.com/gridsome/gridsome/commit/44d13bc))
* **api:** use express app in configureServer ([#668](https://github.com/gridsome/gridsome/issues/668)) ([fff7a8f](https://github.com/gridsome/gridsome/commit/fff7a8f))
* **build:** support symlinks in static folder ([#671](https://github.com/gridsome/gridsome/issues/671)) ([d35ec39](https://github.com/gridsome/gridsome/commit/d35ec39))
* **build:** use pretty path in render queue ([699b027](https://github.com/gridsome/gridsome/commit/699b027))
* **graphql:** don’t fix unknown variable types ([8e45485](https://github.com/gridsome/gridsome/commit/8e45485))
* **graphql:** proxy invalid reference field names ([b23df81](https://github.com/gridsome/gridsome/commit/b23df81))
* **graphql:** update variables when query changes ([0fc0056](https://github.com/gridsome/gridsome/commit/0fc0056))
* **templates:** fix templates on windows ([a80fb76](https://github.com/gridsome/gridsome/commit/a80fb76))





## [0.7.2](https://github.com/gridsome/gridsome/compare/gridsome@0.7.1...gridsome@0.7.2) (2019-09-13)


### Bug Fixes

* **build:** ensure column width for deprecation notices ([50a6ebb](https://github.com/gridsome/gridsome/commit/50a6ebb))
* **develop:** refresh query results on navigation ([0ce8de3](https://github.com/gridsome/gridsome/commit/0ce8de3))
* **graphql:** don’t process empty object fields ([#662](https://github.com/gridsome/gridsome/issues/662)) ([7852e9e](https://github.com/gridsome/gridsome/commit/7852e9e))
* **graphql:** process object types only once ([11416ac](https://github.com/gridsome/gridsome/commit/11416ac))
* **graphql:** require resolve for custom resolvers ([63da3dd](https://github.com/gridsome/gridsome/commit/63da3dd))





## [0.7.1](https://github.com/gridsome/gridsome/compare/gridsome@0.7.0...gridsome@0.7.1) (2019-09-12)


### Bug Fixes

* **graphql:** fix metadata module error ([598de72](https://github.com/gridsome/gridsome/commit/598de72))
* **graphql:** return 404 for missing pages ([7e3fe84](https://github.com/gridsome/gridsome/commit/7e3fe84))
* **store:** keep custom _id field on node ([bee711c](https://github.com/gridsome/gridsome/commit/bee711c))
* **store:** return collection in getCollection action ([7f0a631](https://github.com/gridsome/gridsome/commit/7f0a631))
* **templates:** skip auto template if no node paths ([2e72f5f](https://github.com/gridsome/gridsome/commit/2e72f5f))





# [0.7.0](https://github.com/gridsome/gridsome/compare/gridsome@0.6.9...gridsome@0.7.0) (2019-09-11)


### Bug Fixes

* **app:** ensure siteUrl is set before checking url ([dfdfea9](https://github.com/gridsome/gridsome/commit/dfdfea9))
* **build:** show better error messages ([b71bcc6](https://github.com/gridsome/gridsome/commit/b71bcc6))
* **develop:** run sockjs on main port ([e78503b](https://github.com/gridsome/gridsome/commit/e78503b))
* **develop:** show deprecation notices ([#639](https://github.com/gridsome/gridsome/issues/639)) ([9ed78c9](https://github.com/gridsome/gridsome/commit/9ed78c9))
* **templates:** preserve trailing slash in routes ([f7b5397](https://github.com/gridsome/gridsome/commit/f7b5397))


### Features

* **app:** override App.vue component ([#635](https://github.com/gridsome/gridsome/issues/635)) ([fc9606d](https://github.com/gridsome/gridsome/commit/fc9606d))
* **app:** permalinks config ([#574](https://github.com/gridsome/gridsome/issues/574)) ([e89d80a](https://github.com/gridsome/gridsome/commit/e89d80a)), closes [#121](https://github.com/gridsome/gridsome/issues/121)
* **app:** upgrade to vue-meta v2.0 ([eac20ef](https://github.com/gridsome/gridsome/commit/eac20ef))
* **develop:** run site on local network ([a1d91f4](https://github.com/gridsome/gridsome/commit/a1d91f4))
* **graphql:** customize the schema ([#509](https://github.com/gridsome/gridsome/issues/509)) ([c4684b2](https://github.com/gridsome/gridsome/commit/c4684b2))
* **pages:** dynamic routing ([#570](https://github.com/gridsome/gridsome/issues/570)) ([0061019](https://github.com/gridsome/gridsome/commit/0061019))
* **pages:** trailing slash for page paths ([3116ed5](https://github.com/gridsome/gridsome/commit/3116ed5))
* **templates:** centralized templates config ([#571](https://github.com/gridsome/gridsome/issues/571)) ([04fa6d1](https://github.com/gridsome/gridsome/commit/04fa6d1))





## [0.6.9](https://github.com/gridsome/gridsome/compare/gridsome@0.6.8...gridsome@0.6.9) (2019-08-29)


### Bug Fixes

* **graphql:** ensure field value is array for lists ([8e02ccd](https://github.com/gridsome/gridsome/commit/8e02ccd))





## [0.6.8](https://github.com/gridsome/gridsome/compare/gridsome@0.6.7...gridsome@0.6.8) (2019-08-19)


### Bug Fixes

* **develop:** always use port from cli args ([d94c76c](https://github.com/gridsome/gridsome/commit/d94c76c)), closes [http-party/node-portfinder#84](https://github.com/http-party/node-portfinder/issues/84)
* **g-image:** fix size for fit inside and fit outside ([#608](https://github.com/gridsome/gridsome/issues/608)) ([ff88566](https://github.com/gridsome/gridsome/commit/ff88566))
* **graphql:** image background argument ([#596](https://github.com/gridsome/gridsome/issues/596)) ([1f7702c](https://github.com/gridsome/gridsome/commit/1f7702c))
* **graphql:** process images in list ([#609](https://github.com/gridsome/gridsome/issues/609)) ([97590d0](https://github.com/gridsome/gridsome/commit/97590d0))
* **store:** resolve absolute url paths ([990b673](https://github.com/gridsome/gridsome/commit/990b673))





## [0.6.7](https://github.com/gridsome/gridsome/compare/gridsome@0.6.6...gridsome@0.6.7) (2019-07-25)


### Bug Fixes

* **build:** don’t inline large data sets ([#462](https://github.com/gridsome/gridsome/issues/462)) ([88f28a7](https://github.com/gridsome/gridsome/commit/88f28a7))
* **config:** load custom favicon config ([#526](https://github.com/gridsome/gridsome/issues/526)) ([73a4c38](https://github.com/gridsome/gridsome/commit/73a4c38))
* **graphql:** return null if date value is null or falsy ([#527](https://github.com/gridsome/gridsome/issues/527)) ([3b4de3a](https://github.com/gridsome/gridsome/commit/3b4de3a))


### Performance Improvements

* **pages:** improve pages api performance ([#548](https://github.com/gridsome/gridsome/issues/548)) ([9bc4ddb](https://github.com/gridsome/gridsome/commit/9bc4ddb))





## [0.6.6](https://github.com/gridsome/gridsome/compare/gridsome@0.6.5...gridsome@0.6.6) (2019-07-05)


### Bug Fixes

* **app:** parse json regardless of content-type ([#534](https://github.com/gridsome/gridsome/issues/534)) ([f2d2d40](https://github.com/gridsome/gridsome/commit/f2d2d40))
* **develop:** show 404 for page/1 in development ([#515](https://github.com/gridsome/gridsome/issues/515)) ([9a10a37](https://github.com/gridsome/gridsome/commit/9a10a37))
* **store:** do not resolve emails ([#500](https://github.com/gridsome/gridsome/issues/500)) ([6105069](https://github.com/gridsome/gridsome/commit/6105069))





## [0.6.5](https://github.com/gridsome/gridsome/compare/gridsome@0.6.4...gridsome@0.6.5) (2019-06-25)


### Bug Fixes

* **app:** don’t fetch data if no context in development ([0850875](https://github.com/gridsome/gridsome/commit/0850875))
* **app:** don’t use empty siteDescription ([#511](https://github.com/gridsome/gridsome/issues/511), [#516](https://github.com/gridsome/gridsome/issues/516)) ([346279d](https://github.com/gridsome/gridsome/commit/346279d))
* **app:** improve IE11 compatibility ([39b5114](https://github.com/gridsome/gridsome/commit/39b5114))
* **app:** reload when assets are missing ([#488](https://github.com/gridsome/gridsome/issues/488)) ([db86a09](https://github.com/gridsome/gridsome/commit/db86a09))
* **app:** use xhr for better IE compatibility ([81b5e84](https://github.com/gridsome/gridsome/commit/81b5e84))
* **build:** stabilize image processing worker ([#501](https://github.com/gridsome/gridsome/issues/501)) ([9d66273](https://github.com/gridsome/gridsome/commit/9d66273))
* **build:** warm up sharp to prevent xmllib error ([918e76b](https://github.com/gridsome/gridsome/commit/918e76b))
* **develop:** request graphql endpoint without page path ([#518](https://github.com/gridsome/gridsome/issues/518)) ([d9c0eec](https://github.com/gridsome/gridsome/commit/d9c0eec))
* **graphql:** resolve deprecated node.fields field ([#477](https://github.com/gridsome/gridsome/issues/477)) ([36911bd](https://github.com/gridsome/gridsome/commit/36911bd))





## [0.6.4](https://github.com/gridsome/gridsome/compare/gridsome@0.6.3...gridsome@0.6.4) (2019-06-07)


### Bug Fixes

* **app:** don’t prefetch already loaded data ([025ab83](https://github.com/gridsome/gridsome/commit/025ab83))
* **app:** prevent images from loading twice ([#486](https://github.com/gridsome/gridsome/issues/486)) ([d44b5ac](https://github.com/gridsome/gridsome/commit/d44b5ac)), closes [#438](https://github.com/gridsome/gridsome/issues/438)
* **app:** respect active link class options ([#478](https://github.com/gridsome/gridsome/issues/478)) ([f27cfd6](https://github.com/gridsome/gridsome/commit/f27cfd6))
* **build:** don’t write out empty data files ([55f323d](https://github.com/gridsome/gridsome/commit/55f323d))
* **webpack:** inject promise polyfill ([#480](https://github.com/gridsome/gridsome/issues/480)) ([ae29fea](https://github.com/gridsome/gridsome/commit/ae29fea))





## [0.6.3](https://github.com/gridsome/gridsome/compare/gridsome@0.6.2...gridsome@0.6.3) (2019-05-27)


### Bug Fixes

* **webpack:** externalize included dependencies only ([adbff52](https://github.com/gridsome/gridsome/commit/adbff52))





## [0.6.2](https://github.com/gridsome/gridsome/compare/gridsome@0.6.1...gridsome@0.6.2) (2019-05-20)


### Bug Fixes

* **app:** include query params in html links ([f0b162e](https://github.com/gridsome/gridsome/commit/f0b162e))
* **app:** prevent infinite loop for 404 ([#387](https://github.com/gridsome/gridsome/issues/387)) ([698f8b3](https://github.com/gridsome/gridsome/commit/698f8b3))
* **app:** resolve pagination with trailing slash ([#430](https://github.com/gridsome/gridsome/issues/430)) ([a035311](https://github.com/gridsome/gridsome/commit/a035311))
* **build:** ensure page context is an object ([#434](https://github.com/gridsome/gridsome/issues/434)) ([65bc3ed](https://github.com/gridsome/gridsome/commit/65bc3ed))
* **explore:** set correct mode for explore command ([#435](https://github.com/gridsome/gridsome/issues/435)) ([08b312e](https://github.com/gridsome/gridsome/commit/08b312e))
* **store:** do not slugify id in routes ([#429](https://github.com/gridsome/gridsome/issues/429)) ([308beff](https://github.com/gridsome/gridsome/commit/308beff))
* **store:** use custom year, month or day fields if they exist ([91728ef](https://github.com/gridsome/gridsome/commit/91728ef))





## [0.6.1](https://github.com/gridsome/gridsome/compare/gridsome@0.6.0...gridsome@0.6.1) (2019-05-13)


### Bug Fixes

* **app:** prevent cyclic dependency ([#421](https://github.com/gridsome/gridsome/issues/421)) ([3574efa](https://github.com/gridsome/gridsome/commit/3574efa))
* **graphql:** use correct typeName for belongsTo pagination ([#422](https://github.com/gridsome/gridsome/issues/422)) ([b06310f](https://github.com/gridsome/gridsome/commit/b06310f))
* **pages:** set page context in dev mode ([#417](https://github.com/gridsome/gridsome/issues/417)) ([a7a6e17](https://github.com/gridsome/gridsome/commit/a7a6e17))
* **store:** create reference to node instance ([81bb047](https://github.com/gridsome/gridsome/commit/81bb047))





# [0.6.0](https://github.com/gridsome/gridsome/compare/gridsome@0.5.8...gridsome@0.6.0) (2019-05-10)


### Bug Fixes

* **assets:** encode generated urls ([#393](https://github.com/gridsome/gridsome/issues/393)) ([b6994c8](https://github.com/gridsome/gridsome/commit/b6994c8))
* **build:** keep dist folder between builds ([#409](https://github.com/gridsome/gridsome/issues/409)) ([1ef584b](https://github.com/gridsome/gridsome/commit/1ef584b))
* **build:** set correct dest path for files ([#221](https://github.com/gridsome/gridsome/issues/221)) ([f9dad9e](https://github.com/gridsome/gridsome/commit/f9dad9e))
* **graphql:** do not camelCase field names automatically ([#351](https://github.com/gridsome/gridsome/issues/351)) ([4e54c5c](https://github.com/gridsome/gridsome/commit/4e54c5c))
* **graphql:** ensure totalPages count is not null ([ae75b39](https://github.com/gridsome/gridsome/commit/ae75b39))


### Features

* **api:** helper method for resolving paths ([db3546f](https://github.com/gridsome/gridsome/commit/db3546f))
* **app:** method for fetching page data ([2a624ab](https://github.com/gridsome/gridsome/commit/2a624ab))
* **app:** range option for Pager component ([#344](https://github.com/gridsome/gridsome/issues/344)) ([77dab89](https://github.com/gridsome/gridsome/commit/77dab89))
* **graphql:** add metaData from config ([#225](https://github.com/gridsome/gridsome/issues/225)) ([b90d490](https://github.com/gridsome/gridsome/commit/b90d490))
* **graphql:** advanced sort argument ([#247](https://github.com/gridsome/gridsome/issues/247)) ([9b0907e](https://github.com/gridsome/gridsome/commit/9b0907e))
* **graphql:** limit argument for content types and belongsTo ([7756620](https://github.com/gridsome/gridsome/commit/7756620))
* **pages:** create managed pages ([a9042b0](https://github.com/gridsome/gridsome/commit/a9042b0))
* **pages:** pages api ([#309](https://github.com/gridsome/gridsome/issues/309)) ([5c6a45c](https://github.com/gridsome/gridsome/commit/5c6a45c))
* **store:** methods for retrieving nodes ([7b442a2](https://github.com/gridsome/gridsome/commit/7b442a2))
* **webpack:** configure webpack ([#342](https://github.com/gridsome/gridsome/issues/342)) ([ac9fc5a](https://github.com/gridsome/gridsome/commit/ac9fc5a))





## [0.5.8](https://github.com/gridsome/gridsome/compare/gridsome@0.5.7...gridsome@0.5.8) (2019-04-18)


### Bug Fixes

* **app:** don’t handle external links with router ([#367](https://github.com/gridsome/gridsome/issues/367)) ([bfb2a79](https://github.com/gridsome/gridsome/commit/bfb2a79))





## [0.5.7](https://github.com/gridsome/gridsome/compare/gridsome@0.5.6...gridsome@0.5.7) (2019-04-09)


### Bug Fixes

* **app:** don't resolve url for different port ([#350](https://github.com/gridsome/gridsome/issues/350)) ([a6ab23f](https://github.com/gridsome/gridsome/commit/a6ab23f))
* **g-image:** alt attribute for noscript image ([#353](https://github.com/gridsome/gridsome/issues/353)) ([fcfcf36](https://github.com/gridsome/gridsome/commit/fcfcf36))
* **graphql:** prefer float when mixed number types ([#332](https://github.com/gridsome/gridsome/issues/332)) ([b311850](https://github.com/gridsome/gridsome/commit/b311850))





## [0.5.6](https://github.com/gridsome/gridsome/compare/gridsome@0.5.5...gridsome@0.5.6) (2019-03-29)


### Bug Fixes

* **app:** allow absolute path to custom favicon ([53a755c](https://github.com/gridsome/gridsome/commit/53a755c))
* **app:** allow css.split option to be true ([#266](https://github.com/gridsome/gridsome/issues/266)) ([a0fcd10](https://github.com/gridsome/gridsome/commit/a0fcd10))
* **app:** make routes appear in vue-devtools ([#322](https://github.com/gridsome/gridsome/issues/322)) ([f1a865c](https://github.com/gridsome/gridsome/commit/f1a865c))
* **develop:** allow OPTIONS method request to /___graphql ([#271](https://github.com/gridsome/gridsome/issues/271)) ([f1ec997](https://github.com/gridsome/gridsome/commit/f1ec997))
* **g-image:** increase max image width ([#286](https://github.com/gridsome/gridsome/issues/286)) ([8a7ae89](https://github.com/gridsome/gridsome/commit/8a7ae89))
* **graphql:** allow requests without variables ([#323](https://github.com/gridsome/gridsome/issues/323)) ([8184834](https://github.com/gridsome/gridsome/commit/8184834))
* **store:** handle route params starting with raw correctly ([#295](https://github.com/gridsome/gridsome/issues/295)) ([931937c](https://github.com/gridsome/gridsome/commit/931937c))
* **store:** prioritize node.id over node.fields.id ([3d7c180](https://github.com/gridsome/gridsome/commit/3d7c180))
* **store:** support repeated segments in dynamic routes ([#279](https://github.com/gridsome/gridsome/issues/279)) ([2259f85](https://github.com/gridsome/gridsome/commit/2259f85))





## [0.5.5](https://github.com/gridsome/gridsome/compare/gridsome@0.5.4...gridsome@0.5.5) (2019-03-08)


### Bug Fixes

* **app:** don’t preload /404 without page-query ([5835733](https://github.com/gridsome/gridsome/commit/5835733))
* **app:** only intercept left clicks on links ([#236](https://github.com/gridsome/gridsome/issues/236)) ([78413dc](https://github.com/gridsome/gridsome/commit/78413dc))
* **build:** render template with static route and pagination once ([2f4d93a](https://github.com/gridsome/gridsome/commit/2f4d93a))
* **develop:** show /404 for non existing paths ([b18e8e9](https://github.com/gridsome/gridsome/commit/b18e8e9))
* **develop:** update static-query when source changes ([d867e93](https://github.com/gridsome/gridsome/commit/d867e93))
* **graphq:** siteDescription as metaData ([#260](https://github.com/gridsome/gridsome/issues/260)) ([640f72d](https://github.com/gridsome/gridsome/commit/640f72d))
* **pager:** bind linkClass to an object ([#257](https://github.com/gridsome/gridsome/issues/257)) ([6765a3d](https://github.com/gridsome/gridsome/commit/6765a3d))
* **store:** keep references for empty arrays ([ec6fcf9](https://github.com/gridsome/gridsome/commit/ec6fcf9))
* **webpack:** combine all css in one file ([#230](https://github.com/gridsome/gridsome/issues/230)) ([952148d](https://github.com/gridsome/gridsome/commit/952148d))
* **webpack:** support webp images ([#227](https://github.com/gridsome/gridsome/issues/227)) ([72123f7](https://github.com/gridsome/gridsome/commit/72123f7))
* count minimum one physical cpu ([#255](https://github.com/gridsome/gridsome/issues/255)) ([91444c7](https://github.com/gridsome/gridsome/commit/91444c7))
* pin jest-worker version until fix is published ([#252](https://github.com/gridsome/gridsome/issues/252)) ([c0d15b6](https://github.com/gridsome/gridsome/commit/c0d15b6))


### Performance Improvements

* **graphql:** improve belongsTo query performance ([bcdacce](https://github.com/gridsome/gridsome/commit/bcdacce))





<a name="0.5.4"></a>
## [0.5.4](https://github.com/gridsome/gridsome/compare/gridsome@0.5.3...gridsome@0.5.4) (2019-02-27)


### Bug Fixes

* **build:** ensure data directory exists before building ([#93](https://github.com/gridsome/gridsome/issues/93)) ([3453aff](https://github.com/gridsome/gridsome/commit/3453aff))
* **graphql:** don’t process non graphql requests ([#220](https://github.com/gridsome/gridsome/issues/220)) ([c276b98](https://github.com/gridsome/gridsome/commit/c276b98))





<a name="0.5.3"></a>
## [0.5.3](https://github.com/gridsome/gridsome/compare/gridsome@0.5.2...gridsome@0.5.3) (2019-02-26)


### Bug Fixes

* **app:** fetch data properly for homepage ([#218](https://github.com/gridsome/gridsome/issues/218)) ([fd72abc](https://github.com/gridsome/gridsome/commit/fd72abc))





<a name="0.5.2"></a>
## [0.5.2](https://github.com/gridsome/gridsome/compare/gridsome@0.5.1...gridsome@0.5.2) (2019-02-26)


### Bug Fixes

* **app:** preload data for links in view ([35411aa](https://github.com/gridsome/gridsome/commit/35411aa))
* **app:** unslash path before fetching data ([7c086a7](https://github.com/gridsome/gridsome/commit/7c086a7))





<a name="0.5.1"></a>
## [0.5.1](https://github.com/gridsome/gridsome/compare/gridsome@0.5.0...gridsome@0.5.1) (2019-02-26)


### Bug Fixes

* **app:** keep original path when showing 404 ([f0efbaa](https://github.com/gridsome/gridsome/commit/f0efbaa))
* **build:** fail if path resolves to 404 ([#218](https://github.com/gridsome/gridsome/issues/218)) ([b3b7add](https://github.com/gridsome/gridsome/commit/b3b7add))
* **build:** put images in correct folder when pathPrefix is used ([#221](https://github.com/gridsome/gridsome/issues/221)) ([497998c](https://github.com/gridsome/gridsome/commit/497998c))
* **build:** query context for templates with static route ([a962482](https://github.com/gridsome/gridsome/commit/a962482))
* **build:** render pagination correctly for root path ([#218](https://github.com/gridsome/gridsome/issues/218)) ([1ee57fe](https://github.com/gridsome/gridsome/commit/1ee57fe))
* **g-image:** add static classes to noscript image ([#203](https://github.com/gridsome/gridsome/issues/203)) ([c4036b8](https://github.com/gridsome/gridsome/commit/c4036b8))
* **g-image:** refresh when src updates on same element ([7128fd6](https://github.com/gridsome/gridsome/commit/7128fd6))
* **g-image:** remove duplicate class names ([2de526f](https://github.com/gridsome/gridsome/commit/2de526f))
* **graphql:** don’t fail when invalid page-query ([d143767](https://github.com/gridsome/gridsome/commit/d143767))
* **graphql:** improve graphql error handling ([#204](https://github.com/gridsome/gridsome/issues/204)) ([767b674](https://github.com/gridsome/gridsome/commit/767b674))
* **store:** include GraphQLJSON type in addSchemaField ([73e332c](https://github.com/gridsome/gridsome/commit/73e332c))
* **webpack:** don’t fail if g-image or g-link has no attrs ([5267a78](https://github.com/gridsome/gridsome/commit/5267a78))





<a name="0.5.0"></a>
# [0.5.0](https://github.com/gridsome/gridsome/compare/gridsome@0.4.7...gridsome@0.5.0) (2019-02-19)


### Bug Fixes

* **app:** fix cyclic dependency when importing Pager ([#109](https://github.com/gridsome/gridsome/issues/109)) ([b8247af](https://github.com/gridsome/gridsome/commit/b8247af))
* **app:** parse dates as UTC ([bb1972d](https://github.com/gridsome/gridsome/commit/bb1972d))
* **build:** create new Vue instance before each route ([424e678](https://github.com/gridsome/gridsome/commit/424e678))
* **build:** ensure 404 route for /404 page ([70698e0](https://github.com/gridsome/gridsome/commit/70698e0))
* **g-image:** behave properly inside v-for ([#185](https://github.com/gridsome/gridsome/issues/185)) ([e3c2aba](https://github.com/gridsome/gridsome/commit/e3c2aba))
* **g-image:** pass custom blur to asset queue ([1f9ce9a](https://github.com/gridsome/gridsome/commit/1f9ce9a))
* **graphql:** do not send page param in path ([61cdf9c](https://github.com/gridsome/gridsome/commit/61cdf9c))
* **graphql:** don’t convert URLs or filenames to object ([be08c52](https://github.com/gridsome/gridsome/commit/be08c52))
* **graphql:** handle date types correctly ([53f963d](https://github.com/gridsome/gridsome/commit/53f963d))
* **graphql:** improved error handling ([0dad580](https://github.com/gridsome/gridsome/commit/0dad580))
* **graphql:** merge all entries in arrays ([#184](https://github.com/gridsome/gridsome/issues/184)) ([80952d6](https://github.com/gridsome/gridsome/commit/80952d6))
* **graphql:** return null for missing references ([8d920fc](https://github.com/gridsome/gridsome/commit/8d920fc))
* **graphql:** sort by custom field value ([cfcefaf](https://github.com/gridsome/gridsome/commit/cfcefaf))
* **store:** allow regex wildcard route param ([f283526](https://github.com/gridsome/gridsome/commit/f283526))


### Features

* **app:** override active link classes for Pager ([#143](https://github.com/gridsome/gridsome/issues/143)) ([6a5159d](https://github.com/gridsome/gridsome/commit/6a5159d))
* **app:** override default index.html template ([#162](https://github.com/gridsome/gridsome/issues/162)) ([4cdd326](https://github.com/gridsome/gridsome/commit/4cdd326))
* **app:** siteDescription as description meta tag ([#70](https://github.com/gridsome/gridsome/issues/70)) ([6fa118c](https://github.com/gridsome/gridsome/commit/6fa118c))
* **app:** upgrade to Vue 2.6 ([f1ab4e1](https://github.com/gridsome/gridsome/commit/f1ab4e1))
* **build:** generate 404.html file ([#75](https://github.com/gridsome/gridsome/issues/75)) ([59988e5](https://github.com/gridsome/gridsome/commit/59988e5))
* **develop:** configureServer hook ([029e431](https://github.com/gridsome/gridsome/commit/029e431))
* **g-link:** rel noopener for external links ([#104](https://github.com/gridsome/gridsome/issues/104)) ([9f11efb](https://github.com/gridsome/gridsome/commit/9f11efb))
* **graphql:** belongsTo field for listing references ([#119](https://github.com/gridsome/gridsome/issues/119)) ([2ef275f](https://github.com/gridsome/gridsome/commit/2ef275f))
* **graphql:** current node as query variables ([#77](https://github.com/gridsome/gridsome/issues/77)) ([1beece4](https://github.com/gridsome/gridsome/commit/1beece4))
* **graphql:** filter argument ([#84](https://github.com/gridsome/gridsome/issues/84)) ([692f6cb](https://github.com/gridsome/gridsome/commit/692f6cb))
* **router:** deep node fields as route params ([#115](https://github.com/gridsome/gridsome/issues/115)) ([2d2ec44](https://github.com/gridsome/gridsome/commit/2d2ec44))
* **store:** helper for creating refs in sub fields ([b9d7add](https://github.com/gridsome/gridsome/commit/b9d7add))
* **webpack:** add custom css loader options ([#46](https://github.com/gridsome/gridsome/issues/46)) ([cf7a505](https://github.com/gridsome/gridsome/commit/cf7a505))
* **webpack:** enviroment variables and support for dotenv files ([#123](https://github.com/gridsome/gridsome/issues/123)) ([c236d8b](https://github.com/gridsome/gridsome/commit/c236d8b))
* **webpack:** use [@vue](https://github.com/vue)/babel-preset-app ([e51e363](https://github.com/gridsome/gridsome/commit/e51e363))





<a name="0.4.7"></a>
## [0.4.7](https://github.com/gridsome/gridsome/compare/gridsome@0.4.6...gridsome@0.4.7) (2019-02-04)


### Bug Fixes

* **app:** add key to viewport meta ([#169](https://github.com/gridsome/gridsome/issues/169)) ([c7f6dfa](https://github.com/gridsome/gridsome/commit/c7f6dfa))
* **store:** pass resolveAbsolutePaths correctly ([6164464](https://github.com/gridsome/gridsome/commit/6164464))
* **webpack:** remove duplicate style links (163) ([5ce0106](https://github.com/gridsome/gridsome/commit/5ce0106))





<a name="0.4.6"></a>
## [0.4.6](https://github.com/gridsome/gridsome/compare/gridsome@0.4.5...gridsome@0.4.6) (2019-01-30)


### Bug Fixes

* **app:** add format-detection meta tag ([#145](https://github.com/gridsome/gridsome/issues/145)) ([f7f94ae](https://github.com/gridsome/gridsome/commit/f7f94ae))
* **app:** simplify IntersectionObserver check ([#153](https://github.com/gridsome/gridsome/issues/153)) ([5a0d729](https://github.com/gridsome/gridsome/commit/5a0d729))
* **build:** throw error if something fails in main.js ([bb62605](https://github.com/gridsome/gridsome/commit/bb62605))
* **g-image:** observe images in v-html ([#158](https://github.com/gridsome/gridsome/issues/158)) ([07821da](https://github.com/gridsome/gridsome/commit/07821da))
* **g-image:** run onload event once ([ca6f015](https://github.com/gridsome/gridsome/commit/ca6f015)), closes [#93](https://github.com/gridsome/gridsome/issues/93)
* **webpack:** don’t cache static-query ([#160](https://github.com/gridsome/gridsome/issues/160)) ([0352f99](https://github.com/gridsome/gridsome/commit/0352f99))





<a name="0.4.5"></a>
## [0.4.5](https://github.com/gridsome/gridsome/compare/gridsome@0.4.4...gridsome@0.4.5) (2019-01-26)


### Bug Fixes

* **app:** custom favicon path ([#149](https://github.com/gridsome/gridsome/issues/149)) ([f6b6b3d](https://github.com/gridsome/gridsome/commit/f6b6b3d)), closes [#138](https://github.com/gridsome/gridsome/issues/138)
* **g-image:** bind custom classes to object ([#151](https://github.com/gridsome/gridsome/issues/151)) ([10150ca](https://github.com/gridsome/gridsome/commit/10150ca))





<a name="0.4.4"></a>
## [0.4.4](https://github.com/gridsome/gridsome/compare/gridsome@0.4.3...gridsome@0.4.4) (2019-01-15)


### Bug Fixes

* **graphql:** merge ref fields correctly ([#128](https://github.com/gridsome/gridsome/issues/128), [#129](https://github.com/gridsome/gridsome/issues/129)) ([ffb29ee](https://github.com/gridsome/gridsome/commit/ffb29ee))
* **webpack:** cache graphql loader results ([6e794ab](https://github.com/gridsome/gridsome/commit/6e794ab))
* **webpack:** transpile custom blocks ([#130](https://github.com/gridsome/gridsome/issues/130)) ([c81fee4](https://github.com/gridsome/gridsome/commit/c81fee4))





<a name="0.4.3"></a>
## [0.4.3](https://github.com/gridsome/gridsome/compare/gridsome@0.4.2...gridsome@0.4.3) (2019-01-09)


### Bug Fixes

* **webpack:** fix config for IE support ([e403f4c](https://github.com/gridsome/gridsome/commit/e403f4c))





<a name="0.4.2"></a>
## [0.4.2](https://github.com/gridsome/gridsome/compare/gridsome@0.4.1...gridsome@0.4.2) (2019-01-07)


### Bug Fixes

* **route:** allow node props as route params ([1658fde](https://github.com/gridsome/gridsome/commit/1658fde))
* **store:** update node content and excerpt ([637e0e4](https://github.com/gridsome/gridsome/commit/637e0e4))





<a name="0.4.1"></a>
## [0.4.1](https://github.com/gridsome/gridsome/compare/gridsome@0.4.0...gridsome@0.4.1) (2019-01-03)


### Bug Fixes

* **config:** customizing host and port ([bc44a64](https://github.com/gridsome/gridsome/commit/bc44a64))
* **config:** use host and port from project config ([7936aa7](https://github.com/gridsome/gridsome/commit/7936aa7))
* **graphql:** fix deprecated references api ([cb6f245](https://github.com/gridsome/gridsome/commit/cb6f245))
* **image:** don’t re-render when parent updates ([#93](https://github.com/gridsome/gridsome/issues/93)) ([c813d70](https://github.com/gridsome/gridsome/commit/c813d70))
* **pathPrefix:** don’t create subfolder ([#85](https://github.com/gridsome/gridsome/issues/85)) ([96bfbed](https://github.com/gridsome/gridsome/commit/96bfbed))
* **router:** add leading slash to routes ([4024ace](https://github.com/gridsome/gridsome/commit/4024ace))





<a name="0.4.0"></a>
# [0.4.0](https://github.com/gridsome/gridsome/compare/gridsome@0.3.6...gridsome@0.4.0) (2018-12-19)


### Bug Fixes

* **app:** use default link behavior if 404 ([f9aeed7](https://github.com/gridsome/gridsome/commit/f9aeed7))
* **g-link:** customizable active classes ([#65](https://github.com/gridsome/gridsome/issues/65)) ([0ee5273](https://github.com/gridsome/gridsome/commit/0ee5273))
* **g-link:** link to local files ([ece2de5](https://github.com/gridsome/gridsome/commit/ece2de5))
* **graphql:** include empty string type in schema ([44b68b2](https://github.com/gridsome/gridsome/commit/44b68b2))
* **graphql:** return null for missing images ([39c5a92](https://github.com/gridsome/gridsome/commit/39c5a92))
* **graphql:** warn when missing reference ([a6f7857](https://github.com/gridsome/gridsome/commit/a6f7857))
* **router:** fetch data for paths with hash ([19a0c78](https://github.com/gridsome/gridsome/commit/19a0c78))
* **store:** dont process null value as an object ([a05bb5a](https://github.com/gridsome/gridsome/commit/a05bb5a))


### Features

* **build:** image processing cache ([#57](https://github.com/gridsome/gridsome/issues/57)) ([0a9e449](https://github.com/gridsome/gridsome/commit/0a9e449))
* **graphql:** add custom metadata ([#54](https://github.com/gridsome/gridsome/issues/54)) ([7b35378](https://github.com/gridsome/gridsome/commit/7b35378))
* **graphql:** reference with multiple node types ([#50](https://github.com/gridsome/gridsome/issues/50)) ([185297f](https://github.com/gridsome/gridsome/commit/185297f))
* **image:** crop by width and height ([#78](https://github.com/gridsome/gridsome/issues/78)) ([001aa0b](https://github.com/gridsome/gridsome/commit/001aa0b))
* **router:** custom fields as params ([#53](https://github.com/gridsome/gridsome/issues/53)) ([f53f67f](https://github.com/gridsome/gridsome/commit/f53f67f))
* **webpack:** runtimeCompiler config ([cdb676f](https://github.com/gridsome/gridsome/commit/cdb676f))
* **webpack:** transpileDependencies config ([36e4932](https://github.com/gridsome/gridsome/commit/36e4932))





<a name="0.3.6"></a>
## [0.3.6](https://github.com/gridsome/gridsome/compare/gridsome@0.3.5...gridsome@0.3.6) (2018-12-10)


### Bug Fixes

* **graphql:** dont infer filename as file type ([3a04df9](https://github.com/gridsome/gridsome/commit/3a04df9))
* **image:** exclude unecessary data ([574928c](https://github.com/gridsome/gridsome/commit/574928c))





<a name="0.3.5"></a>
## [0.3.5](https://github.com/gridsome/gridsome/compare/gridsome@0.3.4...gridsome@0.3.5) (2018-12-05)


### Bug Fixes

* **api:** pass graphql object to addSchemaField ([#64](https://github.com/gridsome/gridsome/issues/64)) ([f6fd2a8](https://github.com/gridsome/gridsome/commit/f6fd2a8))
* **build:** fix beforeProcessAssets hook name ([8eafe68](https://github.com/gridsome/gridsome/commit/8eafe68))
* **favicon:** set mime type for icons in head ([bface4d](https://github.com/gridsome/gridsome/commit/bface4d))
* **graphql:** do not use file type for urls ([fd14b44](https://github.com/gridsome/gridsome/commit/fd14b44))
* **graphql:** fix order argument for collections ([3e6a1fa](https://github.com/gridsome/gridsome/commit/3e6a1fa))
* **graphql:** get node by id ([ba83545](https://github.com/gridsome/gridsome/commit/ba83545))
* **graphql:** transform nested invalid field names ([5555354](https://github.com/gridsome/gridsome/commit/5555354))
* **touchicon:** use correct sizes when custom icon ([db1c349](https://github.com/gridsome/gridsome/commit/db1c349))





<a name="0.3.4"></a>
## [0.3.4](https://github.com/gridsome/gridsome/compare/gridsome@0.3.3...gridsome@0.3.4) (2018-11-22)


### Bug Fixes

* **graphql:** do not use file type if no extension ([3b1fb7c](https://github.com/gridsome/gridsome/commit/3b1fb7c))
* **webpack:** allow async chainWebpack ([a0caa84](https://github.com/gridsome/gridsome/commit/a0caa84))





<a name="0.3.3"></a>
## [0.3.3](https://github.com/gridsome/gridsome/compare/gridsome@0.3.2...gridsome@0.3.3) (2018-11-16)


### Bug Fixes

* re-create routes after a node.path change ([b6e16c9](https://github.com/gridsome/gridsome/commit/b6e16c9))





<a name="0.3.2"></a>
## [0.3.2](https://github.com/gridsome/gridsome/compare/gridsome@0.3.1...gridsome@0.3.2) (2018-11-16)


### Bug Fixes

* **graphql:** merge nested object fields ([f2e9d4a](https://github.com/gridsome/gridsome/commit/f2e9d4a))
* **webpack:** absolute path to 404 fallback ([97e5e36](https://github.com/gridsome/gridsome/commit/97e5e36)), closes [#43](https://github.com/gridsome/gridsome/issues/43)
* **webpack:** load local babel config files ([975bfea](https://github.com/gridsome/gridsome/commit/975bfea))





<a name="0.3.1"></a>
## [0.3.1](https://github.com/gridsome/gridsome/compare/gridsome@0.3.0...gridsome@0.3.1) (2018-11-14)


### Bug Fixes

* **graphql:** get sub fields from object fields ([039a532](https://github.com/gridsome/gridsome/commit/039a532))
* **graphql:** return correct dates ([1965091](https://github.com/gridsome/gridsome/commit/1965091))
* **ssr:** render body scripts from vue-meta ([b4b50bd](https://github.com/gridsome/gridsome/commit/b4b50bd))
* **webpack:** run chainWebpack after all plugins ([2cc5850](https://github.com/gridsome/gridsome/commit/2cc5850))





<a name="0.3.0"></a>
# [0.3.0](https://github.com/gridsome/gridsome/compare/gridsome@0.2.5...gridsome@0.3.0) (2018-11-11)


### Bug Fixes

* clear errors in terminal when resolved ([832e7de](https://github.com/gridsome/gridsome/commit/832e7de))
* dont fail when missing favicon.png ([829091b](https://github.com/gridsome/gridsome/commit/829091b))
* handle urls in process queue ([60623ee](https://github.com/gridsome/gridsome/commit/60623ee))
* **image:** render fallback as html string ([738ef23](https://github.com/gridsome/gridsome/commit/738ef23))
* **store:** warn and skip when duplicate path detected ([215b3e9](https://github.com/gridsome/gridsome/commit/215b3e9))
* keep hash when resolving raw html links ([87860ab](https://github.com/gridsome/gridsome/commit/87860ab))
* lazy load external image urls ([4f7f867](https://github.com/gridsome/gridsome/commit/4f7f867))
* send context to transformer ([7b50bae](https://github.com/gridsome/gridsome/commit/7b50bae))
* send graphql to createSchema api ([86363c3](https://github.com/gridsome/gridsome/commit/86363c3))
* update routes when source path changes ([85171cf](https://github.com/gridsome/gridsome/commit/85171cf))


### Features

* addReference and addSchemaField ([c159ee5](https://github.com/gridsome/gridsome/commit/c159ee5))
* build hooks ([32774f0](https://github.com/gridsome/gridsome/commit/32774f0))
* cleaner graphql schema ([#31](https://github.com/gridsome/gridsome/issues/31)) ([98420a2](https://github.com/gridsome/gridsome/commit/98420a2))
* client plugin api ([caa6a17](https://github.com/gridsome/gridsome/commit/caa6a17))
* copy linked files ([7dd26f2](https://github.com/gridsome/gridsome/commit/7dd26f2))
* plugin api ([7a7889b](https://github.com/gridsome/gridsome/commit/7a7889b))
* **contentful:** use new plugin api ([eaf6092](https://github.com/gridsome/gridsome/commit/eaf6092))
* **graphql:** createSchema api [wip] ([c5d6d6b](https://github.com/gridsome/gridsome/commit/c5d6d6b))
* **graphql:** date field type ([d9f8335](https://github.com/gridsome/gridsome/commit/d9f8335))
* **graphql:** file type ([05f6c98](https://github.com/gridsome/gridsome/commit/05f6c98))
* **graphql:** image arguments ([e38b243](https://github.com/gridsome/gridsome/commit/e38b243))
* **graphql:** image type ([#25](https://github.com/gridsome/gridsome/issues/25)) ([316c91d](https://github.com/gridsome/gridsome/commit/316c91d))
* **graphql:** merge third party schemas ([1f33169](https://github.com/gridsome/gridsome/commit/1f33169))
* resolve file paths ([#26](https://github.com/gridsome/gridsome/issues/26)) ([a4baf68](https://github.com/gridsome/gridsome/commit/a4baf68))
* store api ([15d1c97](https://github.com/gridsome/gridsome/commit/15d1c97))
* **store:** set content and excerpt on node ([43c4236](https://github.com/gridsome/gridsome/commit/43c4236))
* support local plugins ([#22](https://github.com/gridsome/gridsome/issues/22)) ([568207f](https://github.com/gridsome/gridsome/commit/568207f))





<a name="0.2.5"></a>
## [0.2.5](https://github.com/gridsome/gridsome/compare/gridsome@0.2.4...gridsome@0.2.5) (2018-10-30)


### Bug Fixes

* prioritize static files ([6326958](https://github.com/gridsome/gridsome/commit/6326958))
* **image:** add more attributes to markup ([5c5052d](https://github.com/gridsome/gridsome/commit/5c5052d))
* send context to transofmers ([0b5840e](https://github.com/gridsome/gridsome/commit/0b5840e))


<a name="0.2.4"></a>
## [0.2.4](https://github.com/gridsome/gridsome/compare/gridsome@0.2.3...gridsome@0.2.4) (2018-10-22)


### Bug Fixes

* **build:** clear cached data files ([909caa0](https://github.com/gridsome/gridsome/commit/909caa0))
* **build:** use correct path for pagination ([e8a642c](https://github.com/gridsome/gridsome/commit/e8a642c))


<a name="0.2.3"></a>
## [0.2.3](https://github.com/gridsome/gridsome/compare/gridsome@0.2.2...gridsome@0.2.3) (2018-10-20)


### Bug Fixes

* don’t create routes for missing content types ([9eb216e](https://github.com/gridsome/gridsome/commit/9eb216e))
* **image:** send quality attr to worker ([4fd5151](https://github.com/gridsome/gridsome/commit/4fd5151))


<a name="0.2.2"></a>
## [0.2.2](https://github.com/gridsome/gridsome/compare/gridsome@0.2.1...gridsome@0.2.2) (2018-10-17)


### Bug Fixes

* forward slash component file path ([5c8e0d6](https://github.com/gridsome/gridsome/commit/5c8e0d6))
* hot reload page-query in windows ([f1ab80a](https://github.com/gridsome/gridsome/commit/f1ab80a))
* make paths in loaders work in windows ([7e27ca1](https://github.com/gridsome/gridsome/commit/7e27ca1))


<a name="0.2.1"></a>
## [0.2.1](https://github.com/gridsome/gridsome/compare/gridsome@0.2.0...gridsome@0.2.1) (2018-10-16)


### Bug Fixes

* ensure cache dir exists ([f243338](https://github.com/gridsome/gridsome/commit/f243338))
* use correct paths on windows ([fd624df](https://github.com/gridsome/gridsome/commit/fd624df))


<a name="0.2.0"></a>
# [0.2.0](https://github.com/gridsome/gridsome/compare/gridsome@0.1.2...gridsome@0.2.0) (2018-10-15)


### Bug Fixes

* **app:** use pathPrefix option ([7edfb79](https://github.com/gridsome/gridsome/commit/7edfb79))
* **build:** adjustments for better render times ([290e92d](https://github.com/gridsome/gridsome/commit/290e92d))
* **build:** check if static dir exists ([e42ca05](https://github.com/gridsome/gridsome/commit/e42ca05))
* **build:** keep leading slash for paged paths ([a2abccc](https://github.com/gridsome/gridsome/commit/a2abccc))
* **build:** show error stack form render failures ([5ba558e](https://github.com/gridsome/gridsome/commit/5ba558e))
* freeze base config object to prevent changes ([5fad26f](https://github.com/gridsome/gridsome/commit/5fad26f))
* replace path prefix correctly in links ([90dc133](https://github.com/gridsome/gridsome/commit/90dc133))
* **build:** use correct manifest path ([7a204be](https://github.com/gridsome/gridsome/commit/7a204be))
* **develop:** exclude dev middleware for playground route ([cff46b9](https://github.com/gridsome/gridsome/commit/cff46b9))
* **graphql:** hot reload page-query changes ([017aa95](https://github.com/gridsome/gridsome/commit/017aa95))
* **image:** hot reload after changes ([b4d83e7](https://github.com/gridsome/gridsome/commit/b4d83e7)), closes [#3](https://github.com/gridsome/gridsome/issues/3)
* **webpack:** page data importer in separate chunk ([34b8244](https://github.com/gridsome/gridsome/commit/34b8244))


### Features

* dir for static files ([4185564](https://github.com/gridsome/gridsome/commit/4185564))


<a name="0.1.2"></a>
## [0.1.2](https://github.com/gridsome/gridsome/compare/gridsome@0.1.1...gridsome@0.1.2) (2018-09-27)


### Bug Fixes

* show system info at startup ([de9793e](https://github.com/gridsome/gridsome/commit/de9793e))
* stop worker if any errors ([9890a26](https://github.com/gridsome/gridsome/commit/9890a26))
* **build:** better error if render fails ([7158300](https://github.com/gridsome/gridsome/commit/7158300))
* **build:** dont prefetch data chunks ([46e80a4](https://github.com/gridsome/gridsome/commit/46e80a4))
* **build:** output paths for html and data ([d167e8e](https://github.com/gridsome/gridsome/commit/d167e8e))
* **critical:** use htmlOutput ([c2c9670](https://github.com/gridsome/gridsome/commit/c2c9670))
* **webpack:** alias to gridsome app ([3891e87](https://github.com/gridsome/gridsome/commit/3891e87))


<a name="0.1.1"></a>
## [0.1.1](https://github.com/gridsome/gridsome/compare/gridsome@0.1.0...gridsome@0.1.1) (2018-09-26)


### Bug Fixes

* **cli:** show stack when failing ([7507051](https://github.com/gridsome/gridsome/commit/7507051))
* **data:** strip trailing slash before import ([35fc653](https://github.com/gridsome/gridsome/commit/35fc653))
* **renderer:** protect agains failing ssr vue-meta ([c9ad300](https://github.com/gridsome/gridsome/commit/c9ad300))


<a name="0.1.0"></a>
# [0.1.0](https://github.com/gridsome/gridsome/compare/gridsome@0.0.6...gridsome@0.1.0) (2018-09-26)


### Bug Fixes

* **app:** dont sanitize inline styles and scripts ([eaac209](https://github.com/gridsome/gridsome/commit/eaac209))
* **babel:** dont load config files ([c891593](https://github.com/gridsome/gridsome/commit/c891593))
* **cli:** stop if not in a gridsome dir ([8c29072](https://github.com/gridsome/gridsome/commit/8c29072))
* **graphql:** dont run empty page query ([9cc7176](https://github.com/gridsome/gridsome/commit/9cc7176))
* **image:** dont add lazy class when no srcset ([f3e4257](https://github.com/gridsome/gridsome/commit/f3e4257))
* **image:** init observer in client only ([4c4dad9](https://github.com/gridsome/gridsome/commit/4c4dad9))
* **image:** re-observe after hot-reload ([dfeeb90](https://github.com/gridsome/gridsome/commit/dfeeb90))


### Features

* GRIDSOME_MODE env variable ([561e72c](https://github.com/gridsome/gridsome/commit/561e72c))
* **app:** send isServer and isClient to main.js ([fe01c8e](https://github.com/gridsome/gridsome/commit/fe01c8e))
* **cli:** gridsome serve ([a91c7fc](https://github.com/gridsome/gridsome/commit/a91c7fc))
* **env:** rename to isClient and isServer ([90880c6](https://github.com/gridsome/gridsome/commit/90880c6))
* **graphql:** rename graphql block to page-query ([8bf5e1a](https://github.com/gridsome/gridsome/commit/8bf5e1a))
* **image:** generate blured inline svg ([bd54dfe](https://github.com/gridsome/gridsome/commit/bd54dfe))


<a name="0.0.6"></a>
## [0.0.6](https://github.com/gridsome/gridsome/compare/gridsome@0.0.5...gridsome@0.0.6) (2018-09-18)


### Bug Fixes

* **worker:** set jpeg quality ([31f8929](https://github.com/gridsome/gridsome/commit/31f8929))


<a name="0.0.5"></a>
## [0.0.5](https://github.com/gridsome/gridsome/compare/gridsome@0.0.4...gridsome@0.0.5) (2018-09-18)


### Bug Fixes

* **app:** prevent duplicate router.push ([508dd58](https://github.com/gridsome/gridsome/commit/508dd58))
* **image:** resize by width attribute + test ([7ac63a7](https://github.com/gridsome/gridsome/commit/7ac63a7))
* **worker:** resize images correctly ([61d2e74](https://github.com/gridsome/gridsome/commit/61d2e74))


### Features

* **app:** browser field in package json ([3e87581](https://github.com/gridsome/gridsome/commit/3e87581))
* **app:** gen favicon and touchicon sizes [#4](https://github.com/gridsome/gridsome/issues/4) ([3448301](https://github.com/gridsome/gridsome/commit/3448301))
* **webpack:** alias ~ to src dir ([81c1a5f](https://github.com/gridsome/gridsome/commit/81c1a5f))


<a name="0.0.4"></a>
## [0.0.4](https://github.com/gridsome/gridsome/compare/gridsome@0.0.3...gridsome@0.0.4) (2018-09-17)

**Note:** Version bump only for package gridsome


<a name="0.0.3"></a>
## [0.0.3](https://github.com/gridsome/gridsome/compare/142896c2454016dc989a7872faffec7263fc658c...gridsome@0.0.3) (2018-09-17)


### Bug Fixes

* webpack progress in tty only ([bab7e8a](https://github.com/gridsome/gridsome/commit/bab7e8a))



<a name="0.0.2"></a>
## [0.0.2](https://github.com/gridsome/gridsome/compare/142896c2454016dc989a7872faffec7263fc658c...gridsome@0.0.3) (2018-09-16)


### Bug Fixes

* add local bin to core package ([0bab302](https://github.com/gridsome/gridsome/commit/0bab302))
