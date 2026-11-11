# 規則帳本

本檔為套件設計與開發階段之規則帳本,為要求程式碼須長成什麼樣,或由規格產出之測試(項目/說明/流程)有哪些,包含軸、單一擁有者、已知限制、破壞性變更紀錄,以及對應是哪些測試檔案或指令等,由agent自行編列、擴充與維護.

**盤點指令**(改動涉及某條規則時,動工前跑一次對照數字,改完再跑一次並於回報附輸出;行號為 2026-10-17 任務20261017051850 run01 重跑之值(本次新增 import 與改寫 R19/R20 站點,位移 rollupFile、rollupCode、rollupWorker、rollupParfor、rollupWorkerCore、buildCheck),會隨改動位移,以指令輸出為準;git grep 只搜受追蹤之檔,新增檔須先加入版控,或在 `git grep` 加 `--untracked`):

| 規則 | 指令 | 現值(2026-10-16 run02) |
|---|---|---|
| R1/R2 產碼模板之 process 監聽註冊 | `git grep -n -E "process\.(on\|once\|addListener\|prependListener\|prependOnceListener)\(" -- src` | 1 處:`src/rollupWorkerCore.mjs:342`(inner,worker 執行緒內,刻意保留)。出現第 2 處即違反 R1 或 R2 |
| R1/R2/R3/R7/R10 worker 包裝 | `npx mocha --no-parallel test/rollupWorker.test.mjs test/rollupParfor.test.mjs --timeout 180000` | 53 passing(rollupWorker 46、rollupParfor 7) |
| R7/R11/R12/R13 作用域、匯出、選項 | `npx mocha --no-parallel test/unit-workerScope.test.mjs --timeout 180000` | 35 passing |
| R14/R15 回傳程式碼模式、路徑、opt | `npx mocha --no-parallel test/unit-rollupFileReturnCode.test.mjs --timeout 180000` | 16 passing |
| R7/R11/R13 真瀏覽器 | `npx mocha --no-parallel test/e2e-workerBrowser.test.mjs --timeout 180000` | 15 passing(Chromium,不開埠) |
| R8 免編譯 parfor | `npx mocha --no-parallel test/parfor.test.mjs --timeout 180000` | 12 passing |
| R9 產製 API 錯誤回報 | `npx mocha --no-parallel test/unit-buildError.test.mjs --timeout 180000` | 11 passing |
| 全套回歸 | `npm test` | **447 passing**(2026-11-11 pt395 rollup 4.67.4 實跑 exit 0,約 4 分;444＋unit-buildCheck 3〔20→23〕;修前同日 rollup 3.30.0 實跑 444 passing)。此前 **444 passing**(2026-11-10 bb02 實跑 exit 0,約 4 分;428＋unit-rollupBabel 16)。此前 **428 passing**(2026-11-02 wpt268 實跑 exit 0,約 3 分;407〔wpt257b〕＋unit-genDocsDist 30＋unit-genDocsExams 由 77 改 72〔−5〕＋unit-ghPagesDeploy 由 14 改 10〔−4〕;wpt257b 時為 407＝原 284＋unit-genDocsExams 77＋unit-modifyReadme 32＋unit-ghPagesDeploy 14,wpt257 時為 376)。原 284 passing(rollupWorker 46、rollupParfor 7、parfor 12、unit-buildError 11、rollupCode 5、unit-workerScope 35、unit-rollupFileReturnCode 16、e2e-workerBrowser 15、unit-buildCheck 20、unit-cleanFolder 8、unit-wsemipContract 18、unit-wpfContract 6、unit-rejectShape 68、unit-tempCleanup 17;不加 `--exit` 能自行結束;2026-10-17 任務20261017051850 run01 換 wsemip 與 wpf 為 1.9.18 並套 R19/R20 後實跑,exit 0;修前基準 198) |
| R3 pending 清理單一擁有者 | `git grep -n -E "delete pendings\[" -- src/rollupWorkerCore.mjs` | 2 處:`rejectPendings`(異常 settle,:637)與 `recvMessage` 之 return(正常 settle,:789)。出現第 3 處即為手寫第二份清理 |
| R3 ⑦ 先送後登記 | `git grep -n -E "wk\.postMessage\(dataSend\)\|pendings\[id\] = pm" -- src/rollupWorkerCore.mjs` | 呼叫函數(`genCaller`)之 postMessage :747 須在登記 :755 之前;工廠 init 之 postMessage :711(失敗時 terminate 後重拋) |
| R3 ⑥ inner 送出兜底單一擁有者 | `git grep -n -E "(parentPort\|self)\.postMessage\(\|could not be cloned" -- src/rollupWorkerCore.mjs` | 送出原語只在 csm(:97、:99),只被 `sendMessage`(:176)內聯使用;兜底訊息 1 處(:185)。inner 他處出現 postMessage 即為繞過兜底 |
| R3 messageerror 綁定 | `git grep -n -E "messageerror" -- src/rollupWorkerCore.mjs` | worker 端 nodejs :135、browser :145;宿主端 nodejs :532、browser :541;宿主端處理 worker 通知 :801;inner 兜底不略過 messageerror 通知 :207 |
| R5 補全解析插件 | `git grep -n "name: 'resolve-ext-subpath'" -- src` | 1 處:`src/rollupFile.mjs:295` |
| R6 換行正規化 | `git grep -n "h = h.replace" -- src/parseVueCode.mjs` | 1 處:`src/parseVueCode.mjs:35` |
| R7 不以文字比對取匯出 | `git grep -n -E "clearExportCode\|let cle[a-z]+ = " -- src` | 0 處(七個比對器已移除;出現即為回到文字比對) |
| R7 模組包裝與預設匯出 | `git grep -n -E "mdUser\|mdDefault" -- src/rollupWorkerCore.mjs` | inner 函數引數 :158;使用者模組包裝 :352–:355;預設匯出 :358;取用 :107、:113、:245 |
| R9 iife 限 browser | `git grep -n "formatOut\[iife\] only supports" -- src` | 3 處:`src/rollupWorker.mjs:158`、`src/rollupParfor.mjs:250`、`src/rollupWorkerCore.mjs:1015` |
| R9 不吞產製錯誤 | `git grep -n -A2 -E "\.catch\(\|catch \(err\) \{" -- src ':!src/*.umd.js'` | 產製 API 無 `.catch`,各 API 之 catch 已無 `console.log(err)`(2026-10-17 起暫存檔清理全經 `src/wptCommon.mjs` 之 `rmTempFile`,其 catch 只印一行警告,見 R20;原 `src/rollupCode.mjs:148`、`src/rollupWorker.mjs:303`、`src/rollupParfor.mjs:336` 已移除;rollupFile 之讀回清理已隨 R14 移除),其餘為 worker 包裝內部之錯誤轉交與建置期語法檢查(`src/rollupWorkerCore.mjs:1129`);`src/buildCheck.mjs` 之 catch 皆把錯誤轉為 RollupError 或重試判定,不印出 |
| R10 blob URL 釋放 | `git grep -n -E "revokeObjectURL\|revokeUrlBlob\(\)" -- src/rollupWorkerCore.mjs` | inner 自行 revoke :88;outer `revokeUrlBlob` 呼叫 2 處(emitFatal :657、terminate :692),定義 :434(nodejs 空函數)、:442(browser) |
| R11 使用者可控名稱只作資料 | `git grep -n -E 'JSON\.stringify\((funNames\|evName)\|\$\{(funName\|evName\|name\|nameDist)\}' -- src/rollupWorkerCore.mjs src/rollupWorker.mjs src/rollupParfor.mjs` | 插入模板者只有 `JSON.stringify`:evName :32、:33,funNames :412;`${funName}`/`${evName}` 只出現於錯誤訊息(:926、:929、:947)。出現於模板即違反 |
| R11/R12 建置期檢查 | `git grep -n -E "has no default export\|has no export,\|evNames only supports\|is reserved by\|has syntax error\|is not a non-empty string" -- src` | 7 處,皆在 `src/rollupWorkerCore.mjs`:funNames :926、:929;evNames :943、:947;匯出 :1115、:1118;inner 語法 :1130 |
| R13 方法呼叫之 this | `git grep -n -E "Reflect\.apply\|cthis = " -- src/rollupWorkerCore.mjs` | `cthis` :119、:121;呼叫 :288(唯一呼叫點) |
| R14 回傳模式與路徑 | `git grep -n -E "bundle\.(generate\|write)\(\|output\.length\|fsIsFolder\(fd(Tar\|Src)\)\|fdTar: ''" -- src` | `src/rollupFile.mjs`:fdTar 檢查 :89、:92,fdSrc 檢查 :112,generate :437,守門 :440,write :452;明給 `fdTar: ''`:`src/rollupCode.mjs:121`、`src/rollupParfor.mjs:302` |
| R15 targets 依值生效 | `git grep -n -E "targets (!==\|===) '(new\|old)'" -- src` | `src/rollupCode.mjs:51`、`src/rollupFile.mjs:161`、`src/rollupWorker.mjs:146`、`src/rollupWorkerCore.mjs:999` |
| R15 不改呼叫端 opt | `git grep -n -E "^\s+opt\.\w+ = " -- src/rollupCode.mjs` | 0 處 |
| R16/R17 建置期檢查 | `npx mocha --no-parallel test/unit-buildCheck.test.mjs --timeout 180000` | 23 passing(引用類 10、import.meta 類 12、runin 訊息 1;2026-11-11 pt395 rollup 4.67.4,原 20) |
| R16/R17 建置期錯誤碼 | `git grep -n -o -E "fail\('[A-Z_]+'" -- src/buildCheck.mjs` | 11 處:UNRESOLVED_IMPORT、WPT_BUILTIN_UNAVAILABLE、WPT_DYNAMIC_REQUIRE、WPT_WORKER_EXTERNAL ×2、WPT_CHECK_PARSE ×2、WPT_IMPORT_META_PROP、WPT_WORKER_IMPORT_META、WPT_IMPORT_META_SHIM_UNKNOWN、WPT_IMPORT_META_SHIM(以指令輸出為準);新增檢查一律經 `fail` |
| R16 log 掛鉤只用 onwarn | `git grep -n -E "onLog\|onwarn:" -- src` | `onwarn:` 1 處(`src/rollupFile.mjs` inputOptions),`onLog` 0 處(2026-11-11 pt395 起依 rollup ^4.67.4,onLog 可用但不並用;原因 rollup 3.20.2 無此選項之舊限制已不適用)。出現第二個 log 掛鉤即須重驗 `UNRESOLVED_IMPORT` 之記錄 |
| R18 清空單一擁有者 | `git grep -n -E "fsCleanFolder\(\|cleanFolderStrict\(" -- src ':!src/*.umd.js'` | `w.fsCleanFolder` 只在 `src/buildCheck.mjs` 之 `cleanFolderStrict` 內;`cleanFolderStrict(` 呼叫 2 處(`src/cleanFolder.mjs`、`src/rollupFiles.mjs`)。他處直呼 fsCleanFolder 即繞過拋錯與重試 |
| R18 清空 | `npx mocha --no-parallel test/unit-cleanFolder.test.mjs --timeout 180000` | 8 passing(Windows;POSIX 略過被占用 1 條) |
| R18 wsemip 取用總數 | `git grep -n -o -E "\bw\.[A-Za-z0-9]+" -- 'src/*.mjs' 'gRollup*.mjs' \| grep -v -E "^src/rollupParfor\.mjs:(4[7-9]\|[5-9][0-9]\|1[0-6][0-9]\|17[0-8]):" \| wc -l`(**用 Git Bash 之管線**,不用 PowerShell) | 112 = 站點 111(含 `src/buildCheck.mjs:600`,其 `w` 由 `cleanFolder.mjs:17`、`rollupFiles.mjs` 傳入;2026-10-17 `rollupFiles.mjs` 增 `w.isarr`、`w.isobj` 各 1 處供 `fns` 檢查(R19 站點 29),原為 110＝109＋1)＋註解 1(`src/rollupWorkerCore.mjs:371`);`src/rollupParfor.mjs:47-178` 為 genParforCode 模板(自 `function genParforCode(` 至其結尾 `}`),其 `w` 是 `wpf.umd.js`,不計。數字變動即有新站點,須補下方〈wsemip 站點全集與判準〉 |
| R18 wsemip 版本敏感站點 | `git grep -n -E "\bw\.(fsCleanFolder\|fsCreateFolder\|fsGetFilesInFolder\|pmSeries\|pmMap)\(" -- 'src/*.mjs' 'gRollup*.mjs'` | 輸出 10 行 = 9 處 wsemip 站點(`gRollup{Code,File,Parfor,Worker}.mjs` 之 fsCleanFolder ×4、`src/buildCheck.mjs:600`、`src/getFiles.mjs:9`、`src/rollupFile.mjs:90`、`src/rollupFiles.mjs:51`、`src/rollupVueToHtml.mjs:84`)＋ 1 行 `src/rollupParfor.mjs:137` 之 pmMap(模板內,屬 wpf,非 wsemip) |
| R18 wsemip 契約守門 | `npx mocha --no-parallel test/unit-wsemipContract.test.mjs --timeout 180000` | 18 passing(含內附三 bundle 同版 1 條);升級內附 wsemip 時,紅燈處即須逐站重評之處 |
| R18 內嵌 bundle 版本(wsemip、wpf 兩檔須同版;不同版即須說明) | `git grep -n -E "^ \* (wsemip\|wpf\|wpf_pmSeries) v[0-9.]+" -- src/wsemip.umd.js src/wpf.umd.js src/wpf_pmSeries.umd.js` | 3 行皆 `v1.9.18`(2026-10-17 任務20261017051850 run01;`test/unit-wsemipContract.test.mjs` 之「三個 bundle 同版」守門) |
| R19 字串拒絕(應 0) | `git grep -n --untracked -E "Promise\.reject\(['\"\`]\|throw ['\"\`]" -- src ':!src/*.umd.js'` | 0 行(修前 27 處,見 R19 站點表);出現即為以字串 reject/throw |
| R19 Promise.reject 全部 | `git grep -n --untracked -E "Promise\.reject\(" -- src ':!src/*.umd.js'` | 2 行:`src/wptCommon.mjs:36`(`rejectWpt`)與 `src/rollupParfor.mjs:70`(parfor 模板內就地建立之 Error);他處新增 reject 一律經 `rejectWpt` |
| R19 單一擁有者 | `git grep -n --untracked -E "rejectWpt\(\|wptError\(" -- src ':!src/*.umd.js'` | **2026-11-02 起 40 行**(＝下列 30 行＋R21/R24 之 `wptError` 10 處:`src/genDocsExams.mjs` 5、`src/genDocsDist.mjs` 4、`src/docsCommon.mjs` 1〔`readOpt` 之 `WPT_DOCS_INVALID_OPT`,兩函數共用〕)。原 30 行 = `src/wptCommon.mjs` 定義 2(:19、:25)＋呼叫 28(`rejectWpt` 27(含 `src/rollupFiles.mjs:42` 之 `WPT_INVALID_FNS`)、`wptError` 1 於 `src/buildCheck.mjs:555` 之 `fail`);第一引數須為 `'WPT_…'` 字面值(`test/unit-rejectShape.test.mjs` 靜態守門) |
| R19/R20 拒絕值形狀與暫存檔清理 | `npx mocha --no-parallel test/unit-rejectShape.test.mjs test/unit-tempCleanup.test.mjs --timeout 180000` | 85 passing(unit-rejectShape 68:站點 28 × 2 組(訊息鎖定、帶碼 Error)＋站點 29 之 fdTar 不被清空 1＋靜態守門 1＋cleanFolderStrict 10(格式 5、輸入檢查 1、前置 lstat 失敗 1、NUL 與無原型物件 1、win32 大小寫別名 1(POSIX 略過)、Windows 實測 1(POSIX 略過));unit-tempCleanup 17:3 API × 3＋靜態守門 1＋rmTempFile 重試與路徑語意 7) |
| R20 暫存檔清理單一擁有者 | `git grep -n --untracked -E "rmTempFile\(\|console\.log\(\s*err\s*\)" -- src ':!src/*.umd.js'` | `rmTempFile(` 4 行:`src/wptCommon.mjs:34` 定義＋`src/rollupCode.mjs:146`、`src/rollupWorker.mjs:301`、`src/rollupParfor.mjs:337` 呼叫;`console.log(err)` 0 行(修前 3 處) |
| R18 wpf 模板取用(`w` 為 wpf,非 wsemip) | `sed -n '/^function genParforCode(/,/^}/p' src/rollupParfor.mjs \| grep -o -E "\bw\.[A-Za-z0-9]+" \| sort \| uniq -c` | `cint`×2、`isbol`×1、`isearr`×1、`iseobj`×1、`isfun`×2、`ispint`×2、`pmMap`×1(10 取用、7 函數);出現第 8 個函數即須確認 wpf 已匯出(`unit-wpfContract` 自模板推導,會紅) |
| R18 wpf 契約守門 | `npx mocha --no-parallel test/unit-wpfContract.test.mjs --timeout 180000` | 6 passing(對新舊 wpf 皆綠,為版本中立之契約;升級 wpf 時紅燈處即須重評) |
| R21 範例頁自給自足 | `npx mocha --no-parallel test/unit-genDocsExams.test.mjs --timeout 180000` | 72 passing(2026-11-02 wpt268;wpt257b 時 77,wpt257 時 60。wpt268 變異:genDocsExams 本體 e01–e14 與共用 `docsCommon` c01–c09 共 23 個全殺〔e01 為整檔回 HEAD〕,對修前 HEAD 之 genDocsExams 跑同一測試檔:47 紅 25 綠;wpt257/wpt257b 之變異見 `sgud/exp/experience.md` 二十一、二十二) |
| R23 gh-pages 只部署 -d | `npx mocha --no-parallel test/unit-ghPagesDeploy.test.mjs --timeout 180000` | 10 passing(2026-11-02 wpt268;約 20 秒,子行程實跑 bin 對本機 bare 倉庫;對修前 HEAD 之 bin:4 紅 6 綠;變異 g01–g03 全殺〔g01 為整檔回 HEAD〕;wpt257b 時 14 案,28 變異 27 殺 1 存活〔b10b 跨磁碟機分支,隨 `isSubPath` 移除不再適用〕) |
| R23 不提供 dist(應 0) | `git grep -n --untracked -E "planProjDist\|provideProjDist\|no-dist\|dist-map" -- bin` | 0 行(出現即為恢復在部署時提供專案根 `./dist/`;dist 由 R24 `genDocsDist` 複製到 `docs/dist/`) |
| R24 複製 dist 至 docs/dist | `npx mocha --no-parallel test/unit-genDocsDist.test.mjs --timeout 180000` | 30 passing(2026-11-02 wpt268;約 2 秒。變異:genDocsDist d01–d17〔含拿掉「為空拋錯」d01、拿掉 `.map` d02〕與共用 `docsCommon` c01–c09,共 26 個全殺〔c01–c09 與 R21 共用,兩測試檔一併跑〕) |
| R24 複製 dist 之邏輯單一擁有者 | `git grep -n --untracked -E "copyFile\(" -- src bin ':!src/*.umd.js'` | 4 行:`src/docsCommon.mjs:44` 定義＋`src/genDocsDist.mjs:110` 呼叫(dist)＋`src/genDocsExams.mjs:308、:316` 呼叫(範例檔複製,非 dist)。`bin/gh-pages.mjs` 與 `genDocsExams` 他處複製 `./dist/` 即為分歧 |
| R22 README 改指 gh-pages | `npx mocha --no-parallel test/unit-modifyReadme.test.mjs --timeout 180000` | 32 passing(2026-11-01 wpt257;對修前〔HEAD〕之 modifyReadme 跑同一測試檔:31 紅 1 綠,綠者為固定走工作樹 src 之 toolg 腳本案) |
| R21/R24 錯誤碼 | `git grep -n --untracked -o -E "wptError\('WPT_DOCS_[A-Z_]+'" -- src/genDocsExams.mjs src/genDocsDist.mjs src/docsCommon.mjs` | 10 行 = `src/docsCommon.mjs` `WPT_DOCS_INVALID_OPT` 1(opt 為非一般物件,兩函數共用)；`src/genDocsExams.mjs` `WPT_DOCS_INVALID_PKG` 2、`WPT_DOCS_PATH_OVERLAP` 1、`WPT_DOCS_SRC_NOT_FOUND` 2；`src/genDocsDist.mjs` `WPT_DOCS_DIST_NOT_FOUND` 1、`WPT_DOCS_DIST_EMPTY` 1、`WPT_DOCS_PATH_OVERLAP` 2(新增錯誤一律經 `wptError` 並給 `WPT_DOCS_` 碼;opt 各鍵型別不符不拋錯,依 K3 改用預設) |
| R21/R22 網址樣式、擁有者、gh-pages 網址組成之單一擁有者 | `git grep -n --untracked -E "newCdnUrlRegex\(\|getRepoOwner\(\|ghPagesUrl\(" -- src ':!src/*.umd.js'` | 9 行:`src/ownPkg.mjs` 定義 3(:9、:21、:31)＋`src/genDocsExams.mjs:144、:226、:290`(getRepoOwner、newCdnUrlRegex(owner)、ghPagesUrl)、`src/modifyReadme.mjs:47、:48、:64`(getRepoOwner、newCdnUrlRegex()、ghPagesUrl)。他處出現第二份 CDN 網址正規式或自行以 `.github.io` 組網址即為分歧(wpt257b 起 gh-pages 網址組成收於 `ghPagesUrl`;變異 o01–o05 全殺) |
| R25 babel 轉譯隔離(不讀使用端設定、外掛模組物件、自帶外掛) | `npx mocha --no-parallel test/unit-rollupBabel.test.mjs --timeout 180000` | 16 passing(2026-11-10 任務20261110095259 bb02;約 30 秒;對修前 HEAD:5 綠 11 紅〔綠者為對照、使用端標準版 babel.config.js〔Babel 7 接受〕、browserslist 有效設定 2 案〔改前 preset 亦不採用,屬回歸鎖〕、.vue 篩選〔與 6.1.0 同規則〕〕;變異 m01–m20:17 殺、3 等價存活〔m05 移除 preset 層 targets、m14 只移除 `browserslistConfigFile`、m15 只移除頂層 targets——三者互為備援,m16 兩者皆移除即殺〕,見 `sgud/exp/experience.md` 二十四) |
| R25 babel 設定與轉譯外掛之單一擁有者 | `git grep -n --untracked -E "^[^/]*(from '@babel/\|from '@rollup/plugin-babel'\|babelrc:\|configFile:\|browserslistConfigFile:\|useBuiltIns:\|corejs:\|'@babel/(preset\|plugin)-)" -- src ':!src/*.umd.js'` | 6 行:`src/rollupBabel.mjs:1`(`@babel/core`)、`src/rollupFile.mjs:15`(preset-env)、`:16`(transform-runtime)、`:347`(`babelrc: false`)、`:348`(`configFile: false`)、`:349`(`browserslistConfigFile: false`;其下 `:350` 為頂層 `targets,`)。出現 `@rollup/plugin-babel`、`useBuiltIns`、`corejs`、以字串指名之 preset/外掛(`'@babel/preset-…'`、`'@babel/plugin-…'`),或他檔另 import `@babel/core` 即違反 |
| R21/R22 不寫死套件名與擁有者 | `git grep -n --untracked -E "w-fft\|w-demores\|yuda-lyu" -- src/genDocsExams.mjs src/modifyReadme.mjs src/ownPkg.mjs` | 6 行,程式邏輯只有 `src/genDocsExams.mjs:121` 之 `keepCdn` 預設值 `['w-demores']`;其餘為 JSDoc 與註解之說明文字。程式邏輯出現其他套件名或 `yuda-lyu` 即違反(變異 g31、m01 已證測試分得出) |

## 〇、輸入空間之軸(worker 包裝類規則建表之起點)

凡要對 worker 包裝(rollupWorkerCore/rollupWorker/rollupParfor/parfor)建笛卡兒表(全域 §2.1 第 3 條),軸取自下表;成員以 grep 自碼取得,不憑記憶。

| 軸 | 成員 | 取得方式 |
|---|---|---|
| 產製路徑 | rollupWorkerCore 直呼/rollupWorker(runin nodejs、browser、both)/rollupParfor(內部經 rollupWorker,預設 both;parforCore 為 function ByInstance)/下游再打包內嵌(註冊數＝內嵌份數) | `src/rollupWorker.mjs` 之 runin 分支(core() 內兩次呼叫 rollupWorkerCore 後合併) |
| outer 數 | runin both 之產物含 **2 個** outer(nodejs 版與 browser 版),其餘 1 個 | 同上 |
| type × 實體模式 | function＋ByInstance/function 工廠(`execFunctionByInstance:false`,如 w-pubsub client)/object＋ByInstance/object 持久(**import 時即建 worker**) | `src/rollupWorkerCore.mjs` 之 `cwt` 分支 |
| 輸出格式 × runin | umd/es 各 runin 皆可;iife **只支援 runin browser**(external 之 `worker_threads` 以全域識別子傳入 iife,nodejs/both 之產物載入即 ReferenceError),其餘 runin 於參數檢查即 reject(R9);中介產物於 iife 時改用 es | formatOut、runin |
| 使用者頂層宣告 × inner 名稱(R7) | 宣告種類 let/const/class、var、function(含被當值取用);inner 名稱 `instance`、`initFail`、`init`、`sendMessage`、`run`、`recvMessage`、`parentPort`、`mdDefault`;worker 全域 `self`、`postMessage`、`onmessage`、`process`、`console`、`String`;方向 使用者→inner(宣告、覆寫)/inner→使用者(自由參照、自由賦值) | `addInnerWebWorkerCode` 模板 |
| 壓縮與名稱保留(R7) | bMinify false/true × keepFnames × mangleReserved × 使用者碼含直接 eval × opt.name 是否與 inner 名稱或原始碼預設匯出同名 | terser 選項(`src/rollupFile.mjs` 之 terser) |
| 匯出形狀(R7、R12) | 具名宣告之預設/匿名預設/物件常值預設/預設＋具名/只有具名/無匯出/CJS 原始碼/字串常值含 `module.exports=`/內嵌已壓縮 CJS 相依;判定依 rollup `chunk.exports` | `rollupFileCore` 回傳之 exports |
| 執行環境語意(R7、R13) | 嚴格與否、方法之 this(物件方法、class 實例方法、function ByInstance)、`module`/`exports` 之有無、nodejs `module.require`、相依之隱式全域 | inner 模板之 `cthis`、`cmd` |
| 使用者可控名稱 × 插入位置(R11) | opt.name、funNames、evNames × 字元(引號、`-`、與 outer 內部函數同名、與 EventEmitter 介面同名、非字串) × 位置(inner、outer、合併層、parfor 外層) | `git grep` 模板內之 `${…}`(見盤點指令 R11) |
| evNames × 實體模式(R12) | function ByInstance/工廠/object(ByInstance、持久);只有工廠支援 | `rollupWorkerCore` 之 evNames 檢查 |
| 使用者碼干預 worker 生命週期 | 註冊 uncaughtException、瀏覽器 error 事件 preventDefault、`self.close()`、`process.exit`(設計限制,見四之二) | 使用者程式碼 |
| 模組實例 | UMD(CJS)以**檔名**快取,加查詢字串不重新求值頂層;ESM 以完整 URL 快取 | Node 模組載入語意 |
| 宿主環境 | Node 主執行緒/瀏覽器(無 process)/瀏覽器＋打包器注入之 process shim(noop 或 EventEmitter)/window＋真 process(Electron renderer、jsdom)/worker 執行緒(巢狀產物) | `isWindow()` 只看 window.document;outer 頂層碼在 `protectShell()` 之外,環境不符仍執行 |
| 宿主 execArgv | 一般/`--input-type=module`(**設計限制**:eval worker 繼承,inner 之 cjs `require` 失效,見四之二)/`--pending-deprecation`(R7 ④) | `new Worker(code, { eval: true })` 未指定 execArgv |
| 宿主既有 process 監聽 | 無/uncaughtException/unhandledRejection/uncaughtExceptionMonitor/capture callback;另有 `--unhandled-rejections` 模式 | Node 語意 |
| 錯誤來源 | 宿主同步例外/宿主未處理 rejection/使用者事件監聽器拋錯/worker 內未捕捉例外/worker 內未處理 rejection/worker 內 exit(n,含 0)/worker 載入期錯誤/worker 建立失敗/inner 初始化失敗(工廠函數拋錯)/結構化複製失敗(宿主→worker:呼叫引數、工廠初始化引數;worker→宿主:回傳值、reject 值、事件內容、初始化錯誤、messageerror 通知)/messageerror(兩方向)/worker 內使用者程式碼自送非協定訊息(含 null)/主動 terminate(有無 pending)/terminate 後呼叫/呼叫不存在之方法 | 逐一對照 `wrapWorker`、inner 模板、`src/parfor.mjs` |
| 產製 API | rollupFile/rollupCode/rollupWorkerCore/rollupWorker/rollupParfor/rollupFiles/rollupVueToHtml/extractHtml(R9) | `git ls-files src` 中產出檔案者 |

