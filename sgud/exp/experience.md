# 累積經驗

本檔為執行工作時特有之累積經驗,留給後續之嘗試、執行與判斷,由agent自行編列、擴充與維護.

---

## 一、同類別漏格:只沿投訴那一條線修,沒列同類的其他線

本套件最主要的失敗形狀。三次都由「下游回報或外部複審」才被發現,而非自己發現。

| # | 事件 | 當時為何以為夠了 | 誰發現 |
|---|---|---|---|
| 1 | 2026-09-07 修「worker 崩潰時 pending 懸置」,只處理 worker 之 error 與非主動 exit;漏了**主動 terminate 時仍有 pending**(bTerminated 使 exit 不處理,pending 永久懸置)、**worker 建立失敗**(錯誤送往無人可聽之 emitter)、**postMessage 同步失敗**、兄弟實作 **src/parfor.mjs 之 exit(0)** | 投訴是「崩潰會懸置」,就只列了「崩潰」的事件 | 2026-10-13 三份獨立審查;同日修畢(帳本 R3、R8);postMessage 同步失敗、messageerror 亦於同日修畢(R3 ⑤⑥⑦) |
| 2 | 2026-09-07 移除 outer 吞噬型監聽時,保留 `uncaughtExceptionMonitor` 並補註解「其只觀測記錄,不影響預設終止行為」——只評估了「是否影響終止」一軸,沒評估「每支產物各註冊一次(both 兩次)」與「它實際會被什麼觸發」(答案:只會被與本函式庫無關的宿主錯誤觸發,對 worker 錯誤零作用) | 被指出的問題是「劫持終止語意」,monitor 不劫持,就判定無害 | 下游 w-serv-hapi 驗收時同一錯誤被印三次而回報 |
| 3 | 2026-10-13 全盤矩陣自填兩格錯誤:B3 格以「rollup-plugin-node-polyfills 之 `on = noop`」為證,但 outer 一律以 `bNodePolyfill:false` 產製,polyfill 根本不進 outer;D6 格寫「建立失敗 → emitFatal → reject」,實際原錯誤遺失 | 憑模板字面與選項名推論,沒追到 `:1116` 與 `wrapWorker` 回 null 之後的呼叫端 | 三份審查皆指出 |

**可執行判準**:

- **凡規則是「失敗 → 呼叫端必有結果」**,動工前列全部終止路徑:error 事件/exit(含 0)/主動 terminate/建立失敗/postMessage 同步失敗/messageerror/載入期錯誤,再列兄弟實作(`src/parfor.mjs` 與 rollupWorkerCore 是兄弟),逐格標已套/未套。
- **凡函式庫在宿主留下全域副作用**(監聽、全域鍵、計時器、資源),量三件事:①註冊次數 × 產物數 × outer 數(both 為 2)②它實際會被什麼觸發(實測一次 worker 崩潰＋一次宿主例外)③對標成熟產品(piscina、workerpool 主端皆零 process 監聽)。
- **寫進矩陣的每一格〔靜態〕都要追到呼叫端**,不只看到模板那一行;追不到就標〔推導〕。

## 二、量測 import 副作用的陷阱(寫宿主隔離測試前必讀)

2026-10-13 三份審查與紅綠燈實跑得到,每條都會造成假通過或懸置:

| 陷阱 | 後果 | 正解 |
|---|---|---|
| UMD(CJS)產物以**檔名**快取,`import('x.umd.js?t=…')` 不會重新求值頂層;ESM 才以完整 URL 快取 | 在 mocha 行程內重複 import 量註冊數,現行碼也量到 0 → 假通過。既有 `impFresh` 對 UMD 並不 fresh | 用乾淨子程序(`test/tools/hostProbe.mjs`) |
| mocha 自掛 process 監聽;NODE_OPTIONS 之 --require 也可能預載 | 絕對值不為 0 | 量 import 前後全部事件(`process.eventNames()`)之增量 |
| object 持久實體(`execObjectFunsByInstance:false`)import 即建 worker,MessagePort 撐住事件迴圈 | 只計數、不拋錯之子程序永不退出 | 子程序回報後主動 `process.exit(0)`;spawnSync 帶 timeout |
| Node fatal 輸出會先印拋出處之來源行 | 以字面字串拋錯時訊息在 stderr 出現 2 次 | 錯誤先建立再於 timer 拋變數,或計 `Error: <訊息>` 行 |
| 建置失敗時不覆寫目標檔(2026-10-13 前 rollupWorker/rollupParfor 更吞錯照常 resolve,已改 reject) | 沿用舊檔或缺檔,測試拿舊產物假通過 | 產製前先刪目標檔,產後斷言存在且非空 |
| import 失敗、路徑錯誤也會使「沒有 outer 輸出」成立 | 宿主隔離斷言假通過 | 子程序回報各產物匯出型別作正向對照,未回報即失敗 |
| 管線在 Windows 為同步、POSIX 為非同步 | stdout 計數在 POSIX 可能不穩 | 主斷言放監聽增量,stdout 計數為輔 |
| 瀏覽器、類 Electron 宿主之 outer 路徑在 Node 測不到 | 漏測 | 加「產物明文不含 process 監聽註冊」靜態守門(inner 為 base64 不在明文) |

## 三、eventemitter3 之 `emit('error')` 無監聽者時靜默

- Node 內建 EventEmitter 無監聽者時 emit('error') 會拋;**eventemitter3 回 false 不拋**(本套件 outer 之 `ev` 用 eventemitter3)。
- 後果:錯誤送到沒人聽的 emitter 等於被吞。worker 建立失敗時原錯誤就是這樣遺失;持久實體在無 pending 時崩潰,宿主若沒掛 `on('error')`,只剩 inner monitor 印的一行。
- 判準:設計錯誤傳遞時,不可依賴 `emit('error')` 讓人看見;要讓呼叫端拿到,就走 reject。

## 四、`process.on('uncaughtException')` 在 worker 內與宿主之後果

