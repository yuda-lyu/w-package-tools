import _ from 'lodash'


function strleft(c, n) {
    return c.substr(0, n)
}


function strdelright(c, n) {
    return strleft(c, c.length - n)
}


function getBlock(ss, m1, m2) {
    let rs = []
    for (let i = 0; i < ss.length; i++) {
        let s = ss[i]
        if (s.indexOf(m1) >= 0) { //indexOf for m1
            let t = s.substring(s.indexOf(m1) + m1.length, s.length)
            rs.push(t)
            continue
        }
        if (rs.length > 0) {
            rs.push(s)
            if (s === m2) { //equal for m2
                break
            }
        }
    }
    return rs.join('\r\n')
}


function parseVueCode(h) {
    let r
    let reg
    let m1
    let m2

    //ss
    let ss = h.split('\r\n')

    //tmp
    r = `<template>[\\s\\S]+<\/template>`
    reg = new RegExp(r, 'g')
    let tmp = h.match(reg)[0]
    let s = tmp.split('\r\n')
    s = _.drop(s, 2)
    s = _.dropRight(s, 2)
    tmp = s.join('\r\n')
    //console.log('tmp', tmp)

    //mounted
    m1 = 'mounted: function() {'
    m2 = '    },'
    let mounted = getBlock(ss, m1, m2)
    if (!mounted) {
        mounted = 'function() { return {} }'
    }
    else {
        mounted = 'function() {' + mounted
        mounted = strdelright(mounted, 1)
    }
    //console.log('mounted', mounted)

    //data
    m1 = 'data: function() {'
    m2 = '    },'
    let data = getBlock(ss, m1, m2)
    if (!data) {
        data = 'function() { return {} }'
    }
    else {
        data = 'function() {' + data
        data = strdelright(data, 1)
    }
    //console.log('data', data)

    //computed
    m1 = 'computed:'
    m2 = '    },'
    let computed = getBlock(ss, m1, m2)
    if (!computed) {
        computed = '{}'
    }
    else {
        computed = strdelright(computed, 1)
    }
    //console.log('computed', computed)

    //methods
    m1 = 'methods:'
    m2 = '    },'
    let methods = getBlock(ss, m1, m2)
    if (!methods) {
        methods = '{}'
    }
    else {
        methods = strdelright(methods, 1)
    }
    //console.log('methods', methods)

    //action
    m1 = `'actions':`
    m2 = '            ],'
    let action = getBlock(ss, m1, m2)
    if (!action) {
        action = '[]'
    }
    else {
        action = strdelright(action, 1)
    }
    //console.log('action', action)

    return { tmp, mounted, data, computed, methods, action, }
}


export default parseVueCode