**rollupFile 類(R14、R15)另有之軸**:入口(rollupFile 未給 fdTar/rollupFiles 未給 fdTar/rollupCode/rollupWorkerCore bReturnCode/rollupWorker 與 rollupParfor 之內部)× bSourcemap(未給/false/true/'inline')× format(es/umd/iife/cjs/不支援之值)× 輸入(mjs/vue/含 css)× bMinify × 結果(成功/解析失敗/輸出選項錯誤)× cwd(有 package.json/無/唯讀)× **fdTar 狀態**(未給/空字串/既有資料夾/不存在而可建立/為檔案/上層為檔案)× **fdSrc 狀態**(未給/資料夾/檔案/不存在)× 並發 × 輸出項數 × targets(未給/'new'/'old'/其他值)× 層(inner、outer、rollupCode)。

**建置期檢查類(R16–R18)另有之軸**(run01 審計表 A–E 與 run02 三方外審補軸;建表全文見 `tmp/bx01/validate-plan.md` 之作法):入口(全部經 rollupFileCore;worker inner 另有 workerInner)× format(umd/cjs/iife/es;system/amd 未列於 JSDoc)× runin × bNodePolyfill × **rollup 版本**(2026-11-11 pt395 起本套件依 `^4.67.4`,使用端根目錄之 rollup 3 不影響——npm 為本套件另裝巢狀之 4;避讓範圍與產物形狀依版本,見 R17 理由)× **建置機 Node 版本**(isBuiltin、prefix-only 內建、旗標關閉之內建)× specifier 角色(裸名/子路徑/`node:`/內建子路徑/相對/虛擬 `\0`/`?query`/非字面值動態)× **引用或節點之保留狀態**(tree-shaking 後是否存活)× **守衛**(try、`.catch`、typeof、`??`、`?.`)× 操作種類(讀、呼叫、寫入、解構、別名)× commonjs 轉換(字面/非字面 require、try 內保留原生、typeof require)× polyfill 能力(真 polyfill/空殼/未涵蓋)× 宣告形式與作用域(頂層、跨模組、函數參數、區域、catch 參數、import 綁定、class static block、直接 eval)× 清空狀態(不存在/為檔案/上層為檔案/連結/占用/並發/根目錄或 cwd)× 呼叫端形態(浮動/await/自接 catch)。

**已知的軸間耦合**(列表時不可當成獨立軸):

- 實體模式 × 時序:object 持久於 import 時即建 worker,「import 未用」對它不成立;只量測不拋錯之子程序須主動 exit,否則懸置
- 實體模式 × terminate:只有持久與工廠模式會由使用者呼叫 terminate;ByInstance 只在 finally 內 terminate(此時 pending 已 settle)
- 實體模式 × messageerror 之波及:無法得知失敗訊息屬哪個呼叫而整批 reject,ByInstance 每實例只有一個呼叫故無波及;持久與工廠模式同時進行中之其他呼叫會一併 reject
- 實體模式 × 送出失敗之回報:呼叫函數(回傳 promise)以 reject 回報;工廠函數(同步回傳)之初始化引數無法複製時維持同步拋錯(只修 worker 遺留,R3 ⑦);ByInstance 與持久之初始化不帶使用者引數,不會失敗
- 實體模式 × this(R13):function ByInstance 之 instance 為合成之 `{ main }`,不得作為 this;其餘以 instance 為 this
- 實體模式 × funNames 檢查(R11):function ByInstance 之 outer 只用內部 `main`,funNames 不掛到回傳物件,故不檢查保留名
- 宿主環境 × 錯誤語意:worker 內未處理 rejection——Node 預設轉為未捕捉例外 → worker 崩潰 → error 事件;瀏覽器只在 worker 內發 unhandledrejection,Worker 物件**不發** error → 呼叫永久懸置。worker 內未捕捉例外——Node worker 結束;瀏覽器 worker **不結束**(R10 標死後主動 terminate)。只在 Node 驗證必漏瀏覽器之懸置
- 宿主環境 × 全域語意:vm 模擬(`test/tools/browserSim.mjs`)不代表真瀏覽器之全域物件與 polyfill 偵測(w-json-stream 於 vm 誤報、Chromium 正常),瀏覽器格以 `test/e2e-workerBrowser.test.mjs` 實跑
- runin × outer 數:both 為 2,任何 outer 頂層副作用在 Node 發生兩次
- 宿主既有監聽 × 輸出次數:宿主若掛 unhandledRejection 或非 throw 模式,rejection 不轉為未捕捉例外
- 宿主 monitor 總數 × MaxListeners:門檻為同事件總監聽數 >10(含宿主自有)

## 一、規則

### R1 產物 outer 層不得於宿主註冊任何 process 監聽

- **規則**:產碼模板中會在宿主求值的頂層程式碼(outer 層、both 合併層、parfor 外層),不得註冊 `process.on/once/addListener/prependListener/prependOnceListener`(含 uncaughtException、unhandledRejection、uncaughtExceptionMonitor)。宿主未捕捉錯誤之處置屬宿主:函式庫不攔截(維持 Node 預設之印出並 exit 1)、不重印。
- **理由**:吞噬型監聽劫持宿主全域錯誤語意(只印不終止);monitor 雖不改終止,但每支產物各註冊一次(both 兩次),只會把與本函式庫無關之宿主錯誤重印至 stdout,N 支即 N 份,總數 >10 觸發 MaxListenersExceededWarning;且它對 worker 錯誤**零作用**(worker 錯誤經 Worker 之 error/exit 事件,不經宿主未捕捉例外)。對標 piscina、workerpool、tinypool、Vite inline worker 皆不在宿主註冊 process 監聽;threads.js 於 import 時註冊 SIGINT/SIGTERM 為反例。
- **範圍收斂**:本規則只約束 process 監聽。「import 不改變任何宿主全域狀態」**不成立**,勿如此宣稱:瀏覽器 UMD 會掛全域模組名、object 持久實體 import 即建 worker、瀏覽器端建 Blob URL。
- **只約束新產製之產物**:產物自含,舊產物照舊註冊;模板修正須以新產製之產物驗證,不可拿下游既有產物驗。
- **站點全集與判準**:

| 站點 | 判準 |
|---|---|
| outer 模板(`addOuterWebWorkerCode`,nodejs 與 browser 兩版;說明註解可搜「刻意不註冊任何process監聽」) | 已套 |
| both 合併層(`src/rollupWorker.mjs` mergeBoth) | 已套 |
| parfor 外層(`src/rollupParfor.mjs` genParforCode) | 已套 |
| `src/parfor.mjs`(免編譯 pool,非產物) | 已套 |
| inner 模板 `src/rollupWorkerCore.mjs:341`(worker 執行緒內,掛 worker 自己的 process) | 刻意不套,見 R2 |

- **測試**:`test/rollupWorker.test.mjs` 之「宿主隔離」4 條(import 十支各型產物(含工廠 nodejs 與 browser)後宿主 process 全部事件監聽增量為 `{}`;宿主未捕捉例外與未處理 rejection 皆 exit 1、`Error: <訊息>` 於 stderr 1 次 stdout 0 次;產物明文無 process 監聽註冊——涵蓋 Node 跑不到之瀏覽器與類 Electron 路徑),iife × browser 產物之明文守門 1 條;`test/rollupParfor.test.mjs` 之 parfor umd＋es 1 條。量測一律走 `test/tools/hostProbe.mjs`(見三)。

### R2 inner 層(worker 內)不得註冊吞噬型監聽,只留 uncaughtExceptionMonitor

- **規則**:inner 模板只可註冊 `uncaughtExceptionMonitor`(觀測);不得註冊 uncaughtException、unhandledRejection。monitor 以 `console.error` 輸出(診斷走 stderr,不混入宿主 stdout 之資料流,同 Node 未捕捉錯誤之慣例)。
- **理由**:吞噬型監聽阻止 worker 依預設終止 → 外層收不到 error/exit → 呼叫中之 promise 永久懸置,殭屍 worker 令宿主無法退出(曾令 mocha 300 秒不返)。保留 monitor 是因無 pending 且呼叫端未監聽 error 時(eventemitter3 無監聽者 emit 不拋),此輸出為崩潰唯一痕跡。
- **限制**:monitor 於被包裝程式碼執行之後才安裝(使用者模組之求值為 inner 函數之引數,先於 inner 函數本體),載入期錯誤不經此記錄;瀏覽器 worker 無 process,本來就不生效;輸出經 worker stdio 進宿主 stderr。monitor 位於 inner 函數作用域內,使用者頂層之 `process`、`console` 宣告不再遮蔽之(R7)。
- **站點**:`src/rollupWorkerCore.mjs:335-346`(已套);同類之執行期診斷 `src/parfor.mjs:97`(單 job 失敗,已改 console.error)。
- **測試**:`test/rollupWorker.test.mjs` 之 worker 內 uncaughtException/exit(0)/exit(5) 各案須 reject;「診斷輸出通道」1 條(乾淨子程序,崩潰之 monitor 輸出 stderr 1 次、stdout 0 次);`test/parfor.test.mjs`「單 job 失敗不炸批」攔截 console.error。

### R3 worker 生命週期任何終止路徑,呼叫端必有結果

- **規則**:
  ①worker 之 error 事件、非 terminate 造成之 exit(含 code 0)→ 標記死亡並整批 reject 登記中之 pending;
  ②主動 `terminate()` → 標記死亡、以 `worker has been terminated` reject 呼叫中之 pending,**不 emit error**(預期操作);
  ③worker 建立失敗 → 保存原始錯誤、**仍回傳 ev(不回傳 null)**;
  ④死亡後之新呼叫一律立即 reject(原因依序為:建立失敗之原始錯誤/`worker has been terminated`/`worker is dead`),不得懸置、不得同步拋錯;
  ⑤訊息反序列化失敗(messageerror)兩方向——worker 回傳之訊息於宿主端解不開、宿主送去之訊息於 worker 端解不開(worker 以 `{ mode: 'messageerror' }` 通知外層)——皆無法得知屬哪個呼叫,一律整批 reject 呼叫中之 pending 並 emit error;worker 仍可服務故**不標死亡**。代價:持久與工廠模式同時進行中之其他呼叫一併 reject(以不懸置為優先),其後到之回傳因已不在登記表而略過。精確歸屬可依 MessagePort 之 FIFO 與「messageerror 就地觸發」以序號達成(宿主→worker 方向零額外訊息,2026-10-13 審查者以真實反序列化失敗實測),因罕見且成熟產品(piscina、workerpool)皆未處理 messageerror 而**不實作**;
  ⑥worker 送出之內容無法結構化複製(回傳值、reject 值、事件內容、初始化錯誤、messageerror 通知)→ inner `sendMessage` 兜底改送可複製之字串說明(`<描述> could not be cloned: <原因>`,描述為 `return value of function[x]`/`rejected value of function[x]`/`payload of event[x]`/`init error`):return → 該呼叫以說明 reject;emit → 改發 error 事件(原事件不送達);messageerror 通知 → 以字串重送(不可略過)。worker **不崩潰、不標死**;兜底再失敗即放棄(不遞迴);
  ⑦宿主送出之內容無法結構化複製:呼叫引數 → 回傳 rejected promise(不同步拋錯),且**送出成功才登記 pending**(不殘留,否則日後 terminate 時成宿主未處理 rejection);每次呼叫新建模式因而必接上 finally 而終止該 worker。工廠函數之初始化引數 → **維持同步拋錯**(工廠為同步回傳 API 之既有契約,同 Node `new Worker(…, { workerData: fn })`),拋出前 terminate 已建之 worker。與 ③ 之區隔:③ 為環境造成之建立失敗(CSP、資源),回傳 ev 使呼叫以原始錯誤 reject;⑦ 為呼叫端之引數錯誤,依各 API 之錯誤回報慣例(promise → reject、同步 → throw)。
  另:inner 初始化失敗(工廠函數拋錯等)→ 記錄於 `initFail`,其後呼叫以初始化之原始錯誤回應(同 ③ 之理由,不得為對 null 取值之 TypeError);funNames 之函數可為非 async(以 `await` 取值);呼叫不存在之方法以 `function[x] is not a function in worker` reject(R13);outer 收到非協定訊息(含 worker 內使用者自送之 null)一律略過,不得於宿主拋錯。
- **單一擁有者**:pending 以呼叫 id 登記於 `pendings`(內部協定,不經對外之 ev,R11);正常 settle 只在 `recvMessage` 之 return(`src/rollupWorkerCore.mjs:783-797`),異常清理只在 `rejectPendings`(:632),`emitError`(:641)與 `terminate`(:682)皆經它;致命失敗只經 `emitFatal`(:649);死後呼叫之原因只存於 `errDead`(宣告 :629,於建立失敗 :666、:678 與 terminate :687 設定);呼叫函數之死後檢查 :727(`genCaller` 內);inner 送出只經 `sendMessage`(:175,兜底同處);初始化失敗只存於 `initFail`(:160)。
- **站點全集(終止與送出路徑)與判準**:

| 路徑 | 判準 |
|---|---|
| worker error 事件(nodejs :504;browser :509,另見 R10 主動 terminate) | 已套 |
| 非主動 exit(含 0)(:524) | 已套 |
| 主動 `terminate()` 時有呼叫中之 pending(:682) | 已套(2026-10-13) |
| terminate 後之新呼叫(:727) | 已套(2026-10-13) |
| worker 建立失敗(:666、:678,綁定與 init 在 `if (wk)` 內,:807) | 已套(2026-10-13) |
| messageerror,worker→宿主(nodejs :531、browser :540) | 已套(2026-10-13;browser 原以規範上為 null 之 `e.data` reject,改為固定訊息 `worker messageerror`) |
| messageerror,宿主→worker(worker 端 nodejs :134、browser :144 通知,宿主端 :800 處理) | 已套(2026-10-13) |
| 重複 terminate(wk 已釋放) | 既有行為:emit error `worker has been terminated`,不改 |
| 呼叫引數無法複製(:745-751) | 已套(2026-10-13,⑦) |
| 工廠初始化引數無法複製(:709-715) | 已套(2026-10-13,⑦) |
| 回傳值、reject 值無法複製(call 分支之 sendMessage) | 已套(2026-10-13,⑥) |
| 事件內容無法複製,呼叫路徑內與路徑外(事件轉送之 sendMessage) | 已套(2026-10-13,⑥) |
| 初始化錯誤無法複製(init catch 之 sendMessage) | 已套(2026-10-13,⑥) |
| messageerror 通知無法複製(兜底不略過 :206) | 已套(2026-10-13,⑥) |
| inner 初始化失敗後之呼叫(:273) | 已套(2026-10-13) |
| 非 async 之 funNames 函數(:287) | 已套(2026-10-13) |
| 呼叫不存在之方法(:278-281) | 已套(2026-10-13 run02,R13) |
| worker 內使用者自送非協定訊息(含 null)(:770) | 已套(2026-10-13) |

- **測試**:`test/rollupWorker.test.mjs` 之 function、object、object 持久三組(崩潰、exit、死後呼叫、error 事件、不外溢 uncaught);「生命週期」5 條(持久實體 terminate 時 pending reject 且不發 error;terminate 後呼叫立即 reject 不同步拋錯;建立失敗於三模式皆以原始錯誤 reject、持久匯出不為 null);「訊息反序列化失敗」3 條(宿主端:持久實體 reject＋error 事件＋之後仍可呼叫、function 每次新建 reject;worker 端:持久實體 reject＋之後仍可呼叫);「worker 回傳之內容無法複製」9 條(⑥,工廠:回傳值、reject 值、呼叫路徑外與內 emit、可複製事件基準、非 async、初始化失敗可複製與不可複製;function 每次新建:回傳值);「宿主送出之引數無法複製」4 條(⑦,持久:不同步拋錯＋之後可呼叫＋terminate 無未處理 rejection;function、object 每次新建:該 worker 被終止;工廠初始化:同步拋錯＋worker 被終止);「非協定訊息」1 條;瀏覽器端(vm 模擬)見 R10;`test/rollupParfor.test.mjs`「job 無法結構化複製」1 條(乾淨子程序,宿主可自行退出);呼叫不存在之方法見 R13。

### R4 rollupParfor 之 cb 一律 await

- **規則**:parfor resolve 前所有 cb 已完成;cb 拋錯或 reject 傳染至 parfor;cb 之非同步並行度受 takeLimit 節流;組內依 k 序。
- **站點**:`src/rollupParfor.mjs:154` 模板之 `await cb(pr.r, pr.k)`(已套)。
- **測試**:`test/rollupParfor.test.mjs`「async cb 會被 await」。

### R5 rollupFile 之補全解析採 fallback-first

- **規則**:`bResolveExtPath`(預設 true)之 resolve-ext-subpath 插件,只對「裸套件＋深層子路徑＋無副檔名」引用,且**原樣解析失敗或解析出不存在之實體路徑時**才補 `.js` 重試;原樣解析成功且(external 或檔案存在)即不介入;重試結果須實體存在才採用;`\0` 虛擬模組不介入。
- **理由**:被引用套件 exports 末端萬用對應 `"./*": "./*"` 原樣輸出不補副檔名(echarts-gl → zrender 之 ENOENT);搶答補 `.js` 會劫持條件式 exports(如 `@babel/runtime` 之 import 條件映射 esm 版)。
- **站點**:`src/rollupFile.mjs:284`(已套)。
- **測試**:**無**(已知缺口;2026-08-19 僅以 w-echarts-vue 依賴樹實測)。

### R6 parseVueCode 解析前先正規化換行為 CRLF

- **規則**:先轉 LF 再轉 CRLF,再以 `split('\r\n')` 解析。
- **理由**:repo blob 為 LF、Windows `core.autocrlf=true` 工作區為 CRLF、`.editorconfig` 寫 lf;LF 輸入整份成單行,tmp/data/methods 靜默成空殼且不拋錯。
- **站點**:`src/parseVueCode.mjs:35`(已套)。
- **測試**:**無**(已知缺口;2026-08-18 以 CRLF/LF/混合三種輸入實測逐位元組相同)。

### R7 使用者程式碼以 CommonJS 模組包裝執行,與 inner 雙向隔離;預設匯出取 module.exports

(2026-10-13 run02 改寫;原 R7「clearExportCode:bMinify 不影響產物正確性,找不到一律明確失敗」連同七個比對器一併移除。)

- **規則**:
  ①inner 模板中,使用者程式碼(rollup 之 cjs 輸出)置於 CommonJS 模組包裝函數 `(function (module, exports) { … }).call(exports, module, exports)` 內執行;inner 之名稱(`instance`、`initFail`、`init`、`sendMessage`、`run`、`recvMessage`、`parentPort`)置於另一個兄弟函數作用域。兩者皆不在腳本頂層,互不可見:使用者頂層宣告不與 inner 名稱或 worker 全域(`self`、`postMessage`、`onmessage`、`process`、`console`)共用作用域,使用者程式碼亦看不到、改不到 inner 之名稱(雙向隔離)。
  ②預設匯出取 `module.exports`;rollup 以 `__esModule` 標示預設與具名並存者,取其 `default`;只有具名匯出者為命名空間物件。**不以 opt.name 或文字比對辨識匯出**,故 bMinify、keepFnames、mangleReserved、直接 eval、opt.name 皆不影響正確性;`mangleReserved` 不再加入 opt.name。
  ③腳本開頭 `'use strict'`:inner 與使用者程式碼皆為嚴格模式(同 rollup 一般輸出;原本 inner 之敘述在使用者之 `'use strict'` 之前,該指令失效而整份為非嚴格)。
  ④nodejs 版之 `module` 沿用 eval worker 提供之 Node CommonJS 模組物件(`module.require`、`module.id` 可用;lodash 等以 `module.require('util').types` 取型別判斷,不改走已棄用之 `process.binding`);瀏覽器無 module 才新建 `{ exports: {} }`。
  ⑤nodejs 之 `parentPort` 以 inner 函數之引數傳入(引數由左至右求值,於使用者程式碼之前取得,維持原取得順序),不成為頂層名稱。
- **理由**:原作法(inner 與使用者 bundle 共用 CJS 頂層、以正規式清除匯出敘述後以 `let ${name} = …` 取值)之後果有三類:載入即 SyntaxError(let/const 撞名)、靜默錯值(function 撞名、被當值取用)、**永久懸置**(使用者 `var run = …` 反蓋 inner 收訊函數;瀏覽器端使用者頂層 `function postMessage`、`var self`、opt.name 為 `self` 遮蔽全域)。terser 對 cjs 之 `toplevel:true` **不保證**不撞名:keepFnames、使用者碼含直接 eval、名稱列於 mangleReserved(原含 opt.name)時頂層名稱照樣保留。對標:Node 之模組包裝(`(function (exports, require, module, __filename, __dirname) { … })`)、Vite 之 iife worker、workerize/greenlet 皆以函數作用域隔離使用者程式碼;rollup 之一般輸出皆為嚴格模式。
- **站點**:`addInnerWebWorkerCode`(`src/rollupWorkerCore.mjs:63`):模板 :153–:359(`'use strict'` :153、inner 函數 :157、使用者模組包裝 :348–:359、預設匯出 :357)、nodejs `module` :123–:127、parentPort 引數 :68–:80(皆已套)。三條產製路徑(rollupWorkerCore 直呼、rollupWorker、rollupParfor)皆經此單一擁有者。
- **已知限制**:錯誤堆疊之行號較原始 bundle 位移數行(使用者碼前多 3–5 行,推導);瀏覽器 worker 內 `typeof module`/`typeof exports` 由 undefined 改為 object(環境偵測改走 CommonJS 分支,下游之 lodash 式偵測結果不變,見五)。
- **測試**:`test/unit-workerScope.test.mjs` 之「worker之使用者程式碼與inner雙向隔離」13 條(S01–S16;nodejs 與 vm 模擬瀏覽器 × bMinify/keepFnames/eval/opt.name)、「worker之預設匯出取用與建置期檢查」7 條(S24–S31 與 type object 無匯出)、「worker內之執行環境」中 S17、S18、S21、S22、S23;`test/e2e-workerBrowser.test.mjs`(真 Chromium:S01、S04、S06、S13、S14、S15、S17、S24、S41、iife、es);`test/rollupWorker.test.mjs`「預設匯出取自CommonJS模組之exports: bMinify與name不影響產物正確性」2 條。

### R8 src/parfor.mjs:任何 worker 異常一律整批 fail-fast,不懸置、不遺留

- **規則**:整批完成(finish)前之任何異常——worker error、任何 exit(**含 code 0**)、worker 建立失敗、messageerror、job 無法結構化複製(postMessage 同步拋錯)、cb 拋錯——一律經 `finish(err)` reject 並 terminate 全部已建 worker;建立迴圈每輪先查 settled;settle 後陸續到達之結果略過(不再呼叫 cb)。單 job 失敗(worker 回 `{k, err}`)不在此列,維持記錄後續跑。
- **單一擁有者**:`finish`(`src/parfor.mjs:55`)為唯一之結束與 terminate 點。
- **站點全集與判準**:派工 try(已套)、建立迴圈 try(已套)、message 監聽之 settled 檢查與 cb try(已套)、messageerror `:122`(已套)、exit(已套);宿主送去之 job 於 worker 端反序列化失敗 → **worker 協定第 6 條**(`src/parfor.mjs:20`):entry 綁 `parentPort.on('messageerror', (err) => { throw err })`,拋出成 worker 未捕捉例外,經既有 error 路徑整批 fail-fast(帶原始錯誤),parfor.mjs 不需改碼(2026-10-13,已套於 JSDoc 與測試 fixture)。
- **未實作協定第 6 條之 entry**:遇此情形整批懸置(設計限制,見四之二)。不採「函式庫自帶 bootstrap 代綁」:會改變 worker 之載入方式(argv、錯誤堆疊),且下游零引用 src/parfor.mjs。
- **單 job 失敗之記錄**:以 `console.error` 輸出(`src/parfor.mjs:97`,診斷走 stderr,同 R2)。
- **對稱**:與 rollupWorkerCore 之 R3 ①(非主動 exit 含 0 皆為異常)、rollupParfor 之 R4(cb 錯誤傳染至 parfor)一致;job 之傳輸失敗不論於哪一端偵測(宿主端 postMessage 同步拋錯、宿主端 messageerror、worker 端 messageerror)皆整批 fail-fast,與協定第 5 條一致。
- **測試**:`test/parfor.test.mjs` 之「worker 載入失敗」與 2026-10-13 新增 5 條(中途 exit(0)、cb 拋錯、job 不可複製、第 2 個 worker 建立失敗時已建者被 terminate 且失敗後不再呼叫 cb、job 於 worker 端反序列化失敗依協定第 6 條 fail-fast);fixture `test/fixtures/parfor_worker.mjs` 實作協定第 6 條(`msgerr` job 以計時器發出 messageerror 模擬)。

### R9 產製 API 之錯誤一律往外拋;formatOut × runin 不支援之組合於參數檢查即明確拒絕