- **worker 內**:阻止 worker 依預設死亡 → 外層收不到 error/exit → pending 永久懸置;殭屍 worker 讓宿主不退出。2026-09-07 紅燈階段 mocha 因此 300 秒不返——「測試整個卡住不結束」就是這個症狀。
- **宿主(outer)**:把整個宿主的未捕捉錯誤改成只印不終止,劫持下游 app 之全域錯誤語意。
- 只觀測不改行為者用 `uncaughtExceptionMonitor`;但它仍是全域註冊,函式庫層一樣不該掛在宿主(見一之 #2)。

## 五、runin 'both' 與 protectShell

- both 產物含兩個 outer(nodejs 版與 browser 版合併),任何 outer 頂層副作用在 Node 發生**兩次**;parfor 預設 runin both,同樣兩次。
- outer 頂層程式碼在 `protectShell()` **之外**:環境不符而 protectShell 提前返回時(如 Node 引用 browser 產物、jsdom、Electron renderer),頂層碼照樣執行。要放任何頂層程式碼前先想這兩點。

## 六、補全型解析插件須 fallback-first(rollupFile 之 bResolveExtPath)

- echarts-gl 以無副檔名深層引用 zrender,而 zrender exports 末端 `"./*": "./*"` 原樣輸出不補副檔名,rollup ENOENT;webpack 因 `fullySpecified=false` 會補而沒事。
- 原提案「先補 .js 搶答」會劫持條件式 exports(`@babel/runtime/helpers/x` 於 import 條件映射 esm 版,補 `.js` 可能導向 cjs 版)。實測當時只是因 `@babel/runtime` 無萬用對應而碰巧逃過。
- 判準:補全型解析一律「原樣解析成功且檔案存在就不介入」,只在原樣失敗或解析出不存在之實體路徑時才補。

## 七、換行:repo LF、Windows 工作區 CRLF

- `core.autocrlf=true` 使 Windows 工作區為 CRLF,repo blob 為 LF,`.editorconfig` 又寫 `end_of_line = lf`。依賴 `split('\r\n')` 的程式在 Windows 本機永遠正常,在 Linux/macOS clone 或遵守 editorconfig 存檔時靜默失效(parseVueCode 產出空殼且不拋錯)。
- 判準:解析文字前先正規化換行(先轉 LF 再轉 CRLF,避免 `\r\r\n`);驗證用 CRLF/LF/混合三種輸入比對結果逐位元組相同。

## 八、多模型獨立審查(dispatch-claude/dispatch-codex)實跑紀錄

2026-10-13 以 2 個 claude-opus-5-5(max)＋1 個 gpt-6.1-sol(max)審 outer monitor 修正案:

- **先建表再派工**:全盤文件(問題核心/待決定事項/規劃方案/建議決定＋對標/矩陣/對稱/修改前實測)寫好才派;審查依序「挑表的漏格 → 對標與對稱 → 方案」。三份共提出約 24 條矩陣與對標指正,其中 2 格是我寫錯;三份皆同意方案,但都強化了測試護欄——**外部複審的主要價值在漏格與護欄,不在方案選擇**。
- **能力探測**:與正式派工相同權限/沙箱、逐字相同限制句、要求原文引用一行英文與一行中文(canary)並寫一個檔;Opus 7 秒、Sol 22 秒通過。
- **限制句**:並行審查者**不得跑 repo 既有測試**(test/fixtures 會互相覆寫);實驗與報告只落自己的 `./tmp/<代號>/`。Codex 限制句不可寫「不能執行指令」,並指定讀檔用 `rg -n '^' --`、寫中文檔用 apply_patch;報告另以 `--output-last-message` 取回全文。
- **收回驗收**:報告存在＋canary 逐字＋工作區快照比對(`git diff | sha1sum` 與未追蹤清單雜湊,派工前先記)。三份皆未越權改檔。
- **審查者也會踩 §11.2**:其中一名誤用 `new URL(import.meta.url).pathname`,在工作目錄外建出百分比編碼資料夾(自述已刪),收回後須回驗 `ls -d /c/opensrc/*%*`。
- **耗時**:Sol 21 分、Opus 28 分與 35 分;派工以 nohup detached＋背景分段等待,VS Code 外掛內不可用 cron/ScheduleWakeup。

## 九、使用者裁示與偏好(本專案)

- 下游自有套件之 dist 為舊版產物(即使含上游已修缺陷)**不要提**——連動升版時自動重產(2026-10-13 裁示)。同類盤點只看上游原始碼與產碼模板。
- 修正案流程:先派多模型獨立審 → 我複審逐條核對 → 定案即直接實作(先紅後綠)→ 刪除建議文件 → 入帳本與本檔。Sol 額度用盡時不重派,只等 Opus。

## 十、依賴盤點與 package.json

- devDependencies 之 `@vue/cli-service` 為 2020 年範本遺留(零引用、無 scripts、無 vue.config.js、無反向依賴),佔 lockfile 406/1438 個套件;各 vue2 類套件皆自裝。判別範本遺留依賴:`git grep` 引用＋scripts＋設定檔＋`npm ls <pkg>` 反向依賴＋lockfile `dev:true` 計數。2026-07-23 已移除。
- `npm uninstall` 會把 package.json 依賴重排為字母序並補檔尾換行,diff 看起來像多改了別的行——是 npm 正規化,不是誤改。

## 十一、工具與環境

- Glob 工具於 `C:/opensrc/*` 層級搜尋 20 秒逾時;跨專案找檔改用 Bash glob(`ls /c/opensrc/*/*/sgud/rule/rulebook.md`),跨專案搜內容用 `git -C <repo> grep`(只搜 tracked 檔)。
- Git Bash 對含中文之路徑直接 `cd` 會因編碼失敗;改用 glob 展開或 `git -C`。
- Node 下 `node -e "<code>" a b` 之額外參數在 `process.argv.slice(1)`,中文路徑可完整傳遞。**起宿主子程序不可用 `--input-type=module`**:子程序內建立之 eval worker 會繼承 execArgv,inner 之 cjs 程式碼被當 ESM 而 `require is not defined`,worker 靜默壞掉(2026-10-13 實測);改用 CommonJS `-e` 並於 async 函數內動態 `import()`。

## 十二、修四項必修缺陷(2026-10-13)之經驗

- **照類別列舉,多抓到 4 個同規則成員**:使用者核可的是「src/parfor.mjs 中途 exit(0) 懸置」一項;動工前把 parfor 之失敗路徑全列(error、exit 各碼、建立失敗、messageerror、派工 postMessage、cb、settle 後之訊息),另外發現建立第 i>0 個 worker 失敗時已建者遺留、messageerror 未處理、job 不可複製與 cb 拋錯成為宿主未捕捉例外——修法全是同一個 `finish(err)`,不涉新設計決定,故一併修並記入 R8。需要新設計決定者(rollupWorkerCore 之 postMessage 同步失敗、messageerror)則維持「待討論」,不擅自擴大。
- **終止路徑的單一擁有者要先抽出來**:terminate 要 reject pending 但不能 emit error,原 `emitError` 把兩件事綁在一起;先抽出 `rejectPendings`(清理)再讓 `emitError` 與 `terminate` 各自組合,否則就會在 terminate 內手寫第二份清理迴圈。
- **建立失敗不要回 null**:回 null 等於把錯誤換成呼叫端對 null 取值之 TypeError;保存原始錯誤、照常回傳物件、讓呼叫以原始錯誤 reject,呼叫端才看得到真因(如瀏覽器 CSP)。
- **測試手法**:①持久實體要新實例 → 把產物複製成新檔名再 import(UMD 以檔名快取)②建立失敗 → 暫換 `require('worker_threads').Worker`(UMD 於呼叫時才取用模組物件之 Worker),ESM 具名匯入者(src/parfor.mjs)再呼叫 `module.syncBuiltinESMExports()` 使其同步,finally 必還原 ③改碼前之紅燈若會遺留存活 worker,以 `mocha --exit` 跑,否則 mocha 不結束;綠燈則**不加** `--exit` 跑一次,能自行結束即證明無遺留 ④改碼前之 cb 拋錯、DataCloneError 會成為 mocha 行程之 Uncaught,同一條測試會被記兩次失敗——屬缺陷本身,不是測試寫錯。
- **真實呼叫端驗收找法**:盤點 C:\opensrc 自有套件之 toolg 腳本,找會碰到該路徑之使用(`execFunctionByInstance:false` 只有 w-pubsub client)。以其實際參數重產,宿主連一個無人監聽之埠使 `subscribe` 停在 mqtt 佇列,即得「呼叫中之 pending」;宿主須在 w-pubsub 目錄執行(eval worker 之 require 以 cwd 為基準)。改碼前先產出 before 產物留著,改碼後無法再以舊 src 重產。
- **clearExportCode 的觸發條件**:只有 `bMinify:false` 且 `opt.name` 與原始碼 default export 不同名才會壞(壓縮時 cleim 以第一處 `module.exports=` 通吃)。下游 w-pubsub 雖用 bMinify false 但同名,所以一直沒踩到;測試 fixture 之 name 本就與原始碼不同名,補一支 bMinify false 即可重現。

## 十三、messageerror 與執行環境前提(2026-10-13)

- **messageerror 有兩個方向,只想到一個就會漏**:使用者點名的是「worker 回傳之訊息在宿主端解不開」;照類別列舉後還有「宿主送去之呼叫在 worker 端解不開」——worker 永遠收不到該呼叫,同樣懸置。後者須 worker 端綁 `parentPort.on('messageerror')`(瀏覽器 `self.onmessageerror`)並以新協定 mode 通知外層。兩者皆無法得知屬哪個呼叫,只能整批 reject 呼叫中之 pending;worker 本身仍可服務,不標死亡。
- **瀏覽器 messageerror 之 `e.data` 依規範為 null**:原碼以 `emitError(e.data)` reject,呼叫端拿到 null;改為固定訊息。對「事件物件帶什麼」要查規範,不要照抄其他事件的寫法。
- **模擬 messageerror 之手法**(真實反序列化失敗難以製造):Node 之 `Worker` 繼承 EventEmitter,`worker.emit('messageerror', err)` 會送到監聽器;worker 內之 `parentPort`(NodeEventTarget)也有 `emit`,監聽器收到的就是傳入之 Error(2026-10-13 實測)。宿主端要取得 bundle 閉包內之 Worker 實體,以子類攔截 `require('worker_threads').Worker` 之建構即可。
- **eval 字串之模組格式只由 `--input-type` 決定,與 package.json 之 type 無關**(實測:cwd 在 `type:"module"` 目錄,eval worker 內 `typeof require` 仍為 function)。原註解寫「因 package.json 不給 type=module 故得用 require」原因寫錯、結論對,已更正。
- **分類判準(使用者 2026-10-13 裁示)**:既有設計明確依賴的前提(inner 以 CommonJS 執行,註解已寫明)被執行環境違反時,屬**設計限制**(文件化),不是缺陷——先查既有註解與設計前提再下「缺陷」標籤。

## 十四、待討論七項(P1~P7)修正之經驗(2026-10-13)

- **影響範圍要自己盤點母體,不可用印象數字**:方案原寫「39 處/24 套件,多為頂層 await」,兩名審查者各自以 `git grep` 逐 repo 計得 134 處/111 套件,主流是未 await 也未 catch 之浮動 promise(100 處)。破壞性變更之影響評估,先 `git -C <repo> grep` 全部自有套件並依呼叫型態分類(浮動/頂層 await/自接 catch)再寫;另查「看輸出字串而非 exit code」之下游工具(w-pksupdate 只搜 `[RollupError]`,src/ectScripts.mjs:44-58)。
- **「產得出」≠「可用」,改輸出格式要在目標環境載入產物**:iife 只換中介格式即可建置成功,但 external 之 `worker_threads` 以全域識別子傳入 iife(結尾 `}(worker_threads);`),runin nodejs/both 之產物一載入即 ReferenceError;UMD 以 `global.x` 屬性取值故不拋。凡涉 formatOut,列 runin × formatOut 全格,並實際載入產物(Node 以 import,瀏覽器以 vm 模擬或真瀏覽器)。
- **瀏覽器 worker 與 Node worker 之錯誤語意不同,矩陣須有宿主環境軸**:①worker 內未處理 rejection——Node 預設轉為未捕捉例外 → worker 崩潰 → error 事件;瀏覽器只在 worker 內發 unhandledrejection,Worker 物件**不發** error → 呼叫永久懸置。②worker 內未捕捉例外——Node worker 結束;瀏覽器 worker **不結束**,標死後須主動 terminate,否則執行緒遺留。只在 Node 測就會漏掉瀏覽器之懸置。
- **以 vm 模擬瀏覽器(test/tools/browserSim.mjs)**:頁面 context 掛 window/document/Blob/URL/Worker,Worker 以第二個 vm context 執行 blob 內容;postMessage 以 structuredClone(無法複製時同步拋 DataCloneError,同瀏覽器);載入為非同步、載入前之訊息排隊;已撤銷之 URL 不可再載入(同 WebKit,可抓出提前 revoke);worker 內計時器之未捕捉例外轉為 Worker 之 error 事件。限制:worker 內未處理 rejection 在此會成為 Node 宿主之 unhandledRejection(瀏覽器不會),非真瀏覽器。
- **送出可能同步失敗者,先送後登記**(與 piscina postTask 同構):回傳 promise 之 API 先 `try { postMessage } catch → reject 並 return`,送出成功才登記 pending。反之(comlink 先登記)失敗時殘留登記,日後整批 reject 成宿主未處理 rejection(Node 預設 exit 1)。如此 `delete pendings[id]` 仍只有 2 處,不需第三處清理。
- **同步 API 之送出失敗維持同步拋錯,只修資源遺留**:工廠函數為同步回傳,初始化引數無法複製時原本就同步拋錯(同 Node `new Worker(…, { workerData: fn })`),只需拋出前 terminate 已建之 worker;改成回傳物件屬契約改變。判準:API 之錯誤回報慣例(promise → reject、同步 → throw)不動,只修遺留。
- **先紅後綠要確認修前真的紅**:①缺漏模組須以相對路徑引用(裸套件名 rollup 只警告並視為 external,建置成功)②回傳值無法複製在修前已以空訊息 Error reject,只斷言 reject 修前即綠,須斷言新訊息前綴與下一呼叫可用 ③呼叫路徑內 emit 不可複製內容修前即 reject 且 worker 存活,須改於呼叫路徑外(計時器)emit 才測得到崩潰 ④「宿主能否自行退出」以乾淨子程序驗(`test/tools/childRun.mjs`,遺留 worker 時懸置至逾時),紅燈不必拖累 mocha 行程。
- **測試行程未載入完成前不可改受測檔案**:2026-10-13 紅燈以背景啟動後隨即改 src,`npx mocha` 啟動加載入 rollup/babel 費時數十秒,rollupWorkerCore.mjs 恰於改到一半時被載入,產物成新舊模板混合(inner 之 sendMessage 內插入了新版 csm 函數之原文)而懸置,一度誤判為既有測試失敗。紅燈改以修前副本跑(`git show HEAD:<檔>` 取出至 `./tmp/<案>/head`,見十六;主控派工之 run 禁用 stash/checkout/reset);跑測試期間只改文件。
- **TaskStop 不保證結束子行程**:背景任務之 TaskStop 只結束 bash 包裝,npx 與 mocha 之 node 行程仍在;以 `Get-CimInstance Win32_Process` 比對 CommandLine 找出自己啟動者,`taskkill /F /T` 後回驗。
- **Codex 額度用盡之判別**:Sol 失敗時 result.json 之 stderr 被截斷看不出原因;實際原因在 `~/.codex/sessions/<日期>/rollout-*.jsonl` 之 task_complete 事件(`error.codex_error_info: "usage_limit_exceeded"`)。依使用者指示不重派,只等 Opus。
- **審查收回後逐條對碼**:兩份 Opus 共 30 條主張,逐條對 `file:line` 或自行重算(下游母體以較窄樣式重算得 121 處/111 套件,套件數相符)後才採納;採納 26、部分採納 1、改採 1(工廠 init 改為維持同步拋錯)、不採 1(Blob 每產物一份屬優化)、另案 1。

## 十五、審計建議書事項一、二之經驗(2026-10-13,run01)

- **「現行是否嚴格模式」要用探針實測,不看字面**:inner 模板在使用者碼之 `'use strict'` 前插入了敘述(nodejs 之 `let { parentPort } = require(…)`、browser 之 `try{revoke}`),該字串因而不在指令序言,整份 worker 腳本一直是非嚴格(探針 `function(){ return this === undefined }` 於 Node、vm、真 Chromium 皆得 sloppy)。任何把使用者碼包進函數的改法都會讓它變嚴格——這是破壞性差異,不是「維持原狀」。
- **下游盤點要以「共用同一模板之全部入口」為母體**:只搜 `rollupWorker(` 會漏 w-component-vue 之 `rollupWorkerCore(` 直呼(在其 script.txt 自動重建內)。正則抓參數時要排除註解行(`// bMinify: false` 曾被誤抓)。
- **terser 之 cjs 預設 toplevel:true 不等於「壓縮就不撞名」**:keepFnames:true、使用者碼含直接 eval、名稱列於 mangleReserved(含 opt.name)時頂層名稱照樣保留。
- **撞名之後果有三種,不只兩種**:載入即 SyntaxError、靜默錯值,以及**永久懸置**(使用者 `var run = …` 之賦值反蓋 inner 函數;瀏覽器端使用者頂層 `function postMessage`/`var self` 遮蔽全域)。測試須以 race 判懸置。
- **vm 模擬器(test/tools/browserSim.mjs)不足以取代真瀏覽器**:w-json-stream(bNodePolyfill)在 vm 報 `a.attachEvent is not a function`,真 Chromium 正常。真瀏覽器可借 w-package-tools-e2e 之 Playwright(以 `C:/…` 絕對路徑 import,勿用 `/c/…`),以 `page.route` 供檔即不需開埠。
- **子程序腳本以字串拼接時注意 ASI**:前段以運算式結尾、後段以 `(` 開頭會被併成呼叫,子程序什麼都不做且 exit 0(假成功)——判讀子程序結果一律要求明確之輸出標記(如 `OUT=`),沒有就當失敗。
- **eslint-scope 分析 acorn AST 須 `ranges: true`**,否則 `__isValidResolution` 讀 range 拋 `reading '0'`。
- **變體比較法**:把 src 複製到 `./tmp/<案>/v/<變體>/src`,把 test、test-code-in、test-code-out-cp、package.json 複製到變體根目錄,以該處為 cwd 跑 mocha,即可在不動 src 之下以既有測試驗每個方案(測試以 `../src` 引用變體)。
- **自審之表必有洞,獨立複審值得派**:本次自認已全盤(事項一 24 格、事項二 40 格),opus 複審仍補出 18 格與 5 條軸,其中一類為高嚴重度且所有候選方案皆未涵蓋——**使用者可控之名稱(funNames)成為 outer 膠水碼之識別子**:funNames 含 `init` 宿主崩潰、`terminate` worker 遺留、`emit` 懸置。對稱檢查要問「同一個使用者可控名稱還流進了模板的哪些地方」(inner `${name}`、outer `function ${funName}`/`ev.${funName}`、evNames 插值),不只問使用者碼的頂層宣告。子代理不能寫報告檔,結果以文字回傳,由主代理照錄成檔。
- **Bash 雙引號字串內勿放反引號**:以 `node -e "…"` 改檔時,字串中之 \`路徑\` 會被 bash 當指令替換執行(曾把一份 md 當 shell 腳本執行,所幸第 3 行即語法錯誤而中止)。改檔一律用 Write/Edit 工具。

## 十六、依主控裁決實作事項一、二之經驗(2026-10-13,run02)

- **修前副本跑紅燈(不用 stash)**:`git ls-files src` 逐檔 `git show HEAD:<檔>` 寫入 `./tmp/<案>/head/src`,把工作區之 test、test-code-in、test-code-out-cp、package.json 複製到副本根,以 `spawnSync(node, [<repo>/node_modules/mocha/bin/mocha.js, …], { cwd: 副本 })` 跑。測試內以 `path.resolve('./src/…')` 取模組、以 `./test-code-in` 取輸入者,皆因 cwd 而指向副本;node_modules 由上層解析。同法可跑任何原型變體(把變體 src 放進副本即可),「HEAD 紅、原型紅、定稿綠」三欄即判別力證據,原型紅的格正好是原型之外必須補的件。
- **紅燈要連「修前就綠」的格一起報**:新測試在修前為綠者是守門格(維持不退化),須逐條說明守的是什麼(如 S22、S23 修前即綠,但原型 d 紅,守的是「nodejs 沿用 Node module」不被包裝改掉);不說明就像測試沒測到東西。
- **一個 before 建置失敗會讓整檔全紅而失去判別力**:e2e 原於 before 建全部產物,修前副本第一支建置失敗即整檔失敗、15 案無一個別結果;改為各案建置錯誤記於該案、由該案之 it 斷言,紅燈才看得出 13 紅 2 綠。
- **發布前閘門之「預設產物不變」要用變體逐位元組證**:定稿之外另建一份「只把 targets 正規化改回修前」之 src 變體,兩者各產下游 10 處後比對。bMinify false 之產物每次建置都不同——rollupCode 之輸入暫存檔名含隨機 id,commonjs 外掛以檔名衍生變數名(`temp<隨機>`),壓縮後才被 mangle 掉;比對前以 `/temp[A-Za-z0-9]{20,}/g` 正規化,並確認修前產物同樣含隨機名(證其為既有不確定性,非本次引入)。
- **閘門比對要逐項分平台**:runin nodejs 之產物只跑 Node、bNode false 之 es 產物只跑 Chromium、both 兩者皆跑;cur 結果取 run01 以修前 src 產製者(產物與結果 json 皆保留在 `./tmp/audit01/`),不可用現行 src 重跑 cur(exp-ds.mjs 之 `cur` 取 `./src`,改碼後即非修前)。
- **以結構消除整類撞名,保留名只留結構上避不掉者**:funNames 只作字串鍵、以 `JSON.stringify` 插入,轉送函數由 `genCaller(funName)` 產生;內部協定改走 `pendings[id]` 與 `emitEv`(掛載前取 `ev.emit.bind(ev)`),outer 內部函數名(init、recvMessage、genPm…)即與使用者無關。剩下與回傳物件對外介面同名者(eventemitter3 原型方法、`_events`、`_eventsCount`、terminate、`__proto__`)才建置期 reject,清單由 `Object.getOwnPropertyNames(EventEmitter.prototype)` 與 `Object.keys(new EventEmitter())` 推導,不手寫。
- **建置期檢查之資料走內部函數**:預設匯出之判定用 rollup `chunk.exports`(`generate()` 之 `output[0].exports`),由 `rollupFileCore` 回傳 `{ bReturnCode, code, exports }`,公開之 `rollupFile` 只回 code;不加公開 opt(如 `cbOutput`),否則會經 rollupCode 之 opt 展開外漏。base64 內嵌之 inner 不經 rollup 解析,以 `new vm.Script(code)` 只編譯不執行補語法檢查(`// eslint-disable-line no-new`)。
- **rollup 3.30 之 generate 何時多於 1 項**:`sourcemap: true` 時為 chunk＋`.map` asset;外掛 `emitFile({ type: 'asset' })` 時為 chunk＋asset(探測實測)。回傳模式已強制不產 sourcemap,現行外掛無 emitFile(postcss 為注入),故 `output.length > 1` 守門現不可達,只能以探測證其觸發條件。
- **this 之設定用 `Reflect.apply(fun, thisArg, input)`**:class 本體恆為嚴格模式,以 `fun(...input)` 呼叫實例方法必 TypeError;function ByInstance 之 instance 是合成之 `{ main }`,不可當 this(否則使用者函數看到奇怪的 this),給 `undefined` 同直接呼叫。
- **本 repo 之 eslint 規則易踩點**:`quote-props` 為一致性模式(物件有一個鍵須加引號,全部鍵都要加);`quotes` 不允許以雙引號避開跳脫(寫 `'a\'b'`);物件跨行時每個屬性各占一行(`object-curly-newline`/`object-property-newline`,含模板字串值者常踩);`no-new-func` 擋 `new Function`,測試內動態函數改 `vm.compileFunction(code, params)`。改完新測試檔一律跑 `npx eslint <檔>`。
- **Playwright 版本對齊本機已裝之瀏覽器**:本機 `%LOCALAPPDATA%/ms-playwright` 已有 chromium-1243,即 playwright 1.63.0 之 `playwright-core/browsers.json` 所指 revision;最新版為 1.64.0,推測需另下載瀏覽器(未驗),故裝 1.63.0、不跑 `playwright install`。devDependency 只在本 repo,不被使用端安裝。`npm install -D` 會順帶把 package-lock.json 之 version 欄同步為 package.json 之 version(原 lock 停在舊版號),屬 npm 正規化,不是改了 package.json 之 version。函式庫之 e2e 以 `page.route('http://<假網域>/**')` 供測試頁與產物,不開埠;act 用測試頁之按鈕(L3 點擊),assert 讀畫面輸出,懸置於頁面內以 settle 轉成 `hang` 文字。
- **vm 模擬與真 Chromium 之分工**:作用域、this、匯出等語意 vm 與 Chromium 一致,unit 用 vm 涵蓋兩 runin;全域物件之屬性語意(self、postMessage 之遮蔽)與 polyfill 偵測只信真瀏覽器,e2e 挑這類格實跑。

## 十七、建置期檢查(R16–R18)之審計與實作(2026-10-16,主控任務 20261014013456 run01–run02)

- **下游實際用的是「下游裝的」相依,不是本 repo 的**:本套件之 rollup 為 `^3.20.2`,全庫下游 `node_modules` 實裝 3.20.2(38)、3.25.1、3.29.x(34)、3.30.0(45);`onLog` 於 3.25 才有,在 3.20.2 上只是未知選項而**靜默失效**。新規則只用 3.20 起即有之 API(`onwarn`、`moduleParsed`、`resolveImportMeta`、`renderChunk`、`chunk.imports`)。查法:`for f in /c/opensrc/*/*/node_modules/rollup/package.json; do node -e ...version; done | sort | uniq -c`。run01 之全庫評估用本 repo 之 node_modules 而漏了這軸,是 opus 外審找出的。
- **全庫沙箱(`tmp/bx01/impact/`)作法**:①`guard.mjs` 以 `--import` 預載,攔一切目標不在本 repo `./tmp/` 之 fs 寫入與子程序;②受測 src 之副本(`mkwpt*.mjs`)把 fdTar/fpTar/暫存檔/清空目標重導到 `out-<tag>/<套件>/`;③**下游相依模式**(`IMPACT_DOWNSTREAM_DEPS=1`):`module.registerHooks` 把受測副本內之裸引用改由 `<套件>/node_modules/w-package-tools/src/` 位置解析(新增之相依除外),並在 `out-<tag>/<套件>/node_modules` 建 junction 指向下游 node_modules,使暫存檔內之裸引用(node-resolve 走訪,不經 Node 掛鉤)亦由下游解析;④每輪用新 tag 且 HEAD 與定稿同時段跑(他代理會同時改下游碼);⑤前後以 `git status --porcelain --ignored` 雜湊比對。限制(sol 外審):只重導寫入不覆蓋讀取(分階段建置之後段讀到原 repo 之舊中介產物)、清空目標換成新目錄而失去原狀態、載入測試 50ms 即結束。
- **`module.registerHooks` 之 resolve 改 `parentURL` 對 CJS `require` 無效**:須自行 `createRequire(根).resolve()`;但 ESM 之 `import` 改走 require 解析會換掉 conditional exports(sol 外審實測可使壞的 import 分支變成好的 require 分支),依 `context.conditions` 分流。
- **「存活」要以 rollup 自己的判定為準**:`resolveImportMeta` 只對 tree-shaking 後保留之 import.meta 呼叫(帶屬性名,裸用為 null),比「模組 renderedLength>0」精準;未解析之裸引用亦應到 `renderChunk` 看是否仍在 `chunk.imports`/`dynamicImports` 才擋(sideEffects:false 套件之未用子模組、死碼內之 `import()` 不擋)。原型以模組為粒度,三位外審皆指為誤擋。
- **守衛與操作種類是軸**:`import.meta.dirname ?? fallback`、`typeof import.meta.dirname`、`import.meta.env?.MODE`、`typeof import.meta`、解構 `{ url }` 於 umd/cjs 皆正確;未受守衛之 `env.MODE`、`glob()`、寫入 `import.meta.x = …` 則壞。只用屬性名白名單判定必有誤擋與漏擋。
- **eslint-scope 之版本會改變判定**:本 repo 原頂層為 5.1.1(@babel/eslint-parser 帶入),不認得 class static block,把 static block 內之 `let __filename` 誤判為外層綁定;7.2.2 正確。新增為直接相依 `^7.2.2` 才會被提升到頂層;另設 `ignoreEval:true`(直接 eval 使作用域動態化而漏判)、`fallback:'iteration'`(新語法節點不崩潰)。
- **commonjs 外掛之轉換長相**:`require(變數)` 與非呼叫之 `require` 參照換成 `import { commonjsRequire } from "\0commonjs-dynamic-modules"`(`typeof require` 亦變 `typeof commonjsRequire`);try 內之**字面** `require('x')` 預設保留原生(`ignoreTryCatch`),但 try 內之 `require(變數)` 仍換成樁(執行得 `caught:Could not dynamically require`)。偵測樁要看該模組在產物內,不能搜字串(第三方預打包碼也含該字串)。
- **Node v24.19.0 之 `fs.rmSync` 之 `maxRetries` 在 Windows 對被占用資料夾(EPERM)不生效**(0ms 即拋;`fs.promises.rm` 才照文件重試)。同步 API 之重試以 Atomics.wait 自寫;**等待期間本行程之事件迴圈被阻塞**,測「占用中途解除」要讓占用之子程序自行計時結束,不能由本行程之計時器去 kill。
- **wsemip 之錯誤有「回傳」與「直接拋出」兩種形狀**:清空前之型別判定可能直接拋(sol 外審注入實測),重試判定須把兩者正規化。並發清空同一資料夾會出現 ENOENT(項目已被他方刪除),亦屬暫時性(opus 外審 3 子程序實測)。
- **由錯誤路徑算出根目錄**:rollupVueToHtml 之 `tar` 無資料夾部分時算出 fdTar 為 `'/'`,原碼即會清空整個磁碟根;清空一律拒絕根目錄、cwd 與其上層。
- **三方外審之分工價值(本次)**:opus 21 條(獨家:下游 rollup 版本、sideEffects:false、渲染根目錄、ENOENT 並發)、sol 30 條(最細:評估方法 8 條、直接 eval、寫入、system 格式、wsemip 直接拋錯)、muse 15 條(與他人高度重疊,1 條把 ESM 之情形誤歸為 CJS)。原型以模組為粒度之誤擋三方皆指出。**派審前先把表與原型落 `./tmp`,提示詞要求「找漏格、誤擋與漏擋」而非確認方案**。
- **他 repo 快照有差不等於沙箱寫出去**:run02 前後 119 repo 中 3 個雜湊變(wsemi、w-orm-reladb、w-maplibregl-vue),以 `find <repo> -maxdepth 3 \( -name node_modules -o -name .git \) -prune -o -newermt '<快照時刻>' -print` 列出變動檔,皆為並行中之他 agent 之 `CLAUDE_*.md`、`src/`、`tmp/` 與 npm 安裝;再以守門記錄(`logs-*/*.guard.jsonl`)之被擋目標之 mtime 早於開跑確認未被寫入。`git status --porcelain --ignored` 於 wsemi 會因其 `tmp/` 巢狀 node_modules 而跑很久(全庫逾 10 分鐘),快照指令以背景執行。閘門結果:新增失敗只有 w-orm-mdb(其安裝之舊 w-orm-reladb 之動態 require 樁),產物 1526 檔不同 0。
- **沙箱跑完要拆 junction 才算收尾**:下游相依模式在 `out-<tag>/<套件>/node_modules` 建之 junction 指向下游真實 node_modules(run02 累計 232 個);日後有人以會跟隨 junction 之工具(PowerShell 5.1 `Remove-Item -Recurse` 等)刪 `./tmp` 即刪到下游。跑完即 `node tmp/bx01/impact/unjunction.mjs`(`fs.unlinkSync` 只刪連結,腳本前後比對目標項目數),再以 `find tmp -type l` 確認剩餘連結皆指向 `./tmp` 內。
- **再犯之計數錯誤**:報告與帳本之數字一律以指令重算(本 run 帳本測試條數初寫 19/9,實為 20/8);Bash 雙引號內之 `node -e` 不可含反引號或 `${}`(被 bash 展開),改檔一律 Edit/Write 或寫成 .mjs 再執行。

## 十八、內附 wsemip 升版(1.9.16 → 1.9.17)之審計方法(2026-10-16,主控任務 20261016181137 run01)

- **站點全集先排除模板**:`git grep -o "\bw\.\w+"` 會把 `src/rollupParfor.mjs:46-163`(genParforCode 模板)內之 `w.cint`、`w.pmMap` 等算進來;該處的 `w` 是 `src/wpf.umd.js`(另一個內嵌 bundle,版本獨立,當時 1.8.42),**不是 wsemip**。誤把 `w.cint` 當 wsemip 呼叫會得出「wsemip 無 cint 匯出」之假缺陷。判別法:看該行是否在 `` ` `` 模板字串內、`import w from` 指向誰。`buildCheck.mjs` 之 `w` 是參數(由 `cleanFolder.mjs`、`rollupFiles.mjs` 傳入),不 import wsemip,grep `from './wsemip.umd.js'` 會漏它。
- **差異探測法(新舊 bundle 同輸入逐格比)**:把舊(`git show HEAD:src/wsemip.umd.js`)與新(wsemi `toolfp/dist`)各放 `tmp/run01/{old,new}/`,同一支探測腳本以 tag 參數各跑一次(各自夾具根),輸出 JSON 再以 cmp 腳本比;輸入軸取「本套件實際傳入之型別」+全值矩陣(含包裝物件、Symbol、BigInt、無原型物件)。純函數 3059 格、fs 127 格(結果+案後目錄樹)、cleanFolderStrict 22 格、pm 13 格,加上**注入失敗**(改寫 `fs.lstatSync` 對特定路徑拋 EBUSY/EACCES…共 60 格)。函數層與站點層要分開比:函數層 40 格不同(拋出→回傳),站點層(cleanFolderStrict)20 格 0 差異——「行為有變」不等於「站點受影響」,吸收在哪一層要寫清楚。
- **探測腳本陷阱**:①路徑正規化要在 `JSON.stringify` 之 replacer 內對字串值做,先 stringify 再 replace 會因反斜線被跳脫成 `\\` 而失敗(出現假差異 3 格);②Windows 之 EPERM 訊息帶 ANSI 亂碼之路徑,正規化不掉,比對前把兩個夾具根名稱統一成同一字串;③對可能永遠不 settle 之 promise 一律 `Promise.race` 加逾時,否則頂層 await 卡住只出現 `Detected unsettled top-level await` 警告而無結果;④工作區為 CRLF,變異腳本用 `\n` 之正規式必不命中(顯示 `MUTATION NOT APPLIED`),寫成 `\r?\n`,且每個變異都要檢查「真的改到」。
- **守門測試要含「舊版紅、新版綠」之格**:升版之守門不只是「新版綠」,要有格能證明它分得出版本。本次「前置檢查失敗不同步拋出」2 條於 1.9.16 紅(15 綠 2 紅)、1.9.17 綠;再以 4 個變異(去掉拋出分支之 catch、去掉 ENOENT 重試、忽略回傳之 error、不帶 cause)驗測試本身,4/4 被殺。注入 `fs.lstatSync` 須同步包住單一呼叫並 finally 還原,mocha `--no-parallel` 下不互相干擾。
- **只改受測行為之外的檔時,變體跑測試優於暫改 src**:另一個內嵌 bundle(wpf 1.9.17)是否可換,以 `tmp/run01/v-wpf/`(複製 src、test、test-code-in、package.json,換入新 wpf)以 cwd 為變體跑 54 條,不動 repo。
- **此類任務之結論分層**:「不受影響」要附三樣——站點清單(逐 `file:line`)、為何不受影響之讀碼理由(取不取回傳值、兩形狀是否同判)、實測差異格數。不附其中之一就只是推論。
- **wsemi 同一輪發布會同時重產 wsemip 與 wpf(`toolparfor/dist`)**:兩者是不同 bundle、版本各自獨立,本套件另內嵌 wpf 兩檔供 `rollupParfor` 模板使用,使用處在模板字串內而非 `src/*.mjs` 之執行路徑,grep 會與 wsemip 之取用混在一起(同為 `w.`)。升 wsemip 時一併查 `head -n 2 src/wsemip.umd.js src/wpf*.umd.js` 與 wsemi 之 `toolparfor/dist` 版本;第一次升 wsemip(R18)時漏看 wpf,落後一整輪(1.8.42)才被發現,盤點指令已入帳本頂部。
- **守門測試只釘「本套件依賴之契約」,不釘版本新語意**:wpf 守門初稿含「pmMap 之 fn 同步拋錯視同 reject」一條,於舊 1.8.42 紅(舊版對非 promise 回傳拋 `return of fun is not a promise`)——但模板恆給 async fn,該行為不可達,屬釘住版本新語意而非依賴契約,刪除;留下之 6 條對新舊 wpf 皆綠。要版本判別力者另放 wsemip 之「前置檢查失敗不回傳拋出」2 條(那是 `rollupFile.mjs:89` 註解所稱之契約)。
- **舊 pmMap 之未處理 rejection 會使探測行程崩潰**:不給 fn、陣列含已 reject 之 Promise 時,舊版無人觀察該 Promise,探測腳本整個行程以 `Error: pr` 結束而無任何格子輸出;探測含 reject 之格要放子程序或略過並另記。`Promise.race` 逾時只擋得住懸置,擋不住這類崩潰。
- **assert 之預期值要先實測再寫**:wpf 之 `ispint('4')` 為 true、`cint(1.6)` 為 2(四捨五入),憑印象寫了 `'4'` 為 false 而紅;守門測試之預期值一律先以探測腳本印出新舊兩版之實值再寫。

## 十九、R19/R20(字串拒絕改帶碼 Error、暫存檔清理留痕)與 wsemi 1.9.18 換入(2026-10-17,主控任務 20261017051850 run01)

- **`CLAUDE*.md` 被 `.gitignore`(第 4 行 `CLAUDE*.md`)**:帳本與本檔之改動不會出現在 `git status`,`git ls-files` 亦無;新增之 `src/wptCommon.mjs` 與測試檔為未追蹤,帳本盤點指令對新檔須加 `git grep --untracked`。
- **全庫呼叫端盤點作法**:Grep 工具於 `C:\opensrc` 加 `glob: '!{**/node_modules/**,**/dist/**,**/docs/**,**/tmp/**,**/.git/**,**/*.md}'` 數秒即回(先前「`C:/opensrc/*` 層級逾時」之記載僅限 Glob)。要看錯誤處理形態改寫成 .mjs 走訪(5643 檔、564 檔引用本套件、53 個 catch 處理器中 50 個只印出),比逐檔人讀可靠;`fns` 之形態亦以走訪分類。腳本在 `./tmp/t55/scan*.mjs`。
- **`util.inspect(err)` 於 Error 帶自有可列舉屬性(`code`)時,把 ` {` 接在最後一個堆疊框行尾**:w-pksupdate R15 之 `RE_STACK_FRAME` 以 `$` 結尾,該行不匹配;堆疊 ≥ 2 框時前一行仍匹配故無礙,**只有單框堆疊(模組頂層呼叫＋top-level await 後)會漏判**,此時靠訊息不變之固定字串清單兜底。改 Error 屬性時要用 w-pksupdate 的 `detectPrintedFailure` 實測輸出(唯讀 import 其 `src/ectScripts.mjs`),不要憑想像。
- **Windows `fs.rmSync` 的 EPERM 實測形狀**:`code: 'EPERM'`、`syscall: 'rm'`、`errno: 1`,`message` 與 `path` 為 ANSI 碼頁亂碼(含 U+FFFD);路徑含「開源」即重現,製造法同帳本 R18(子行程 cwd 設在目標之子資料夾內)。wsemip 之 `fsCleanFolder` 回傳 `{ error: Error }` 原樣帶出。
- **先紅後綠的分組**:同一站點拆兩組測試——「訊息文字鎖定」(修前即綠,證明沒改到訊息)與「帶碼 Error 形狀」(修前紅)。27 站點於 `before` 一次跑完並記錄各站結果,每案之意外記於該案,不使整檔失去判別力(同十六)。
- **不可達之守門如何測**:①`WPT_MULTI_OUTPUT`(generate 多於 1 項,現行外掛不可達)→ 複製 `src/` 到 `test/_tmp/…/variant/src`,以字串置換把 `import { rollup } from 'rollup'` 換成包一層使 `generate` 多回一項之版本,其餘為 src 原樣;②`WPT_INNER_SYNTAX`(inner 語法檢查)無自然輸入(rollup 先驗語法;hashbang 被 rollup 剝除、HTML 註解在 babel 階段即拒)→ 於呼叫期間替換 `vm.Script` 並在 finally 還原。
- **注入 `fs.rmSync` 模擬清理失敗時,只對「已存在」之 temp-* 失敗**(貼近 `force: true` 對不存在者靜默成功之語意),否則對尚未建立之暫存檔也會誤出警告;「建置失敗而暫存檔已存在」要選建置於暫存檔寫出之後才失敗之輸入(nodejs inner 可建、瀏覽器 inner 引用內建模組 `fs` → `WPT_WORKER_EXTERNAL`),只選缺漏模組會因暫存檔未建立而使案變空。
- **變異驗證一次改全部站點即可證每站之測試**:各站拒絕值互相獨立,把 27 處同時改回字串後恰有 27 條形狀測試＋1 條靜態守門轉紅、鎖定組全綠,即證逐站有效(`./tmp/t55/mutate.mjs`,各變異在 `./tmp/t55/mut/<id>/` 之副本跑,不動 repo)。
- **wsemi 1.9.18 換入之審計**:沿用十八之差異探測(舊＝HEAD、新＝1.9.18):純函數/fs/清空/注入 3268 格 0 差異;pmSeries 之容器軸新增 19 格,6 格有差皆為物件容器誤用輸入(下游 121 檔 `fns` 全為字串或陣列)。wpf 之 `pmMap` 完成順序 `log` 欄為計時器雜訊(同一程式重跑落在不同格),比對 wpf 時要重跑數次再判差異。三檔以 `cmp` 與 wsemi repo dist、`npm pack wsemi@1.9.18` 解出者逐位元組比對。
- **帳本行號之更新**:`git grep` 於 HEAD(`git grep … HEAD -- paths`)與工作樹各跑一次,並排比對(`./tmp/t55/inventory.mjs`),比逐行手改可靠;R18 取用總數指令之模板範圍須隨 `genParforCode` 之行段更新;新增 `w.` 取用(如 `rollupFiles.mjs` 增 `isarr`/`isobj`)會使總數變動,須同步補站點與差異探測說明。

