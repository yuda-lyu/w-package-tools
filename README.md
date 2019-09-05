# w-package-tools
A tool for build packages.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-package-tools.svg?style=flat)](https://npmjs.org/package/w-package-tools) 
[![Build Status](https://travis-ci.org/yuda-lyu/w-package-tools.svg?branch=master)](https://travis-ci.org/yuda-lyu/w-package-tools) 
[![license](https://img.shields.io/npm/l/w-package-tools.svg?style=flat)](https://npmjs.org/package/w-package-tools) 
[![gzip file size](http://img.badgesize.io/yuda-lyu/w-package-tools/master/dist/w-package-tools.umd.js.svg?compression=gzip)](https://github.com/yuda-lyu/w-package-tools)
[![npm download](https://img.shields.io/npm/dt/w-package-tools.svg)](https://npmjs.org/package/w-package-tools) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-package-tools.svg)](https://www.jsdelivr.com/package/npm/w-package-tools)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-package-tools/global.html#addVersion).

## Installation
### Using npm(ES6 module):
> **Note:** w-package-tools depends on `rollup`, `@babel` and `core-js`.

```alias
npm i w-package-tools

import getFiles from 'w-package-tools/src/getFiles.mjs'

console.log(getFiles('path for forder'))
```