import _ from 'lodash'
import getPks from './getPks.mjs'
import setPks from './setPks.mjs'


/**
 * 自動添加package.json內版本補丁號
 *
 */
function addVersion(fnPks = './package.json') {

    //pks
    let pks = getPks(fnPks)

    //v
    let v = pks.version
    let s = _.split(v, '.')
    s[2] = _.toString(_.toNumber(s[2]) + 1)
    pks.version = _.join(s, '.')

    //save
    setPks(pks, fnPks)

    console.log('now version: ' + pks.version)

}


export default addVersion