## 二十、R19/R20 外審(opus1、sol1)收回後之處置經驗(2026-10-17,同任務 run01)

- **外審兩份、共 16 條、合併 12 條,全屬實或部分屬實,無誤報**;價值在三類:①既有缺陷(Windows 大小寫別名繞過 cwd 保護、前置 lstat 非 ENOENT 原樣拋出而 POSIX CI 會紅)②自己新增程式的時間窗(`rmTempFile` 的非同步重試改變 cwd 語意)③測試對真實迴歸的盲區(重試次數/EPERM/間隔/非阻塞、`.+` 放行任意訊息後綴)。**自己寫完測試後的變異驗證不夠**:我的 22 個變異全殺,審查者仍以重試語意與訊息比對找出 6 個存活者——變異集合要含「語意參數」(次數、間隔、集合成員),不只含「有無」。
- **逐條核對一律重現,不採信敘述**:`tmp/t55/verifyReview.mjs` 以 HEAD 副本與工作樹並排跑審查者主張(假 `w` 計呼叫次數、自建夾具、含 NUL 之真實路徑),HEAD 欄即「修前為紅」的證據。
- **審查範圍與契約的邊界要自己裁**:opus1 指出 worker 產物模板亦有字串拒絕,事實屬實,但它是 R3 執行期契約(測試以字串文字斷言),改型別會連動所有新產製產物,故收斂 R19 範圍並列「刻意不套(待裁示)」,不為求全而擴大。判準:改的是**建置期錯誤**還是**已產製產物的執行期值**。
- **一併修的既有缺陷要「同函數、小修、可測」才做**(win32 大小寫別名),並在報告明寫「範圍外之既有缺陷」;不同函數或需改契約者列待裁示。
- **w-pksupdate 側之建議放 `agent-out/`,不寫進他 repo**;STANDBY 欄回報該檔路徑。
- **變異副本要與 repo 結構一致**:靜態守門會讀 `./bin`、`./toolg`、`./gRollup*.mjs`,副本漏帶即每個變異都因 ENOENT 假紅,使「全殺」的結論不可信(第一輪變異報告即因此作廢重跑)。
- **前景等待**:`sleep N` 單獨長於約 25 秒會被擋;改用 `until <條件>; do sleep 5; done` 之條件迴圈（單次 ≤ 10 分鐘）或 Monitor 等候背景工作,不要輪詢式連續呼叫。