- **規則**:①產製 API(rollupFile、rollupCode、rollupWorkerCore、rollupWorker、rollupParfor、rollupFiles、rollupVueToHtml、extractHtml)遇建置或寫檔錯誤一律 reject 原始錯誤,不得 catch 後只印出;內層 API 之錯誤原樣往外拋,不得被吞後於外層出現次生錯誤(如 rollupParfor 找不到暫存產物)。②暫存檔清理放 finally,以 `fs.rmSync(fp, { force: true })` 略過尚未建立者,不印 ENOENT(會被誤認為真因);清理本身之失敗依 R20(一行警告,不印 Error 物件,不覆蓋原始錯誤)。③`formatOut: 'iife'` 只支援 `runin: 'browser'`:rollupWorker、rollupParfor、rollupWorkerCore 對其餘 runin 於參數檢查即 reject `formatOut[iife] only supports runin[browser], but runin is [x]`;rollupWorker 呼叫 rollupWorkerCore、rollupParfor 呼叫 rollupWorker 產製中介產物時,iife 改用 es(iife 無 export,合併層無法 import),其餘格式沿用使其產物不變。
- **理由**:①吞錯使下游產製腳本照常往下(如 w-converhp 先以 rollupWorker 產 worker 再打包 dist),失敗時發布舊產物或缺產物;兄弟 API(rollupFile、rollupCode、rollupWorkerCore)本即 reject,對標 rollup、esbuild 之 build API 亦以 reject 回報。③iife 以全域識別子傳入 external 模組(結尾 `}(worker_threads);`),nodejs 版 outer 引用之 worker_threads 於任何環境皆非全域變數,產物建置成功而載入即 ReferenceError;UMD 以 `global.x` 屬性取值故不受影響。
- **影響範圍**(2026-10-13 審查者盤點 C:\opensrc 自有套件,本人以較窄樣式重算得 121 處/111 套件、套件數相符):呼叫 134 處/111 套件(rollupFiles 113、rollupVueToHtml 13、rollupWorker 8、rollupParfor 0);行為改變者 113 處/92 套件(未 await 之浮動 promise 100 處、未接 catch 之 await 13 處),失敗時由「印出後 exit 0」改為「Node 印出於 stderr 並 exit 1」;自接 `.catch` 之 21 處維持 exit 0。下游 `formatOut: 'iife'` 用法 0 處。
- **下游偵測**:w-pksupdate 之 ectScripts 不看 exit code、只搜合併輸出之 `[RollupError]`(其 `src/ectScripts.mjs:44-58`),改後 Node 印出之 `Error [RollupError]` 仍可命中;非 RollupError 類失敗(字串 reject、fs 錯誤)修前修後該工具皆偵測不到(另案,屬該 repo)。
- **既有行為(文件化)**:rollupFiles 給定 fdTar 時開頭即清空目標資料夾(清空失敗即 reject,見 R18),建置失敗時其內為空或僅有先前檔案之產物;rollupVueToHtml 建置失敗時不寫 html(改後)。
- **站點**:`src/rollupWorker.mjs` 之 core().finally(已套)、`src/rollupParfor.mjs` 之 core().finally(已套)、`src/rollupFiles.mjs` pmSeries(已套)、`src/extractHtml.mjs` 寫檔(已套)、iife 檢查三處(見盤點指令,已套);rollupCode 之輸入暫存檔清理(`src/rollupCode.mjs:138-148`)以 `unlinkSync` 並印出,與 ② 之寫法不一致(未套,見四之一;該檔恆於呼叫前寫入,ENOENT 只在外力刪除時發生)。rollupFile 原有之讀回暫存檔清理已隨 R14(不寫檔)整段移除。
- **測試**:`test/unit-buildError.test.mjs` 11 條(七個產製 API 皆 reject 且錯誤含缺漏模組,rollupWorker/rollupParfor 另斷言不印 ENOENT、不殘留暫存檔、不產出產物;rollupVueToHtml 不寫 html;extractHtml 寫檔失敗 reject;iife × nodejs/both 於三 API 皆 reject);iife × browser 之可用性見 `test/rollupWorker.test.mjs`、`test/rollupParfor.test.mjs` 之 vm 模擬瀏覽器各 1 條與 `test/e2e-workerBrowser.test.mjs` 之 iife 1 條。本檔之缺漏模組以相對路徑引用(rollup 本即錯誤);裸套件名之缺漏原只警告並視為 external,2026-10-16 起亦建置失敗,其測試見 R16(`test/unit-buildCheck.test.mjs`)。

### R10 瀏覽器端 worker 資源於任何終止路徑皆釋放(blob URL 與執行緒)

- **規則**:①worker 以 blob URL 載入,inner(瀏覽器版)開頭即自行 `revokeObjectURL(self.location.href)`(同 Vite 之 inline worker);②outer 保存 `urlBlob`,於 `emitFatal`(載入失敗、建立失敗)與 `terminate()`(含未載入即中止,如引數無法複製而立即中止)時 revoke,重複 revoke 為 no-op;③瀏覽器 worker 內之未捕捉錯誤不會使 worker 結束,onerror 經 emitFatal 標死後須主動 `wk.terminate()`,且**不清空 wk**,使使用者其後之 terminate 照常而不誤發 error 事件。
- **理由**:不 revoke 則 ByInstance 每次呼叫留一個 blob(整份 worker 程式碼),長時運行之頁面隨呼叫次數成長;標死而不 terminate 則底層 worker 繼續執行至頁面卸載。不採「建構後立即 revoke」:Vite 註解指明會壞 WebKit;不採「Blob 每產物只建一份」:revoke 補齊後每次之 Blob 皆可回收,只省配置,屬優化。
- **站點**:inner :87(位於腳本開頭、使用者程式碼之前,使用者頂層宣告不再使其落入 TDZ,R7)、outer `urlBlob` 設定 :424、`revokeUrlBlob` 定義 :433/:441 與呼叫 :656、:691、瀏覽器 onerror :509-516(皆已套)。
- **測試**:`test/rollupWorker.test.mjs`「瀏覽器端」7 條(vm 模擬瀏覽器,`test/tools/browserSim.mjs`):回傳值與 reject 值無法複製不懸置、呼叫路徑外 emit 不標死、正常呼叫由 worker 自行撤銷、引數無法複製時未載入即終止且由頁面撤銷、載入失敗由頁面撤銷且終止、new Worker 同步拋錯由頁面撤銷、執行期未捕捉錯誤時主動終止且其後 terminate 不誤發 error;`test/rollupParfor.test.mjs` iife × browser 1 條(每個 worker 皆終止、URL 皆撤銷)。模擬器限制:非真瀏覽器,worker 內未處理 rejection 在此成為 Node 宿主之 unhandledRejection。

### R11 使用者可控之名稱只作為資料,不成為膠水碼之識別子或語法

(2026-10-13 run02 新增。)

- **規則**:opt.name、funNames、evNames 為使用者可控之字串。產碼模板只把它們當資料使用——以 `JSON.stringify` 插入為字串常值,或作為物件之字串鍵(`ev[funName]`、`ww[funName]`、`instance[data.fun]`);**不得**宣告為具名函數或變數、拼接為識別子(`function ${funName}`、`ev.${funName}`、`let ${name}`),亦不得以引號拼接進字串常值。opt.name 只用於 outer 之 UMD/IIFE 全域名(交 rollup 處理)與產物檔名,不進 inner。內部協定不經對外之 ev:呼叫結果以 id 登記於 `pendings` 由 `recvMessage` settle,內部發送事件用 `emitEv`(於掛載 funNames 前取 `ev.emit.bind(ev)`)。結構上無法共存者——funNames 與回傳物件(eventemitter3 實體)之對外介面同名:原型方法(`emit`、`on`、`once`、`off`、`removeAllListeners` 等)、實例欄位(`_events`、`_eventsCount`)、`terminate`、`__proto__`——於建置期 reject;保留名由 eventemitter3 之原型與實例推導(`funNamesReserved`),不手寫清單。
- **理由**:原 outer 以 `function ${funName}(){}` 宣告轉送函數並 `ev.${funName} = ${funName}`,funNames 含 `init` 宿主行程 exit 1(worker 未初始化,轉送之 promise 成宿主未處理 rejection)、含 `terminate` 每次新建之 worker 永不終止而宿主無法退出、含 `emit` 回傳路徑改為再送呼叫而無限往返(懸置且耗 CPU);evName 含 `'` 使 inner 執行期 SyntaxError;opt.name 進 inner 之 `let ${name}` 遮蔽 `self`(懸置)或含 `-` 即語法錯誤。以結構消除整類撞名(名稱只作資料),優於維護 outer 內部名稱之保留清單(主控裁決 2026-10-13);只有對外介面這類「結構上避不掉」者才於建置期 reject。
- **站點全集與判準**:

| 站點 | 判準 |
|---|---|
| inner 事件轉送 `genInnerWebWorkerCodeEv`(:28–:50,evName 以 JSON 插入) | 已套 |
| inner 呼叫分派(`instance[data.fun]`,:278) | 已套(字串鍵) |
| outer `cfns`(:411,funNames 以 JSON 陣列插入) | 已套 |
| outer object ByInstance 之轉送(:479–:490,`ww[funName]`) | 已套 |
| outer wrapWorker 之 `genCaller`(:720)與掛載(:824–:827)、`emitEv`(:624)、`pendings` 依 id settle(:783–:797) | 已套 |
| funNames 之型別與保留名檢查(:921–:930;function ByInstance 不掛 funNames 故不檢查) | 已套 |
| opt.name:inner 不再使用;outer 經 rollupCode 之 `name` 交 rollup | 已套 |
| rollupWorker 合併層、rollupParfor 外層之模板插值 | 不適用:只插入內部產生之暫存路徑與 runin(盤點指令 R11 輸出為證) |

- **測試**:`test/unit-workerScope.test.mjs` 之「worker選項」:S43、S46(funNames 含 init、recvMessage、genPm、rejectPendings 與非識別子 `my-fn` 皆可呼叫,宿主不崩潰、子程序自行結束)、S44、S45(emit、once、terminate、`__proto__`、工廠模式之 on 於建置期 reject 且不產出)、非字串 funNames reject、S49(evName 含引號照常轉送)、S41、S42(opt.name 為 `self`、含 `-`);`test/e2e-workerBrowser.test.mjs` 之 S41、S43、S49。

### R12 建置期檢查:不產出執行期才以誤導訊息失敗之產物

(2026-10-13 run02 新增。)

- **規則**:rollupWorkerCore 於產出前檢查,不通過即 reject 且不寫產物:①funNames(function ByInstance 以外)各為非空字串且非保留名(R11);②evNames 只支援 type function 且 `execFunctionByInstance:false`(工廠,由工廠回傳物件之 `on` 轉送),其餘模式給予即 reject(type object 不新增轉送能力,JSDoc 載明),各 evName 須為非空字串;③匯出:type function 須有預設匯出,type object 須有預設或具名匯出,判定依 rollup 之 `chunk.exports`(非文字比對);chunk 資訊由內部函數 `rollupFileCore` 交出,**不經公開 opt**(原型之 `cbOutput` 會經 rollupCode 之 opt 轉交而外漏,不採);④inner(以 base64 內嵌、不經 rollup 解析)以 `new vm.Script(inner)` 只編譯不執行,語法錯誤即 reject。
- **理由**:同 R9 之精神(產製錯誤於建置期回報)。修前之對應格:evNames 用於 function ByInstance 每次呼叫 reject `r.on is not a function`;type object 之 evNames 靜默無效;缺預設匯出者採包裝後會建置成功而呼叫時才 `fun is not a function`;evName 含引號或 opt.name 含 `-` 建置成功而執行期 SyntaxError。
- **站點**:`src/rollupWorkerCore.mjs` 之參數檢查 :921–:948、匯出檢查 :1108–:1115、語法檢查 :1121–:1127;`src/rollupFile.mjs` 之 `rollupFileCore`(回傳 `{ bReturnCode, code, exports }`,`export { rollupFileCore }`)(皆已套)。
- **測試**:`test/unit-workerScope.test.mjs`:S26、S27(type function 只有具名、無匯出 → reject 且訊息含 `default export`、不產出)、type object 無任何匯出(reject 且訊息含 `has no export`、不產出;修前亦 reject,但訊息為誤導之 `can not clear export default of name[…]`)、S25(type object 只有具名 → 可用)、S44、S45、非字串 funNames、S47、S48(evNames 於 function ByInstance、type object → reject 且不產出)。語法檢查之觸發格(evName、opt.name)已由 R11 之結構修法消除,現行無可觸發之輸入,屬守門;以 S49、S42 證其不誤擋。

### R13 方法呼叫之 this 與呼叫不存在之方法

(2026-10-13 run02 新增。)

- **規則**:inner 以 `Reflect.apply(fun, thisArg, input)` 呼叫:type object 之方法、工廠回傳物件(含 class 實例)之方法以所屬物件為 this(同 `obj.method()`);type function 且 `execFunctionByInstance:true` 時 instance 為合成之 `{ main }`,this 為 `undefined`(同直接呼叫使用者函數)。呼叫前檢查 `typeof fun === 'function'`,否則以 `function[x] is not a function in worker` reject。
- **理由**:原以 `fun(...input)` 呼叫(sloppy 下 this 為全域物件):物件方法用 this 靜默回錯值、工廠回傳 class 實例(class 本體恆嚴格)一律 TypeError;不存在之方法得誤導之 TypeError。對標 comlink 之 `apply(parent)` 以所屬物件為 this。
- **站點**:`cthis` :116–:121、檢查 :277–:281、呼叫 :287(唯一呼叫點,已套)。
- **測試**:`test/unit-workerScope.test.mjs`:S19(物件方法 this,nodejs 與 vm)、S20(工廠回傳 class 實例)、S52(function ByInstance 之 this 為 undefined)、S53(不存在之方法具名 reject);`test/e2e-workerBrowser.test.mjs` 之 S19、S20。

### R14 rollupFile 回傳程式碼模式對 cwd 零寫入;產製路徑不可用即 reject,不靜默改道

(2026-10-13 run02 新增。)

- **規則**:①模式只依參數判定:給了 fdTar(非空字串)即寫檔模式,資料夾不存在則建立,為檔案或無法建立即 reject(訊息含 `opt.fdTar`);未給才為回傳程式碼模式。②回傳程式碼模式以 `bundle.generate()` 於記憶體產出,**不寫任何檔案**(成功與失敗皆然),不產生 sourcemap(無檔可指;bSourcemap 之任何值皆不產),回傳碼與寫檔模式(bSourcemap false)之檔案內容逐位元組相同。③generate 產出多於 1 項(外掛 emitFile 之 asset、sourcemap 資產)即 reject,不靜默丟失。④未給 fpSrc 時,fdSrc 給定即須為既存資料夾,否則 reject(訊息含 `opt.fdSrc`),不改用 `'./'`;未給才為 `'./'`。⑤內部呼叫須能回傳程式碼者明給 `fdTar: ''`(rollupCode、rollupParfor 之最終 rollupFile;rollupParfor 展開之 opt 若帶 fdTar,原會寫檔並把字串 `'finish'` 寫入產物);rollupWorkerCore 之 rpOpt 不展開 opt,未給 fdTar 即回傳模式。
- **理由**:原回傳模式以 `bundle.write` 寫 `./temp-<id>` 再讀回,bSourcemap 預設 true 時遺留 `temp-<id>.map`,回傳碼末行指向已刪之暫存檔;行程中止於寫後讀前則主檔亦遺留;cwd 唯讀即失敗;給了 fdTar 而不可用時靜默改走回傳模式(呼叫端以為已寫檔,等同吞錯,全庫連動時會帶舊產物發布)。對標:rollup `generate`、esbuild `write:false` 皆於記憶體產出。
- **站點**:`src/rollupFile.mjs`:fdTar :76–:90、fdSrc :95–:111、sourcemap :408、generate 與守門 :418–:431、write :433–:438;`rollupFile`(公開)與 `rollupFileCore`(內部,R12)之分工 :48–:62;`src/rollupCode.mjs:116`、`src/rollupParfor.mjs:296`(明給 `fdTar: ''`);`src/rollupFiles.mjs`(逐檔呼叫 rollupFile,未給 fdTar 即回傳模式)(皆已套)。
- **殘餘(設計事實,見四之二)**:rollupCode 仍把輸入寫成 cwd 暫存檔(`./temp-<id>-<name>.js`,供合併碼之相對路徑解析,finally 刪除);rollupFile 恆讀 cwd 之 `package.json`(banner 用)。
- **測試**:`test/unit-rollupFileReturnCode.test.mjs`「rollupFile回傳程式碼模式」11 條(format es/umd/iife/cjs × bSourcemap 未給/false/true/'inline':cwd 不新增、無指向檔案之 sourceMappingURL、與寫檔模式逐位元組相同;同 cwd 並發 3 個;.vue;bMinify false＋css;建置失敗;format 不支援;rollupFiles 未給 fdTar;rollupWorkerCore bReturnCode),「產製路徑不可用即reject」中 fdTar 為檔案、fdTar 上層為檔案、fdSrc 非資料夾、rollupParfor 帶 fdTar 4 條。每案於 `test/_tmp/rollupFileReturnCode/<案>/` 之隔離 cwd 以乾淨子程序執行(cwd 之副作用不可在 mocha 行程內量測)。③之守門於現行外掛組合不可達(回傳模式 sourcemap 恆 false、postcss 為注入、`inlineDynamicImports:true`),無測試;觸發條件以探測證之(rollup 3.30.0:sourcemap true 時 generate 產出 chunk＋`.map` asset,外掛 emitFile 時產出 chunk＋asset)。

### R15 targets 依值生效、預設產物不變;rollupCode 不改寫呼叫端之 opt

(2026-10-13 run02 新增。)

- **規則**:①rollupCode:`targets` 為 `'new'` 或 `'old'` 即依值,其餘為 `'old'`。②rollupWorkerCore:給 `'new'`/`'old'` 時 inner(使用者程式碼)與 outer 皆依值;未給時 inner `'new'`、outer `'old'`(與修前產物逐位元組相同)。③rollupWorker:給值時合併層亦依值,未給為 `'old'`;各層之 rollupWorkerCore 呼叫照傳 opt.targets。④rollupCode 以 `{ ...opt, … }` 另建物件交 rollupFile,不改寫呼叫端之 opt。
- **理由**:原以 `w.isbol` 檢查字串,給值恆被重設(rollupWorker、rollupWorkerCore 恆 `'new'`,rollupCode 恆 `'old'`,故 outer 恆以 `'old'` 轉譯)——有參數卻無效屬半吊子(全域 §2.1 第 6 條)。下游盤點無人傳 targets(只有 w-json-stream、w-cluster 之註解行 `// target: 'old'`),故修為依值生效而預設不變。
- **站點**:`src/rollupCode.mjs:46-50`、`:113-134`;`src/rollupWorkerCore.mjs:992-1000`、`:1075`、`:1138`;`src/rollupWorker.mjs:141-146` 與合併之 rollupCode 呼叫(皆已套)。
- **測試**:`test/unit-rollupFileReturnCode.test.mjs`「rollupCode不改寫呼叫端之opt」1 條。預設產物不變以發布前閘門證之(2026-10-13 run02:下游 10 處以定稿與「targets 正規化回復修前」之變體各產一次,7 處逐位元組相同,3 處未壓縮產物只差 rollupCode 輸入暫存檔名衍生之隨機變數名,正規化後相同);給值生效之產物差異無自動測試(下游無人傳,已知缺口)。

### R16 引用類:產物仍引用之無法解析裸引用一律建置失敗(Node 內建模組除外);commonjs 動態 require 樁之未受守衛呼叫即失敗;瀏覽器 worker 之 inner 不得引用外部模組

(2026-10-16 run02 新增;主控裁示 Q1=U4、Q2=U8、Q7;外審 opus/sol/muse 修正後定稿。)

- **規則**:①`rollupFileCore` 以 `onwarn`(log 掛鉤只此一個;2026-10-16 訂此規則時因下游實裝之 rollup 最舊為 3.20.2 而不用 onLog,2026-11-11 pt395 起本套件依 `rollup ^4.67.4`,onLog 雖可用仍不並用)記錄 rollup 之 `UNRESOLVED_IMPORT`(照常輸出警告),由檢查外掛 `genBuildCheck` 於 `renderChunk` 依**產物**判定:來源仍在 `chunk.imports`/`chunk.dynamicImports`(被 tree-shaking 移除者不擋,如 sideEffects:false 套件未被使用之子模組)且非 Node 內建模組即 `this.error`(pluginCode `UNRESOLVED_IMPORT`,訊息附 `opt.external` 之全名/RegExp 指引);只以動態 `import()` 引用且各處皆受守衛(同一函數內之 try 區塊、`.catch`、`.then` 第二參數)者為選用相依,只警告(`WPT_UNRESOLVED_OPTIONAL`)。Node 內建模組之判定:執行建置之 Node 之 `module.isBuiltin`(含 `node:` 前綴與 `stream/promises` 等子路徑;**不可**以 `node:` 前綴一律視為內建:不存在之 `node:xxx` 會被放行而產物載入即 `No such built-in module`)。確為執行期由使用端提供之模組以既有之 `opt.external` 明列(external 先於解析,不發警告),不新增選項。②**產物不可能取得內建模組者不豁免**:format 為 iife(external 以全域識別子傳入),或 runin browser 且 bNodePolyfill(polyfill 未涵蓋者成為瀏覽器內之 require)時,產物之外部引用中有未明列於 external 之內建模組即 `this.error`(`WPT_BUILTIN_UNAVAILABLE`)。③commonjs 動態 require 樁:@rollup/plugin-commonjs 把 `require(非字面值)` 與非呼叫之 `require` 參照換成引用 `\0commonjs-dynamic-modules` 之 `commonjsRequire`(呼叫即拋 `Could not dynamically require`);該模組在產物內時,引用它之模組有未受守衛之呼叫或非呼叫之參照(`typeof` 不計)即 `this.error`(`WPT_DYNAMIC_REQUIRE`,列出模組);只在 try 區塊內呼叫者只警告(`WPT_DYNAMIC_REQUIRE_GUARDED`,catch 必走)。④rollupWorkerCore 以 `rollupFileCore(rpOpt, { workerInner: runin })`(第二參數,不經公開 opt)建 inner;runin browser 之 inner 有任何外部引用(含內建模組與列於 external 者)或未受守衛之 free `require`(ESM 原始碼直寫者不經 commonjs 而原樣保留;排除 `typeof require`、以 `typeof require` 為條件之分支與 try 區塊內者)即 `this.error`(`WPT_WORKER_EXTERNAL`)。
- **理由**:rollup 對裸引用解析失敗只警告並當 external(rollup.js:26041-26057),建置 exit 0 而產物載入即 `Cannot find module`(瀏覽器 worker 內為 `require is not defined`);w-pksupdate 以離開碼與 `[RollupError]` 判定,看不到警告。以 `this.error` 拋出者為 RollupError,呼叫端自接 catch 印出時輸出仍含 `[RollupError]`。對標:vite 7 對 UNRESOLVED_IMPORT 一律 throw(僅 `?commonjs-external` 例外),esbuild 與 webpack 對**未受守衛**者為錯誤、對 try 內之選用相依放行或降為警告(vite 8 亦放行);本規則與後者一致。內建模組豁免:全庫 23 套件以預設 runin browser 建置 Node 用之 umd,不豁免即全數誤傷(run01 全庫實跑)。commonjs 動態 require 樁:建置無任何警告而執行期必拋,全庫 w-orm-reladb、w-orm-mdb 之 dist 因此壞(`src/requireModel.js:2`)。
- **站點**:`src/buildCheck.mjs`(`isNodeBuiltin`、`isListedExternal`、`genBuildCheck`、`getDynImportSites`、`getStubRefs`、`findFreeRequires`);`src/rollupFile.mjs`(`onwarn`、外掛置於 terser 之前、`rollupFileCore` 之第二參數);`src/rollupWorkerCore.mjs`(`workerInner`)(皆已套)。全部建置入口經 `rollupFileCore`,一處生效。
- **已知限制**:`opt.external` 以全名比對(陣列元素可為 RegExp),列套件名不涵蓋其深層子路徑;rollupFile 只接受陣列之 external(函數被忽略,下游現無);非字面值之動態 `import(變數)` 不經解析,建置不擋(執行期相對產物位置解析);commonjs 於 try 內之字面 `require('x')` 預設保留原生(`ignoreTryCatch`),不經解析;bNodePolyfill 把 `fs` 等映射為空殼,呼叫其成員仍壞(屬 polyfill 之設計);內建模組之判定依執行建置之 Node 版本(`module.isBuiltin` 需 Node ≥18.6);受守衛之判定以同一函數內之語法位置為準,不追跨函數之控制流;runin browser 之一般產物(非 worker、未開 bNodePolyfill)引用內建模組照常建置(Node 用之 umd 合法,瀏覽器用途屬呼叫端以 runin、external、bNodePolyfill 設定之責任)。
- **測試**:`test/unit-buildCheck.test.mjs` 之「引用類」10 條。

### R17 import.meta 類:非 es 格式之 url 以外屬性未受守衛即失敗;墊片被劫持即失敗;worker inner 不得使用 import.meta.url

(2026-10-16 run02 新增;主控裁示 Q3=T1、Q4;外審修正後定稿。)

(2026-11-11 任務20261111182635 pt395:rollup 3.30.0 → 4.67.4,②之判定程式不變——原即依輸出之實際綁定;理由、已知限制與測試改寫,見下。)

