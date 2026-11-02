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