## 二十一、genDocsExams 與 README 改指 gh-pages(R21、R22;2026-11-01,主控任務 20261101202155 wpt257)

- **先盤現況再定選項,盤出的事實比規格更能改設計**:①`script.txt` 現序為 `cleanFolder`(清 dist 與 docs)→ jsdoc → `gDocsExams` → `gDistRollup`,`gDocsExams` 執行時 **dist 是空的**——規格只說「複製 `./dist/`」,若照做會靜默產出空的 `docs/dist`;故函數對「dist 不存在/為空/引用之檔不在 dist」皆給警告,並把「須排在 gDistRollup 之後」寫進 R21 與報告。②各套件 toolg 並非全是 `./examples/`:w-howler 以專案根之 `web.html`(引用 `dist/…` 非 `../dist/…`)→ 需 `opt.files` 與「相對 dist 引用於複製後失效則改指」;5 套件(w-jsonview-tree 等)只是變數名不同;w-json-stream 另有 `into-stream.umd.js` → 整夾複製 dist 即涵蓋,不逐檔列舉。③README 有 `/dist/` CDN 網址之 44 套件中 13 個無 `gDocsExams` → 需「只複製 dist」模式(`fdSrc: ''`),否則 README 指向之 gh-pages 檔不存在。盤點腳本只讀 `scan/scanOwnCdn.json` 與各 repo 之 `toolg/`,於 `./tmp/wpt257/`。
- **網址辨識:邊界比寫對主體更容易漏**:套件名後須 `(?![\w.~-])`(否則 `wsemi-extra`、`wsemi.js`、`w-fft_x` 被當自有套件);主機須緊接 `//` 且之後立即 `/npm/`(`xcdn…`、`cdn.jsdelivr.net.example.com` 不匹配);`@scope/`、`gh/`、`raw.githubusercontent.com` 不匹配。相對 `dist/` 引用須要求前一字元不在 `[\w./:@~-]`:否則根目錄範例檔(files 模式)內的 `https://x/dist/a.js`、`assets/dist/a.js` 會被當成本套件 dist——**lookbehind 在一般範例夾(非根)被 `isInside(fdDist)` 擋掉而看不出作用,只有根目錄範例才現形**,測試要補這格(變異 g30 因此才被殺)。
- **路徑跳出用「解析後包含關係」不用字串檢查**:`..`、`%2F`、Windows 反斜線皆可繞過 `includes('..')`;以 `path.resolve` 後 `path.relative(base, x)` 不以 `..` 起頭且非絕對判定(`isInside`),Windows 之大小寫由 `path.relative` 處理。相同函數也用於「目標不得位於來源之內」,於任何寫入之前拋。
- **多餘的防線要刪或證其有用**:`fpLib === base`、`relInDist.startsWith('..')`、`pthRaw === '/dist/'` 皆被後一道檢查(`statSync.isFile()`、`distSet.has`)涵蓋,變異後行為不變(等價變異),於實作後刪除;留著只會讓變異報告出現無法殺的存活者。
- **測試輔助函數之預設參數陷阱**:`mkCase(readme, { repository = ghRepo() } = {})` 時,明給 `repository: undefined` 仍會套預設,「無 repository 欄位」的案例因此測成「有」(第一版幸被結果發現);改以 `'repository' in opt` 判斷。
- **變異集合要避免「變異本身會寫到 repo」**:`strOpt` 允許空字串的變異會令 `fdTar: ''` 解析成 cwd(repo 根)而把範例寫進 repo,故不納入;`fdSrc` 不處理 `''` 之變異靠「fdTar 位於 fdSrc(=cwd)之內」的重疊檢查在寫入前拋錯而安全。凡變異可能擴大寫入範圍者先想寫入點再納入。
- **變異驗證的做法(一次取鎖)**:`tmp/wpt257/mutate.mjs` 在 `tmp/wpt257/mut/<id>/` 只複製受測的 6 個 src 檔與 2 個測試檔(測試以 `../src/` 引用副本,工作目錄仍為 repo 根,夾具在 `test/_tmp/`),以 mocha `--reporter json --reporter-option output=` 取失敗清單;整支腳本包在**一次** `quiet-run --lock` 內(約 60 個變異),不是每個變異各取一次鎖(等鎖 30 秒 × 60 次)。`find` 以正規式比對並容忍 CRLF,出現次數不為 1 即記 `NOT APPLIED`(不當作存活)。
- **真實專案實跑不寫入原 repo**:把 `package.json`、README、`examples/`(或 `test-html/`)、`dist/`,以及 node_modules 內**自有套件**之 `package.json` 與 `dist/` 複製到 `tmp/wpt257/real/<名>/`,以**子行程、cwd=複本夾**呼叫預設路徑之 `genDocsExams()` 與**未改**之 `toolg/modifyReadme.mjs`,才驗得到「預設路徑」與「各套件 toolg 不改即生效」。不用 junction 連回原 node_modules(清理時會穿過)。
- **動工前先掃 `C:\opensrcOper\dspec\README.md` 索引,不要等到寫〈審查三要點自查〉才讀**:本輪規格寫成後才讀到〈自有套件之瀏覽器端取用與gh-pages〉與〈輸入參數之檢測機制〉,補出三個缺口並重跑全部變異(約 20 分鐘):①規則 2 將範例原始檔之他套件網址改指其 gh-pages,規則 3 又要求產製時就地化——只認 jsDelivr/unpkg 的實作在主控批次改寫原始檔之後會讓範例頁對外取用 gh-pages(違規則 3),故辨識「本套件擁有者之 `github.io/<名>/dist/…`」並就地化(`/examples/…`、`/global.html` 之導覽連結不動且不警告,否則 80 個範例頁各一則假警告);②K3:opt 鍵型別不符視為未給改用預設,不拋錯(我原先 throw `WPT_DOCS_INVALID_OPT`);`null` 一律視為未給,故 `fdSrc: null` 不再等於「無範例」,只剩 `''`;③V17:全部檢測先於任何寫入(原先 `fdSrc` 不存在之檢查排在 dist 複製之後)。**dspec 內部不一致**:`process_review.md` 審查三要點(3)舉例「opt 給錯值卻靜默回退(違 K3)」與 dspec K3(2026-10-31 改寫:非預期之輸入視為未給、改用預設)相反,以 dspec 正文為準並列待裁示。
- **K3 之變異要含 `null` 與「改用預設後結果相同」之格**:型別不符鍵改用預設後輸出與不給相同,只比輸出會讓「是否真的走預設路徑」的變異存活(`arrOpt` 把 `null` 當無效,輸出相同但 debug 說明多一則);須搭配 `opt.debug` 之說明斷言,且 `null`/`undefined` 各鍵都要有格(變異 k09 因此才被殺)。
- **在變異腳本裡替換成「語法有效」的文字**:`h04` 第一版因括號數不對使副本載入即 SyntaxError(記為 NO RESULT,不是被殺);腳本須把 NO RESULT、NOT APPLIED 與存活分開統計,並逐一處理。
- **gh-pages 部署不受 `.gitignore` 影響**:`bin/gh-pages.mjs` 是 clone 目標分支 → 清空 → 複製 `-d` 資料夾 → push,所以 `docs/dist`、`docs/libs` 可列入各套件 `.gitignore` 避免 repo 增大(一個 wsemi umd 約 1.3MB,每個引用 wsemi 之套件 +1.3MB)而仍會上線;此為建議,未改任何套件。

