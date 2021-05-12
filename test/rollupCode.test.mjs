import fs from 'fs'
import assert from 'assert'
import rollupCode from '../src/rollupCode.mjs'


describe('rollupCode', function() {
    let fdSrc = './test-code-in'
    let fdTarCp = './test-code-out-cp'

    if (true) {
        let name = 'gBase1'
        let fnIn = `${name}.js`
        let fnOut = `${name}.umd.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow, cCp)
        })
    }

    if (true) {
        let name = 'gBase2'
        let fnIn = `${name}.js`
        let fnOut = `${name}.umd.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow, cCp)
        })
    }

    if (true) {
        let name = 'gVue1'
        let fnIn = `${name}.vue`
        let fnOut = `${name}.umd.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name,
                formatIn: 'vue'
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow.length, cCp.length) //vue檔案內會隨機產生data id, 雖不同但固定長度, 故可改比對檔案大小
        })
    }

    if (true) {
        let name = 'gAsync1'
        let fnIn = `${name}.mjs`
        let fnOut = `${name}.es.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name,
                formatOut: 'es',
                targets: 'new',
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow, cCp)
        })
    }

    if (true) {
        let name = 'gAsync2'
        let fnIn = `${name}.mjs`
        let fnOut = `${name}.es.js`
        it(`should be ok when run ${name}'`, async function() {
            let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), {
                name,
                formatOut: 'es',
                targets: 'new',
            })
            let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
            assert.strict.deepStrictEqual(cNow, cCp)
        })
    }

})
