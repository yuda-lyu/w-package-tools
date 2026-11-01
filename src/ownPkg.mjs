//ownPkg, 內部用(非公開API; 故用//註解而非JSDoc, 以免被jsdoc收進公開文件): 自有套件(wsemi與w-*)之判定、GitHub擁有者取得、CDN網址樣式(帳本R21、R22)


//newCdnUrlRegex, 回傳匹配「指向自有套件之jsDelivr/unpkg網址」之全域正規式(每次新建, 避免/g之lastIndex狀態被共用)
//  支援: https:、http:、無協定(//開頭); cdn.jsdelivr.net/npm、fastly.jsdelivr.net/npm、unpkg.com
//  給owner(GitHub擁有者, 小寫)時另匹配該擁有者之gh-pages主機(owner.github.io/<套件名>/…), 供範例頁產製將已改指gh-pages之他套件網址就地化(規格: 自有套件之瀏覽器端取用與gh-pages 規則3)
//  群組: 1套件名(wsemi或w-開頭小寫連字號), 2版本(含@, 可無), 3路徑(含開頭/與其後至空白、引號、括號、角括號前, 可無)
//  套件名後不得緊接[\w.~-]: 避免w-fft_x、w-fft.js被當成w-fft; 不匹配@scope/套件與第三方套件
function newCdnUrlRegex(owner = '') {
    let ghHost = owner ? `|${owner.replace(/[^a-z0-9-]/g, '\\$&')}\\.github\\.io` : ''
    let host = `(?:https?:)?\\/\\/(?:cdn\\.jsdelivr\\.net\\/npm|fastly\\.jsdelivr\\.net\\/npm|unpkg\\.com${ghHost})\\/`
    let name = '(wsemi|w-[a-z0-9]+(?:-[a-z0-9]+)*)(?![\\w.~-])'
    let ver = '(@[^/\'"`\\s)<>]*)?'
    let pth = '(\\/[^\'"`\\s)<>]*)?'
    return new RegExp(host + name + ver + pth, 'g')
}


//getRepoOwner, 由package.json取得GitHub擁有者字串, 取不到(無repository、非GitHub)回傳空字串
//  repository可為字串或{url}; url形式: https://github.com/o/r(.git)、git+https://…、git://…、ssh://git@github.com/o/r.git、git@github.com:o/r.git、github:o/r、o/r
function getRepoOwner(pks) {
    let r = pks && pks.repository
    let u = typeof r === 'string' ? r : (r && typeof r.url === 'string' ? r.url : '')
    let m = u.match(/github\.com[/:]([^/\s:]+)\//i) || u.match(/^github:([^/\s:]+)\//i) || u.match(/^([A-Za-z0-9][A-Za-z0-9-]*)\/[^/\s:]+$/)
    return m ? m[1] : ''
}


//ghPagesUrl, 組成自有套件之gh-pages網址: https://<擁有者>.github.io/<套件名><pth>; pth為含開頭/之路徑與其?#尾段(如/dist/x.umd.js?v=1); 擁有者大小寫不拘(主機名一律小寫)
//  modifyReadme(README改寫)與genDocsExams(本機找不到之他套件網址改指gh-pages)共用, 網址組成只此一處
function ghPagesUrl(owner, pkName, pth) {
    return `https://${owner.toLowerCase()}.github.io/${pkName}${pth}`
}


export { newCdnUrlRegex, getRepoOwner, ghPagesUrl }