## 二十二、dist 改由部署工具提供、原地改寫既有頁面、找不到改指 gh-pages(R21 修正、R23;2026-11-01,主控任務 20261101202155 wpt257b)

- **設計被「不可改之檔」改變時,把責任搬到下游那個「必定在對的時間執行」的工具**:`script.txt` 在重建 dist 之前就跑 `gDocsExams` 且不得改,wpt257 的「複製 dist 並警告須排序」依賴使用者去改排序;wpt257b 改由 `npm run deploy` 所用之 `bin/gh-pages.mjs` 提供 dist——部署必在 dist 建好之後(盤點 121 個有 deploy 之套件,`deployBeforeDist` 0 個),`genDocsExams` 因此與 dist 先後完全無關,並刪去全部 dist 警告(預設)。判斷「該不該由函數驗證 dist」時注意:Vue 類在 `gDistApp` 與 `gDistRollupComps` 之間可能已有**部分** dist,預設去驗證會有誤報;故預設完全不驗證。
- **先確認 `gh-pages` 指令解析到誰,不要憑 package.json 的字面**:`"deploy": "gh-pages -d docs"` 是第三方套件之指令名;實際由 `node_modules/.bin/gh-pages`(shim)決定。盤點方法:讀各套件 `node_modules/.bin/gh-pages(.cmd)` 之 shim 內容(正規式取 `../<套件>/…/gh-pages*`),並確認 `package.json` 無 `gh-pages` 依賴、`node_modules/gh-pages` 不存在(121/121 皆指 `w-package-tools/bin/gh-pages.mjs`;另提醒:盤點期間 `C:\opensrc` 下會有他 session 新增套件〔本輪出現 w-knowledge-summarize〕,數字以最後一次重跑為準)。盤點腳本 `tmp/wpt257b/inventory.mjs`(只讀)。
- **CLI 型腳本之測試**:`bin/gh-pages.mjs` 是頂層執行之腳本,不匯出函數;以**子行程實跑**搭**本機 bare 倉庫**當 origin 即可完整驗證(`git ls-tree -r --name-only gh-pages`、`git show gh-pages:<path>` 取遠端內容與位元組)。要點:①git 身分與 `core.autocrlf` 用環境變數固定(`GIT_AUTHOR_*`、`GIT_COMMITTER_*`、`GIT_CONFIG_COUNT/KEY_0/VALUE_0`),不依賴使用者設定;②**每個案先斷言 origin 是暫存夾內之本機路徑**(防止測試誤推真實遠端);③`git clone --depth` 對本機路徑只警告不失敗;④不存在之 origin 路徑會走「orphan」分支再於 push 失敗,是測「部署失敗」的現成作法;⑤`-d .` 因暫存夾在專案內而無窮遞迴(修改前即有),測試別用。
- **同一特例分支要先問「它能被測到嗎」**:`isSubPath` 的 `r === '' ||` 與 `!isAbsolute(r)` 兩項,前者冗餘(空字串通過後面兩項檢查),刪;後者只有跨磁碟機才觸發,單磁碟機機器無法實測,以 `path.win32.relative('C:\\p\\dist','D:\\site')` → `D:\site`(絕對)推理驗證,保留並在規則帳本標為已知未覆蓋(變異 b10b 存活)。冗餘防線不留,無法測的防線要明寫。
- **%5C 的冗餘**:`isSimpleDistPath` 先對 `%5C` 寫了獨立判斷,變異 g09d 存活——解碼後的反斜線已被 `pthFs.includes('\\')` 擋,`%5C` 判斷為冗餘(`%2F` 則必要,因解碼後是 `/` 而看不出)。測試加了 `%5C` 的案例並不能讓冗餘判斷變得必要;刪冗餘判斷。
- **原地改寫既有檔時,不要為「沒有原始位置」另開特例**:一度在 `rewriteText` 加 `bPlace` 跳過相對 dist 引用之改指;檢視後發現以檔案目前位置當「原位置」即可(fdTar 內頁面之 `../dist/…` 本來就不指向專案 `./dist` 而不動;`../../dist/…` 指向專案 dist 才改指 fdTarDist),特例反而讓真實存在之 `../../dist/…` 不被修正。多一個旗標＝多一組要測的分支。
- **歸併主控台警告的做法**:`warn(s, key = s)` 另存同序之 `warnKeys`,回傳之 `warnings` 仍逐則完整(含檔名,供程式使用),主控台依 key 歸併(同網址同原因的 109 頁只印 `warning x109: …`)。實跑 w-leaflet-vue 時 109 則同類警告是因為 `wsemi.umd.min.js` 在 wsemi 的 dist 不存在(jsDelivr 自動壓縮檔,5 個套件的 toolg 在用),不歸併就是 109 列。
- **真實產物複本實跑要連部署一起跑**:`tmp/wpt257b/realRun.mjs` 把 `test-html/`、`dist/`、`docs/examples/`(gDistApp 之產物)、node_modules 內自有套件之 `package.json`+`dist/` 複製成工作夾,跑 `genDocsExams({ fdSrc: './test-html/' })`,再以**本套件 bin** 部署到本機 bare 倉庫並 `git clone` 出站台,對站台內之 `examples/*.html` 做相對引用存在性檢查——這樣 `../dist/…` 才有東西可查(genDocsExams 本身不再複製 dist)。取出站台用 `git clone` 而非 `git archive | tar`(Git Bash 之 GNU tar 把 `C:\…` 當遠端主機)。
- **同一網址形態在兩個模組各組一次＝原則 4（所有入口一致）的違反**:新增「找不到改指 gh-pages」時我在 `genDocsExams` 又寫了一份 `` `https://${owner}.github.io/${pkName}${…}` ``,而 `modifyReadme` 早有一份;寫自查表（對照原則 4）時才發現,收斂為 `ownPkg.mjs` 之 `ghPagesUrl(owner, pkName, pth)`（兩處共用；變異 o01–o05 以兩個測試檔一併跑才殺得完：主機小寫只有 modifyReadme 測試分得出,尾段/路徑只有 genDocsExams 測試分得出）。教訓：新增功能先 `git grep` 該字串形態（`github.io`）有沒有既有組成點。
- **變異腳本分組、加 `--bail`**:bin 測試約 25 秒,變異 28 個全跑約 5 分鐘;分兩批各在一次 `quiet-run --lock` 內,mocha 加 `--bail`(被殺者提早結束)。`find` 可含 `\n`(腳本把它當 `\r?\n`),用於跨行片段。

