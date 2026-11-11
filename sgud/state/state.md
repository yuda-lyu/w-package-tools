# 現況(state)

本檔只記**現況**:各功能做到哪裡、對應之規則帳本條目與測試檔、已知缺口與待辦、最近一次驗證或發布之版本;過程寫入 `sgud/exp/experience.md`。與 `sgud/rule/rulebook.md`(藍圖)比對即知尚未做到者。2026-11-01 由 wpt257 建立(sgud 遷移後首份);2026-11-02 wpt268 更新 R21–R24 相關列。

## 版本與驗證

- `package.json` 版本 1.1.25(bb02 之 Babel 8 已隨 1.1.25 發布)。**pt395(2026-11-11,rollup 3 → 4)之改動未改版、未發布、未提交**,待主控複審後發布並跑全庫連動(對使用端之變化見 README〈Breaking changes〉之 rollup 4 節)。
- 相依(pt395 起):`rollup` ^4.67.4(lock 4.67.4;使用端安裝時解析為範圍內滿 7 天之最新,2026-11-11 為 4.67.5)、`@rollup/plugin-commonjs` ^29.0.3、`@rollup/plugin-node-resolve` ^16.0.3、`@rollup/plugin-replace` ^6.0.3、`@rollup/plugin-terser` ^1.0.2(terser 5.51.2)、`@rollup/plugin-json` ^6.1.0;`rollup-plugin-vue` 5.1.9、`rollup-plugin-postcss` 4.0.2、`rollup-plugin-node-polyfills` 0.2.1 不變。Babel(bb02 起):`@babel/core` ^8.1.0、`@babel/preset-env` ^8.0.7、`@babel/plugin-transform-runtime` ^8.0.6、`@babel/runtime` ^8.1.0;`@babel/eslint-parser` ^7.21.3(lock 7.29.9,限主版號 7,經 `overrides` 用本套件之 core 8)。mocha 11、jsdoc-vuejs 3.0.9 未動(mocha 12 另輪)。
- 內附 `src/wsemip.umd.js`、`src/wpf.umd.js`、`src/wpf_pmSeries.umd.js` 皆 v1.9.18(R18)。
- 全套 `npm test`:見下〈最近一次驗證〉。

## 功能現況

