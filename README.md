# w-package-tools
A tool for build packages.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-package-tools.svg?style=flat)](https://npmjs.org/package/w-package-tools) 
[![license](https://img.shields.io/npm/l/w-package-tools.svg?style=flat)](https://npmjs.org/package/w-package-tools) 
[![npm download](https://img.shields.io/npm/dt/w-package-tools.svg)](https://npmjs.org/package/w-package-tools) 
[![npmdownload](https://img.shields.io/npm/dm/w-package-tools.svg)](https://npmjs.org/package/w-package-tools) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-package-tools.svg)](https://www.jsdelivr.com/package/npm/w-package-tools)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-package-tools/global.html#addVersion).

## Installation

### Using npm(ES6 module):
```alias

npm i w-package-tools

import rollupCode from 'w-package-tools/src/rollupCode.mjs'
rollupCode({...})

import rollupWorker from 'w-package-tools/src/rollupWorker.mjs'
rollupWorker({...})

```

## Breaking changes

### Babel 8, babel config of the package is not read
- Building (`rollupFile`, and `rollupFiles`, `rollupCode`, `rollupWorker`, `rollupParfor`, `rollupVueToHtml` that build through it) uses Babel 8 (`@babel/core` 8) and **no longer reads the babel config of the package being built**: `babel.config.*`, `.babelrc*`, `.babelignore` and the `babel` key of `package.json` are ignored (files listed in `.babelignore` are now transpiled too). The settings used are fixed in `src/rollupFile.mjs`: `@babel/preset-env` (with `targets`) and `@babel/plugin-transform-runtime`, both taken from the dependencies of this package, so the build does not depend on which babel versions are installed at the root of the package. The browserslist config of the package (`browserslist` key, `.browserslistrc`) does not change the output either: the level is set by the `targets` option only.
- Files are transpiled by the same rule as before (`@rollup/plugin-babel` 6.1.0, now replaced by `src/rollupBabel.mjs`): `.js .jsx .es6 .es .mjs .cjs` after removing the query; `.vue` files and their blocks (`x.vue?...`) and virtual modules (`\0...`) are not.
- `@babel/plugin-proposal-export-default-from` is no longer applied: the non-standard `export v from 'mod'` does not build, write `export { default as v } from 'mod'`.
- `useBuiltIns` and `corejs` are gone (removed in Babel 8): an `import 'core-js'` in the source is not expanded any more.
- A free global `regeneratorRuntime` (code compiled by an old Babel that expects the global polyfill, in the source or in a bundled dependency) is no longer replaced by the bundled `@babel/runtime/regenerator` (Babel 8 removed the `regenerator` option of `@babel/plugin-transform-runtime`): the build succeeds but the output throws `regeneratorRuntime is not defined` where the global is missing. None of the current dist files of own packages relied on it.
- The old import assertion syntax `import x from './a.json' assert { type: 'json' }` does not parse any more (Babel 8), use `with { type: 'json' }`.
- `@babel/preset-env` 8 always applies its bugfix plugins (an option in Babel 7, off by default), so the output of some syntax may be less transformed than before; the JS output of the checked packages did not change.
- No longer installed with this package: `@babel/cli`, `@babel/node`, `@babel/register`, `@babel/plugin-transform-regenerator`, `@babel/polyfill`, `@babel/plugin-proposal-export-default-from`, `core-js`, `@rollup/plugin-babel`. A package whose own scripts use one of them, or use `@babel/core` directly (Babel 8 is ESM only, has no default export, and `transform` without a callback throws), must declare it in its own `package.json`.
- Node.js `^22.18.0 || >=24.11.0` (required by `@babel/core` 8).

`babel.config.js` of the package is now read only by eslint (`@babel/eslint-parser`, kept at 7; it uses the `@babel/core` at the root of `node_modules`, which is 8 from this package, or 7 when `@vue/cli-plugin-babel` provides it; npm may print `ERESOLVE overriding peer dependency` for it, which is expected). The babel plugins named in the old standard file are no longer installed at the root of `node_modules` by this package, so eslint fails with `Cannot find module` until the file is changed. The two ways below are for packages whose `babel.config.js` is read only by eslint and vue-cli; if something else in the package reads it (jest, babel-loader, `@babel/register`, own scripts using `@babel/core`), declare the babel packages it needs in the package itself first:
- package without `@vue/cli-plugin-babel`: replace the whole file with
```alias

module.exports = {}

```
- package with `@vue/cli-plugin-babel` (vue-cli also reads the file for `vue-cli-service build` and `serve`, and provides `@babel/preset-env` and `@babel/plugin-transform-runtime` of Babel 7 at the root; `npm ls @babel/preset-env` shows the 7 at the root): keep the file and only delete the line
```alias

'@babel/plugin-proposal-export-default-from',

```

## Examples and README for gh-pages
Own packages are no longer published to npmjs, so the CDN (`cdn.jsdelivr.net/npm`) has no current versions of them. Example pages and the browser usage in README therefore point to gh-pages.

### genDocsExams (toolg/gDocsExams.mjs)
Copies `./examples/` to `./docs/examples/` and rewrites the urls in the pages so they work on gh-pages. The package's own `../dist/xxx.umd.js` references are kept as they are: `./docs/dist/` is written by `genDocsDist` (see below), so this function does not copy dist and does not depend on whether dist is built yet. Urls of other own packages (`wsemi`, `w-*`; jsDelivr or unpkg, pinned or not; or their gh-pages `https://<owner>.github.io/<name>/dist/...`) are always changed to `https://<owner>.github.io/<name>/dist/<file>` (nothing is copied, whether the package is installed locally or not); an url whose path is not a plain `/dist/<file>`, or whose owner is unknown, is kept and reported in `warnings`. Text files already in `./docs/examples/` (for example `app.html` written by an earlier build step) are rewritten in place by the same rules (`bInplace: false` turns it off), so run it after the steps that write pages into `docs/examples/`. A value of the wrong type in `opt` is treated as not given (set `opt.debug: true` to see which keys fell back to the default). Third-party urls are not changed, and `w-demores` is kept on the CDN by default.
```alias

import genDocsExams from 'w-package-tools/src/genDocsExams.mjs'

genDocsExams()
//genDocsExams({ fdSrc: './test-html/' }) //examples in another folder
//genDocsExams({ fdSrc: '' }) //no examples to copy, only rewrite the pages already in ./docs/examples/

```

### genDocsDist (toolg/genDocsDist.mjs)
Each own package serves its dist from its own gh-pages (`https://<owner>.github.io/<name>/dist/<file>`). `genDocsDist` copies all files of `./dist/` (subfolders and `.map` files included) to `./docs/dist/` the same way `genDocsExams` copies `./examples/` to `./docs/examples/`: the target is emptied first (created if missing), links (symlink, junction) are not followed. It throws when `./dist/` does not exist or has no file (so the publish stops), or when the target is inside the source or the source is inside the target. Put `node toolg/genDocsDist.mjs` in `script.txt` right above `git add`, after every step that builds dist.
```alias

import genDocsDist from 'w-package-tools/src/genDocsDist.mjs'

genDocsDist()
//genDocsDist({ fdDist: './dist/', fdTar: './docs/dist/' }) //the defaults

```

### gh-pages (bin/gh-pages.mjs, `npm run deploy`)
`"deploy": "gh-pages -d docs"` in an own package resolves to the `gh-pages` bin of this package, not to the third-party `gh-pages`. It only deploys the content of the `-d` folder (default `docs`); it does not provide the project's `./dist/` (`genDocsDist` puts it into `docs/dist/` at build time, so it is deployed with the rest). Option: `-d <dir>`.
```alias

"deploy": "gh-pages -d docs"

```

### modifyReadme (toolg/modifyReadme.mjs)
Changes `https://cdn.jsdelivr.net/npm/<own package>[@version]/dist/<file>` in README to `https://<owner>.github.io/<own package>/dist/<file>` (owner from `repository.url` of package.json), and replaces `<package name>@x.y.z` with the current version. Badges are not changed.
```alias

import modifyReadme from 'w-package-tools/src/modifyReadme.mjs'

modifyReadme()

```