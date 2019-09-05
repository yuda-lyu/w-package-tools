import _ from 'lodash'
import rollupFiles from '../src/rollupFiles.mjs'
import getFiles from '../src/getFiles.mjs'


let fdSrc = './src'
let fdTar = './dist'
let fns = getFiles(fdSrc)
_.pull(fns, 'rollupFiles.mjs', 'rollupFile.mjs')

rollupFiles({
    fns: fns,
    fdSrc,
    fdTar,
    //nameDistType: 'kebabCase',
    hookNameDist: (v) => {
        if (v === 'WPackageTools') {
            return 'w-package-tools'
        }
        return v
    },
    globals: {
        'fs': 'fs',
        'lodash': 'lodash',
        'path': 'path',
        'rollup': 'rollup',
        'rollup-plugin-vue': 'rollup-plugin-vue',
        'rollup-plugin-commonjs': 'rollup-plugin-commonjs',
        'rollup-plugin-postcss': 'rollup-plugin-postcss',
        'rollup-plugin-babel': 'rollup-plugin-babel',
        'rollup-plugin-replace': 'rollup-plugin-replace',
        'rollup-plugin-babel-minify': 'rollup-plugin-babel-minify',
    },
    external: [
        'fs',
        'lodash',
        'path',
        'rollup',
        'rollup-plugin-vue',
        'rollup-plugin-commonjs',
        'rollup-plugin-postcss',
        'rollup-plugin-babel',
        'rollup-plugin-replace',
        'rollup-plugin-babel-minify',
    ],
})