- **規則**:檢查外掛 `genBuildCheck`(置於 terser 之前)以 rollup 之 `resolveImportMeta` 掛鉤記錄**存活**之 import.meta 取用——rollup 只對 tree-shaking 後存活者呼叫此掛鉤(帶屬性名;裸用或非常值計算屬性為 null),掛鉤回 null 交還 rollup 之預設墊片,故死碼內之取用不誤擋。①format 非 es、非 system(兩者原樣保留 import.meta)時:存活之 url 以外屬性 P,若同模組內 P 無任何受守衛之取用(`typeof`、if／三元／while 之條件、`&&`／`||`／`??` 之左運算元、相等比較、其後為可選鏈 `?.`)即 `this.error`(`WPT_IMPORT_META_PROP`)——涵蓋 `dirname`、`filename`、`resolve`、`main` 與未受守衛之 `env.X`、`glob()`、`hot` 等;對 import.meta 成員之寫入(賦值、遞增減、delete)一律錯誤;存活之裸用依 AST 分類:只判斷存在與解構只取 `url` 者照常,解構取出其他屬性、rest、別名或非常值計算屬性即錯誤。②format 為 umd 或 cjs 且產物用到 url 時,以 acorn 解析輸出、eslint-scope 7 分析作用域(`fallback:'iteration'`、`ignoreEval:true`),墊片範圍(以 `pathToFileURL(__filename)` 之呼叫為錨點,其外 `.href` 再外之條件運算式)內之 `__filename`(umd 另 `location`)解析到產物內任何宣告即 `this.error`(`WPT_IMPORT_META_SHIM`,訊息含宣告種類與輸出行號)——**依輸出之實際綁定判定,不依原始碼之宣告**:rollup 已改名避讓者(輸出為 `__filename$1` 等)不擋,仍在墊片作用域鏈上者擋;產物用到 url 卻找不到墊片即 `this.error`(`WPT_IMPORT_META_SHIM_UNKNOWN`,fail-closed,rollup 改版時不靜默略過);分析器拋錯轉為 `WPT_CHECK_PARSE`。③`workerInner` 時存活之 url(含經別名、解構取得者)即 `this.error`(`WPT_WORKER_IMPORT_META`);只判斷存在之守衛(如 `import.meta.hot ? 1 : 7`)照常。
- **理由**:rollup 對非 es 格式只模擬 `url`,其他屬性一律換成 `'undefined'`(rollup 3.30.0 之 rollup.js:13368-13375);umd 之墊片引用 `__filename` 與 `location`,同名宣告在墊片之作用域鏈上即綁到該宣告:載入 TDZ、TypeError 或**靜默錯值**(以 cwd 組成之路徑)。**避讓之範圍依 rollup 版本**(2026-11-11 pt395 兩版對照:32 種形態 × umd/cjs,不加檢查建置並載入產物判定是否劫持,與檢查之判定逐格比對,兩版各 64 格全一致):rollup 3.30.0 之 umd 不避讓(`accessedMetaUrlGlobals`,rollup.js:13350-13357),cjs 只在頂層保留 `__filename/__dirname`(rollup.js:18050-18051);**rollup 4.67.4 之 umd 亦把模組頂層之 `__filename` 宣告改名(`__filename$1`,含 let/const/var/function/class/export/逗號/解構/import 綁定與跨模組)而不再劫持,但 umd 頂層之 `location` 不改名(仍劫持)**;兩版皆不改名者:函數參數、函數內區域宣告、catch 參數、頂層區塊/if 區塊/for 迴圈內之宣告、箭頭函數與方法之參數(umd 之 `location` 參數亦然)——皆仍劫持。`require` 為墊片所用之全域,兩版皆改名避讓(頂層與函數參數)。被打包之 commonjs 相依之頂層 `var __filename`:rollup 3＋commonjs 24 於 umd 劫持;rollup 4＋commonjs 29(`strictRequires` 預設 `true`,模組包於函數內)不在墊片之作用域鏈上,不劫持。worker inner 以 eval(nodejs:`__filename` 為 `[worker eval]`)或 blob(browser:無 require)執行,無模組位置。以存活之取用與輸出端作用域為準:涵蓋各宣告形式、跨模組、函數內遮蔽,且不誤擋被 tree-shaking 移除者與受守衛者。對標:esbuild 對非 ESM 輸出之 import.meta 每處警告並換空物件;webpack 未知屬性換 undefined、`import.meta.filename` 亦會被使用者 `__filename` 靜默遮蔽(bench 2b)。
- **站點**:`src/buildCheck.mjs`(`genBuildCheck`、`getMetaUses`、`isTestContext`、`findShimRanges`、`analyzeScope`);`src/rollupFile.mjs`;`src/rollupWorkerCore.mjs`(皆已套)。相依:`acorn`、`eslint-scope`(直接相依;**頂層須為 7.x**:5.1.1 不認得 class static block 而誤判劫持)。
- **已知限制**:受守衛之判定以模組為單位(同模組有一處受守衛之 P,其他 P 之取用亦放行);同名宣告之值與墊片相同者(如 `const location = globalThis.location`)亦擋(保守);`import.meta.url` 於 umd/cjs 為產物檔之 URL、於 iife 依 `document.currentScript`(見四之二);墊片範圍以 `pathToFileURL(__filename)` 為錨點(rollup 3.30.0 與 4.67.4 相同;找不到即 `WPT_IMPORT_META_SHIM_UNKNOWN`),升級 rollup 須重做兩版對照(作法見 `sgud/exp/experience.md` 二十五)——rollup 改變避讓範圍時,下列「頂層 `__filename` 照常」「頂層 `location` reject」兩條測試即轉紅守門。
- **測試**:`test/unit-buildCheck.test.mjs` 之「import.meta 類」12 條(2026-11-11 pt395 起;原 9 條):umd 頂層 9 種 `__filename` 宣告形式 × bMinify 照常建置且產物取得**產物檔之完整路徑**(外審 F6 後由 dirname 改為完整路徑)、宣告保留其值、具名匯出 `__filename` 亦為產物檔路徑;umd 頂層 `location` 6 種(let × bMinify、const、function、class、import 綁定、跨模組)reject,同 6 種 × cjs 照常且得正確值;跨模組 3 種照常且兩模組各得其值;頂層區塊、for 迴圈、箭頭函數參數 × umd/cjs reject,函數參數 `location` umd reject、cjs 照常;**genBuildCheck 直接對照**(同一輸入僅以前置外掛改寫輸出之宣告名:頂層 `__filename$<n>` 改回 `__filename` 即 reject——並先斷言輸出確有改名之宣告、函數內宣告改名即照常——證判定依輸出之綁定);函數參數、區域、條件區塊內提升之 `var`、catch 參數 × umd/cjs reject;對照 8 格＋被打包之 commonjs 相依之頂層 `var __filename` × umd/cjs 照常;非 url 屬性、守衛、只判斷存在、worker inner 4 條不變。對修前(rollup 3.30.0 之副本)跑新測試:19 綠 4 紅(紅者皆為 rollup 3 確實劫持而檢查正確擋下之格:頂層、跨模組、genBuildCheck 之未改寫輸出、commonjs 相依 umd);對 rollup 4 跑修前測試:2 紅(頂層、跨模組由 reject 變 resolve)。

### R18 清空資料夾失敗即錯誤

(2026-10-16 run02 新增;主控裁示 Q5=K1、Q6;外審修正後定稿。)

- **規則**:①`cleanFolder` 改經 `cleanFolderStrict`:先拒絕非字串或空字串、根目錄、cwd 與其上層(由錯誤之路徑算出 `'/'` 時不得清空整個磁碟;rollupVueToHtml 之 tar 無資料夾部分即得 `'/'`)、目標本身為連結(符號連結、junction);再以 `w.fsCleanFolder` 清空,回傳非 success 或直接拋出即依錯誤碼處置:EBUSY、EPERM(Windows 下被占用之資料夾)、ENOTEMPTY、ENOENT(並發清空同一資料夾時項目已被他方刪除)以 Atomics.wait 同步重試 10 次、間隔 300ms(共 11 次嘗試、最長約 3 秒;最後一次失敗後不再等待),其他錯誤不重試;最終拋 R19 ④ 格式之 `can not clean folder[<絕對路徑>]: code[<code>] syscall[<syscall>] attempts[<次數>]`(2026-10-17 起不再引用 Node 之 `last.message`;`code` 為 `WPT_CLEAN_FOLDER`,`cause` 為原錯誤);成功回傳 `{ success }`(同前)。②`rollupFiles` 只在給定 fdTar(非空字串)時以同一函數清空,失敗即 reject 且不建置;未給 fdTar(回傳程式碼模式)不清空。③內附 `src/wsemip.umd.js` 為 wsemi **1.9.18** 之 toolfp 版(2026-10-17 任務20261017051850 run01 自 1.9.17 換入,三檔逐位元組同 wsemi repo 之 `toolfp/dist`、`toolparfor/dist` 與 npm 發布之 wsemi@1.9.18,對本套件無可觀察差異,見〈wsemip 站點全集與判準〉末段;其前 2026-10-16 任務20261016181137 run01 自 1.9.16 換入 1.9.17;fsCleanFolder 失敗一律回傳 `{ error }`——1.9.17 起清空前之檢查亦然,不再同步拋出,且 `error` 恆 truthy:真 Error 與非空字串原樣、其餘轉字串;以 lstatSync 判型別故懸空連結不中斷)。`cleanFolderStrict` 對「回傳 `{ error }`」與「直接拋出」兩種形狀同判,故 1.9.16 與 1.9.17 皆適用;該 catch 分支於 1.9.17 起實際不可達(真 fs 下),刻意保留(防禦,由 `unit-wsemipContract` 以假 `w` 守;`src/buildCheck.mjs:576` 註解已寫明兩版形狀)。內附 `src/wpf.umd.js`、`src/wpf_pmSeries.umd.js`(rollupParfor 產物內嵌之 parfor 執行期,**非 wsemip**,來源 wsemi `toolparfor/dist`)納入同一版本更新規則,2026-10-16 任務20261016181137 run02 同步為 1.9.17(原 1.8.42),2026-10-17 任務20261017051850 run01 同步為 1.9.18,見〈wpf 內嵌 bundle 站點全集與判準〉。
- **理由**:原 cleanFolder 原樣回傳、rollupFiles 丟棄結果,清空失敗(子資料夾被占用、目標為檔案)時建置照常、舊檔殘留而隨 dist 發布;全庫 116 支 `toolg/cleanFolder.mjs` 皆裸呼叫不看回傳,改為拋錯即全部自動生效(離開碼 1)。Node v24.19.0 之 `fs.rmSync` 之 `maxRetries` 於 Windows 對被占用資料夾(EPERM)不重試(實測 0ms 即拋),故自寫迴圈。對標 vite(emptyOutDir 拋錯、無重試)、webpack(output.clean 失敗即 fatal)、fs-extra(拋錯)。
- **站點**:`src/buildCheck.mjs`(`cleanFolderStrict`)、`src/cleanFolder.mjs`、`src/rollupFiles.mjs`、`src/wsemip.umd.js`(皆已套);內嵌 bundle 之版本更新規則另含 `src/wpf.umd.js`、`src/wpf_pmSeries.umd.js` 與其使用處 `src/rollupParfor.mjs` 之 `genParforCode`/`genParforCoreCode` 模板(已套 1.9.17)。
- **已知限制**:清空失敗時已刪之項目不還原(同 vite、webpack);rollupFiles 之清空錯誤非 RollupError,呼叫端自接 catch 印出者 exit 0 且無 `[RollupError]` 字樣(w-pksupdate 偵測缺口,主控另案);同步等待期間本行程之事件迴圈被阻塞(cleanFolder 為同步 API);同一輸出資料夾之並發建置(兩支建置同時清空並寫入)不支援(後清空者會刪掉先建置者之產物);EACCES 等權限錯誤不重試。
- **測試**:`test/unit-cleanFolder.test.mjs` 8 條(被占用者只在 Windows 實跑);runin 訊息見 `test/unit-buildCheck.test.mjs` 末 1 條;內附 wsemip 之契約見 `test/unit-wsemipContract.test.mjs` 17 條(假 `w` 驗 cleanFolderStrict 對兩種錯誤形狀之同判:暫時性重試/耗盡/不重試/字串錯誤 7 條;真 bundle 之 fsCleanFolder 4 條、fsCreateFolder 3 條、getFiles 1 條、pmSeries 與 isestr 2 條。其中「前置檢查(lstat)失敗不同步拋出」2 條於 1.9.16 之 bundle 紅、1.9.17 綠,為版本差異之判別證據;變異 4/4 被殺);內嵌 wpf 之契約見 `test/unit-wpfContract.test.mjs` 6 條(對新舊 wpf 皆綠之版本中立契約,變異 5/5 被殺)。

#### wsemip 站點全集與判準(2026-10-16 任務20261016181137 run01 審計:內附 1.9.16 → 1.9.17;盤點指令見頂部表)

站點 109(15 檔、19 個函數;`file:line` 以頂部 `git grep` 輸出為準;2026-10-17 因 R19 站點 29 增為 111,新增者為 `rollupFiles.mjs` 之 `isarr`、`isobj` 各 1,屬純函數,1.9.18 差異探測 3059 格 0 差異)。1.9.17 對本套件所用函數之變更只有兩類:①`fsCleanFolder`/`fsCreateFolder` 之前置檢查失敗由同步拋出改回傳 `{ error }`、`error` 恆 truthy;②A-lite 包裝物件判定(`isestr(new String(''))` 由 true 改 false)。其餘(isbol 之 JSDoc、fsGetFilesInFolder 之 JSDoc、pmSeries 之 isfun 外提)無可觀察差異。

| 函數(站點數) | 站點 | 1.9.17 變更 | 判準 |
|---|---|---|---|
| fsCleanFolder(5) | `src/buildCheck.mjs:600`(cleanFolderStrict,呼叫端 `cleanFolder.mjs:17`、`rollupFiles.mjs`;原 :573,行號隨 2026-10-17 改動位移);`gRollupCode.mjs:10`、`gRollupFile.mjs:8`、`gRollupParfor.mjs:10`、`gRollupWorker.mjs:15` | 前置檢查失敗 拋出→`{ error }`;error 恆 truthy | **不受影響**:cleanFolderStrict 兩形狀同判(注入 EBUSY/EPERM/ENOENT/EACCES/EIO × once/always × 2 目標共 20 格,新舊逐格相同);gRollup* 不取回傳值(範例/產製腳本,僅注入式前置失敗由崩潰改為續行,刻意不套) |
| fsCreateFolder(2) | `src/rollupFile.mjs:89`、`src/rollupVueToHtml.mjs:84` | 同上 | **不受影響**:兩處皆不取回傳值,失敗由其後之判定處理(rollupFile:91 之 fsIsFolder 檢查與 R14 reject;rollupVueToHtml 由其後 rollupFiles 之 cleanFolderStrict)。僅「前置 lstat 失敗」之競態下訊息由原始錯誤變為 `invalid opt.fdTar`,真 fs 近乎不可達 |
| fsGetFilesInFolder(1) | `src/getFiles.mjs:9` | 只改 JSDoc | 不受影響 |
| pmSeries(1) | `src/rollupFiles.mjs:45` | isfun 外提至迴圈外 | 不受影響(依序、reject 即停、reject 原值,探測 13 格 0 差異) |
| isestr(19) | `extractHtml.mjs:51,116,121`、`rollupCode.mjs:32`、`rollupFile.mjs:87,105,110,154,178`、`rollupFiles.mjs:34`、`rollupParfor.mjs:210,222,228`、`rollupWorker.mjs:102,117`、`rollupWorkerCore.mjs:888,924,945,968` | 僅 `new String('')` 由 true 改 false | 不受影響:下游 119 個 toolg 目錄之建置腳本 0 處 `new String/Number/Boolean(` |
| isbol(22)、isarr(10;2026-10-17 增 `rollupFiles.mjs` 1 處)、isearr(6)、isobj(5;同增 1 處)、fsIsFile(4)、fsIsFolder(3)、genID(4)、getFileName(11)、getFileTrueName(1)、getPathParent(1)、strright(6)、strdelright(5)、strleft(4)、strdelleft(1) | 見頂部取用總數 | 無碼變更(isbol 只改 JSDoc) | 不受影響(差異探測:純函數 3059 格僅包裝物件之 24 格不同,其中本套件只用 isestr) |

**1.9.17 → 1.9.18(2026-10-17 任務20261017051850 run01 審計;站點全集同上表,盤點指令輸出 110/10 行不變)**:wsemi 1.9.18 改 pmChain/pmMap/pmSeries(容器於進入時取值、讀取拋錯一律 reject,wsemi R-PM-SETTLE-01 規則 17)與以 lodash 陣列樣函數迭代使用端物件者(clearXSS 等,wsemi R-OBJ-ITER-01)。差異探測(`tmp/t55/p4/probe.mjs`,沿用 2026-10-16 之作法:舊＝HEAD 之 1.9.17、新＝1.9.18,同一組輸入):純函數 3059 格、fs 127 格(結果與案後目錄樹)、cleanFolderStrict 22 格、注入失敗(`fs.lstatSync` 拋 EBUSY/EACCES 等)60 格,**0 差異**;pm 32 格(原 13＋新增 19:`fns` 為帶 `length` 鍵之物件、類陣列物件、`Symbol.toStringTag` 偽稱陣列、元素 getter 拋錯、已撤銷 Proxy、稀疏陣列、陣列子類、凍結陣列、迴圈中改動陣列、thenable 回傳、reject 字串/undefined、同步拋字串等)6 格有差——皆為 `fns` 傳入物件容器之誤用輸入(舊:依 `length` 索引迭代或同步拋 TypeError;新:依自有鍵迭代或 reject);pmSeries 之 reject 原值、依序、reject 即停等 13 格與 1.9.17 逐格相同。站點 `src/rollupFiles.mjs:45` 之 `fns` 契約為 `String|Array`,`_.isString` 先轉陣列;下游呼叫 rollupFiles 之 121 個檔案(`C:\opensrc` 排除 node_modules/dist/docs/tmp):`fns` 為字串字面 86、陣列字面 13、`getFiles(fdSrc)`(回傳陣列)18、`fns.filter(…)` 3、經設定模組傳入之字串 4(w-gis、w-ui-loginout),傳物件 0 處。**不受影響**。守門:`test/unit-wsemipContract.test.mjs` 18 條對 1.9.17、1.9.18 皆綠;本次不新增版本判別格(本套件未依賴 1.9.18 之新語意)。三檔逐位元組同 wsemi repo 之 `toolfp/dist`、`toolparfor/dist` 與 `npm pack wsemi@1.9.18` 解出者。

#### wpf 內嵌 bundle 站點全集與判準(同 R18 之版本更新規則;2026-10-16 任務20261016181137 run02:1.8.42 → 1.9.17;2026-10-17 任務20261017051850 run01:1.9.17 → 1.9.18)

`src/wpf.umd.js`、`src/wpf_pmSeries.umd.js` 是 `rollupParfor` 產物內嵌之 parfor 執行期,**與 wsemip 為不同之 bundle、版本各自獨立**(來源 wsemi `toolparfor/dist/`,匯出只有 `pmMap、ispint、isfun、iseobj、isearr、isbol、cint` 與 pmSeries 預設匯出)。**升級 wsemip 時須一併評估 wpf**(wsemi 之同一輪發布會同時重產兩者)。使用處不在 `src/*.mjs` 之執行路徑,而在產碼模板:

| 使用處 | 取用 | 判準 |
|---|---|---|
| `src/rollupParfor.mjs` 之 `genParforCode` 模板(`function genParforCode(` 至其結尾 `}`;`import w from '{fpWpf}'`) | `w.cint`×2、`w.isbol`、`w.isearr`、`w.iseobj`、`w.isfun`×2、`w.ispint`×2、`w.pmMap`(共 10 取用、7 函數);指令見頂部表 | 已套(1.9.17);`w.pmMap(gpgs, asyncFn, takeLimit)` 為 R4 之並行度與「resolve 前所有 cb 已完成」之擁有者 |
| `src/rollupParfor.mjs` 之 `genParforCoreCode` 模板(`import pmSeries from '{fpPmSeries}'`) | `pmSeries(pgs, async fn)` 預設匯出 | 已套(1.9.17) |
| `src/rollupParfor.mjs:261-262` | 取得兩檔路徑(存在於 cwd 則用之,否則改為 `w-package-tools/src/…` 供下游解析) | 路徑常值,不隨版本變 |

1.9.17 對 wpf 之變更與本套件(差異探測 `tmp/run02/probe-wpf2.mjs`,舊=HEAD 之 1.8.42,184 格,3 格不同):①`pmMap` 改為不經 queue、以索引派發(完成計數、只 resolve 一次、輸入進入時取值)——模板用法(陣列輸入、async fn、takeLimit 1/2/3/4/0/10/-1/1.5/'2'/NaN/undefined/null/Infinity、中途 reject、物件輸入、群組陣列)之最大並行數、啟動/完成順序、結果、reject 值**逐格相同**;②**空輸入**舊永遠懸置、新 resolve `[]`——不可達(模板以 `iseobj/isearr` 擋掉空輸入並拋 `pgs is not an effective array or object`);③不給 fn 之 Promise 陣列含一般值:舊同步拋 `f.then is not a function`、新可用——模板恆給 fn,不可達;④`isfun(generator 函數)` 舊 false、新 true——影響 cb 為 generator 函數時之前置檢查,不屬實際用法(cb 為 async 函數)。不受影響;守門:`test/unit-wpfContract.test.mjs` 6 條(自模板推導所用名稱須皆為匯出之函數、pmSeries 預設匯出、選項判定語意、pmMap 並行度與全部完成才 resolve 與結果依索引序、reject 原值且停止派發、pmSeries 依序與 reject;對舊 1.8.42 亦全綠=版本中立之契約,變異 5/5 被殺)。換入後之 parfor 相關測試:全套 `npm test` 綠(見頂部表之現值)。**只影響新產製之 parfor 產物**(產物自含,已發布者不變,同 R1)。

**1.9.17 → 1.9.18(2026-10-17)**:差異探測 `tmp/t55/p4/probe-wpf.mjs`(同 1.9.17 評估之輸入軸,184 格)無穩定差異——重跑 4 次,3 次各有 1 格之 `pmMap` 完成順序紀錄(`log`)不同(兩個近乎同時完成之計時器先後,每次落在不同格),1 次 0 差異;最大並行數、結果、reject 值逐格相同,屬計時器順序雜訊。模板取用 7 函數 10 取用不變(頂部表)。`test/unit-wpfContract.test.mjs` 6 條對 1.9.17、1.9.18 皆綠。只影響新產製之 parfor 產物。

### R19 產製 API 之錯誤一律為 Error 物件並帶 `WPT_` 碼;清空失敗之訊息不引用 Node fs 之訊息

(2026-10-17 任務20261017051850 run01 新增;來源:w-pksupdate 主責 agent 建議書《建議w-package-tools修正》(2026-10-16);主控裁示 P1、P2。)

- **規則**:
  ①本套件於**建置期**自行拒絕或拋出之錯誤(產製 API:rollupFile、rollupCode、rollupWorkerCore、rollupWorker、rollupParfor、rollupFiles、rollupVueToHtml、extractHtml,含內部之 `rollupFileCore`;與 `cleanFolderStrict`),以及 rollupParfor 產物的**參數檢查**(`cb` 檢查,站點 27),一律為 `Error` 物件(有堆疊),`code` 為 `WPT_` 開頭之字串(下表),`message` 為**既有訊息文字(不變)**;不得以字串(或其他非 Error 值)reject 或 throw。**不含**worker 產物(outer/inner 模板)之執行期錯誤值(`worker is dead`、`worker has been terminated`、`worker exit, code[n]`、`worker messageerror`、`<描述> could not be cloned: …` 等,R3 契約且測試以字串文字斷言,見下〈刻意不套〉)。
  ②建立只經 `src/wptCommon.mjs` 之 `rejectWpt(code, msg)`(回傳 rejected promise)與 `wptError(code, msg)`(回傳 Error;堆疊自呼叫處起算);rollupParfor 模板內(產物自含,無法 import)就地建立同形狀之 Error。
  ③第三方錯誤(RollupError、fs 錯誤、`vm.Script` 之 SyntaxError、wsemip 回傳之錯誤)本即 Error 或由 wsemi 負責,原樣往外拋,不重包。
  ④**不引用 Node `fs` 錯誤之 `message` 與 `path`**:Windows 下 `fs.rmSync` 之錯誤訊息與 `err.path` 以系統 ANSI 碼頁編碼,路徑含非 ASCII(如「開源」)即為亂碼(實測 Node 24.19/Windows:`EPERM, Permission denied: \\?\C:\opensrc\¶}·½-JS-…`,`err.path` 含 U+FFFD),且 `fd` 常為相對路徑(`./dist`),使用者無從定位是哪個套件。`cleanFolderStrict` 之錯誤訊息改以已知之絕對路徑 `path.resolve(fd)`、`last.code`、`last.syscall` 與嘗試次數組成:`can not clean folder[<絕對路徑>]: code[<code>] syscall[<syscall>] attempts[<次數>]`(無 `syscall` 則省略該段;**無 `code` 之 Error**(非 fs 錯誤,如 wsemi 內部之 TypeError,其 message 不含 fs 路徑亂碼)為 `<name>: <message> attempts[<次數>]`);wsemip 以字串回報者(如目標為檔案之 `input path is not a folder`,wsemi 自撰文字,無路徑)為 `can not clean folder[<絕對路徑>]: <字串>`;輸入檢查失敗(非字串、空字串、根目錄/cwd/上層、連結)沿用 `can not clean folder[<路徑>]: <原因>`,fd 為非空字串時括號內為絕對路徑,否則(非字串、空字串)為 `String(fd)`(無法轉字串者如無原型物件為 `[object Object]`);**前置 `lstat` 檢查遇非 ENOENT 之錯誤**(POSIX 下上層為檔案之 ENOTDIR、權限不足、路徑含 NUL)亦經同一函數包成 `code[<code>] syscall[lstat]`(不含嘗試次數,未曾呼叫 `w.fsCleanFolder`),不原樣拋出原始 fs 錯誤;`code` 恆為 `WPT_CLEAN_FOLDER`;`cause` 保留原錯誤。**根目錄/cwd/上層之比較於 win32 不分大小寫**(檔案系統不分大小寫:磁碟機代號 `c:` 與 `C:`、目錄名大小寫別名皆指同一目錄,字串相等不等於同一目錄;修前 `cleanFolder(process.cwd().toLowerCase())` 可通過保護而清空 cwd,2026-10-17 外審 sol1 實測)。
- **理由**:字串拒絕在下游普遍之 `.catch((err) => { console.log(err) })` 下只印單行,無堆疊亦無 `code`,離開碼 0;Error 物件印出時帶堆疊框,w-pksupdate 之 R15(`src/ectScripts.mjs` 之 `detectPrintedFailure`)可由結構特徵判為建置失敗,不必靠訊息字樣清單(該清單隨本套件新增訊息而過時,為其已知限制;堆疊 ≥ 2 框時成立,單框見下〈已知限制〉②)。訊息文字不變,使 w-pksupdate 現行之固定字串清單在過渡期仍命中。對標:rollup、esbuild 之 build API 皆以 Error 物件 reject 並帶 `code`。
- **相容性**:呼叫端若以 `typeof err === 'string'`、`err.includes(...)`、`err === '…'` 判斷本套件之拒絕值會受影響;`console.log(err)` 仍含原訊息(多堆疊與 `code`);`String(err)` 多 `Error: ` 前綴;`err.message` 由 `undefined` 變為原訊息。全庫盤點(2026-10-17,`C:\opensrc` 各 repo 排除 node_modules/dist/docs/tmp,引用 `w-package-tools` 之 564 個檔案):`typeof err === 'string'`/`isestr(err)` 判斷 0 處、以訊息內容判斷 0 處(僅 w-component-vue 之測試以子程序輸出的子字串檢查 `opt.fpSrc is not file`、`has no default export`,不受影響),catch 處理器 53 個中 50 個只印出、3 個與本套件無關(w-syslog 測試夾具、w-vditor-vue 測試)。
- **已知限制**:①`console.log(err)` 於 Windows 路徑含非 ASCII 時,`cause`(可列舉)仍展開 Node 原錯誤,其 `message` 與 `path` 仍為亂碼;主訊息已無亂碼(依主控裁示 P2「`cause` 照舊保留」)。②`code` 為可列舉屬性,`util.inspect` 會在**最後一個堆疊框行尾加上 ` {`**,w-pksupdate R15 之 `RE_STACK_FRAME`(`$` 結尾)不匹配該行:堆疊 ≥ 2 框時前面各框仍匹配;**單框堆疊**(錯誤生於 API 函數 `await` 之後且呼叫端未 `await`,如 `rollupWorkerCore(…).catch(console.log)`,2026-10-17 外審 opus1/sol1 實測)堆疊判定落空,此時靠訊息不變之固定字串清單兜底——結構判定之完整需 w-pksupdate 側正規式容許行尾 ` {`(建議檔見該次報告)。③靜態守門只認字面值緊接 `Promise.reject(`/`throw`/`reject(` 之形狀,看不到以變數持字串之 `reject(msg)`/`throw s`(外審 opus1 變異 M19 存活);worker 模板之字串值屬〈刻意不套〉,新增產製 API 之錯誤一律走 `rejectWpt`/`wptError`。④`rollupFiles` 之 `fns` 無效(站點 29)為審計發現之間接站點:原由 wsemip 之 `pmSeries` 以字串 `rs is not an array or object` 拒絕且**已先清空 fdTar**,改於清空前以帶碼 Error 拒絕。
- **站點全集(字串 reject/throw)與判準**(2026-10-17 盤點 `src/*.mjs`、`gRollup*.mjs`、`bin/`、`toolg/`;`src/*.umd.js` 為 wsemi 產物不計;直接字串站點 27 處＋審計發現之間接站點 1 處(29),已全套):