| 功能 | 檔案 | 規則帳本 | 測試檔 | 狀態 |
|---|---|---|---|---|
| worker 包裝(rollupWorkerCore/rollupWorker/rollupParfor 之產物:宿主隔離、生命週期、作用域與匯出、建置期檢查、this) | `src/rollupWorkerCore.mjs`、`src/rollupWorker.mjs`、`src/rollupParfor.mjs` | R1–R3、R7、R10–R13 | `test/rollupWorker.test.mjs`、`rollupParfor.test.mjs`、`unit-workerScope.test.mjs`、`e2e-workerBrowser.test.mjs` | 已套;設計限制見規則帳本四之二 |
| 免編譯 parfor | `src/parfor.mjs` | R4、R8 | `test/parfor.test.mjs` | 已套;worker 端反序列化失敗整批懸置屬設計限制 |
| 產製 API 之錯誤回報(不吞錯、`WPT_` 碼 Error、暫存檔清理留痕) | `src/wptCommon.mjs` 及各 `rollup*.mjs` | R9、R19、R20 | `test/unit-buildError.test.mjs`、`unit-rejectShape.test.mjs`、`unit-tempCleanup.test.mjs` | 已套 |
| rollupFile 回傳程式碼模式、路徑、targets | `src/rollupFile.mjs`、`src/rollupCode.mjs` | R14、R15 | `test/unit-rollupFileReturnCode.test.mjs`、`rollupCode.test.mjs` | 已套;`rollupCode.test.mjs` 之 gVue1、gAsync2 為語意斷言(pt395),gBase1、gBase2、gAsync1 仍逐字比對預期檔(現狀指紋,已知缺口) |
| 建置期檢查(引用、import.meta) | `src/buildCheck.mjs` | R16、R17 | `test/unit-buildCheck.test.mjs`(23) | 已套;R17② 依輸出之實際綁定,rollup 4 改名避讓之頂層 `__filename` 不擋、umd 頂層 `location` 與非模組作用域者仍擋(pt395 兩版對照 64×2 格一致) |
| babel 轉譯(Babel 8;不讀使用端 babel/browserslist 設定〔頂層 targets＋`browserslistConfigFile:false`〕、外掛以模組物件傳入、自帶外掛取代 `@rollup/plugin-babel`;2026-11-10 bb02) | `src/rollupFile.mjs`(`babelOpt`)、`src/rollupBabel.mjs`、`babel.config.js`(空,只供 eslint) | R25 | `test/unit-rollupBabel.test.mjs`(16) | 本套件側已完成;下游 wsemi、w-component-vue 副本驗證:dist JS 逐位元組相同、`.map` 之 `names`/`mappings` 改變、vue-cli 產物相同、lint 相同。**使用端 `babel.config.js` 之改法(無 vue-cli 者改空、有者刪 export-default-from 一列)由主控於連動時統一處理(未做)**;已知限制見帳本 R25(helper 之 `@babel/runtime` 自被轉譯檔位置解析、eslint-parser 7 跑在 core 8、Node 版本) |
| 清空資料夾 | `src/cleanFolder.mjs`、`src/buildCheck.mjs`(`cleanFolderStrict`) | R18 | `test/unit-cleanFolder.test.mjs`、`unit-wsemipContract.test.mjs`、`unit-wpfContract.test.mjs` | 已套;`genDocsDist` 清空目標亦經此 |
| 範例頁自給自足 `genDocsExams`(wpt268 改版) | `src/genDocsExams.mjs`、`src/ownPkg.mjs`、`src/docsCommon.mjs` | R21 | `test/unit-genDocsExams.test.mjs`(72) | 本套件側已完成:**引用其他自有套件一律改寫為其 gh-pages 網址**(不複製、不讀 `node_modules`、無 `docs/libs/`);**不複製 dist**(`fdLibs`、`fdNodeModules`、`bCopyDist`、`bDistMap` 已移除,回傳無 `dist`、`libs`);自身 `../dist/…` 保持相對;原地改寫 `fdTar` 既有頁面(`bInplace`)。**各套件 `toolg` 改呼叫(樣板 A/B/D)由主控批次處理(未做)** |
| 複製 dist 至 `docs/dist/` `genDocsDist`(2026-11-02 wpt268 新增) | `src/genDocsDist.mjs`、`src/docsCommon.mjs` | R24 | `test/unit-genDocsDist.test.mjs`(30) | 本套件側已完成:`./dist/` 全部檔案(含子資料夾、`.map`)複製到 `./docs/dist/`,先清空目標;dist 不存在或無檔案即拋錯(`WPT_DOCS_DIST_NOT_FOUND`/`WPT_DOCS_DIST_EMPTY`);目標與來源重疊(含連結解開後)拋 `WPT_DOCS_PATH_OVERLAP`;連結不跟進。**各套件 `toolg/genDocsDist.mjs`(一行呼叫)與 `script.txt` 於 `git add .  -A` 正上方插入 `node toolg/genDocsDist.mjs` 由主控批次處理(未做)** |
| 部署 `-d` 資料夾至 gh-pages(wpt268 撤除提供 dist) | `bin/gh-pages.mjs` | R23 | `test/unit-ghPagesDeploy.test.mjs`(10) | 本套件側已完成:**職責僅部署 `-d` 資料夾**,不提供專案根 `./dist/`(`--no-dist`、`--dist-map` 已移除);各套件 `"deploy": "gh-pages -d docs"` 經 `.bin` 解析至此(121/121 實測,wpt257b);需各套件升級 w-package-tools 後生效 |
| README 瀏覽器用法改指 gh-pages `modifyReadme`(2026-11-01 擴充) | `src/modifyReadme.mjs`、`src/ownPkg.mjs` | R22 | `test/unit-modifyReadme.test.mjs` | 本套件側已完成;各套件現有 `toolg/modifyReadme.mjs` 不改即生效;其指向之 gh-pages `dist/` 由 R24 提供(各套件須有 `docs/dist/`) |
| 小工具:`getPks`、`setPks`、`addVersion`、`getFiles`、`getReadme`、`extractHtml`、`rollupVueToHtml`、`rollupFiles`、`parseVueCode` | `src/*.mjs` | R5、R6(補全解析、換行正規化)等 | `rollupFiles`、`rollupVueToHtml` 由 `unit-buildError`/`unit-rejectShape` 間接涵蓋;R5、R6 **無專屬測試** | 可用;R5、R6 測試為已知缺口 |