## 二十三、genDocsDist、他自有套件改指 gh-pages、gh-pages 只部署(R21 改版、R23 撤除、R24;2026-11-02,主控任務 20261102100136 wpt268)

- **使用者推翻前一輪設計時,先讀規格的「落實狀態」找出哪些是我上輪造的**:wpt257b 為了「`script.txt` 不得改」把 dist 責任搬給 `bin/gh-pages.mjs`(部署時提供專案根 `./dist/`),使用者 11-02 裁示「gh-pages.mjs 職責僅發布」「依循複製 examples 至 docs/examples 之方式複製 dist 至 docs/dist」「撤掉 docs/libs/」,並同意由主控把 `genDocsDist` 插入 `script.txt`。教訓:當時「script.txt 不能改」只是約束的**一面**,真正的約束是「責任放在哪個工具」;換一個擁有者(主控改 script.txt)就能回到最直接的設計。撤除時要一併移除**該功能的全部附屬**(參數、說明行、警告、盤點行、測試、README、單一擁有者表),原則 14 不留相容。
- **「一律改寫」比「有就地化、沒有改寫」簡單且更可驗證**:舊流程是「本機 `node_modules` 有該檔→複製到 `docs/libs/` 並改相對路徑;沒有→改指 gh-pages 並警告」,分支多、輸出隨本機安裝狀況而異(同一原始檔在兩台機器產出不同頁面)。新規則「不看本機、一律改指 gh-pages」使輸出只取決於輸入,測試只需「有無 node_modules 結果皆同」一案(`本機node_modules有無該套件…結果皆同`)而非逐分支。代價:wsemi 之 `wsemi.umd.min.js`(實際不存在於 wsemi 的 dist)原本因「本機無檔」而被警告,現在靜默改寫成指向不存在之檔(rulebook R21 已知限制)——這是「不讀本機」的直接後果,要寫進已知限制並由主控批次改原始檔,不是把本機檢查加回去。
- **共用的走訪/複製/opt 讀取抽成內部模組 `src/docsCommon.mjs`,而不是把 genDocsExams 的私有函數複製一份到 genDocsDist**:`walk`(連結不跟進)、`isInside`、`copyFile`、`readOpt`(K3/K9/V4)原本是 genDocsExams 的私有函數;新函數完全需要同樣的語意,複製會成為「兩處各一份、日後只改一處」的分歧(同 22 輪 `ghPagesUrl` 的教訓)。以 `genDocsExams` 既有 75 案不改斷言(僅網址形態改)、並對 `docsCommon` 做 9 個變異(c01–c09,兩個測試檔一併跑)證明抽出沒有改行為。
- **會清空目標的函數,重疊檢查要連結解開後再做一次**:`cleanFolder(fdTar)` 先於複製,若 `fdTar` 的上層或 `fdDist` 本身是 junction,字面比對看不出「來源在目標內」,清空就刪掉來源真實內容。`realPath()` 取「已存在之最深上層」的 `realpathSync.native` 再接回其餘段(目標不存在時也能用);兩個方向各一個變異(d07、d08)才分別被「目標上層為指向 dist 內之連結」與「來源為指向目標內之連結」兩案殺掉——**只測一個方向會讓另一個方向的 realPath 保護無人驗證**。
- **「為空」的定義要和「清空」一致**:`dist/` 只有空子資料夾、只有 junction 時,可複製的檔案數為 0,必須與「資料夾為空」同樣報錯(否則清空目標後什麼都沒複製,部署出空 dist)。以 `walk` 的回傳長度判定而不是 `readdirSync(dist).length`;兩案(只有空資料夾、只有連結)各有測試。
- **整檔回到 HEAD 當變異,是最有力的「修前紅」證明**:`mutate.mjs` 之 `{ head: '路徑' }` 以 `git show HEAD:路徑` 取修前版本放進副本(e01=genDocsExams、g01=gh-pages),新測試對它:`unit-genDocsExams` 47 紅、`unit-ghPagesDeploy` 4 紅 6 綠(綠者為行為本不變之案)。再加 41 個細部變異(d01–d17 genDocsDist、c01–c09 docsCommon、e02–e14 genDocsExams、g02–g03 bin)共 43 全殺;`NOT APPLIED` 的 d14 是 `find` 在 JSDoc 與程式各命中一次(2 處),改成含 `wptError(` 前綴使其唯一後重跑被殺——`find` 要避開同字串出現在 JSDoc/註解。
- **測試鎖與前景限制**:變異腳本包在一次 `quiet-run --lock` 內(1 分 6 秒,43 個變異);全套 `npm test` 另取一次(約 3 分鐘,背景執行,notification 到時才讀 summary);前景指令不可 `sleep N` 單獨超過數秒(被守門擋),改以背景＋notification。