| # | 站點 | 訊息(不變) | code | 觸發與測試 |
|---|---|---|---|---|
| 1 | `rollupFileCore` fdTar 不可用 | `invalid opt.fdTar[<fdTar>]: not a folder and can not be created` | `WPT_INVALID_FDTAR` | fdTar 為檔案 |
| 2 | `rollupFileCore` fdSrc 非資料夾 | `invalid opt.fdSrc[<fdSrc>]: not a folder` | `WPT_INVALID_FDSRC` | 未給 fpSrc 而 fdSrc 為檔案 |
| 3 | `rollupFileCore` fpSrc 非檔案 | `invalid fpSrc: <fpSrc>` | `WPT_INVALID_FPSRC` | fpSrc 不存在 |
| 4 | `rollupFileCore` 回傳模式多項輸出 | `return-code mode of rollupFile can not output multiple files: <檔名>` | `WPT_MULTI_OUTPUT` | 現行外掛組合不可達(R14 ③),以 src 副本注入使 `generate` 多回一項 |
| 5–8 | rollupCode、rollupWorker、rollupParfor、rollupWorkerCore 之 name | `invalid opt.name` | `WPT_INVALID_NAME` | 未給 name |
| 9–11 | rollupWorker、rollupParfor、rollupWorkerCore 之 fpSrc | `opt.fpSrc is not file` | `WPT_INVALID_FPSRC` | fpSrc 不存在 |
| 12–14 | 同上三者之 fpTar | `invalid opt.fpTar` | `WPT_INVALID_FPTAR` | 未給 fpTar(rollupWorkerCore 未給 bReturnCode) |
| 15 | rollupParfor 之 type | `opt.type need to set 'function'` | `WPT_INVALID_TYPE` | type 為 `'object'` |
| 16–18 | rollupWorker、rollupParfor、rollupWorkerCore 之 iife × 非 browser(同 R9 ③) | `formatOut[iife] only supports runin[browser], but runin is [<runin>]` | `WPT_IIFE_RUNIN` | formatOut iife、runin nodejs |
| 19 | rollupWorkerCore funNames 非陣列 | `invalid opt.funNames` | `WPT_INVALID_FUNNAMES` | type object 未給 funNames |
| 20 | funNames 元素非字串 | `invalid opt.funNames: [<x>] is not a non-empty string` | `WPT_INVALID_FUNNAMES` | funNames 含數字 |
| 21 | funNames 與回傳物件介面同名(R11) | `opt.funNames[<x>] is reserved by the returned object(EventEmitter): …` | `WPT_FUNNAMES_RESERVED` | funNames 含 `emit` |
| 22 | evNames 用於不支援之模式(R12) | `opt.evNames only supports type[function] with execFunctionByInstance[false], but type is […] and execFunctionByInstance is […]` | `WPT_EVNAMES_UNSUPPORTED` | type object 給 evNames |
| 23 | evNames 元素非字串 | `invalid opt.evNames: [<x>] is not a non-empty string` | `WPT_INVALID_EVNAMES` | 工廠模式 evNames 含數字 |
| 24 | type function 缺預設匯出(R12) | `module[<fn>] has no default export, type[function] requires a default export, exports[…]` | `WPT_NO_DEFAULT_EXPORT` | 只有具名匯出 |
| 25 | type object 無任何匯出(R12) | `module[<fn>] has no export, type[object] requires a default export or named exports` | `WPT_NO_EXPORT` | 無匯出之模組 |
| 26 | inner 建置期語法檢查(R12) | `inner of worker[<fn>] has syntax error: <原因>` | `WPT_INNER_SYNTAX` | 無自然輸入可觸發(rollup 已先驗語法),以注入 `vm.Script` 測 |
| 27 | rollupParfor 產物(`genParforCode` 模板)之 cb 檢查 | `cb is not a function, need to set opt.returnResult to true` | `WPT_PARFOR_NO_CB` | 以新產製之 parfor 產物呼叫(未給 cb 且 returnResult 非 true);**只影響新產製之產物**(同 R1) |
| 28 | `cleanFolderStrict`(原已為 Error,無碼) | 見 ④ | `WPT_CLEAN_FOLDER` | R18 之各清空失敗;前置 lstat 失敗(注入 ENOTDIR/EACCES/EPERM、路徑含 NUL);無原型物件;win32 大小寫別名 |
| 29 | `rollupFiles` 之 `fns` 無效(審計發現之間接站點;原由 wsemip 之 `pmSeries` 以字串 `rs is not an array or object` 拒絕,且已先清空 fdTar) | `invalid opt.fns: need a file name string or an array of file name strings` | `WPT_INVALID_FNS` | 未給 `fns`;須於清空前拒絕(fdTar 內既有檔不被動) |

  **刻意不套**(已為 Error 物件,P1 範圍為字串拒絕,沿用): `src/rollupWorker.mjs` 之 `mergeCore` 內 `invalid runin[<runin>]`(runin 已於前正規化,不可達)、`genParforCode` 模板內 `pgs is not an effective array or object`(產物執行期)、inner 模板內 `function[<x>] is not a function in worker`(base64 內嵌於 worker)。無 `code`;日後若要統一另案處理。
  **刻意不套(待裁示)**:worker 產物(outer/inner 模板,亦內嵌於 parfor 產物)之**執行期錯誤值**——outer 之 `errDead` 初值 `worker is dead`、`invalid worker`、`worker has been terminated`(`rejectPendings`/`emitError`/死後呼叫)、`worker exit, code[n]`(`emitFatal`)、`worker messageerror`(兩端)、inner `sendMessage` 兜底之 `<描述> could not be cloned: <原因>`(經 `dataRecv.msg` 以字串 reject)等。它們是 R3 之執行期契約(訊息文字為契約的一部分,`test/rollupWorker.test.mjs` 以字串文字斷言),且以事件/`pm.reject(變數)` 形式傳出而非 `Promise.reject('…')` 字面值;改為 Error 即改變所有已產製、已發布 worker 產物之執行期行為(產物自含,僅新產製者生效),屬契約變更,未經裁示不動(外審 opus1 F1;其實測:parfor 產物中 core `process.exit(1)` → 呼叫端得字串 `worker exit, code[1]`,w-pksupdate 判定 null——該情境屬應用執行期,不在建置腳本的失敗偵測範圍)。若日後裁示統一,建議碼 `WPT_WORKER_DEAD`/`WPT_WORKER_TERMINATED`/`WPT_WORKER_EXIT`/`WPT_WORKER_CLONE`/`WPT_WORKER_MESSAGEERROR`,並同步改 R3 與其測試。
- **單一擁有者**:`src/wptCommon.mjs` 之 `wptError`、`rejectWpt`。新增錯誤一律經它並給 `WPT_` 碼,不得 `Promise.reject('…')`、`throw '…'`。
- **盤點指令**:見頂部表〈R19 字串拒絕〉與〈R19 單一擁有者〉。
- **測試**:`test/unit-rejectShape.test.mjs`(站點 1–27、29 逐站兩組斷言:鎖定組=仍 reject 且訊息逐字相同(站點 4、21 為完整比對,不以任意後綴放行)、形狀組=`instanceof Error`、`code`、堆疊首框為呼叫處、`util.inspect` 含堆疊框行與 code;站點 29 另斷言 fdTar 內既有檔不被清掉;站點 28 與 ④ 之訊息格式、亂碼路徑、前置 lstat 失敗、NUL 與無原型物件、win32 大小寫別名;靜態守門:`src` 無字串 reject/throw);`test/unit-wsemipContract.test.mjs`、`test/unit-cleanFolder.test.mjs` 之 `cleanFolderStrict` 訊息斷言隨 ④ 更新。

### R20 暫存檔清理失敗之留痕:一行警告,不印 Error 物件,不拋,不覆蓋建置之原始錯誤

(2026-10-17 任務20261017051850 run01 新增;主控裁示 P3;w-pksupdate 第 41 項 D8。)

- **規則**:
  ①產製 API 之暫存檔(`./temp-<id>-*`:rollupCode 之輸入檔;rollupWorker 之 `-nw`、`-ww`、`-mg`;rollupParfor 之 `-parforCore-src`、`-parforCore-tar.wk.umd`、`-parfor-src`)清理只經 `src/wptCommon.mjs` 之 `rmTempFile(fp)`(單一擁有者),置於各 API 之 `finally`(R9 ②;rollupCode 原用 `unlinkSync`,2026-10-17 起齊為 `rmSync force`)。
  ②`fs.rmSync(abs, { force: true })`(不存在不算失敗);**路徑於進入時即固定為 `path.resolve(fp)`**(各 API 傳入之暫存路徑為相對路徑,重試等待期間宿主若 `process.chdir()`,相對路徑會改指他處而刪錯檔或靜默略過,外審 sol1 實測);EBUSY、EPERM(Windows 下防毒掃描或索引服務暫時占用)重試 3 次(共 4 次嘗試)、間隔 100ms(非同步,不阻塞事件迴圈);其他錯誤碼(EIO、EACCES…)不重試。
  ③重試後仍失敗只 `console.log` **一行**警告:`warning: temp file[<絕對路徑>] was not removed: code[<code>] syscall[<syscall>]; the build result is not affected, please remove it manually`(`code` 缺則用 `name`;無 `syscall` 則省略該段;絕對路徑為 `path.resolve(fp)`,不引用 Node 的 `message`,見 R19 ④);**不得 `console.log(err)` 印出 Error 物件**——其堆疊框會被 w-pksupdate 之 R15(`detectPrintedFailure`)判為建置失敗,而此時建置實際已成功;**不拋錯**——不使成功之建置失敗,亦不覆蓋建置之原始錯誤(失敗時 reject 的仍是建置之真因)。
  ④警告行不含堆疊框行(`^\s+at .+:\d+:\d+`)、不含 R19 各訊息之字樣(`can not clean folder[`、`invalid opt.` 等)、不含 `RollupError`、不含 w-pksupdate `FATAL_WORDS` 之字樣(`rm指令失敗` 等中文固定字樣);核對作法:以 w-pksupdate 當版 `src/ectScripts.mjs` 之 `detectPrintedFailure(out, err)` 餵入警告行輸出須回傳 `null`、餵入修前 `console.log(err)` 之輸出須回傳堆疊判定(2026-10-17 實測見報告;唯讀參考,不入本 repo 測試以免耦合他 repo)。
- **已知限制**:警告行含**外來文字**——絕對路徑(cwd、檔名)與 rollupCode 之 `name`(暫存檔名含 name)由使用端決定;若其本身含 w-pksupdate 固定字串(如 `name: 'invalid opt.good'`、cwd 含 `rm指令失敗`),警告行會被該字串清單命中而誤判(外審 sol1 實測);「完整原樣路徑」與「整行絕無任意固定子字串」無法僅靠模板文字同時保證,須由下游偵測端處理(不處理:現實上屬病態命名)。
- **理由**:原 `console.log(err)` 於清理失敗(建置已成功)時印出整個 Error 物件(含堆疊框),被 w-pksupdate 之 R15 誤判為建置失敗而中止排程;但吞掉清理錯誤又使殘留檔無從察覺,故留一行含 `code` 與絕對路徑之警告。
- **站點全集與判準**:rollupCode(1 檔)、rollupWorker(3 檔)、rollupParfor(3 檔)之 `finally` 共 3 處呼叫點,已全套;rollupFile 恆不寫暫存檔(R14),rollupFiles/rollupVueToHtml/extractHtml 無暫存檔,不適用。
- **測試**:`test/unit-tempCleanup.test.mjs`(三個 API × 清理持續失敗/暫時失敗後成功/建置失敗兼清理失敗;注入 `fs.rmSync` 於暫存檔路徑拋 EPERM 並帶亂碼訊息,斷言:建置成功時仍 resolve 且產物存在、恰一行警告/檔、含絕對路徑與 code、不含亂碼訊息、無堆疊框、console 引數皆為字串;建置失敗時 reject 的是建置真因)；`rmTempFile` 之重試語意 7 條(第 4 次才成功、EPERM 亦重試、持續失敗恰 4 次、其他碼不重試、預設間隔 ≥90ms、等待期間事件迴圈可跑計時器、重試期間 `chdir` 不刪他處同名檔)。

### R21 範例頁自給自足:genDocsExams 產製 docs 之範例頁,不依賴 npm 之 CDN

(2026-11-01 任務20261101202155 wpt257 新增;使用者裁示:範例頁自給自足,README 改指 gh-pages。起因:自有套件 2026-10-28 起只發布至 Verdaccio,npmjs 停更,各套件 `toolg/gDocsExams.mjs`/`gDocExams.mjs` 所產之 `cdn.jsdelivr.net/npm/<名>@<現行版號>/dist/…` 於發布後 404。**2026-11-02 任務20261102100136 wpt268 改版**:使用者裁示「各自有套件的 dist,應該都放在自己 repo 內 docs/dist」「genDocsExams 改成:其他自有套件的引用一律改寫成對方的 gh-pages 網址」「撤掉 docs/libs/」〔規格 `自有套件之瀏覽器端取用與gh-pages` 規則 1、3〕:不再複製其他自有套件至 `docs/libs/`、移除複製 dist 之選項〔`fdLibs`、`fdNodeModules`、`bCopyDist`、`bDistMap`,原則 14 不留相容〕,dist 改由 R24 `genDocsDist` 負責。)

- **規則**:各套件 `toolg` 一律呼叫 `src/genDocsExams.mjs` 之 `genDocsExams(opt)`(同步,回傳 `{ name, examples, inplace, rewrites, keeps, warnings }` 並印主控台),不再自寫複製與取代:
  ①`opt.fdSrc`(預設 `./examples/`;給 `''`/`null` 表示無範例頁,只原地改寫 `fdTar` 既有頁面)遞迴複製到 `opt.fdTar`(預設 `./docs/examples/`);`opt.files` 可只複製指定檔(給了不遞迴 fdSrc,用於範例檔在專案根之 w-howler 類);只有副檔名在 `opt.extsText`(預設 `.html .htm .js .mjs .css`,不分大小寫)者讀成文字改寫,其餘與「無改寫之文字檔」皆**位元組原樣複製**(非 UTF-8 編碼之檔不被破壞);改寫者保留 BOM 與換行。
  ②**dist 不由本函數複製**(2026-11-02 wpt268 起;沿革:wpt257 預設複製→wpt257b 預設不複製並保留 `bCopyDist`/`bDistMap`→wpt268 一併移除):dist 由 R24 `genDocsDist`(`toolg/genDocsDist.mjs`,`script.txt` 於 `git add` 正上方、所有建置之後)複製到 `docs/dist/`,隨 `docs/` 提交與部署。`opt.fdDist`(預設 `./dist/`)僅用於判定範例檔之相對 dist 引用是否指向本套件之 dist、自身網址之 `/dist/…` 路徑是否有效、重疊檢查;`opt.fdTarDist`(預設 `./docs/dist/`)為 dist 在站台內之位置,用於計算改寫後之相對路徑與略過其內之檔,**不被寫入**。**本套件自身之 `../dist/…` 引用保持原字串**(站台上即 `docs/dist/`);僅當「原引用(相對於檔案目前位置)指向專案 `fdDist` 內之檔,而該位置在 fdTar 不再指向 fdTarDist 之同一檔」(如範例檔在專案根、引用 `dist/x.umd.js`,複製到 docs/examples 後失效;fdTar 內既有頁面之 `../../dist/x.umd.js`;或 fdTar 改在 docs 根)才改寫為指向 fdTarDist 之相對路徑,並計入 `rewrites`。引用之前一字元為 `[\w./:@~-]` 者(完整網址、`assets/dist/`、`vendor/…/dist/`)不是本套件 dist 之引用;解析後不在 fdDist 內者亦不動。**不驗證 dist 內有無被引用之檔**(與 dist 建置之先後無關;dist 不存在或為空由 R24 報錯)。
  ②之二**一併原地改寫 `fdTar` 內既有之文字檔**(`opt.bInplace`,預設 `true`):各套件在 `gDocsExams`/`gDocExams` 之前已有其他步驟把頁面寫進 `docs/examples/`(Vue 類之 `gDistApp` 產 `app.html`〔`app.umd.js` 為 bundle〕、`gExtractHtml` 產 `test-html/`),這些頁面內之自有套件網址規則同複製來之檔(③);副檔名限 `extsText`;本次由 fdSrc 複製覆蓋者已處理過不重複;`fdTarDist` 位於 fdTar 內時其內之檔略過;內容無變動不寫檔(保留 mtime);連結不跟進並警告;回傳 `inplace`(相對 fdTar,僅列有變動者)。因此本函數須在產製這些頁面之步驟之後執行(現行 Vue 類 `script.txt` 皆已如此,實測 w-leaflet-vue、w-aggrid-vue)。
  ③範例檔內指向其他自有套件(`wsemi`、`w-` 開頭小寫連字號名)之網址——`cdn.jsdelivr.net/npm`、`fastly.jsdelivr.net/npm`、`unpkg.com`,`https:`/`http:`/無協定,未釘版/`@latest`/`@x.y.z`/`@範圍`;**以及本套件擁有者(package.json 之 `repository`,小寫)之 gh-pages 網址 `https://<擁有者>.github.io/<名>/dist/…`**(gh-pages 網址之 `/dist/` 以外路徑〔`/examples/…`、`/global.html` 等導覽連結〕與 `/dist/` 資料夾本身不動、不警告;擁有者不明或他人之 github.io 不辨識)——**一律改寫為 `https://<擁有者>.github.io/<名>/dist/<檔>`**(`C:\opensrcOper\dspec\自有套件之瀏覽器端取用與gh-pages.md` 規則 2、3:使用者 2026-11-02「引用其他自有套件一律改寫成對方的 gh-pages 網址」):擁有者取本套件 package.json 之 `repository`(自有套件皆同一擁有者);不釘版、一律 `https`;`?`、`#` 尾段與 `%` 編碼保留;**不複製其檔、不讀 `node_modules`,本機有無該套件皆然**(原 wpt257/wpt257b 之「就地化到 `docs/libs/`」撤除);已是此形態者原樣保留(不計 `rewrites`、不警告),`http:`/無協定形態之 gh-pages 網址正規化為 `https`。指向本套件自身(名稱取自 package.json 之 `name`,不寫死)者,路徑須以 `/dist/` 開頭,改指 fdTarDist 之同一檔(相對路徑)。`opt.keepCdn`(預設 `['w-demores']`,資源型、檔案大)內之套件保留原網址,計入 `keeps`,不警告;給 `[]` 則一般處理。
  ④第三方套件(`vue`、`lodash`、`@babel/polyfill`…)與外形相似者(`wsemi-extra`、`wsemi.js`、`w-x_y`、`wx-foo`、`@w-scope/w-x`、`Wsemi`、`gh/`、`raw.githubusercontent.com`、他主機)網址一律不動。
  ⑤**無法改寫不拋錯,保留原網址並列入 `warnings`**:⑤之一他自有套件之網址,擁有者不明(無 `repository`、非 GitHub)者,或路徑不是單純之 `/dist/<檔>`(`isSimpleDistPath`:以 `/dist/` 開頭、其後各段非空且非 `.`/`..`、解碼後無反斜線、原字串無 `%2F`;故 `/res/…`、`/dist/`、含 `..`/`.`/空段/反斜線/`%2F` 者皆是——gh-pages 站台只提供 `dist/`,`keepCdn` 內之套件優先不受此限);⑤之二網址含 `${…}`/`{{…}}`、網址無檔案路徑、`%` 無法解碼、自身網址路徑不在 `/dist/` 下或跳出 dist、連結(符號連結、junction)略過。(**不再有**「本機找不到」「dist 不存在/為空/引用之檔不在 dist」類警告。)
  ⑤之三主控台印出時,同類警告歸併:多頁各有一則(同網址、同原因)者印一列 `warning xN: <不含檔名之全文>`,單則印全文;回傳之 `warnings` 仍逐則完整(含檔名)。
  ⑥只增不刪:不清空任何目標資料夾(`docs` 由各專案之 `cleanFolder('docs')` 先清);不跟進連結;冪等(重跑內容與摘要皆同,來源不動)。
  ⑦錯誤一律為帶 `WPT_DOCS_` 碼之 Error 物件(R19),**且先於任何寫入**(`dspec/輸入參數之檢測機制.md` V17):`WPT_DOCS_INVALID_OPT`(opt 為非一般物件:字串、數字、布林、陣列、函數;訊息固定為 `invalid opt: must be an object`,不回顯值〔K9、V19〕;由與 R24 共用之 `readOpt` 拋出)、`WPT_DOCS_INVALID_PKG`(package.json 讀不到/非 JSON/無 name;訊息不引用 Node fs 之原訊息,見 R19 ④)、`WPT_DOCS_SRC_NOT_FOUND`(fdSrc 非空而不存在或非資料夾;`files` 內之檔不存在或跳出 fdSrc)、`WPT_DOCS_PATH_OVERLAP`(fdTar 等於或位於來源 fdDist/fdSrc 之內,不把產物寫進專案之 dist;`files` 給定時 fdSrc 不計;fdTarDist 不被寫入,不檢查)。
  ⑧**opt 之檢測依 `C:\opensrcOper\dspec\輸入參數之檢測機制.md`(草案中已定之條款)**:opt 為 `undefined`/`null` 視為未給(V4);各鍵 `undefined`/`null` 取預設,給了而型別不符(字串鍵須非空字串、陣列鍵須為非空字串陣列、布林鍵須為布林、`fdSrc` 須為字串〔可空,`''` 表示無範例頁〕)者**視為未給、改用預設,不拋錯**(K3,使用者 2026-10-31);`opt.debug` 為 `true` 時於 `warnings` 說明 `invalid opt.<鍵>: must be <種類>, using default`(固定詞彙、不含傳入之值,K9)。已移除之鍵(`fdLibs`、`fdNodeModules`、`bCopyDist`、`bDistMap`)依 V7 視為未宣告之鍵而忽略(不警告;原則 14 不留相容、不提示改用)。`modifyReadme` 之 `fnRM`、`fnPks`(帶預設值之位置參數視同 opt 鍵,K2)亦同。(`C:\opensrcOper\sgud\proc\process_review.md` 審查三要點(3)表內原載「opt 給錯值卻靜默回退(違 K3)」之相反舉例,主控已於 2026-11-01 更正,本套件之做法即 dspec 現行 K3);若日後裁定改為拋錯,僅需改 `src/docsCommon.mjs` 之 `readOpt`(R24 共用)與 `genDocsExams` 之 `fdSrc` 處理、`modifyReadme` 二處。
- **理由**:npm 停更後 `cdn.jsdelivr.net/npm/<名>@<版號>` 取不到新版(實測 w-fft@1.0.37 → 404);範例另以未釘版/`@latest` 取其他自有套件,得舊版。改為各套件自己的 gh-pages 提供 dist(R24),範例頁自身用同站相對路徑、引用他自有套件用其 gh-pages 網址,不再依賴任何自有套件之 npm 發布;不複製他套件之檔,使各套件 repo 內不再有他套件之副本(使用者 2026-11-02:各自有套件的 dist 應放在自己 repo 內 `docs/dist`)。
- **執行順序(給各套件 `script.txt`)**:與 dist 建置之先後無關,`script.txt` 不必調整;唯一次序要求是須在**把頁面寫進 `docs/examples/` 之步驟之後**(`gDistApp`、`gExtractHtml`;`cleanFolder` 之後),才能原地改寫這些頁面。
- **已知限制**:被引用之他套件 `dist` 檔是否存在於其 gh-pages **不驗證**(wpt268 起不再讀本機 `node_modules`;原 wpt257b 因「本機無檔」而警告之 `wsemi/dist/wsemi.umd.min.js` 〔wsemi 之 dist 只有 `wsemi.umd.js`〕現被靜默改寫為 `https://<擁有者>.github.io/wsemi/dist/wsemi.umd.min.js`,該檔在 gh-pages 不存在,執行期 404;出現於 w-leaflet-vue、w-maplibregl-vue、w-threejs-vue、w-flow-vue、w-trade-backtest 之 `toolg/gDistApp.mjs`、`gExtractHtml.mjs`,須由主控批次改原始檔為 `wsemi.umd.js`);他套件之網址不釘版,gh-pages 上恆為最新版(規格規則 5);jsDelivr 對 `.js` 自動產生之 `.min.js` 不模擬;`unpkg`/`jsDelivr` 之 `gh/`、`raw.githubusercontent.com` 形態不處理;原地改寫對非 UTF-8 且有網址命中之既有檔會以 UTF-8 寫回(其他位元組被取代),頁面皆為 UTF-8,不處理。
- **站點全集與判準**:自有套件網址之樣式只在 `src/ownPkg.mjs` 之 `newCdnUrlRegex()`(R21、R22 共用)、擁有者取得只在 `getRepoOwner(pks)`;genDocsExams 之網址處理只在 `rewriteText` 內 a(相對 dist 引用)、b(CDN 網址)兩段,文字檔來源有二(fdSrc 複製、fdTar 既有原地改寫),皆經同一 `rewriteText`;gh-pages 網址之組成只在 b 段「其他自有套件」分支一處(`ghPagesUrl`);走訪、複製、opt 讀取與 R24 共用 `src/docsCommon.mjs`(單一擁有者,見二)。
- **測試**:`test/unit-genDocsExams.test.mjs`(假套件於 `test/_tmp/genDocsExams/`,不碰真實專案;預設路徑以子行程於假套件資料夾呼叫、複製與位元組保真、dist 不複製〔含 dist 不存在〕、extsText、連結不跟進、冪等、9 種網址形式皆改寫為 gh-pages 網址且無 `docs/libs`、本機 `node_modules` 有無皆同、gh-pages 形態〔已是所要形態原樣、無協定/http 正規化、自身、導覽連結不動、他人 github.io/無 repository 不辨識、大小寫〕、多頁/尾段/CSS 與 mjs、版本與協定形式/查詢片段/編碼、非單純 `/dist/<檔>` 保留並警告、擁有者不明、keepCdn〔預設、指定、`[]`、優先〕、警告歸併、原地改寫〔7 案:規則同複製來之檔、覆蓋同名只處理一次、`bInplace:false`、相對 dist 引用以目前位置判定與 mtime、fdTarDist 略過、BOM/CRLF 與冪等、fdTar 不存在與連結〕、第三方與相似者、名稱取自 package.json、自身網址、路徑跳出、樣板變數與無路徑、%編碼、相對 dist 引用、無範例頁、摘要與主控台輸出〔無 dist/libs〕、opt 檢測〔含已移除之鍵被忽略〕、三種錯誤碼與檢測先於寫入)。真實專案實跑見任務報告。

### R23 部署工具 bin/gh-pages.mjs 只部署 -d 資料夾,不提供 dist

(2026-11-01 任務20261101202155 wpt257b 新增「部署時提供專案 `./dist/`」;**2026-11-02 任務20261102100136 wpt268 撤除**:使用者裁示「w-package-tools 內 gh-pages.mjs 職責僅發布,沒有要複製自己 dist 至 docs/dist/……請依循複製自己 examples 至 docs/examples 的方式去複製自己 dist 至 docs/dist/」〔規格 `自有套件之瀏覽器端取用與gh-pages` 規則 1:原載「由部署工具於 deploy 時提供 ./dist、不在建置時複製進 docs/dist/」不成立〕。dist 改由 R24 `genDocsDist` 於建置時複製進 `docs/dist/`,隨 `-d docs` 部署。)

- **解析**:各套件 `package.json` 之 `"deploy": "gh-pages -d docs"` 經 `node_modules/.bin/gh-pages` 解析到本套件 `package.json` 之 `bin["gh-pages"]` = `bin/gh-pages.mjs`(2026-11-01 盤點,`tmp/wpt257b/inventory.mjs`:127 個 package.json 中 121 個有 `deploy`〔120 為 `gh-pages -d docs`、本套件為 `node bin/gh-pages.mjs -d docs`〕,121 個之 `.bin/gh-pages` shim 皆指 `w-package-tools/bin/gh-pages.mjs`,0 個依賴或安裝第三方 `gh-pages`;無 `deploy` 者 6 個中 3 個為真套件〔w-pksbatch、w-pksupdate、w-demores,不部署 gh-pages〕、3 個為子資料夾之 package.json)。
- **規則**:`bin/gh-pages.mjs` 之職責僅部署 `-d <dir>`(預設 `docs`)資料夾之內容到 `gh-pages` 分支:`git clone --depth 1`→`git rm -rf .`→複製 `-d` 內容→寫 `.nojekyll`→commit→push。
  ①**不讀、不複製專案根 `./dist/`**;`--no-dist`、`--dist-map` 參數、`[gh-pages] 專案 dist: …` 說明行、連結警告、路徑衝突警告全部移除(原則 14 不留相容)。已移除之參數視為未知參數而忽略(未知參數本即忽略)。
  ②站台上之 `dist/` 即 `-d` 資料夾內之 `dist/`(R24 `genDocsDist` 之產物,含 `.map`),與 `-d` 內其他檔一併原樣部署。
  ③**不改既有參數與行為**:`-d <dir>`(預設 `docs`)、未知參數忽略、`-d` 不存在或為空即 `exit 1` 且不部署、`git clone --depth 1`→`git rm -rf .`→複製→push 之流程、`.nojekyll`、無變更不 commit、失敗清理暫存夾與 `exit 1`。
