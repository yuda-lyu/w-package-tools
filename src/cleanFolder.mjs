import w from './wsemip.umd.js'
import { cleanFolderStrict } from './buildCheck.mjs'


/**
 * 清空資料夾(不存在則建立)，給各專案之建置腳本使用
 *
 * 失敗即拋錯(錯誤訊息為'can not clean folder[資料夾]: 原因')：目標為檔案、無法建立、未給路徑，或資料夾內項目被占用(EBUSY、EPERM、ENOTEMPTY)經重試10次(間隔300ms)後仍失敗；
 * 資料夾內之連結(符號連結、junction，含目標已不存在者)只移除連結本身；失敗時已刪除之項目不還原
 *
 * @param {String} fd 輸入欲清空資料夾路徑字串
 * @returns {Object} 回傳結果物件{ success }
 */
function cleanFolder(fd) {

    //cleanFolderStrict, 非success即拋錯(帳本R18), 裸呼叫之建置腳本因而以非0結束
    return cleanFolderStrict(w, fd)

}


export default cleanFolder