## 二十四、@babel 7 → 8 與 rollupFile 之 babel 隔離(R25;2026-11-10,主控任務 20261110095259 bb02)

- **「是否經 babel」之觀察點要選 rollup 不會動的行**:先以「頂層 `let x = 1` 之有無分號」判定,`.vue` 案假紅——rollup 渲染頂層變數宣告時本身會補分號。改看函數本體:babel 重印整個模組(縮排 2 格、補分號),rollup 不動函數本體文字,故原始碼以 4 格縮排、不寫分號時,產物中該行之形狀即可判定。
- **安裝擺放之夾具要照 npm 實際擺法,缺一層就假紅或假綠**:「使用端根目錄有 core 7」之夾具,起初只把本套件之 core 8 巢狀,preset-env/transform-runtime 則往上解析;一旦在根目錄放假 preset-env 7(模擬 vue-cli 帶入者),本套件之 `import presetEnv` 也解析到假 7 而紅——實際安裝(w-component-vue 副本實查)時 npm 會把三者都巢狀於 `w-package-tools/node_modules`。夾具在 repo 內時,解析鏈會一路走到 repo 根之 `node_modules`,若根目錄不放假 7,「外掛改回字串指名」之變異也不會紅(字串會解析到 repo 根之 Babel 8)。所以:根目錄放「會拋錯之假 7」、本套件之 Babel 8 以轉接模組(`export * from '<實際 URL>'`)巢狀;同層提升則依「peer 接受 core 7 者被提升」由 `package.json` 推導,不寫死名單(改前會提升 `@rollup/plugin-babel` 等 9 個,改後只剩 `@babel/eslint-parser`)。
- **修前紅燈之執行環境**:相依已換成 Babel 8 後,本 repo 之 `node_modules` 無法再跑改前版本。以 `git ls-tree`＋`git cat-file blob` 取 HEAD 之 blob 原始位元組建副本(不經 eol 轉換)、`npm ci --min-release-age=0`(暫存副本之 lockfile 精確安裝,派工允許),再把新測試檔複製進去跑。HEAD 副本也充當 lint 基準與「改前行為」探測(例如 browserslist 設定之影響)之環境。注意 HEAD 版以字串指名外掛、自 cwd 解析:探測夾具放在本 repo 下時 HEAD 版找不到 Babel 7 外掛,夾具須放在 HEAD 副本之下。
- **變異執行器要處理行尾**:`src/rollupFile.mjs` 為 CRLF、新檔為 LF;以含 `\n` 之樣式套變異時 5 個「找不到樣式」——執行器須依檔案行尾調整樣式,且「樣式找不到」要報錯而不是算存活。13 個變異(移除 `configFile`/`babelrc`、preset 或外掛改回字串、移除 `targets`、不掛外掛、篩選不排除 `\0`、不去 query、副檔名不錨定、caller 不宣告 ESM、不產 sourcemap、忽略呼叫端設定、語法壞)全殺。
- **下游等價比對之三個基準**:①同路徑之改前基準(副本先跑一次建置列並快照),改前改後逐位元組比;②正式 repo 已提交之產物:wsemi 可逐位元組比,w-component-vue 主檔含 `rollup-plugin-vue` 之 `data-v-*` 雜湊(非 production 時以絕對檔名計)與內嵌 CSS sourcemap 之絕對路徑,換路徑即不同,只能正規化後比(改前基準對正式 repo 亦如此,證明差異與工具鏈無關);③快照之內容帶原建置路徑,正規化時要用建置時之根而不是快照所在之根。
- **移除傳遞相依會讓下游「取不到即略過」之測試靜默改變**:移除 `core-js` 後 wsemi 之 core-js 對拍案由通過變為略過(總案數不變、0 failing),只有比對 passing/pending 數才看得出。下游全套之驗收要比 passing 與 pending 兩個數,並列出 pending 名單對照。
- **`git diff --output=<檔>` 可在不經 shell 重導向下把差異寫檔**(守門擋 `>`);要排除 lockfile:`git diff --output=<檔> -- . ':!package-lock.json'`。
- **preset 給了 `targets` 不代表 browserslist 設定不被讀**(外審 terra F1,實測重現):Babel core 在無**頂層** `targets` 時,依 `browserslistConfigFile`(預設 true)自 cwd 讀 `.browserslistrc`/`package.json#browserslist`/`BROWSERSLIST`,兩檔並存或查詢無效即拋錯(B7 亦然)。我原以「ie 11 設定不改變產物」判定「不讀」——那只證明 preset 不採用,沒測到 core 層讀取時之失敗路徑。判「不讀某設定」要連「該設定壞掉時」一起測,不能只測「該設定有效但不同」。
- **升 Babel 大版要查「預設會悄悄做的事」被移除者**(外審 F6):transform-runtime 7 預設 `regenerator: true` 會改寫自由全域 `regeneratorRuntime`,8 移除後產物建置成功、執行期才 `regeneratorRuntime is not defined`。下游逐位元組相同只證明「那兩包」沒用到;要判全庫影響,用該 runtime 特有之字串(`Generator is already running`)掃全庫已提交之 dist(先以改前產物確認判準抓得到),本次 0/140。
- **測試不依賴傳遞相依**:要解 sourcemap 時 `@jridgewell/trace-mapping` 雖在 node_modules,卻只是 Babel 之傳遞相依(wsemi core-js 對拍案即因此被本次改動影響),故於測試內自寫 20 行 VLQ 解碼。`api.caller(fn)` 之回傳須為簡單型別(作快取鍵),要取整個 caller 物件用 `JSON.stringify`。
- **外審時效**:terra(gpt-6.1-terra/max,Codex 唯讀沙箱)約 20 分鐘回 11 條,其中 F1、F6 為我漏掉之高嚴重度格;Claude API 兩把金鑰皆無額度時 `dispatchAiFallback` 回 `QUOTA_EXHAUSTED`(`failureKind: no-credit`),以 `probe-anthropic-keys.mjs` 交叉確認後不派。

