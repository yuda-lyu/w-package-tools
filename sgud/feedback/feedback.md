# 回饋(feedback)

本檔記錄任務中發現之自有套件、全域技能、全域設定之調整與抽提提案(全域設定 §12.2);只增不改,處置結果另記一列,供主控核實、盤點與整合。一條一列。

| 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|
| 2026-11-10 | 自有套件 | wsemi | `test/b642u8arr.test.mjs` 之 core-js 對拍案(`[oracle] should agree with core-js Uint8Array.fromBase64 …`)於取不到 `core-js` 時 `this.skip()`;core-js 原經 w-package-tools 之 dependencies 傳遞提供,w-package-tools 移除 core-js(R25,主控裁定 C)後該案改為略過,全套由 29956 passing／8 pending 變為 29955／9(總數不變、0 failing)。提案:wsemi 若要保留此對拍,於自身 devDependencies 宣告 `core-js`;否則接受略過 | wsemi `test/b642u8arr.test.mjs:124-136`;任務 20261110095259 bb02 下游副本全套 log(pending 名單) |
| 2026-11-10 | 全域技能 | role-coder-for-test(或 role-coder-for-validate) | 「改相依／建置工具後之下游全套驗收」只比 passing 與 failing 會漏掉「取不到相依即自行略過」之測試靜默改變(passing 少 1、pending 多 1、總數不變)。提案:驗收條目加「比對 passing 與 pending 兩數,並列 pending 名單逐一對照」;另「以夾具模擬 npm 安裝擺放」時,須依實際擺放把本套件之衝突版本相依全部巢狀(只巢狀其一會假紅或使變異假綠) | 任務 20261110095259 bb02(wsemi 下游 29955／9;`test/unit-rollupBabel.test.mjs` 夾具首版只巢狀 core 之假紅,見 `sgud/exp/experience.md` 二十四) |
| 2026-11-10 | 全域技能 | role-coder-for-validate(Step 1 輸入空間表) | 驗「不讀/不採用某設定」之規則時,我只測了「設定有效但值不同→產物不變」,漏了「設定壞掉(衝突、無效)→建置不失敗」,外審才找出 Babel core 仍讀 browserslist 設定而會使建置失敗。提案:輸入空間表之「設定來源」軸,每個成員至少列「有效且不同」「無效／衝突」「讀取即拋錯」三格;另「相依大版升級」類改動加一軸「舊版預設會自動做、新版移除者」(如 transform-runtime 之 regenerator 改寫),並以該行為之特有字串掃全庫產物判影響 | 任務 20261110095259 bb02 外審 terra F1、F6;`sgud/exp/experience.md` 二十四 |
