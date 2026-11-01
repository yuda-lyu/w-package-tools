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

## Examples and README for gh-pages
Own packages are no longer published to npmjs, so the CDN (`cdn.jsdelivr.net/npm`) has no current versions of them. Example pages and the browser usage in README therefore point to gh-pages.

### genDocsExams (toolg/gDocsExams.mjs)
Copies `./examples/` to `./docs/examples/` and rewrites the urls in the pages so they work on gh-pages. The package's own `../dist/xxx.umd.js` references are kept as they are: `dist/` is provided at deploy time by `gh-pages` (see below), so this function does not copy dist and does not depend on whether dist is built yet (`bCopyDist: true` copies `./dist/` to `./docs/dist/` for the special case of not deploying with `gh-pages`). Urls of other own packages (`wsemi`, `w-*`; jsDelivr or unpkg, pinned or not; or their gh-pages `https://<owner>.github.io/<name>/dist/...`) are copied from `./node_modules/` to `./docs/libs/` and changed to relative paths; when the package or file is not found locally, a `/dist/<file>` url is changed to `https://<owner>.github.io/<name>/dist/<file>` and reported in `warnings`, any other url is kept and reported. Text files already in `./docs/examples/` (for example `app.html` written by an earlier build step) are rewritten in place by the same rules (`bInplace: false` turns it off), so run it after the steps that write pages into `docs/examples/`. A value of the wrong type in `opt` is treated as not given (set `opt.debug: true` to see which keys fell back to the default). Third-party urls are not changed, and `w-demores` is kept on the CDN by default.
```alias

import genDocsExams from 'w-package-tools/src/genDocsExams.mjs'

genDocsExams()
//genDocsExams({ fdSrc: './test-html/' }) //examples in another folder
//genDocsExams({ bCopyDist: true }) //also copy ./dist/ to ./docs/dist/

```

### gh-pages (bin/gh-pages.mjs, `npm run deploy`)
`"deploy": "gh-pages -d docs"` in an own package resolves to the `gh-pages` bin of this package, not to the third-party `gh-pages`. Besides the content of the `-d` folder, it deploys the project's `./dist/` (without `.map`) as `dist/` of the site, so `https://<owner>.github.io/<name>/dist/<file>` exists after every deploy. If `./dist/` does not exist or is empty the deploy goes on as before and prints one line. A file of the `-d` folder's own `dist/` with the same path but different content is replaced by the one in `./dist/`, with a warning. Options: `-d <dir>` (default `docs`), `--no-dist` (do not provide dist), `--dist-map` (include `.map` files).
```alias

"deploy": "gh-pages -d docs"
//"deploy": "gh-pages -d docs --no-dist"
//"deploy": "gh-pages -d docs --dist-map"

```

### modifyReadme (toolg/modifyReadme.mjs)
Changes `https://cdn.jsdelivr.net/npm/<own package>[@version]/dist/<file>` in README to `https://<owner>.github.io/<own package>/dist/<file>` (owner from `repository.url` of package.json), and replaces `<package name>@x.y.z` with the current version. Badges are not changed.
```alias

import modifyReadme from 'w-package-tools/src/modifyReadme.mjs'

modifyReadme()

```