- **站點全集與判準**:`bin/gh-pages.mjs` 內無 `planProjDist`、`provideProjDist`、`--no-dist`、`--dist-map`(0 處,見頂部盤點表);部署內容＝`-d` 資料夾內容＋`.nojekyll`。
- **已知限制**:`-d .`(專案根)因暫存夾位於專案內而無窮遞迴,為修改前即有之限制,未處理;`copyRecursive` 以 `statSync` 複製 `-d` 內容,`-d` 內之連結會被跟進(修改前即有,本輪未動)。
- **測試**:`test/unit-ghPagesDeploy.test.mjs`(假專案為暫存夾內之本機 git 倉庫,origin 指向同夾內之本機 bare 倉庫,測試先斷言 origin 在暫存夾內;子行程實跑 bin,以 `git ls-tree`/`git show` 驗遠端 `gh-pages` 分支內容與位元;套件宣告、`docs/dist/`〔含子資料夾、二進位、`.map`〕原樣部署、專案根有 `./dist/` 而 `-d` 內無 `dist/` 時不提供、`-d` 內有 `dist/` 時不被專案根覆蓋且無衝突警告、已移除參數被忽略、`-d` 語意不變、`-d` 不存在或為空、`-d` 為 dist、再次部署與無變更、origin 失效)。對修前〔HEAD 之 bin〕跑同一測試檔:4 紅 6 綠(紅者為「不提供專案根 dist」之 4 案;綠者為行為本不變之案例)。

### R24 複製 dist 至 docs/dist:genDocsDist

(2026-11-02 任務20261102100136 wpt268 新增;使用者裁示:「依循複製自己 examples 至 docs/examples 的方式去複製自己 dist 至 docs/dist/」「w-package-tools 內新建 genDocsDist,遇到 dist 不存在就報錯,docs/dist/ 須含 .map 檔」「dist 為空亦報錯」〔使用者同意主控之建議〕。規格:`自有套件之瀏覽器端取用與gh-pages` 規則 1(各套件以自己的 gh-pages 提供 dist,網址 `https://<擁有者>.github.io/<套件名>/dist/<檔>`)、`自有套件之發布與建置腳本` 規則 3、4(`toolg/genDocsDist.mjs` 為一行呼叫,`script.txt` 插在 `git add .  -A` 正上方,所有建置列之後;D 型無 dist 者不設)。)

- **規則**:各有 dist 之自有套件的 `toolg/genDocsDist.mjs` 一行呼叫 `src/genDocsDist.mjs` 之 `genDocsDist(opt)`(同步,回傳 `{ files, nMap, warnings }`,並印一行摘要 `genDocsDist: dist N file(s) (.map M) -> <fdTar>; warnings K`,有警告者另逐行 `  warning: …`):
  ①預設把 `./dist/`(`opt.fdDist`,相對 cwd)全部檔案(含子資料夾、`.map`、二進位,位元組原樣)複製到 `./docs/dist/`(`opt.fdTar`);`files` 為相對 `fdTar` 之 posix 路徑,`nMap` 為其中 `.map`(副檔名不分大小寫)之個數;空資料夾不複製。
  ②複製前先清空目標(不存在則建立):經 `cleanFolder`(R18:失敗即拋 `WPT_CLEAN_FOLDER` 並重試、目標為連結或檔案即拒、清空時連結只移除連結本身)。
  ③**dist 不存在、不是資料夾,或其內無任何檔案(只有空資料夾、只有連結亦然)即拋錯**:`WPT_DOCS_DIST_NOT_FOUND`、`WPT_DOCS_DIST_EMPTY`,訊息 `dist folder[<絕對路徑>] not found, please build dist before this step` / `dist folder[<絕對路徑>] has no file, please build dist before this step`(不含使用端資料值);**先於清空與任何寫入**——發布流程因而中止,不會部署出空 dist 或過期之 dist。dist 內沒有 `.map` 不是錯(`nMap` 為 0)。
  ④目標與來源不得互相包含(含相同):目標在來源內〔會把產物寫進 dist〕、來源在目標內〔清空目標會刪掉來源〕皆拋 `WPT_DOCS_PATH_OVERLAP`(訊息 `opt.fdTar[…] must not be inside source folder[…]` / `source folder[…] must not be inside opt.fdTar[…]`);另以 `fs.realpathSync.native` 解開連結後(路徑不存在時取最深已存在之上層再接回其餘段)再判定一次,擋住「目標之上層或來源本身為指向對方內部之連結」。
  ⑤連結(符號連結、junction)不跟進:略過並列入 `warnings`(`symbolic link or junction[<路徑>] was skipped`),連結目標內容不被複製、不被更動。
  ⑥opt 檢測同 R21 ⑧(共用 `readOpt`):`undefined`/`null` 視為未給,非一般物件拋 `WPT_DOCS_INVALID_OPT`,各鍵型別不符視為未給改用預設(`fdDist`、`fdTar` 須非空字串,`bLog` 須布林),`opt.debug: true` 時說明於 `warnings`。
  ⑦重跑冪等(內容與摘要皆同);來源不動;`dist` 縮減後重跑,已移除之檔不殘留於目標(因先清空)。
- **理由**:dist 由各套件自己的 gh-pages 提供(規格規則 1),`docs/dist/` 隨 `docs/` 提交至 master 並經 `npm run deploy` 上 gh-pages;部署工具(R23)只負責部署。不存在或為空即報錯,使「上線一份空的/過期的 dist」成為發布中止而非靜默事故(w-package-tools 之 `cleanFolder` 於前段已清空 `dist/`,至 `genDocsDist` 才重建完成,故空 dist 代表建置失敗)。
- **站點全集與判準**:複製 dist 之邏輯只在 `src/genDocsDist.mjs`(`bin/gh-pages.mjs` 與 `genDocsExams` 皆不複製 dist);檔案走訪、複製、opt 讀取與 R21 共用 `src/docsCommon.mjs`(單一擁有者:`toPosix`、`isInside`、`walk`〔連結不跟進〕、`copyFile`、`readOpt`)。各套件 `toolg/genDocsDist.mjs` 之建議內容:`import genDocsDist from 'w-package-tools/src/genDocsDist.mjs'` ＋空行×2＋`genDocsDist()`(與 `toolg/gDocsExams.mjs` 同型)。
- **已知限制**:清空與複製不是原子操作:複製中途失敗(磁碟滿、檔案被占用)時 `docs/dist/` 只有部分檔案,錯誤為 Node 原始 fs 錯誤(未包 `WPT_` 碼,與 `genDocsExams` 之複製一致),下次重跑會重新清空;`opt.fdDist` 本身為指向他處資料夾之連結時,內容照常複製(只有 dist **內**之連結不跟進);`realpathSync` 在 Windows 回傳之大小寫/短檔名與 `path.resolve` 可能不同,兩者皆經 `path.relative` 比較(Windows 不分大小寫),短檔名(8.3)別名未另處理。
- **測試**:`test/unit-genDocsDist.test.mjs`(假套件於 `test/_tmp/genDocsDist/`,不碰真實專案;預設路徑以子行程於假套件資料夾呼叫、含子資料夾/二進位/`.map`〔含大寫副檔名〕全部複製且位元一致、只有 `.map` 的 dist、複製前先清空目標〔含舊子資料夾,目標之外不動〕、目標不存在則建立、冪等與 dist 縮減、`fdDist`/`fdTar` 可指定、連結不跟進、dist 不存在/為檔案/為空/只有空資料夾/只有連結皆拋錯且不動目標、重疊〔6 種字面路徑、目標上層為指向 dist 內之連結、來源為指向目標內之連結〕、目標本身為連結/檔案〔`WPT_CLEAN_FOLDER`〕、opt 檢測 11 鍵＋`undefined`/`null`＋非物件、摘要與主控台輸出)。

### R22 README 之瀏覽器用法改指 gh-pages:modifyReadme

(2026-11-01 任務20261101202155 wpt257 新增;同 R21 之起因與裁示。)

- **規則**:`src/modifyReadme.mjs` 之 `modifyReadme(fnRM, fnPks)`——**各套件現有之 `toolg/modifyReadme.mjs`(`import modifyReadme …; modifyReadme()`)不改即生效**:
  ①README 內指向自有套件(`wsemi`、`w-*`,含本套件與其他自有套件,同 R21 ③ 之主機與版號形式)且路徑為 `/dist/<檔>` 之 CDN 網址,改為 `https://<擁有者>.github.io/<套件名>/dist/<檔>`(`?`、`#` 尾段保留;擁有者於網址中以小寫表示);擁有者取自 package.json 之 `repository`(字串或 `{url}`;`https://github.com/o/r(.git)`、`git+https://…`、`git://…`、`ssh://git@github.com/o/r.git`、`git@github.com:o/r.git`、`github:o/r`、`o/r`),不寫死。
  ②徽章(`img.shields.io`、`www.jsdelivr.com/package/…`)、第三方套件、自有套件之非 `/dist/` 路徑(如 `w-demores` 之 `/res/…`)、`/dist/` 資料夾本身、外形相似者一律不動。
  ③原行為維持:其餘字樣 `<本套件名>@x.y.z` 換成 package.json 之現行版號(正規式未改)。
  ④取不到擁有者(無 `repository`、非 GitHub 主機):**不拋錯**,網址不改寫,`console.log` 一行 `warning: …` 並計入回傳之 `warnings`(僅當 README 確有對應網址時);版號替換照常。
  ⑤內容無變動時不寫檔(原為無條件寫檔);回傳 `{ changed, rewrites, warnings }`(原回傳 undefined,呼叫端皆忽略)。
- **理由與依賴**:同 R21。README 之網址指向各套件 gh-pages 之 `dist/`,該 `dist/` 由 R24(`genDocsDist` 於建置時把 `./dist/` 複製到 `docs/dist/`,隨 `docs/` 部署)產生,故:有 dist 之套件須在 `script.txt` 於 `git add` 上方加入 `node toolg/genDocsDist.mjs`(wpt268 起;取代 wpt257b 之「R23 部署時提供」,亦取代 wpt257 所述之「13 套件新增只複製 dist 之 `toolg/gDocsExams.mjs`」);README 引用**其他**自有套件(例 w-serv-* 引用 w-converhp 之 client)時,對方套件亦須已發布過含 `docs/dist/` 之版本。
- **站點全集與判準**:盤點 2026-11-01(`C:\opensrcOper\dnow\20261101202155\scan\scanOwnCdn.json`):README 有 `/dist/` CDN 網址者 44 套件 50 處(48 自身釘版、2 他套件未釘版〔w-serv-broadcast、w-serv-webdata 引用 w-converhp〕);其中 13 套件無 `toolg/gDocsExams.mjs`/`gDocExams.mjs`(w-comor-hapi、w-comor-mqtt、w-comor-socketio、w-websocket-client、w-comor-websocket、w-converhp、w-conversi、w-converws、w-converws-client-webworker、w-serv-broadcast、w-serv-webdata、w-runqws、w-serv-hapi),其 gh-pages `dist/` 由 R23 提供即可。README 內 `raw.githubusercontent.com` 形態(w-mousekey 等 11 處)非 CDN `/dist/`,本規則不處理。
- **測試**:`test/unit-modifyReadme.test.mjs`(11 種網址形式、Markdown/反引號/引號/同行多網址邊界、徽章與相似者不動、版號替換維持、無對應不寫檔〔mtime〕、CRLF 與 BOM 保留與冪等、8 種 repository 形式、4 種取不到擁有者、以未改之 `toolg/modifyReadme.mjs` 於假套件夾執行)。

### R25 babel 轉譯不讀使用端設定、外掛以模組物件傳入、以自帶 rollup 外掛轉譯(Babel 8)

(2026-11-10 主控任務20261110095259 bb02 新增;排程第 372 項 @babel 7 → 8。主控裁定:A 以自帶外掛 `src/rollupBabel.mjs` 取代 `@rollup/plugin-babel`〔其 peer 至 7.1.0 仍為 `@babel/core ^7`,上游 Babel 8 支援未合併〕;C 移除未使用之 `@babel/cli`、`@babel/node`、`@babel/register`、`@babel/plugin-transform-regenerator`、`@babel/polyfill`、`core-js`、`@rollup/plugin-babel`、`@babel/plugin-proposal-export-default-from`〔全庫 `export x from` 語法 0 處〕;D `@babel/eslint-parser` 維持 7〔eslint 8 維持〕並以 `overrides` 使用本套件之 `@babel/core`。使用端 `babel.config.js` 之改法(B)由主控於連動時統一處理,寫法見 README〈Breaking changes〉。調查與副本驗證見任務之 bb01 審計報告。)

- **規則**(`src/rollupFile.mjs` 之 `rollupFileCore` 內 `babelOpt`,與 `src/rollupBabel.mjs`):
  ①`babelrc: false`、`configFile: false`:建置**不讀使用端之 babel 設定**(`babel.config.{js,json,cjs,mjs,cts,ts,mts}`、`.babelrc{,.json,.js,.cjs,.mjs,.cts}`、`package.json` 之 `babel` 鍵、`.babelignore`),其內容與其以字串指名之外掛皆不影響產物;轉譯等級只由 `opt.targets`:**頂層與 preset 皆給 `targets`,並設 `browserslistConfigFile: false`**——core 於無頂層 `targets` 時會自 cwd 讀使用端之 browserslist 設定(`package.json#browserslist`、`.browserslistrc`、環境變數 `BROWSERSLIST`),兩檔並存或查詢無效即建置失敗(`contains both .browserslistrc and package.json with browsers`、`Unknown browser …`;改前 Babel 7 亦然,2026-11-10 外審 terra F1 指出、實測重現),且讀 `api.targets()` 之外掛所見與 preset 不同。兩項設定任一即足以擋住(變異 m14、m15 各自存活、m16 兩者皆移除即殺),並存為雙重保險(preset 層之 `targets` 亦同:未給時 preset-env 沿用頂層,變異 m05 存活)。
  ②preset 與外掛一律傳本檔 import 之**模組物件**(`presetEnv`、`pluginTransformRuntime`),不以字串指名(字串自 babel 之 root=cwd 解析,版本取決於使用端之安裝擺放)。
  ③轉譯外掛為 `src/rollupBabel.mjs`(輸入端 `transform`),其 `import '@babel/core'` 自本套件位置解析。篩選同 `@rollup/plugin-babel` 6.1.0(其 `dist/es/index.js:268,273` 與 `@rollup/pluginutils` 之 `createFilter`):非字串或含 `\0` 之 id 不處理;去 `?` 後之 bareId 以 `@babel/core` 之 `DEFAULT_EXTENSIONS`(`.js .jsx .es6 .es .mjs .cjs`)結尾(區分大小寫)才處理——故 `.vue` 與其區塊(`x.vue?rollup-plugin-vue=script.js`)不經 babel、`x.js?query` 經 babel;caller 為 `{ name: '@rollup/plugin-babel', supportsStaticESM, supportsDynamicImport, supportsTopLevelAwait, supportsExportNamespaceFrom }`(皆 true,保留 ES 模組語法交 rollup);`sourceMaps: true`;`loadPartialConfigAsync` 回 null 時不處理;不做 plugin-babel 之 preflight(只驗 babelHelpers 與外掛相符,不影響產物)。
  ④helpers 由 `@babel/plugin-transform-runtime` 以引用 `@babel/runtime/helpers/*` 提供(等同原 `babelHelpers: 'runtime'`)。
  ⑤不用 `useBuiltIns`、`corejs`(Babel 8 已移除,傳入即拋 `The 'useBuiltIns' option has been removed`);不用 export-default-from。
  ⑥本套件 `babel.config.js` 為 `module.exports = {}`,只供 eslint 之 `@babel/eslint-parser` 讀取。
- **理由**:Babel 8 之 preset-env 拒收 `useBuiltIns`/`corejs`,而原設定未關 `configFile`,使用端標準版 `babel.config.js`(含此二鍵)被讀入即建置失敗;Babel 8 外掛裝在本套件之下(使用端根目錄另有 Babel 7 時為巢狀),以字串指名會自使用端根目錄解析到他版本或找不到;`@rollup/plugin-babel` 與使用端根目錄之 core 7 同層提升時取得 core 7,Babel 8 外掛跑在 core 7 上即失敗(bb01 於 vue-cli 使用端重現)。三者皆使建置隨使用端之設定與擺放而變,本規則使建置只取決於本套件之相依與 `opt`。
- **站點全集與判準**:babel 設定只在 `rollupFileCore` 之 `babelOpt` 一處、轉譯外掛只在 `src/rollupBabel.mjs`;各入口(`rollupFiles`、`rollupCode`、`rollupWorker`/`rollupWorkerCore`、`rollupParfor`、`rollupVueToHtml`)皆經 `rollupFileCore`(`src/rollupCode.mjs:4`、`src/rollupFiles.mjs:3`、`src/rollupParfor.mjs:7`、`src/rollupVueToHtml.mjs:4`、`src/rollupWorkerCore.mjs:6`)。盤點指令見頂部表(5 行)。
- **已知限制**:①helper 引用之 `@babel/runtime` 由 rollup 自**被轉譯檔之位置**解析:使用端根目錄為 runtime 7(由 `@vue/cli-plugin-babel` 帶入)時,transform-runtime 8 產生之引用解析到 runtime 7。2026-11-10 兩個下游(wsemi、w-component-vue)之產物 helper 引用 0 個(`targets` 為 `defaults`/`last 2 Chrome versions`,現行原始碼幾乎不需轉譯);只有需 helper 之新語法才觸發,解析不到時依 R16 建置失敗(不靜默)。②sourcemap 之 `names`/`mappings` 與 Babel 7 不同(Babel 8 產生器對成員運算式之名稱記錄不同),JS 逐位元組相同。③`@babel/eslint-parser` 7 跑在 core 8 為上游未支援之組合(peer `^7.11.0`);本套件以 `overrides` 解,使用端安裝時 npm 印 `ERESOLVE overriding peer dependency` 警告;本套件、wsemi、w-component-vue 之 lint 輸出與改前逐行相同。④Node 須 `^22.18.0 || >=24.11.0`(`@babel/core` 8 之 engines);本套件 `package.json` 無 `engines` 欄位,寫於 README。⑤`core-js` 不再隨本套件安裝:wsemi `test/b642u8arr.test.mjs:124-136` 之 core-js 對拍案取不到即略過(2026-11-10 下游副本由通過變為略過;是否由 wsemi 自宣告相依待主控裁示)。⑥**自由全域 `regeneratorRuntime` 不再被改寫**:Babel 7 之 transform-runtime(`regenerator: true`)會把原始碼或被打包相依中之自由變數 `regeneratorRuntime` 換成打包進產物之 `@babel/runtime/regenerator`,Babel 8 移除該選項(`node_modules/@babel/plugin-transform-runtime/lib/index.js:36-37`),產物保留自由全域引用、建置成功但執行期 `regeneratorRuntime is not defined`(實測);2026-11-10 掃全庫已提交之 140 個 dist,含 regenerator runtime 特有字串 `Generator is already running` 者 0 個(改前 B7 探測產物有此字串,判準有效)→ 現有產物無一依賴此改寫。恢復改寫(加 `babel-plugin-polyfill-regenerator`)或建置期偵測自由 `regeneratorRuntime` 而拒絕,待主控裁示。⑦舊 import assertion 語法 `assert { type: 'json' }` 於 Babel 8 解析失敗(建置期報錯,非靜默);全庫 src/toolg/test/examples 靜態與動態 import attributes 皆 0 處;rollup 3 對 external 之 attributes 輸出 `assert` 屬 rollup 既有限制(rollup 4 另輪)。⑧preset-env 8 之 bugfix 外掛恆開(Babel 7 為選用、預設關),某些語法之產物可能比改前少轉譯;transform-runtime 8 之預設 `version` 為 `8.0.0-beta.0`,較新之 helper 改為內嵌。兩包下游 JS 0 差異,不推廣為所有語法皆相同。⑨helper 解析之補充:使用端根目錄完全沒有 `@babel/runtime`(本套件之 runtime 8 只在巢狀)時,使用端原始碼之 helper 引用亦解析不到 → R16 建置失敗;但解析到他版本(runtime 7)時不檢查版本,`opt.external` 明列 helper 時亦不檢查。以 `absoluteRuntime` 錨定本套件之 runtime 為可行方向(會改走其 CJS/ESM 條件解析,須另測),待主控裁示。
- **測試**:`test/unit-rollupBabel.test.mjs`(16;夾具於 `test/_tmp/rollupBabel/`,建置於乾淨子程序以使用端資料夾為 cwd,可另給子程序環境變數):對照組 1;①使用端設定 10 種(`babel.config.js` 拋錯、使用端標準版、`babel.config.json`、`.babelrc`、`.babelrc.js`、`package.json#babel`、`package.json#browserslist`、`.browserslistrc`、兩者並存、環境變數 `BROWSERSLIST` 無效)建置成功且產物與無設定時逐字相同;②`.vue` 主檔建置之 script 區塊不經 babel、其引用之 .js 經 babel,外掛層 id 表(DEFAULT_EXTENSIONS 6 種、`x.js?query`、`.vue`、`.vue?…script.js` 2 種、`\0` 2 種、`.ts`/`.css`/`.json`、`.JS`)與 6.1.0 相同、經 babel 者帶 sourcemap,轉譯保留 ES 模組語法,caller 與 6.1.0 逐鍵相同(spy 外掛以 `api.caller` 取出),sourcemap 指向原始檔且產物各行對應回原始碼同一行(測試內自寫 VLQ 解碼,不依賴傳遞相依);③使用端根目錄放會拋錯之假 `@babel/core` 7、`@babel/preset-env` 7、`@babel/plugin-transform-runtime` 7(並依「peer 接受 core 7 者同層提升」複製本套件相依),本套件與其 Babel 8 巢狀安裝(轉接模組計數 core、preset-env、transform-runtime 之呼叫)時,建置成功、core 與兩者皆被呼叫、產物與直接建置者相同。觀察方式:babel 重印模組(函數本體縮排 2 格、補分號),rollup 只改寫頂層宣告,故函數本體之行可判定該模組是否經 babel。

## 二、已確立的單一擁有者

| 決定 | 擁有者 | 備註 |
|---|---|---|
| 自有套件網址之樣式與 GitHub 擁有者之取得(R21、R22) | `src/ownPkg.mjs` 之 `newCdnUrlRegex()`、`getRepoOwner(pks)` | genDocsExams 與 modifyReadme 共用;新增 CDN 主機/形態只改此處;內部用,不入 jsdoc |
| 範例頁之產製(R21) | `src/genDocsExams.mjs` 之 `genDocsExams` | 各套件 `toolg` 只呼叫它,不自寫複製與取代;**不複製 dist、不複製他自有套件**(他自有套件一律改寫為其 gh-pages 網址) |
| 複製 `./dist/` 至 `./docs/dist/`(R24) | `src/genDocsDist.mjs` 之 `genDocsDist` | 各有 dist 之套件 `toolg/genDocsDist.mjs` 一行呼叫;dist 不存在或為空即拋錯;`bin/gh-pages.mjs` 與 `genDocsExams` 皆不複製 dist |
| 部署 `-d` 資料夾至 gh-pages(R23) | `bin/gh-pages.mjs` | 各套件 `package.json` 之 `"deploy": "gh-pages -d docs"` 解析至此 bin;**職責僅部署**,不提供 dist(`--no-dist`、`--dist-map` 已移除) |
| `genDocsExams`／`genDocsDist` 共用之走訪(連結不跟進)、複製、opt 讀取(R21、R24) | `src/docsCommon.mjs` 之 `toPosix`、`isInside`、`walk`、`copyFile`、`readOpt` | 內部用,不入 jsdoc;兩函數不各自再寫一份 |
| worker 致命失敗之處置(標記死亡、整批 reject、emit error) | `wrapWorker` 之 `emitFatal` | 新增致命路徑一律經此 |
| pending 之登記與 settle | `wrapWorker` 之 `pendings`(以呼叫 id 為鍵):正常 settle 在 `recvMessage` 之 return,異常清理在 `rejectPendings` | emitError、terminate、messageerror 皆經 rejectPendings;不經對外之 ev |
| 死後呼叫之 reject 原因 | `wrapWorker` 之 `errDead` | 建立失敗、terminate 處設定;崩潰沿用 `worker is dead` |
| 呼叫函數之產生 | `wrapWorker` 之 `genCaller(funName)` | funNames 以字串鍵掛到 ev;不宣告具名函數 |
| inner 與 outer 之訊息協定 | outer `recvMessage` 之 mode:`emit`(事件)、`return`(呼叫結果)、`messageerror`(worker 端收不到宿主訊息);非協定訊息(含 null)略過 | 新增 mode 須兩端同改並補測試 |
| inner 之送出與無法複製之兜底 | inner `sendMessage(data, desc)` | 送出原語(csm)只在其內;新增送出點一律經它並給描述 |
| inner 初始化失敗之記錄 | inner `initFail` | call 分支以其原始錯誤回應 |
| 使用者模組之執行與預設匯出 | inner 模板之 CommonJS 模組包裝(`mdUser` → `mdDefault`) | 新增輸出形狀時不加文字比對;以 `__esModule` 與 module.exports 判定 |
| 方法呼叫之 this | inner `run` 之 `Reflect.apply(fun, ${cthis}, input)` | 唯一呼叫點 |
| funNames 之保留名 | `funNamesReserved`(由 eventemitter3 原型與實例推導) | 不手寫清單 |
| worker 建置期檢查 | `rollupWorkerCore` 之參數檢查、匯出檢查(`rollupFileCore` 之 exports)、`vm.Script` 語法檢查 | 新增可於建置期判定之錯誤一律在此 |
| rollup chunk 資訊之取得 | `rollupFileCore`(內部函數) | 不經公開 opt 交出 |
| 回傳程式碼模式之產出 | `rollupFileCore` 之 `bundle.generate` | 不寫檔;多項即 reject |
| 建置期檢查(引用、import.meta、worker inner) | `src/buildCheck.mjs` 之 `genBuildCheck`(onwarn 記錄、外掛於 renderChunk 依產物判定) | 新增可依產物判定之建置期錯誤一律在此,以 `this.error` 拋 RollupError 並給 pluginCode;依本套件之 rollup ^4.67.4 之外掛 API(2026-11-11 pt395 前為「只用 3.20 起即有之 API」) |
| 清空資料夾 | `src/buildCheck.mjs` 之 `cleanFolderStrict` | cleanFolder 與 rollupFiles 皆經它;不得再直呼 `w.fsCleanFolder` |
| 瀏覽器 blob URL 之釋放 | outer `revokeUrlBlob`(nodejs 為空函數)＋inner 開頭自行 revoke | emitFatal、terminate 皆經它 |
| 產製 API 之暫存檔清理 | `src/wptCommon.mjs` 之 `rmTempFile`(R20),由各 API 之 finally 呼叫 | 不得 catch 主錯誤;失敗只留一行警告,不印 Error 物件、不拋 |
| 產製 API 之錯誤物件(`WPT_` 碼) | `src/wptCommon.mjs` 之 `wptError`、`rejectWpt`(R19) | 不得 `Promise.reject('字串')`、`throw '字串'`;新增錯誤一律給 `WPT_` 碼 |
| parfor 整批結束與 terminate | `src/parfor.mjs` 之 `finish` | 所有異常路徑皆經此 |
| outer/inner 模板 | `addOuterWebWorkerCode`/`addInnerWebWorkerCode` | 兩模板之同族註解須對稱處置 |
| runin both 合併 | `src/rollupWorker.mjs` 之 mergeBoth | |
| 宿主隔離之量測 | `test/tools/hostProbe.mjs` | 兩測試檔共用,勿另寫近似實作;子程序之啟動經 `test/tools/childRun.mjs` |
| 乾淨子程序(宿主能否自行退出、輸出通道、cwd 副作用、execArgv) | `test/tools/childRun.mjs`(opt.cwd、opt.execArgv) | CommonJS `-e`;逾時以 timedOut 回報 |
| 攔截 worker_threads.Worker(建立失敗、取得實體、等待結束) | `test/tools/workerCtor.mjs` 之 withCtorFail、withCtorSpy、waitExit | 勿於測試檔內另寫 |
| 瀏覽器端之模擬 | `test/tools/browserSim.mjs` | vm 頁面＋worker 兩 context;記錄 URL 建立/撤銷與 terminate |
| worker 作用域、匯出、選項之 fixture | `test/tools/workerFx.mjs` | unit 與 e2e 共用;格號 S## 對應 R7、R11–R13 |
| 真瀏覽器 | `test/e2e-workerBrowser.test.mjs`(Playwright,devDependency) | 見六 |

