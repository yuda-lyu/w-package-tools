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
        'path': 'path',
        'lodash': 'lodash',
        '@rollup/plugin-commonjs': '@rollup/plugin-commonjs',
        '@rollup/plugin-node-resolve': '@rollup/plugin-node-resolve',
        '@rollup/plugin-replace': '@rollup/plugin-replace',
        'rollup': 'rollup',
        'rollup-plugin-babel': 'rollup-plugin-babel',
        //'rollup-plugin-babel-minify': 'rollup-plugin-babel-minify',
        'rollup-plugin-postcss': 'rollup-plugin-postcss',
        'rollup-plugin-terser': 'rollup-plugin-terser',
        'rollup-plugin-vue': 'rollup-plugin-vue',
    },
    external: [
        'fs',
        'path',
        'lodash',
        '@rollup/plugin-commonjs',
        '@rollup/plugin-node-resolve',
        '@rollup/plugin-replace',
        'rollup',
        'rollup-plugin-babel',
        //'rollup-plugin-babel-minify',
        'rollup-plugin-postcss',
        'rollup-plugin-terser',
        'rollup-plugin-vue',
    ],
})
