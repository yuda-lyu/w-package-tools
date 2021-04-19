import fs from 'fs'
import assert from 'assert'
import rollupCode from '../src/rollupCode.mjs'


describe('rollupCode vue', function() {

    let fdSrc = './test-code-in'
    let fdTarCp = './test-code-out-cp'

    let name = 'g3'
    let fnIn = `${name}.vue`
    let fnOut = `${name}.umd.js`

    it(`should be equal to ${fnOut} when run ${fnIn}'`, async function() {
        let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), { name: name, formatIn: 'vue' })
        let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
        assert.strict.deepStrictEqual(cNow.length, cCp.length) //vue檔案內會隨機產生data id, 雖不同但固定長度, 故可改比對檔案大小
    })

})