## 已知缺口與待辦

- R5(`bResolveExtPath` 補全解析)、R6(`parseVueCode` 換行正規化)無專屬測試(規則帳本已列)。
- 未修缺陷:`rollupFile` 未呼叫 `bundle.close()`(已知不修);其餘設計限制見規則帳本四之二。
- 待主控(wpt268 更新,見任務報告〈給主控〉):①各有 dist 之套件新增 `toolg/genDocsDist.mjs`(`import genDocsDist from 'w-package-tools/src/genDocsDist.mjs'`＋空行×2＋`genDocsDist()`)並於 `script.txt` 的 `git add .  -A` 正上方插入 `node toolg/genDocsDist.mjs`;②47 套件(`gDocsExams` 33 + `gDocExams` 14,2026-11-01 wpt257b 盤點實數)之 `toolg` 改呼叫 `genDocsExams`(樣板 A/B/D 不變);③各套件 `.gitignore` 的 `docs/libs/` 行**撤除**(wpt257b 時要求加入者,wpt268 起不再產生 `docs/libs/`);④`wsemi.umd.min.js`(wsemi dist 無此檔)出現於 w-leaflet-vue、w-maplibregl-vue、w-threejs-vue、w-flow-vue、w-trade-backtest 之 `toolg/gDistApp.mjs`/`gExtractHtml.mjs`,須改為 `wsemi.umd.js`(wpt268 起 `genDocsExams` 不讀本機而**不再警告**,w-leaflet-vue 複本實跑已確認被靜默改寫為 `…/wsemi/dist/wsemi.umd.min.js`)。
- 待主控(bb02):①使用端 126 份 `babel.config.js` 依 README〈Breaking changes〉改(與升本套件同一輪);②w-converws-client-webworker `toolg/gMergeWorker.mjs` 直接使用 `@babel/core`(Babel 7 API),須由該套件處理;③wsemi 之 core-js 對拍案因本套件移除 core-js 而略過,是否由 wsemi 自宣告 core-js 待裁示;④自由全域 `regeneratorRuntime` 不再被改寫(Babel 8;現有 dist 0 個依賴),恢復改寫或建置期拒絕待裁示(帳本 R25 已知限制⑥);⑤helper 之 `@babel/runtime` 是否以 `absoluteRuntime` 錨定本套件待裁示(⑨);⑥mocha 12 另輪(rollup 4 已於 pt395 完成)。
- 待主控(pt395):全庫連動時留意 README〈Breaking changes〉rollup 4 節——產物程式碼與大小改變(lock 帶舊 terser 者可能變大)、commonjs 29 之 `strictRequires: true`(CJS 初始化順序)、node-resolve 16 之 `production` 條件、建置錯誤訊息加 `[plugin wpt-build-check]` 前綴、`.map` 形狀、原生二進位為 optional 相依;使用端以逐字或長度比對產物之測試會轉紅。
- 待裁示(pt395 外審 terra F1、F3,皆非本輪引入,帳本四之一):①terser 把預設參數內墊片之全域參照改綁到函數本體之同名 `var`(壓縮後才壞,檢查在壓縮前);②墊片錨點過寬(使用者之 `.pathToFileURL(__filename)` 被當墊片)。建議同一輪處理:錨點限 rollup 墊片形＋terser 之後之完整性檢查。自有套件原始碼曝險皆 0。
- `sgud/rule/rulebook.md` 已逾 160 KB,依全域設定「過長即整理」宜拆為 `rulebook_<類型>.md`(未做,非 bb02 範圍)。
- 已知未覆蓋:`genDocsDist` 之 `realPath` 在 Windows 回傳短檔名(8.3)別名時的比對(`path.relative` 不分大小寫,但不解 8.3);複製中途失敗(磁碟滿等)之錯誤為 Node 原始 fs 錯誤,未包 `WPT_` 碼。

## 最近一次驗證

