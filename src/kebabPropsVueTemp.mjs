import _ from 'lodash'


function kebabPropsVueTemp(t) {
    let reg = new RegExp(/:[\w\W][^=:; ]*=/, 'g')
    return _.replace(t, reg, function(v) {
        let prop = v
        prop = _.replace(prop, ':', '')
        prop = _.replace(prop, '=', '')
        let s = _.split(prop, '.')
        prop = _.kebabCase(s[0])
        let c = ''
        if (s.length === 2) {
            c = '.' + s[1]
        }
        prop = `:${prop}${c}=`
        return prop
    })
}


export default kebabPropsVueTemp
