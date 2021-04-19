import fs from 'fs'
import assert from 'assert'
import rollupCode from '../src/rollupCode.mjs'


describe('rollupCode js advanced', function() {

    let fdSrc = './test-code-in'
    let fdTarCp = './test-code-out-cp'

    let name = 'g2'
    let fnIn = `${name}.js`
    let fnOut = `${name}.umd.js`

    it(`should be equal to ${fnOut} when run ${fnIn}'`, async function() {
        let cNow = await rollupCode(fs.readFileSync(`${fdSrc}/${fnIn}`, 'utf8'), { name: name })
        let cCp = fs.readFileSync(`${fdTarCp}/${fnOut}`, 'utf8')
        assert.strict.deepStrictEqual(cNow, cCp)
    })

})