## 三、測試須有哪些(由規格產出)

| 項目 | 說明 | 流程/護欄 | 檔案 |
|---|---|---|---|
| 宿主隔離(R1) | 各型產物 import 不增宿主 process 監聽;宿主錯誤只由 Node 印一次並 exit 1 | ①乾淨子程序,且以 **CommonJS `-e`** 起(`--input-type=module` 會被子程序內之 eval worker 繼承而壞掉)②全部事件增量,非絕對值 ③子程序回報匯出型別作正向對照 ④錯誤先建立再拋,計 `Error: <訊息>` 行 ⑤只計數之子程序主動 exit ⑥spawnSync 帶 timeout ⑦產物明文靜態守門 | `test/rollupWorker.test.mjs`、`test/rollupParfor.test.mjs`、`test/tools/hostProbe.mjs` |
| 生命週期(R3 ①~④) | terminate 時 pending、terminate 後呼叫、三模式建立失敗 | 持久實體須取新實例(`impCopy` 複製為新檔名再 import,UMD 以檔名快取);建立失敗以 `withCtorFail` 暫換 `worker_threads.Worker`(UMD 於呼叫時才取用模組物件之 Worker),finally 必還原 | `test/rollupWorker.test.mjs` |
| messageerror(R3 ⑤) | 兩方向 × 持久／每次新建 | 真實之反序列化失敗難以製造,以 Node 於該情形發出之事件模擬:宿主端以 `withCtorSpy` 攔截 Worker 建構取得實體後 `emit('messageerror', err)`;worker 端由 fixture(`tmsgerr`)於 worker 內 `parentPort.emit('messageerror', err)`;斷言 reject、error 事件、之後仍可呼叫 | `test/rollupWorker.test.mjs`、`test-code-in/gWorker7_ObjCrash.mjs`、`test-code-in/gWorker8_FunCrash.mjs`(`hang`) |
| 作用域與預設匯出(R7) | 使用者頂層宣告 × inner 名稱(S01–S07)、bMinify/keepFnames/eval/opt.name(S08–S12)、worker 全域遮蔽(S13、S14)、雙向隔離(S15、S16)、匯出形狀(S24–S31)、嚴格模式與 module(S17、S18、S21–S23) | nodejs 以乾淨子程序(`childRun`,呼叫後不主動 exit,以能否自行結束判 worker 遺留;S23 帶 `execArgv: ['--pending-deprecation']` 驗 stderr 無 DEP0111);browser 以 vm 模擬;以 settle 4 秒判懸置;產製前刪檔、失敗時斷言不產出 | `test/unit-workerScope.test.mjs`、`test/tools/workerFx.mjs`、`test/rollupWorker.test.mjs`(R7 2 條) |
| 選項與建置期檢查(R11、R12) | funNames 與 outer 內部名稱(S43、S46)、對外介面保留名(S44、S45)、非字串、evNames × 實體模式(S47、S48)、evName 含引號(S49)、opt.name(S41、S42)、缺預設匯出(S26、S27) | 斷言 reject 訊息含關鍵字且 `exists === false`;S43 以子程序能自行結束證 worker 終止 | `test/unit-workerScope.test.mjs` |
| this 與不存在之方法(R13) | S19、S20、S52、S53 | 兩 runin;工廠呼叫後 terminate | `test/unit-workerScope.test.mjs` |
| 回傳程式碼模式與路徑(R14) | 見 R14 之測試 | 每案一個隔離 cwd(含 package.json)於乾淨子程序呼叫,比對呼叫前後 `readdirSync('.')`;sourceMappingURL 以 `/\/\/# sourceMappingURL=(?!data:)/` 判(data: 內嵌自足,不屬之);逐位元組對照取寫檔模式 bSourcemap false 之產物 | `test/unit-rollupFileReturnCode.test.mjs` |
| opt 不被改寫(R15) | rollupCode 呼叫前後 opt 之 JSON 相同 | | `test/unit-rollupFileReturnCode.test.mjs` |
| rollupCode 產物(R15;2026-11-11 pt395 改寫 2 案) | gVue1(.vue → 預設 umd、壓縮):單行(terser 預設輸出,壓縮之可觀察表現)、元件選項(props 型別與預設值、data、methods 與 mounted 之呼叫輸出,鍵不依順序)、render 以假 vm 呼叫得與 template 相同之節點樹、`_scopeId` 與同雜湊之樣式 id、beforeCreate 注入一個含文字之 style、非 SSR/functional、無 CommonJS 時掛全域名;gAsync2(es、targets new、壓縮):無 import(相依已打包)、預設匯出、**預設匯出本身為 AsyncFunction** 且無 regenerator、以 data: URL 載入呼叫得原始碼之回傳值 | 語意斷言版本中立:rollup 3.30.0 與 4.67.4 皆 5/5(原以長度與逐字比對預期檔,rollup 4 剪除 normalizeComponent 之 SSR/shadow/functional 分支、內聯常數別名而轉紅)。外審 terra F5 之反例(方法改輸出、預設匯出改為同步函數而另放無關 async 函數)以變體輸入實跑:強化後 2 案皆紅。**驗不到**:真 vue 2 之掛載、資料更新、DOM patch、scoped 屬性之套用與 CSS 解析(`test-code-in/gVue1.vue` 之 scoped style 為空),由下游 w-component-vue 之真瀏覽器冒煙補;gBase1、gBase2、gAsync1 仍逐字比對 `test-code-out-cp`(現狀指紋,rollup 4 下位元組相同,已知缺口) | `test/rollupCode.test.mjs` |
| 真瀏覽器(R7、R11、R13、R9 iife) | 15 案(見六) | 每案新瀏覽器;page.route 供檔不開埠;真滑鼠點擊後讀畫面文字;頁面內 6 秒判 hang;斷言無 pageerror | `test/e2e-workerBrowser.test.mjs` |
| parfor fail-fast(R8) | 中途 exit(0)、cb 拋錯、job 不可複製、建立失敗、worker 端反序列化失敗(協定第 6 條) | 一律以 5 秒 settle 判懸置;建立失敗以 `syncBuiltinESMExports()` 令 parfor.mjs 之 ESM 具名匯入同步替換之 Worker,finally 還原;worker 端 messageerror 以計時器發出(同步 emit 會被 entry 之 try 接住而變單 job 失敗) | `test/parfor.test.mjs`、`test/fixtures/parfor_worker.mjs`(`exit0`、`msgerr` job) |
| 結構化複製失敗(R3 ⑥⑦) | worker 送出之回傳值、reject 值、事件內容(路徑內/外)、初始化錯誤;宿主送出之呼叫引數、工廠初始化引數 | 須先紅:回傳/reject 值斷言新訊息前綴與下一呼叫可用(修前已以空訊息 Error reject);事件須於呼叫路徑外(計時器)emit 才測得到崩潰;引數案以 withCtorSpy＋waitExit 驗該 worker 被終止,持久實體以 terminate 後未處理 rejection 數為 0 驗不殘留 pending | `test/rollupWorker.test.mjs`、`test-code-in/gWorker9_FunClone.mjs`(工廠)、`test-code-in/gWorker8_FunCrash.mjs`(`retfn`) |
| 產製 API 錯誤回報(R9) | 七個產製 API 失敗皆 reject;iife × nodejs/both reject | 缺漏模組以**相對路徑**引用;暫存資料夾 `test/_tmp/buildError`、`test/_tmp/buildIife`;攔截 console 斷言無 ENOENT;斷言 cwd 無 temp-* 殘留 | `test/unit-buildError.test.mjs` |
| 引用類建置期檢查(R16) | 裸名/子路徑/動態/不存在之 `node:` × 入口(rollupFile、rollupFiles、rollupCode、rollupWorkerCore、rollupWorker);內建豁免;external 全名/RegExp;tree-shaking 移除與受守衛之選用相依不擋;iife、瀏覽器+bNodePolyfill 之內建;動態 require 樁(未受守衛 reject、try 內只警告、typeof 不計);瀏覽器 inner 之外部引用與 free require | 每案先刪目標後建置,失敗時斷言 `exists === false`;錯誤碼以 `e.pluginCode \|\| e.code` 斷言;resolve 者載入產物呼叫斷言值(端到端);fixture 與假套件(`node_modules/fakelib-se`,sideEffects:false)落 `test/_tmp/buildCheck/`;產物名須為合法識別子(iife 之全域名) | `test/unit-buildCheck.test.mjs` |
| import.meta 類建置期檢查(R17) | 頂層各宣告形式(rollup 4 改名者照常、`location` reject)、跨模組、頂層區塊/for/箭頭參數、函數參數(含 `location`)、區域、catch 參數 × umd/cjs;genBuildCheck 同輸入只改輸出綁定之對照;被打包 commonjs 相依之頂層 var;非 url 屬性未受守衛、別名、解構、計算屬性、寫入 × umd/cjs/iife;對照(cjs 頂層、只 `__dirname`、改名、document/URL、未使用之宣告、class static block、受守衛、死碼);worker inner(url reject、只判斷存在之守衛照常) | resolve 者載入產物斷言取得之位置為產物所在資料夾或 `pathToFileURL(產物)`;class static block 一格守 eslint-scope 版本(5.1.1 會誤判) | `test/unit-buildCheck.test.mjs` |
| 拒絕值形狀(R19) | 27 個字串拒絕站點(＋間接站點 29)逐站改為帶碼 Error(`instanceof Error`、`code`、訊息與原字串逐字相同、堆疊含呼叫處框);`cleanFolderStrict` 訊息格式(絕對路徑、code、syscall、attempts,不含 Node 之 `message`)與 Windows 非 ASCII 路徑下不含亂碼;靜態守門(`src` 無字串 reject/throw) | 站點 4(不可達)以 `src` 副本注入使 `generate` 多回一項;站點 26 以注入 `vm.Script`;站點 27 以新產製之 parfor 產物呼叫;訊息以逐字相等斷言(w-pksupdate 固定字串清單依賴);亂碼路徑以子程序 cwd 占用製造(Windows;POSIX 以假 `w` 斷言格式);fixture 落 `test/_tmp/rejectShape/` 由測試自刪 | `test/unit-rejectShape.test.mjs` |
| 暫存檔清理失敗之留痕(R20) | 三個 API × 清理持續失敗(一行警告/檔、含絕對路徑與 code、無亂碼訊息、無堆疊框、不印 Error 物件、建置結果不變)/暫時失敗重試後成功(無警告)/建置失敗兼清理失敗(reject 真因、警告照留) | 注入 `fs.rmSync` 於暫存檔路徑拋 EPERM(帶亂碼訊息)並還原於 finally;攔截 `console.log` 逐引數檢查型別;`mocha --no-parallel` 下不互相干擾 | `test/unit-tempCleanup.test.mjs` |
| 清空失敗即錯誤(R18) | 不存在可建立、目標為檔案、上層為檔案、未給、根目錄/cwd/上層、目標為連結、懸空 junction、被占用(持續→拋、中途釋放→成功)、並發清空、裸呼叫腳本離開碼、rollupFiles(為檔案、被占用) | 被占用以子程序之工作目錄製造(Windows;POSIX skip);中途釋放由子程序自行結束(同步重試期間本行程計時器不觸發);並發以 3 子程序清 2,500 檔 | `test/unit-cleanFolder.test.mjs` |
| 瀏覽器端(R3、R9、R10) | iife × browser 可用;無法複製不懸置;blob URL 於各路徑撤銷;執行期錯誤主動終止 | vm 模擬(`test/tools/browserSim.mjs`),撤銷記錄撤銷者(page/worker),載入前撤銷視為載入失敗 | `test/rollupWorker.test.mjs`、`test/rollupParfor.test.mjs` |
| 診斷輸出通道(R2) | monitor 走 stderr | 乾淨子程序,崩潰後稍候 500ms(worker stdio 非同步轉送) | `test/rollupWorker.test.mjs` |
| 產物須確實產出 | 建置失敗時不覆寫目標檔 | 產製前先刪目標檔,產後斷言存在且非空 | 各 before |
| worker 失敗 settle(R3) | 崩潰、exit(0)、exit(5)、死後呼叫 | settle 4 秒內須有結果 | `test/rollupWorker.test.mjs` |
| async cb(R4) | 見 R4 | | `test/rollupParfor.test.mjs` |
| 發布前閘門(模板變更時) | 下游全部 worker 產製(2026-10-13 為 10 處:w-pubsub 2、w-json-stream、w-cluster、w-gis、w-converhp 3、w-component-vue 2 之 rollupWorkerCore 直呼)以新 src 重產,Node 與真 Chromium 之呼叫結果與修前逐項相同 | 他 repo 唯讀,參數照抄其 toolg,產物落 `./tmp/`;w-pubsub 須起 server(埠 8700–8749 內)、子程序 NODE_PATH 指其 node_modules;未壓縮產物含隨機暫存名,逐位元組比對前正規化 `temp[A-Za-z0-9]{20,}` | 臨時腳本(不入版控;作法見 `sgud/exp/experience.md` 十六) |
| babel 轉譯隔離(R25) | 使用端設定 10 種(含 browserslist 兩檔並存、`BROWSERSLIST` 無效)不影響產物;id 篩選表同 plugin-babel 6.1.0;保留 ES 模組語法;caller 逐鍵同 6.1.0;sourcemap 行對應;使用端根目錄有 Babel 7 時仍用本套件之 core、preset-env、transform-runtime(計數呼叫) | 乾淨子程序以假使用端資料夾為 cwd;以「函數本體是否被重印」判定是否經 babel(頂層 `let` 會被 rollup 補分號,不可作觀察點);假 Babel 7 被載入即拋錯;本套件之 Babel 8 以轉接模組巢狀安裝;修前紅燈須於 HEAD 副本(Babel 7 之 node_modules)跑,因本 repo 之 node_modules 已換 Babel 8 | `test/unit-rollupBabel.test.mjs` |
| 相依升版之下游等價(R25 類) | 改相依或建置設定時,下游套件之建置列產物與改前逐位元組相同 | 下游以 `git ls-files` 自工作樹逐位元組建副本(不用 `git archive`)、`npm ci --min-release-age=0`、先跑改前基準並快照、再 `npm i -D <tgz>`;同路徑之改前基準與改後比(含路徑相依之 `data-v-*` 雜湊與內嵌絕對路徑者,對正式 repo 只能正規化後比);跑全套、lint 對照 | 臨時腳本(作法見 `sgud/exp/experience.md` 二十四) |

**紅燈之跑法**:新測試須先證其能分辨修前與修後。src 已改者**不用 stash/checkout**:以 `git show HEAD:src/<檔>` 把 `git ls-files src` 全部取出至 `./tmp/<案名>/head/src`,把工作區之 `test`、`test-code-in`、`test-code-out-cp`、`package.json` 複製至該副本根目錄,以副本為 cwd 跑 mocha(測試以 `../src` 引用副本之 src;node_modules 由上層解析)——各測試檔以 `path.resolve('./src/…')` 取模組者亦因 cwd 而指向副本。改碼前之紅燈若會遺留存活 worker(懸置之持久實體、懸置之 parfor),以 `mocha --exit` 跑,否則 mocha 不結束;綠燈則不加 `--exit` 跑一次,能自行結束即證明無遺留。**測試行程執行中(含啟動載入之數十秒)不得改任何受測檔案**(2026-10-13 曾因此載入半改之模板而產出壞產物)。

## 四、已知缺陷與限制(未修)

### 四之一、缺陷(待討論)

原列六項(吞建置錯誤與 iife、inner 回傳值不可複製、呼叫引數不可複製、parfor worker 端反序列化失敗、blob URL 未 revoke、monitor 走 stdout)已於 2026-10-13 修畢,見 R2、R3 ⑥⑦、R8、R9、R10 與五;其後列之「rollupFile 回傳模式遺留 `temp-<id>.map`」與「inner 與使用者 bundle 共用 CJS 頂層作用域」已於 2026-10-13 run02 修畢,見 R14、R7(原敘述「terser 對 CJS 預設不改頂層名稱」有誤:terser 之 cjs 為 `toplevel:true`,但 keepFnames、直接 eval、mangleReserved 時保留頂層名稱,見 R7 理由)。

| 缺陷 | 位置 | 建議分類 |
|---|---|---|
| w-pksupdate 之 ectScripts 原忽略 exit code、只搜 `[RollupError]`,非 RollupError 類之產製失敗(字串 reject、fs 錯誤)偵測不到 | 他 repo:w-pksupdate `src/ectScripts.mjs`(當版 `detectPrintedFailure`,其 R15 以堆疊框與固定字串判定) | 本套件側已於 2026-10-17 改字串 reject 為帶碼 Error 並使清理失敗不印 Error 物件(R19、R20);其餘屬該 repo |
| (已修,2026-10-17 run01)rollupCode 之輸入暫存檔清理以 `unlinkSync` 並印出 Error 物件,與 R9 ② 之 `rmSync force` 寫法不一致 | 原 `src/rollupCode.mjs:138-148` | 已齊為 `rmTempFile`(R20) |
| rollupFile 未呼叫 `bundle.close()` | `src/rollupFile.mjs` 之 generate/write 後 | 已知不修(全 src 無 closeBundle 外掛,現無後果;依 Rollup 文件應呼叫) |
| (2026-11-11 pt395 外審 terra F1)**壓縮後墊片被改綁**:預設參數使用 `import.meta.url`、函數本體另以 `var` 宣告 `__filename`(umd 另 `location`)時,未壓縮產物正確且 R17② 正確放行(預設參數之作用域看不到本體之 `var`),terser 卻把預設參數內之全域參照改名為本體宣告之短名,產物載入呼叫即 `ReferenceError`;建置期檢查在 terser 之前,看不到 | terser(5.16.8、5.46.1、5.51.2 皆重現,`tmp` 實測;rollup 3.30.0 亦然,非本輪引入);`src/rollupFile.mjs:385`(檢查外掛)、`:393`(terser 在其後) | 待裁示:於 terser 之後加「墊片之全域參照未被改綁」之完整性檢查(與下一列之錨點收緊同輪),或接受為第三方限制。自有套件原始碼中預設參數使用 `import.meta.url` 者 0 處(2026-11-11 全庫 `src` 搜尋) |
| (2026-11-11 pt395 外審 terra F3)**墊片錨點過寬**:`findShimRanges` 把任何 `.pathToFileURL(__filename)` 呼叫當墊片(未確認為 rollup 之 `require('u' + 'rl')` 形),使用者自己之此類呼叫位於參數 `__filename` 之函數內即被誤擋;又只要找到 1 個錨點即不觸發 `WPT_IMPORT_META_SHIM_UNKNOWN`,真墊片改形而另有使用者呼叫時 fail-closed 失效 | `src/buildCheck.mjs:250-267`、`:500-503`;rollup 3.30.0 與 4.67.4 皆然 | 待裁示(與上一列同輪):錨點限 rollup 之墊片形並逐處核對。自有套件原始碼中 `pathToFileURL(__filename)` 只出現於註解(2026-11-11 全庫 `src` 搜尋) |

### 四之二、設計限制(文件化,不修)

| 限制 | 說明 |
|---|---|
| 宿主不得以 `--input-type=module` 啟動 | inner 以 `new Worker(code, { eval: true })` 執行,eval 字串預設以 CommonJS 解析,inner 依此設計使用 `require`(`src/rollupWorkerCore.mjs:73-79` 註解)。eval 字串之格式**與 package.json 之 type 無關,僅由 `--input-type` 決定**(2026-10-13 實測:cwd 在 `type:"module"` 目錄時 eval worker 內 `typeof require` 仍為 function;宿主帶 `--input-type=module` 時 worker 拋 `require is not defined in ES module scope`)。worker 預設繼承宿主 execArgv,故該啟動方式不支援(使用者 2026-10-13 裁示屬非設計之支援範圍) |
| messageerror 整批 reject(R3 ⑤) | 無法得知失敗訊息屬哪個呼叫,持久與工廠模式同時進行中之其他呼叫一併 reject(可能其實已成功,含副作用者會被誤報失敗),其後到之回傳略過;序號法可精確歸屬但不實作(理由見 R3 ⑤) |
| parfor 之 worker entry 未實作協定第 6 條 | job 於 worker 端反序列化失敗時整批懸置(主程序無從得知);實作者整批 fail-fast |
| 無法複製之事件內容改發 error 事件 | 原事件不送達;呼叫端未監聽 error 時(eventemitter3 不拋)該說明亦遺失 |
| worker 內使用者程式碼註冊 `process.on('uncaughtException')`,或瀏覽器 `error` 事件呼叫 `preventDefault`(S50) | 錯誤不會使 worker 結束,外層收不到 error/exit,呼叫懸置(nodejs、真 Chromium 實測)。inner 依 R2 刻意不註冊吞噬型監聽,outer 無逾時;JSDoc 載明 |
| 瀏覽器 worker 內以 `self.close()` 自行結束(S51) | 瀏覽器無 exit 事件,外層無從得知,呼叫懸置;nodejs 之 `process.exit` 則以 `worker exit, code[n]` reject(兩端不對稱);JSDoc 載明 |
| evNames 只支援工廠(R12) | type object 不轉送事件(建置期 reject,JSDoc 載明);function ByInstance 無可監聽之回傳物件 |
| rollupCode 之輸入暫存檔寫在 cwd(R14 殘餘) | `./temp-<id>-<name>.js`(`src/rollupCode.mjs:108-111`,供合併碼之相對路徑解析),finally 刪除;cwd 唯讀時 rollupCode、rollupWorker、rollupWorkerCore、rollupParfor 仍失敗;行程中止於其間則殘留 |
| rollupFile 恆讀 cwd 之 package.json | banner 用,回傳模式與 `bBanner:false` 亦讀;cwd 無 package.json 即 reject ENOENT(可選改為 bBanner 為真才讀,未做) |
| 未壓縮產物不可重現(逐位元組) | rollupCode 之輸入暫存檔名含隨機 id,commonjs 外掛以檔名衍生變數名(`temp<隨機>`),bMinify false 之產物每次建置不同(修前即如此;壓縮後被 mangle 而相同) |
| 以具名匯入取 CJS 模組不存在之匯出得 undefined(R16 外) | commonjs 互通無法靜態得知 CJS 之匯出;Node 原生 ESM 為 SyntaxError。建置不擋 |
| umd/cjs 之 `import.meta.url` 為產物檔之 URL(R17) | 非原始碼位置(打包後模組位置為 bundle 所在資料夾);iife 依 `document.currentScript`,於 Node 或瀏覽器 worker 載入即 `document is not defined`。umd 之墊片依宿主全域選分支(rollup 3.30.0 與 4.67.4 皆然,2026-11-11 外審 terra F2):classic worker 以 `importScripts` 載入 umd 時得 worker 本身之 `location.href`(非該 umd 檔),Node 宿主若有全域 `location` 亦得該值;cjs 不受 `location` 影響 |
| rollupFile 直呼之 iife × 明列之 Node 外部模組 | external 以全域識別子傳入,Node 端載入即 ReferenceError(w-batch 以 `toolg/assignNodePks.mjs` 後處理,刻意);未明列者建置即失敗(R16 ②) |
| runin browser 之一般產物引用 Node 內建模組 | Node 端可用(全庫 23 套件以此建 Node 用之 umd),瀏覽器分支取全域為 undefined;屬呼叫端以 runin、external、bNodePolyfill 設定之責任(R16 ①豁免) |
| 非字面值之動態 `import(變數)`、try 內之字面 `require`(commonjs 預設保留原生) | 不經解析,建置不擋(R16 已知限制) |
| 清空失敗時已刪之項目不還原;同一輸出資料夾之並發建置不支援 | 同 vite、webpack(R18 已知限制) |

## 五、破壞性變更紀錄