## 二十五、rollup 3 → 4 與 R17 墊片之兩版對照(2026-11-11,主控任務 20261111182635 pt395)

- **「上游已修」要逐形態驗,不能以一格推全類**:評估時以頂層 `let __filename` 一格得出「rollup 4 已修墊片劫持」;逐形態實測後,rollup 4 只改名**模組頂層之 `__filename`**,umd 頂層之 `location` 仍劫持,函數、區塊、if、for、箭頭與方法參數、catch 參數之同名宣告兩版皆劫持。檢查本即依輸出之作用域綁定判定,故程式不必改,改的是測試之預期與帳本之理由。
- **兩版對照之作法**(升 rollup 時重做):對每個形態 × umd/cjs,①不加檢查外掛建置、載入產物呼叫,取得之值不含產物所在資料夾或拋錯即「實際劫持」;②加檢查外掛建置得判定;③兩者逐格比對。rollup 與 commonjs 取自執行環境之 node_modules,於升版前後各跑一次(本輪 3.30.0 與 4.67.4 各 64 格,0 格不一致)。腳本放 `./tmp/`,證據交任務資料夾。
- **證明「判定依輸出綁定」可不靠打包器版本**:以 rollup 直接建置,檢查外掛前置一個 `renderChunk` 外掛改寫輸出之宣告名(`__filename$1` 改回 `__filename`、或把函數內宣告改名),同一輸入之判定隨之翻轉(`test/unit-buildCheck.test.mjs`「genBuildCheck: 同一輸入只改變輸出之綁定」)。renderChunk 依外掛順序串接,前者之輸出即後者之輸入。
- **指紋測試換語意斷言,先在兩版都跑**:新斷言於 rollup 3.30.0 與 4.67.4(及 4.67.5)皆綠、舊斷言於 4 紅,才證明新斷言不是 4 之新指紋。舊版環境取法:下游副本 `npm ci` 後其 `node_modules/w-package-tools` 即修前版(lock 之 integrity 與修前 `npm pack` 相同),把新測試檔放進該處以其為 cwd 跑 mocha;或在 `./tmp/` 建空 `package.json` 後 `npm i <修前 tgz>`。`.vue` 產物以 `new Function('module','exports','document', code)` 載入(假 document 只需 `head.appendChild`、`createElement`、`createTextNode`),render 以假 vm(`_self._c`、`_v`、`_s`)呼叫得節點樹;es 產物以 `data:text/javascript;base64,` 動態 import。
- **產物大小之歸因要固定 terser**:含 worker 之下游包 r4 反而大 3.6%,先疑 commonjs 29 之 `strictRequires: true`(改 `"auto"` 實測大小幾乎不變而排除),再查 lock:該包鎖 terser 5.16.8,`@rollup/plugin-terser` 1.0.2 帶入 5.51.2;以同為 terser 5.51.2 之 rollup 3 環境重建,rollup 4 反小 206 bytes。下游 lock 之舊 terser、舊 rollup(3.20.2)會讓「rollup 4 之差異」混入其他升版。
- **下游解析之版本 ≠ 本 repo 之 lock**:本 repo lock 4.67.4,下游 `npm i <tgz>` 解析 `^4.67.4` 得 4.67.5(當日剛滿 7 天冷卻)。測試要在下游實際會拿到之版本也跑一次。
- **UMD 冒煙之相依解析看產物所在位置**:`createRequire(<副本>/package.json)` 之 require 只決定產物本身從哪找,產物內之 `require('dayjs')` 依產物檔所在位置解析;快照放在副本外即 `Cannot find module`,須複製回副本內再載入。
- **外審(terra)補出之軸:壓縮在檢查之後**:R17② 在 terser 之前檢查,預設參數用 `import.meta.url`＋本體 `var __filename` 之形態,未壓縮正確、壓縮後 terser 把預設參數之全域參照改綁到本體之短名而 `ReferenceError`(terser 5.16.8/5.46.1/5.51.2 皆然,非本輪引入;列四之一待裁示)。兩版對照只比「打包器版本」會漏「壓縮器」這一軸;判「實際劫持」要以**最終產物**(含壓縮)為準。
- **升外掛大版要逐一讀其 CHANGELOG 之預設值變更**:本輪自己列了 commonjs 之 `strictRequires`,漏了 node-resolve 16 之 `exports` 條件(加 `production`)、replace 6 之識別子界線、rollup 4 錯誤訊息加 `[plugin <名>]` 前綴、原生二進位改 optional 相依——皆外審補出,於 4 包下游無差異但屬可觀察變更。曝險以「已提交 dist 之 `.map` sources → 該 repo `node_modules/<名>/package.json`」全庫只讀掃描(126 repo、152 map、0 個)。
- **語意斷言也要做反例**:首版 gVue1 只斷言方法「存在」、gAsync2 只要「產物某處有 async」,外審以「方法改輸出」「預設匯出改同步、另放無關 async」兩反例皆過;改為呼叫方法比對輸出、斷言預設匯出本身為 AsyncFunction 後,於 `./tmp` 變體輸入實跑 2 案皆紅。
- **commonjs 包裝影響 R17 之軸**:被打包之 CJS 相依之頂層 `var __filename` 於 commonjs 24(`strictRequires: "auto"`)在模組頂層而劫持 umd 墊片;commonjs 29(`true`)包於函數內,不在墊片之作用域鏈上。外掛預設值之改變也會移動「何者劫持」之邊界。
