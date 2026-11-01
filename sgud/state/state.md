# 現況(state)

本檔只記**現況**:各功能做到哪裡、對應之規則帳本條目與測試檔、已知缺口與待辦、最近一次驗證或發布之版本;過程寫入 `sgud/exp/experience.md`。與 `sgud/rule/rulebook.md`(藍圖)比對即知尚未做到者。2026-11-01 由 wpt257 建立(sgud 遷移後首份),各功能列之狀態取自規則帳本當日內容,未重新稽核。

## 版本與驗證

- `package.json` 版本 1.1.21(本輪未改版、未發布;發布由主控)。
- 內附 `src/wsemip.umd.js`、`src/wpf.umd.js`、`src/wpf_pmSeries.umd.js` 皆 v1.9.18(R18)。
- 全套 `npm test`:見下〈最近一次驗證〉。

## 功能現況

| 功能 | 檔案 | 規則帳本 | 測試檔 | 狀態 |
|---|---|---|---|---|
| worker 包裝(rollupWorkerCore/rollupWorker/rollupParfor 之產物:宿主隔離、生命週期、作用域與匯出、建置期檢查、this) | `src/rollupWorkerCore.mjs`、`src/rollupWorker.mjs`、`src/rollupParfor.mjs` | R1–R3、R7、R10–R13 | `test/rollupWorker.test.mjs`、`rollupParfor.test.mjs`、`unit-workerScope.test.mjs`、`e2e-workerBrowser.test.mjs` | 已套;設計限制見規則帳本四之二 |
| 免編譯 parfor | `src/parfor.mjs` | R4、R8 | `test/parfor.test.mjs` | 已套;worker 端反序列化失敗整批懸置屬設計限制 |
| 產製 API 之錯誤回報(不吞錯、`WPT_` 碼 Error、暫存檔清理留痕) | `src/wptCommon.mjs` 及各 `rollup*.mjs` | R9、R19、R20 | `test/unit-buildError.test.mjs`、`unit-rejectShape.test.mjs`、`unit-tempCleanup.test.mjs` | 已套 |
| rollupFile 回傳程式碼模式、路徑、targets | `src/rollupFile.mjs`、`src/rollupCode.mjs` | R14、R15 | `test/unit-rollupFileReturnCode.test.mjs`、`rollupCode.test.mjs` | 已套 |
| 建置期檢查(引用、import.meta) | `src/buildCheck.mjs` | R16、R17 | `test/unit-buildCheck.test.mjs` | 已套 |
| 清空資料夾 | `src/cleanFolder.mjs`、`src/buildCheck.mjs`(`cleanFolderStrict`) | R18 | `test/unit-cleanFolder.test.mjs`、`unit-wsemipContract.test.mjs`、`unit-wpfContract.test.mjs` | 已套 |
| 範例頁自給自足 `genDocsExams`(2026-11-01 新增,wpt257b 修正) | `src/genDocsExams.mjs`、`src/ownPkg.mjs` | R21 | `test/unit-genDocsExams.test.mjs` | 本套件側已完成;**預設不複製 dist**(由 R23 部署時提供,與 dist 建置先後無關,`script.txt` 不必改);原地改寫 `fdTar` 既有頁面(`bInplace`);本機找不到之他自有套件 `/dist/<檔>` 改指 gh-pages;**各套件 `toolg` 改呼叫(樣板 A/B/D)由主控批次處理(未做)** |
| 部署時提供專案 `./dist/`(2026-11-01 wpt257b 新增) | `bin/gh-pages.mjs` | R23 | `test/unit-ghPagesDeploy.test.mjs` | 本套件側已完成;各套件 `"deploy": "gh-pages -d docs"` 經 `.bin` 解析至此(121/121 實測);需各套件升級 w-package-tools 後生效 |
| README 瀏覽器用法改指 gh-pages `modifyReadme`(2026-11-01 擴充) | `src/modifyReadme.mjs`、`src/ownPkg.mjs` | R22 | `test/unit-modifyReadme.test.mjs` | 本套件側已完成;各套件現有 `toolg/modifyReadme.mjs` 不改即生效;其指向之 gh-pages `dist/` 由 R23 提供 |
| 小工具:`getPks`、`setPks`、`addVersion`、`getFiles`、`getReadme`、`extractHtml`、`rollupVueToHtml`、`rollupFiles`、`parseVueCode` | `src/*.mjs` | R5、R6(補全解析、換行正規化)等 | `rollupFiles`、`rollupVueToHtml` 由 `unit-buildError`/`unit-rejectShape` 間接涵蓋;R5、R6 **無專屬測試** | 可用;R5、R6 測試為已知缺口 |

## 已知缺口與待辦

- R5(`bResolveExtPath` 補全解析)、R6(`parseVueCode` 換行正規化)無專屬測試(規則帳本已列)。
- 未修缺陷:`rollupFile` 未呼叫 `bundle.close()`(已知不修);其餘設計限制見規則帳本四之二。
- 待主控(wpt257b 更新,見任務報告〈給主控之批次改寫指引〉):①47 套件(`gDocsExams` 33 + `gDocExams` 14,2026-11-01 wpt257b 盤點實數,含 w-knowledge-summarize)之 `toolg` 改呼叫 `genDocsExams`(樣板 A/B/D 不變);②**不再需要**:13 套件新增只複製 dist 之 toolg、`script.txt` 順序調整(wpt257 時之要求已作廢,dist 由 R23 提供);③各套件 `.gitignore` 加 `docs/libs/`(`docs/dist/` 本函數已不產生,不必);④`wsemi.umd.min.js`(wsemi dist 無此檔)出現於 w-leaflet-vue、w-maplibregl-vue、w-threejs-vue、w-flow-vue、w-trade-backtest 之 `toolg/gDistApp.mjs`/`gExtractHtml.mjs`,須改為 `wsemi.umd.js`;⑤w-geo 範例引用之 `w-component-vue`(釘版)未安裝時改指 gh-pages 並警告,可接受或安裝。
- 已知未覆蓋(R23):`isSubPath` 之跨磁碟機分支(單磁碟機無法實測);`planProjDist` 讀取 `./dist/` 失敗之 `exit 1`。

## 最近一次驗證

- 2026-11-01 wpt257b:全套 `npm test`(`quiet-run --lock`)**407 passing**,exit 0(原 284 + `unit-genDocsExams` 77 + `unit-modifyReadme` 32 + `unit-ghPagesDeploy` 14);變異:genDocsExams 新增/改動分支 42 個全殺、ownPkg `ghPagesUrl` 5 個全殺、`bin/gh-pages` 28 個 27 殺 1 存活(跨磁碟機,單磁碟機無法實測);`unit-ghPagesDeploy` 對修前 HEAD 之 bin:11 紅 3 綠;以 w-leaflet-vue、w-aggrid-vue 之真實 `test-html/`、`dist/`、`docs/examples/`(gDistApp 產物)複本實跑 `genDocsExams` 後,再以 `bin/gh-pages` 部署到本機 bare 倉庫並取出站台:相對引用 5 情境皆 0 缺檔,結果見任務報告。未發布、未重產 docs。
- 2026-11-01 wpt257(前輪):`unit-genDocsExams` 60、`unit-modifyReadme` 32,全套 376 passing;99 變異全殺;w-fft、w-aggrid-vue 複本實跑。
- 規格對照:`C:\opensrcOper\dspec\自有套件之瀏覽器端取用與gh-pages.md`(規則 1–3、5–7 本套件側已落實)、`輸入參數之檢測機制.md`(K2、K3、K9、V4、V17、V19)。
