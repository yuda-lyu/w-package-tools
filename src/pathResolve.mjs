import path from 'path'


function pathResolve(fp) {
    let fd = path.resolve()
    fp = path.resolve(fp)
    // fp = fp.replace(':/', '://')
    // fp = path.normalize(fp)
    fp = path.relative(fd, fp)
    fp = fp.replace(/\\/g, '/')
    fp = path.format({
        root: './',
        base: fp,
        ext: 'ignored'
    })
    return fp
}


export default pathResolve