- 2026-11-11 pt395(rollup 3 → 4):全套 `npm test`(`quiet-run --lock`)修前 rollup 3.30.0 **444 passing**、修後 rollup 4.67.4 **447 passing**(unit-buildCheck 20 → 23),皆 exit 0;R17 墊片兩版對照(32 形態 × umd/cjs × 3.30.0/4.67.4)檢查判定與實際綁定 128 格一致;改寫之 unit-buildCheck、rollupCode 於 rollup 4.67.5 亦 28/28;修前測試對 rollup 4 恰 4 紅(2 指紋、2 頂層劫持)。下游副本(打包檔 `npm i --no-save`,解析為 rollup 4.67.5):wsemi、w-component-vue、Node 端 umd 包、含 worker 之包建置列全過、建置訊息與 r3 相同、UMD 冒煙(Node require、headless Chromium)r3/r4 皆過且觀察值相同;下游經本套件建置之測試 wsemi 9、w-component-vue 43、Node 端 umd 包 16 皆綠;外審後加 bNodePolyfill＋worker 之包、iife＋文字後處理之包,建置、訊息、冒煙 r3/r4 皆同。外審 terra 10 條(F5、F6、F4 採納為測試強化,F8–F10 寫入 README,F1、F3 列四之一待裁示);外審後全套再跑 447 passing。未發布、未改版。
- 2026-11-10 bb02(R25):全套 `npm test`(`quiet-run --lock`)**444 passing**(428＋`unit-rollupBabel` 16),exit 0;新測試對修前 HEAD 副本(Babel 7 之 node_modules)5 綠 11 紅;變異 20 個 17 殺、3 等價存活(頂層 targets、`browserslistConfigFile`、preset 層 targets 互為備援);外審 terra 11 條(F1 browserslist 之 core 層讀取已修;F6 regeneratorRuntime、F4 helper 錨定列需裁示);lint 與 HEAD 逐行相同(只有既有 `src/parseVueCode.mjs:41`)。下游副本(打包檔 `npm i -D`):wsemi 建置列全過、dist JS 5 檔與正式 repo 逐位元組相同、全套 29955 passing／9 pending／0 failing(正式現況 29956／8,差 1 案為 core-js 對拍案略過);w-component-vue 建置列全過、dist JS 與同路徑改前基準逐位元組相同(對正式 repo 只差路徑相依內容)、vue-cli build 10 檔相同、全套 232 passing。未發布、未改版。
- 2026-11-02 wpt268:全套 `npm test`(`quiet-run --lock`)**428 passing**,exit 0(基準 407 + `unit-genDocsDist` 30 + `unit-genDocsExams` 77→72 + `unit-ghPagesDeploy` 14→10);變異 43 個全殺(d01–d17 genDocsDist、c01–c09 docsCommon、e01–e14 genDocsExams、g01–g03 bin;e01、g01 為整檔回 HEAD);新測試對修前 HEAD:`unit-genDocsExams` 47 紅 25 綠、`unit-ghPagesDeploy` 4 紅 6 綠;以 w-fft、w-leaflet-vue 之真實 `dist/`、`examples/`／`test-html/` 複本實跑預設路徑 `genDocsDist()`＋`genDocsExams()`:`docs/dist` 與 `dist` 位元一致(含 `.map`)、無 `docs/libs`、無殘留自有套件 CDN 網址(`w-demores` 依 `keepCdn` 保留)。未發布、未改版。
- 2026-11-01 wpt257b:全套 407 passing(原 284 + `unit-genDocsExams` 77 + `unit-modifyReadme` 32 + `unit-ghPagesDeploy` 14);其變異與真實複本實跑見經驗二十二。
- 2026-11-01 wpt257(前輪):`unit-genDocsExams` 60、`unit-modifyReadme` 32,全套 376 passing;99 變異全殺;w-fft、w-aggrid-vue 複本實跑。
- 規格對照:`C:\opensrcOper\dspec\自有套件之瀏覽器端取用與gh-pages.md`(規則 1–3、5–7 本套件側已落實)、`自有套件之發布與建置腳本.md`(規則 4 `genDocsDist.mjs`)、`自有套件之npm發布範圍.md`(第 2 條:`docs/dist/` 不計入 `docs/` 大小,與本套件無關)、`輸入參數之檢測機制.md`(K2、K3、K9、V4、V17、V19)。