| 日期 | 變更 | 可觀察差異 | 生效條件 |
|---|---|---|---|
| 2026-11-11 任務20261111182635 pt395(1.1.25 之後,未發布) | rollup 3.30.0 → 4.67.4、`@rollup/plugin-commonjs` 24 → 29.0.3、`-node-resolve` 15 → 16.0.3、`-replace` 5 → 6.0.3、`-terser` 0.4 → 1.0.2(terser 5.51.2)、`-json` 宣告 ^6.1.0;`@babel/eslint-parser` lock 7.28.6 → 7.29.9(宣告不變);R17②之判定程式不變 | 產物程式碼改變、行為不變:rollup 4 依呼叫端常數剪除分支、內聯常數別名(4 包下游:wsemi −0.69%、w-component-vue −0.41%、Node 端 umd −0.42%;含 worker 之包 +3.55%,因其 lock 之 terser 5.16.8 換成 5.51.2,同 terser 下 rollup 4 −206 bytes);commonjs 29 之 `strictRequires` 預設由 `"auto"` 改 `true`(CJS 相依包於函數、首次 require 時執行;依賴舊提升順序者結果可能不同,外審夾具實測 `not-ready` → `ready`);node-resolve 16 於 `exports` 條件加入 `production`(`NODE_ENV` 為其他值時 `development`),帶此條件之相依改取該入口(全庫已提交 dist 之 152 個 `.map` 內被打包者 0 個帶此條件);replace 6 只替換完整識別子(`$process.env.NODE_ENV` 不再誤替換);建置期檢查之錯誤訊息前加 `[plugin wpt-build-check] `(仍為 RollupError、pluginCode 不變);rollup 4 依平台載入 optional 之原生二進位(`--omit=optional` 或跨平台複製 node_modules 即無法載入);`.map` 不再有 `sourcesContent` 鍵(原為 null)、`sources`/`names`/`mappings`/`x_google_ignoreList` 改變;建置訊息(循環相依、瀏覽器包含 Node 內建模組)相同;umd 頂層宣告 `__filename` 由建置失敗(`WPT_IMPORT_META_SHIM`)改為照常(rollup 4 改名避讓),umd 頂層 `location` 與非模組作用域之同名宣告照舊失敗;逐字或長度比對產物之測試會轉紅 | 各套件升級 w-package-tools 後重建;使用端根目錄之 rollup 3 不影響(npm 巢狀安裝 4) |
| 2026-11-10 任務20261110095259 bb02(1.1.24 之後,未發布) | R25:Babel 7 → 8(`@babel/core` 8.1.0 等);建置不再讀使用端之 babel 設定與 browserslist 設定;`@rollup/plugin-babel` 換成自帶 `src/rollupBabel.mjs`;移除 `@babel/cli`、`@babel/node`、`@babel/register`、`@babel/plugin-transform-regenerator`、`@babel/polyfill`、`core-js`、`@rollup/plugin-babel`、`@babel/plugin-proposal-export-default-from` 相依 | 下游產物 JS 不變、`.map` 之 `names`/`mappings` 改變;使用端之 `.babelignore` 不再生效(所列之檔照常轉譯);使用端之 browserslist 設定與 `BROWSERSLIST` 不再被讀(原本兩檔並存或查詢無效會使建置失敗);自由全域 `regeneratorRuntime` 不再被改寫(執行期才失敗;現有產物 0 個依賴);舊 `assert { type }` 語法不再可解析;preset-env bugfix 外掛恆開;非標準 `export v from 'mod'` 不再可建置;原始碼之 `import 'core-js'` 不再展開;使用端標準版 `babel.config.js` 會使使用端之 eslint 解析失敗(`Cannot find module`),須依 README 改(無 vue-cli 者改空、有 vue-cli 者刪 export-default-from 一列);Node 須 `^22.18.0 \|\| >=24.11.0`;直接使用 `@babel/core`(且依賴本套件提供)之使用端腳本改得 Babel 8 API | 使用端升級本套件後 |
| 2026-11-02 任務20261102100136 wpt268(1.1.22 之後,未發布) | R21:`genDocsExams` 移除 `opt.fdLibs`、`opt.fdNodeModules`、`opt.bCopyDist`、`opt.bDistMap`,回傳與摘要列不再含 `dist`、`libs`;引用其他自有套件者**一律改寫為 `https://<擁有者>.github.io/<名>/dist/<檔>`**(不再複製至 `docs/libs/`,不再讀 `node_modules`,本機有無皆然);「本機找不到」警告消失,新增「擁有者不明」「路徑非單純 `/dist/<檔>`」兩種保留原網址之警告。R23:`bin/gh-pages.mjs` 移除提供專案 `./dist/`(`--no-dist`、`--dist-map`、`[gh-pages] 專案 dist:` 說明行、衝突與連結警告)。R24:新增 `src/genDocsDist.mjs`(`genDocsDist`)與內部 `src/docsCommon.mjs` | 各套件重跑 `gDocsExams` 後 `docs/libs/` 不再產生,他自有套件改為 gh-pages 網址;傳入已移除之鍵不報錯、不生效;`gh-pages -d docs` 部署內容＝`docs/`(專案根 `./dist/` 不再被帶入,站台 `dist/` 須由 `docs/dist/` 提供,即各套件須於 `script.txt` 加 `node toolg/genDocsDist.mjs`);已發布之 1.1.22 版 `bin/gh-pages` 仍會帶入專案根 `./dist/`(無 `.map`),各套件升級至本版並新增 `genDocsDist` 後,站台 `dist/` 改由 `docs/dist/`(含 `.map`)提供 | 下游以新版 w-package-tools 執行 `gDocsExams`／`npm run deploy` 時;`genDocsDist` 須各套件新增 `toolg/genDocsDist.mjs` 並由主控插入 `script.txt` |
| 2026-11-01 任務20261101202155 wpt257(1.1.21 之後,未發布) | R22:`modifyReadme` 新增「README 內自有套件 `/dist/` 之 CDN 網址改為 gh-pages 網址」;內容無變動時不寫檔;回傳值由 `undefined` 改為 `{ changed, rewrites, warnings }`;取不到 GitHub 擁有者時印一行 `warning:`(不拋錯) | 各套件執行未改之 `toolg/modifyReadme.mjs` 後,README 之 `https://cdn.jsdelivr.net/npm/<名>@<版號>/dist/<檔>` 變為 `https://<擁有者>.github.io/<名>/dist/<檔>`(w-fft、w-aggrid-vue 複本實跑各 1 行);徽章與非 `/dist/` 路徑不動;原「`<名>@x.y.z` 換現行版號」維持;呼叫端皆忽略回傳值(各套件 toolg 為 `modifyReadme()` 裸呼叫);**指向之 gh-pages `dist/` 須由 genDocsExams(R21)部署,否則 README 之網址 404** | 下游以新版 w-package-tools 執行各自之 `toolg/modifyReadme.mjs` 時 |
| 2026-11-01 同上 | R21:新增 `src/genDocsExams.mjs`、內部 `src/ownPkg.mjs`(新增檔,不改既有函數) | 無既有行為變更;各套件 `toolg/gDocsExams.mjs`、`gDocExams.mjs` 改呼叫它後,`docs/examples` 之 `../dist/…` 引用由 R23 部署時提供之站台 `dist/` 滿足、他自有套件改由 `docs/libs`(或本機無檔時 gh-pages 網址)提供,不再產 `cdn.jsdelivr.net/npm/<名>@<現行版號>` | 各套件改 `toolg`(主控批次) |
| 2026-11-01 任務20261101202155 wpt257b(同上未發布版之修正,對 wpt257 版 genDocsExams 的差異) | R21:`genDocsExams` 預設**不再複製 dist**(新增 `opt.bCopyDist`,預設 `false`;wpt257 版預設複製);與 dist 有關之警告預設不再發生;新增 `opt.bInplace`(預設 `true`)原地改寫 `fdTar` 內既有文字檔,回傳多 `inplace`;本機找不到之他自有套件 `/dist/<檔>` 由「保留原網址＋警告」改為「改寫為擁有者之 gh-pages 網址＋警告」;`PATH_OVERLAP` 對 `fdTarDist` 只在 `bCopyDist` 時檢查;主控台警告歸併為 `warning xN:`。R23:`bin/gh-pages.mjs` 部署時新增提供專案 `./dist/`(`--no-dist`、`--dist-map`) | wpt257 版尚未發布,對外無破壞;對 `bin/gh-pages` 之既有使用者:有 `./dist/` 且非空之專案,部署內容多出 `dist/`(此為規格規則 1 之目的),可用 `--no-dist` 停用 | 下游以新版 w-package-tools 執行 `npm run deploy` 時生效 |
| 2026-10-17 任務20261017051850 run01(1.1.20 之後) | R19 P1:27 個字串 reject 站點改為帶 `WPT_` 碼之 Error 物件(訊息文字不變);rollupParfor 產物(模板)之 `cb is not a function…` 同 | 拒絕值 `typeof` 由 `string` 變 `object`:`console.log(err)` 仍含原訊息,另多堆疊框與 `code: 'WPT_…'` 行(w-pksupdate 之 R15 因此可由結構判為建置失敗,不再只靠固定字串);`String(err)` 多 `Error: ` 前綴;`err.message` 由 `undefined` 變原訊息;`typeof err === 'string'`、`err.includes(…)`、`err === '…'` 類判斷失效——全庫(`C:\opensrc` 排除 node_modules/dist/docs/tmp,引用 `w-package-tools` 之 564 個檔案)此類判斷 0 處,catch 處理器 53 個中 50 個只印出、其餘 3 個與本套件拒絕值無關 | 產製端直接生效;parfor 產物之 `WPT_PARFOR_NO_CB` 於下游重新產製時生效 |
| 同上 | R19 P2:`cleanFolderStrict` 之錯誤訊息改以絕對路徑、`code`、`syscall`、嘗試次數組成,不再引用 Node 的 `message`;錯誤帶 `code: 'WPT_CLEAN_FOLDER'` | 原 `can not clean folder[./dist]: EPERM, Permission denied: \\?\C:\opensrc\¶}·½-JS-…`(相對路徑＋亂碼)改為 `can not clean folder[C:\opensrc\開源-JS-…\dist]: code[EPERM] syscall[rm] attempts[11]`;字串回報者(目標為檔案)為 `can not clean folder[<絕對路徑>]: input path is not a folder`;w-pksupdate 之固定字串 `can not clean folder[` 仍命中 | 產製端直接生效 |
| 同上 | R20 P3:暫存檔清理失敗(建置已成功)不再 `console.log(err)`,改為 EBUSY/EPERM 重試 3 次後仍失敗才印一行警告(含絕對路徑與 code);rollupCode 之輸入暫存檔清理由 `unlinkSync` 齊為 `rmSync force` | 清理失敗時輸出由整個 Error 物件(含堆疊框,被 w-pksupdate R15 誤判為建置失敗)變為單行 `warning: temp file[…] was not removed: code[…] syscall[…]; …`;暫時占用(防毒掃描等)由印出錯誤變為重試後靜默成功;外力先行刪除暫存檔時 rollupCode 不再印 ENOENT | 產製端直接生效 |
| 同上 | P4:內附 wsemip、wpf、wpf_pmSeries 1.9.17 → 1.9.18 | 對本套件無可觀察差異(差異探測：wsemip 純函數/fs/清空/注入共 3268 格 0 差異,pm 32 格僅 `fns` 為物件容器之誤用輸入 6 格有差,下游 0 處傳物件;wpf 184 格無穩定差異);全套 198 → 284 passing(新增 unit-rejectShape 68、unit-tempCleanup 17、unit-wsemipContract +1) | 產製端直接生效;parfor 產物於下游重新產製時 |
| 同上(外審 opus1、sol1 後補) | `cleanFolderStrict` 前置 lstat 非 ENOENT 錯誤改包成 `WPT_CLEAN_FOLDER`；win32 下根目錄/cwd/上層比較不分大小寫；無 code 之 Error 帶 `name: message`；`String(fd)` 對無原型物件安全。`rmTempFile` 進入時固定絕對路徑。`rollupFiles` 於清空前檢查 `fns`(`WPT_INVALID_FNS`,站點 29) | 修前:POSIX 上層為檔案之 ENOTDIR 與路徑含 NUL 者拋原始 fs 錯誤(無碼、無絕對路徑格式);`cleanFolder(process.cwd().toLowerCase())` 等大小寫別名可通過保護而清空 cwd(**既有缺陷**);`rollupFiles` 缺 `fns` 先清空 fdTar 再以 wsemip 字串拒絕(偵測 null)。修後皆為帶碼 Error 且不清空。下游 `fns` 121 檔全為字串/陣列(物件 0),不受影響 | 產製端直接生效 |
| 2026-10-16 任務20261016181137 run01(1.1.19 之後;審計後直接替換) | 內附 wsemip 1.9.16 → 1.9.17(`src/wsemip.umd.js` 由 wsemi `toolfp/dist` 複製;wsemi 第 39 項之 fs/pm/is 族行為變更) | 對本套件**無可觀察差異**:109 站點逐站評估(見 R18〈wsemip 站點全集與判準〉),差異探測新舊 3281 格,本套件所用函數僅 `isestr(new String(''))` 與「前置檢查拋出→回傳 `{ error }`」兩類有差,前者下游 0 處、後者由 cleanFolderStrict 兩形狀同判吸收(注入 20 格新舊相同);全套 175 → 192 passing(新增 unit-wsemipContract 17 條;同輪 run02 再加 unit-wpfContract 6 條 → 198) | 產製端直接生效;下游無須動作 |
| 2026-10-16 任務20261016181137 run02(1.1.19 之後;與上列 wsemip 同輪發布) | 內附 wpf 兩檔(`src/wpf.umd.js`、`src/wpf_pmSeries.umd.js`,rollupParfor 產物內嵌之 parfor 執行期)1.8.42 → 1.9.17;`src/buildCheck.mjs:576` 註解更新(程式不變) | 新產製之 parfor 產物所內嵌之 `pmMap` 改為不經 queue 以索引派發:模板用法(takeLimit 13 種值、中途 reject、物件/群組輸入)之並行度、順序、結果、reject 值逐格相同;僅空輸入(舊懸置、新 `[]`)、不給 fn 之 Promise 陣列含一般值(舊同步拋、新可用)、`isfun(generator 函數)`(舊 false、新 true)不同,三者於 parfor 皆不可達(模板以 `iseobj/isearr` 擋空輸入、恆給 fn、cb 為 async 函數)。探測 184 格 3 格不同(皆屬上列)。已發布之 parfor 產物自含,不變(同 R1) | 下游以新版重新產製 parfor 產物時;下游 `rollupParfor` 呼叫 0 處(R9 之盤點) |
| 2026-10-16 run02(1.1.18 之後) | R16:產物仍引用之無法解析裸引用、iife/瀏覽器+bNodePolyfill 之未明列內建模組、commonjs 動態 require 樁之未受守衛呼叫、瀏覽器 worker inner 之外部引用與 free require 改為建置錯誤 | 原 exit 0 而產物載入或呼叫即壞之建置改為 RollupError(浮動呼叫 exit 1;自接 catch 印出者 exit 0 但含 `[RollupError]`);受守衛之選用相依只警告。全庫沙箱(下游實裝之相依,116 套件 265 支腳本)新增失敗只有 w-orm-mdb 1 支(`WPT_DYNAMIC_REQUIRE`:其安裝之舊版 w-orm-reladb `src/requireModel.js` 之動態 require 樁,真缺陷;w-orm-reladb 本身已於 `c542052` 改 createRequire 而未失敗;主控另立修正),產物 1526 檔不同 0 | 產製端直接生效 |
| 同上 | R17:非 es 格式之 url 以外屬性未受守衛、寫入 import.meta、墊片被劫持、worker inner 使用 import.meta.url 改為建置錯誤 | 原載入 TDZ/TypeError/靜默錯值者改為建置期失敗;受守衛之取用與死碼不擋 | 產製端直接生效 |
| 同上 | R18:cleanFolder 失敗由回傳物件改為拋錯(重試後)、拒絕根目錄/cwd/上層/連結;rollupFiles 清空失敗即 reject、未給 fdTar 不清空;wsemip 1.8.42 → 1.9.16 | toolg/cleanFolder.mjs 裸呼叫於失敗時 exit 1;成功回傳不變;被占用時最長約 3 秒後拋錯;懸空連結不再中斷清空;`w.isfun` 對 generator 函數改為 true(本套件無此用法) | 直接生效 |
| 同上 | 未給 runin 時不再印 `invalid runin[null], set to 'browser'` | 只在給了非法值時印出(rollupFile、rollupCode、rollupWorkerCore) | 直接生效 |
| 2026-10-13 run02(1.1.17 之後) | R7 M1:worker 內使用者程式碼(含內嵌之全部相依)由非嚴格改為嚴格模式 | 未宣告變數之賦值拋 ReferenceError(相依之隱式全域亦然,S18)、未綁 this 之函數內 this 由全域物件改為 undefined、寫入唯讀屬性拋錯;與 rollup 一般輸出(主執行緒之 dist)同語意;下游 10 處重放結果不變 | 下游以新版重新產製產物(已發布之產物不受影響:inner 以 base64 內嵌、執行期不引用本套件) |
| 同上 | R7 M2:瀏覽器 worker 內 `module`、`exports` 由未定義改為物件 | `typeof module` 類環境偵測改走 CommonJS 分支;下游含 lodash 式偵測者(瀏覽器端 gis、wcl、ctt、flt)真 Chromium 重放結果不變 | 同上 |
| 同上 | R7 M3:nodejs worker 沿用 Node 之 module | 無差異(`module.require`、`module.id` 維持;方案 d 原型之退化未進定稿) | — |
| 同上 | R7 M6、M8、§3.7:作用域雙向隔離與模組包裝 | 撞名/遮蔽之既有壞格轉為正常(S01–S14、S28、S29、S41、S42:載入即 SyntaxError、靜默錯值、永久懸置者);使用者碼之自由參照不再看到 inner 名稱、對其自由賦值改拋 ReferenceError(S15、S16);頂層 var/function 不再成為 worker 全域(以 `self[name]` 動態取用自身頂層函數者會壞;下游 10 處無此情形);頂層 this 為 module.exports(推導;rollup 已把 ESM 頂層 this 改寫為 undefined,一般不可觀察);opt.name 不再須與預設匯出名對應;每份 inner 增約 1.3 KB(下游 10 處:+1284~+1908 B,工廠與 object 之 outer 因轉送函數不再逐一展開而 wps −2763 B、wpsc −4431 B) | 同上 |
| 同上 | R7 M5、R12 M4:匯出形狀 | 預設＋具名匯出由建置失敗(`can not clear export default of name[…]`)改為可產製(S24);只有具名匯出之 type object 由建置失敗改為可用(命名空間當物件,S25,新能力);type function 缺預設匯出維持建置期失敗,訊息改為 `module[x] has no default export, type[function] requires a default export, exports[…]`(S26、S27) | 同上 |
| 同上 | R13 M7:方法呼叫之 this | 物件預設匯出之方法、工廠回傳之實例方法以所屬物件為 this(原為全域物件或 TypeError,S19、S20);function ByInstance 之 this 由全域物件改為 undefined(S52);不存在之方法改以 `function[x] is not a function in worker` reject(S53) | 同上 |
| 同上 | R11 M10:funNames 結構性修法 | funNames 含 outer 內部名稱(init、recvMessage、genPm、rejectPendings 等)由宿主崩潰、worker 遺留、懸置改為正常(S43、S46);含對外介面名(eventemitter3 之方法與欄位、terminate、`__proto__`)或非字串者改為建置期 reject(S44、S45) | 產製端直接生效 |
| 同上 | R11、R12 M11:evNames 與建置期語法檢查 | evNames 用於 function ByInstance(原每次呼叫 reject `r.on is not a function`)或 type object(原靜默無效)改為建置期 reject(S47、S48;rollupParfor 之 opt 帶 evNames 亦同);evName 含引號、opt.name 含 `-` 或為 `self` 由執行期失敗改為正常(S49、S41、S42);inner 有語法錯誤即建置期 reject | 產製端直接生效 |
| 同上 | R7 M9:錯誤堆疊 | worker 內錯誤堆疊之行號位移數行(推導) | 下游重新產製 |
| 同上 | R14:rollupFile 回傳程式碼模式 | 不再寫 cwd(不遺留 `temp-<id>.map`、rollupFile 本身不需 cwd 寫權限);回傳碼末行不再帶指向已刪暫存檔之 sourceMappingURL(回傳模式一律不產 sourcemap;bSourcemap 之非布林值如 'inline' 本即視同 true);給了 fdTar 而為檔案或無法建立由靜默回傳程式碼改為 reject;fdSrc 給定而非資料夾由改用 `./` 改為 reject;rollupParfor 之 opt 帶 fdTar 由產物成字串 `finish` 改為正常;rollupFiles 未給 fdTar 同回傳模式。下游 rollupFile 11 處皆給可用之 fdTar、rollupCode 0 處、rollupParfor 0 處,無呼叫端受影響 | 產製端直接生效 |
| 同上 | R15:targets、rollupCode 之 opt | rollupCode、rollupWorkerCore、rollupWorker 之 `targets: 'new'/'old'` 由無效改為依值(未給時產物不變,下游無人傳);rollupCode 不再改寫呼叫端之 opt(原會被寫入 fpSrc、fdTar、format 等鍵) | 產製端直接生效 |
| 2026-10-13(1.1.16 之後) | R9:rollupWorker、rollupParfor、rollupFiles、rollupVueToHtml、extractHtml 之錯誤改為 reject | 原「印出後照常 resolve」改為 reject;未 await 或未接 catch 之下游產製腳本於失敗時由 exit 0 改為 exit 1(Node 印於 stderr),後續步驟不再執行;自接 catch 者不變;rollupVueToHtml 失敗時不再寫出 html;清理不再印 ENOENT | 直接生效(產製端) |
| 2026-10-13(1.1.16 之後) | R9:formatOut iife 只支援 runin browser | rollupWorker、rollupParfor、rollupWorkerCore 之 iife × nodejs/both 改為參數檢查即 reject(原為吞錯不產出或產出載入即壞之產物);iife × browser 由不可產製改為可用 | 直接生效(產製端) |
| 2026-10-13(1.1.16 之後) | R3 ⑥:worker 送出之內容無法複製之兜底 | 回傳值、reject 值無法複製:Node 由 worker 崩潰(呼叫得空訊息 Error、持久與工廠實體死亡)、瀏覽器由永久懸置,改為以 `... could not be cloned: ...` reject 且 worker 續可服務;呼叫路徑內 emit 無法複製之事件內容:該呼叫由 DataCloneError reject 改為照常 resolve 並改發 error 事件;路徑外者由崩潰改為發 error 事件;初始化失敗後之呼叫由 null TypeError 改為初始化之原始錯誤;非 async 之 funNames 函數由 TypeError 改為照常回傳 | 下游以新版重新產製產物 |
| 2026-10-13(1.1.16 之後) | R3 ⑦:宿主送出之引數無法複製 | 持久與工廠實體之呼叫由同步拋錯改為回傳 rejected promise,其後 terminate 不再成為宿主未處理 rejection(原 Node 預設 exit 1);每次呼叫新建模式之 worker 由遺留(宿主不退出)改為終止;工廠初始化引數無法複製仍同步拋錯,但已建之 worker 改為終止 | 同上 |
| 2026-10-13(1.1.16 之後) | R10:瀏覽器端 blob URL 撤銷與致命錯誤時終止 worker;outer 略過非協定訊息 | blob URL 不再隨呼叫累積;執行期未捕捉錯誤後底層 worker 由繼續執行改為終止;worker 內使用者自送 null 由宿主 TypeError 改為略過 | 同上 |
| 2026-10-13(1.1.16 之後) | R2:inner monitor 改 console.error;src/parfor.mjs 單 job 失敗改 console.error;parfor 協定新增第 6 條 | 診斷由宿主 stdout 移至 stderr;parfor 之 entry 依協定第 6 條綁 messageerror 者由懸置改為整批 fail-fast | monitor:下游重新產製;parfor:直接生效 |
| 2026-10-13(1.1.16 之後) | R3 ⑤:messageerror 兩方向之處置 | 原本懸置之呼叫改為 reject 並 emit error;browser 之 messageerror 由以 null reject 改為以 `worker messageerror` reject;inner 與 outer 之訊息協定新增 `messageerror` mode | 下游以新版重新產製產物 |
| 2026-10-13(1.1.16 之後) | R3 ①~④:主動 terminate 時 reject 呼叫中之 pending;terminate 後之呼叫立即 reject;建立失敗回傳 ev 而非 null | 原本懸置之 pending 改為 reject `worker has been terminated`;原本同步拋 TypeError 之呼叫改為回傳 rejected promise;持久實體建立失敗時匯出由 null 改為物件、呼叫以原始錯誤 reject | 同上 |
| 2026-10-13(1.1.16 之後) | R7(舊):clearExportCode 修正 | bMinify false 且 name 不同名時由「產出 inner 為 undefined 之壞產物」改為正常;無法辨識之形狀由靜默壞產物改為建置拋錯(2026-10-13 run02 以模組包裝取代,clearExportCode 已移除) | 同上 |
| 2026-10-13(1.1.16 之後) | R8:src/parfor.mjs fail-fast 補齊 | worker 中途 exit(0) 由懸置改為 reject;cb 拋錯由宿主未捕捉例外改為 reject;整批失敗後不再呼叫 cb | 直接生效(免編譯) |
| 2026-10-13(1.1.16 之後) | outer 層移除 `uncaughtExceptionMonitor` | 宿主不再出現 `outer:uncaughtExceptionMonitor` 輸出;宿主自掛吞噬處理器且不記錄者,原由函式庫代印於 stdout 之痕跡消失 | 下游以新版重新產製產物 |
| 2026-09-07(2e14fce) | outer 層移除吞噬型 uncaughtException/unhandledRejection;inner 同;外層加 pending 登記與致命失敗整批 reject | 宿主未捕捉例外恢復 Node 預設(印出並終止);worker 崩潰時呼叫端由永久懸置改為 reject;死後呼叫立即 reject | 同上 |
| 2026-08-21(3822f40) | rollupParfor 之 cb 改為 await | parfor 完成時間包含 cb 耗時;cb 錯誤改為傳染至 parfor | 同上 |

## 六、e2e 落地映射(規則帳本之一節;對應全域技能 role-coder-for-test-e2e §3 契約)

本套件為無 UI 之函式庫;e2e 之「使用者路徑」為「頁面程式於使用者操作時呼叫瀏覽器 worker 產物」。只寫名稱與模式,不寫行號。

### 服務與 port

| 項目 | 值 |
|---|---|
| 後端/前端 | 無。測試頁與產物以 Playwright `page.route('http://wpt.test/**')` 攔截供檔,**不開埠**、不出網 |
| e2e 執行 | 單檔:`npx mocha --no-parallel test/e2e-workerBrowser.test.mjs --timeout 180000`;全套經 `npm test`(同一 mocha 指令,`test/*.test.mjs`) |
| 瀏覽器 | `playwright`(devDependency `^1.63.0`,安裝時之 1.63.0 對應本機已裝之 chromium-1243);Chromium headless |
| 共用實作 | 不引用 w-package-tools-e2e:本檔只需 launch 與 page.route,無截圖、紅框、比對需求 |

### 契約映射

| 契約 | 本專案實名 / 模式 | 偏離與依據 |
|---|---|---|
| C1 launch wrapper | `chromium.launch({ headless: true })`,全專案唯一出口在 `test/e2e-workerBrowser.test.mjs` 之 beforeEach | 無確定性渲染旗標組:無 pixel 比對,只讀畫面文字 |
| C2 server lifecycle | 不適用 | 無服務 |
| C3/C4/C5 | 不適用 | 無設定、無資料庫、無登入與語系 |
| C6/C7/C8/C9 截圖、紅框、遮罩、比對 | 不適用 | 受測對象為函式庫產物;測試頁為測試自建之最小頁(一顆「執行」按鈕與一個輸出區),非產品畫面,無操作手冊用圖;以 baseline 凍結測試頁之長相只是現狀指紋(全域 §16.1)。語意斷言:畫面輸出文字之 JSON 等於規格觀察值,且無 pageerror |
| C10 輸入 | 不適用 | 無文字輸入 |
| C11 偵測等待 | `page.locator('#out[data-done="1"]').waitFor({ state: 'attached', timeout: 20000 })`;頁面內以 6 秒 settle 把懸置轉為畫面文字 `hang` | |
| C12 settle 訊號 | 不適用 | 無動畫容器 |
| C13 regen 入口 | 不適用 | 無 baseline |
| C14 端點 | `http://wpt.test`(攔截) | |
| act | `page.getByRole('button', { name: '執行' }).click()`(L3 真滑鼠) | |
| 隔離 | 每案 beforeEach 新瀏覽器、afterEach 關閉;產物於 before 以 `rollupWorker` 產製至 `test/_tmp/e2eWorkerBrowser/out/`,after 刪除;各案之建置錯誤記於該案、由該案之 it 回報(不使整批於 before 失敗) | |
| case 單位 | 帳本格號(S##)為 id,非 E2E-NNN | 本套件無 e2e 流程 spec,規格即本帳本 R7、R11、R13 之格 |

### 案例(15)

S01、S04、S06、S13、S14、S15、S17、S24、S19、S20、S41、S43、S49、iife、es(fixture 取自 `test/tools/workerFx.mjs`;期望值與 unit 相同)。

### 已知缺口

- 只跑 Chromium;WebKit(R10 之「建構後立即 revoke 會壞 WebKit」)、Firefox 未驗。
- 瀏覽器格之 R3 終止路徑、R10 撤銷仍只在 vm 模擬(`test/rollupWorker.test.mjs` 瀏覽器端 7 條),未於真瀏覽器實跑。
