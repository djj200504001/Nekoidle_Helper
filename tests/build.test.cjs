const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('安装文件与模块源码一致，入口、版本号和单次初始化完整', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    const source = fs.readFileSync(path.join(root, 'src/enhancements.js'), 'utf8').replace(/\r\n/g, '\n').split('// CommonJS test exports')[0].trim();
    const embedded = source.split('\n').map(line => line.trim() ? '        ' + line : '').join('\n');
    assert.ok(script.includes(embedded));
    assert.equal((script.match(/\/\/ NEK_ENHANCEMENTS_START/g) || []).length, 1);
    assert.equal((script.match(/\/\/ NEK_ENHANCEMENTS_END/g) || []).length, 1);
    assert.equal((script.match(/nekEnhancements\.init\(\);/g) || []).length, 1);
    assert.equal((script.match(/function \(\) \{ nekEnhancements\.decorate\(\); \}/g) || []).length, 1);
    assert.match(script, /@version\s+1\.53\.0\n/);
    assert.match(script, /@description\s+v1\.53\.0：/);
    assert.match(script, /const CURRENT_VERSION = '1\.53\.0';/);
    assert.doesNotThrow(() => new vm.Script(script));
});

test('自动收菜按钮进度改 CSS 动画，无 rAF 逐帧写背景', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    assert.match(script, /@keyframes nek-harvest-green/);
    assert.match(script, /@keyframes nek-harvest-yellow/);
    assert.match(script, /\.nek-harvest-fill\.green/);
    assert.match(script, /\.nek-harvest-fill\.yellow/);
    assert.match(script, /\.nek-harvest-label/);
    assert.match(script, /function syncHarvestAnimation\(btn, force\)/);
    assert.match(script, /animationDelay = delay/);
    assert.match(script, /function markHarvestTick\(\)[\s\S]{0,600}syncHarvestAnimation\(btn, true\)/);
    assert.doesNotMatch(script, /requestAnimationFrame\s*\(/);
    assert.doesNotMatch(script, /rafHarvestPaint/);
    assert.doesNotMatch(script, /btn\._nekBg/);
});

test('任务侧栏合同满员角标逻辑已注入', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    assert.match(script, /function ensureQuestFullBadge\(\)/);
    assert.match(script, /game\.quests\.work\.length/);
    assert.match(script, /game\.character\.quest_max/);
    assert.match(script, /'tip nek-quest-full'/);
    assert.doesNotMatch(script, /tip-default nek-quest-full/);
    assert.match(script, /setInterval\(ensureQuestFullBadge, 30000\)/);
    assert.match(script, /badge\.style\.display = 'block'/);
    assert.match(script, /badge\.remove\(\)/);
});

test('研究队列按钮缺料提示：复用 researchStatus 判定 + 红框内发光样式', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    // 复用脚本已有的 researchStatus「材料不足」判定，不另起游戏接口
    assert.match(script, /function researchQueueLacking\(\)/);
    assert.match(script, /nekEnhancements\.core\.view\(\)\.researchStatus/);
    assert.match(script, /st\.includes\('材料不足'\)/);
    // 样式：红边框 + 红色内发光呼吸动画，字保持黑色（无 color 覆盖）
    assert.match(script, /@keyframes nek-research-lack-breathe/);
    assert.match(script, /\.nek-research-queue-toggle\.nek-research-lack \{ border-color: rgb\(255,48,33\)/);
    assert.match(script, /animation: nek-research-lack-breathe 1\.6s ease-in-out infinite/);
    // 仅在有队列/任务时提示，无队列不误报；title 补注缺料说明
    assert.match(script, /const lack = cls !== 'off' && researchQueueLacking\(\)/);
    assert.match(script, /btn\.classList\.toggle\('nek-research-lack', lack\)/);
    assert.match(script, /if \(lack\) tip \+= ' · 队首材料不足，等待补充'/);
});

test('云同步模块已注入：端点、限流、登录页停同步、二选一、通知反馈', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    // 端点 / 限流
    assert.match(script, /const CLOUD_ENDPOINT = 'https:\/\/tcc\.shinki\.top:19527\/api\/state'/);
    assert.match(script, /const CLOUD_MIN_INTERVAL = 2000/);
    // 决策1：同步读取 uid、不等待、无 3 秒超时
    assert.match(script, /const readUidCloud = \(\) =>/);
    assert.doesNotMatch(script, /waitForUidCloud|CLOUD_UID_TIMEOUT|setTimeout\(poll/);
    // 登录页停同步（实测：uid 仍可读时必须用页面状态判断）
    assert.match(script, /const isLoginScreen = \(\) =>/);
    assert.match(script, /isLoginScreen\(\)\) return \{ skipped: true \}/);
    // 二选一确认
    assert.match(script, /async function cloudOnToggle\(checked, toggleEl\)/);
    assert.match(script, /使用云端数据覆盖当前浏览器/);
    assert.match(script, /保留当前浏览器数据并覆盖云端/);
    // 通知栏反馈
    assert.match(script, /const cloudNotify = \(msg, type, ms\)/);
    assert.match(script, /UI\.notifier\.show\(msg, type \|\| 'tip'/);
    // XOR/Base64 传输混淆
    assert.match(script, /function cloudEncode\(data\)/);
    assert.match(script, /function cloudDecode\(blob\)/);
    assert.match(script, /CLOUD_XOR_KEY/);
    // 结构白名单 + submitted 清洗 + 钓鱼 day
    assert.match(script, /function cloudValidate\(p\)/);
    assert.match(script, /delete o\.submitted/);
    assert.match(script, /p\.fish\.bookings\.some/);
    assert.match(script, /function fishLocalDay\(\)/);
    assert.match(script, /day: fishLocalDay\(\)/);
    // 启动：4 个 init 在前立即执行，pull 绑定 toolbar-container，不阻塞加载
    assert.match(script, /function bootWithCloud\(\)/);
    assert.match(script, /nekEnhancements\.init\(\);\s*initHarvest\(\);[\s\S]{0,1800}await cloud\.bootPull\(\)/);
    assert.match(script, /await cloud\.bootPull\(\);[\s\S]{0,120}finally \{ bootPullBusy = false; cloud\.booting = false; \}/);
    // pull 绑定 toolbar-container：出现/重建发一次 GET，同一节点只拉一次，回退清空 token
    assert.match(script, /function bootPullOnToolbar\(delay\)/);
    assert.match(script, /document\.querySelector\('\.toolbar-container'\)/);
    assert.match(script, /if \(bootPullToken === bar\) return;/);
    assert.match(script, /if \(!readUidCloud\(\)\) return;/);
    assert.match(script, /new MutationObserver\(function \(\) \{[\s\S]{0,300}bootPullOnToolbar\(300\)/);
    assert.match(script, /if \(!bar\) bootPullToken = null;/);
    // 兜底轮询仍在
    assert.match(script, /setTimeout\(attempt, 600\)/);
    // 设置页开关唯一
    assert.match(script, /nek-assist-cloud-toggle/);
    assert.match(script, /const CLOUD_LS_KEY = 'nek_cloud_enabled'/);
});

test('云同步加载顺序：启动只 pull 不 push，一致不覆盖不通知，仅三类反馈', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    // 决策2：pull 后比对，一致 applied:false 不通知；仅覆盖时反馈
    assert.match(script, /function cloudSameAsLocal\(remote, uid\)/);
    assert.match(script, /if \(cloudSameAsLocal\(r\.data\.data, curUid\)\) return \{ found: true, applied: false \}/);
    // 比对语义归一化：null/'1' 都=开、'0'=关，避免 null vs '1' 误判为不同导致误报覆盖
    assert.match(script, /settings\[k\] = \(settings\[k\] === '0' \|\| settings\[k\] === false\) \? '0' : '1'/);
    assert.match(script, /if \(k === 'alcsortMode'\) \{[^\n]*字符串枚举/);
    assert.match(script, /cloudApply\(r\.data\.data, curUid\);[\s\S]{0,160}云端数据已覆盖本地/);
    // uid 安全闸门：覆盖/上传前实时校验当前游戏玩家，防 A 回退登录页后 B 登录被串号覆盖
    assert.match(script, /const cloudUidGuard = \(uid\) =>/);
    assert.match(script, /const cur = readUidCloud\(\);\s*if \(!cur \|\| String\(cur\) !== String\(uid\)\) throw new Error\('uid_changed'\)/);
    // cloudApply 覆盖前闸门
    assert.match(script, /function cloudApply\(p, uid\) \{[\s\S]{0,120}cloudUidGuard\(uid\)/);
    // pull：请求前 + 响应回来后双重校验，且异步期间回退登录页则放弃
    assert.match(script, /const curUid = cloudUidGuard\(uid\);[\s\S]{0,200}this\.request\('GET', curUid\)/);
    assert.match(script, /this\.request\('GET', curUid\);[\s\S]{0,120}if \(isLoginScreen\(\)\) return \{ skipped: true \};\s*\/\/ 异步等待期间回退登录页：放弃/);
    assert.match(script, /cloudUidGuard\(curUid\);\s*\/\/ 响应回来后再确认玩家没切换/);
    // push：上传前闸门 + 异步后复核
    assert.match(script, /async push\(uid, payload\) \{[\s\S]{0,120}const curUid = cloudUidGuard\(uid\)/);
    // flush：始终以当前玩家为准，检测账号切换则丢弃旧状态
    assert.match(script, /const uid = readUidCloud\(\);[\s\S]{0,120}if \(this\.uid && String\(this\.uid\) !== String\(uid\)\) \{/);
    // 启动阶段 booting 封禁 push；pull 结束（finally）才解除，覆盖所有路径
    assert.match(script, /booting: true,/);
    assert.match(script, /markDirty\(\) \{[\s\S]{0,120}this\.booting/);
    assert.match(script, /async flush\(force\) \{[\s\S]{0,140}this\.booting/);
    assert.match(script, /catch \(e\) \{ console\.warn\('\[云同步\] 启动拉取异常', e\); \}\s*finally \{ bootPullBusy = false; cloud\.booting = false; \}/);
    // 单次请求超时：服务端挂起也不阻塞启动 / 不永久封禁 push
    assert.match(script, /const CLOUD_REQ_TIMEOUT = 3000/);
    assert.match(script, /new AbortController\(\)/);
    assert.match(script, /setTimeout\(\(\) => ctrl\.abort\(\), CLOUD_REQ_TIMEOUT\)/);
    assert.match(script, /opt\.signal = ctrl\.signal/);
    // 启动先 pull，非登录态 + 有 uid 才 pull；404/429/失败静默（无 pull 失败通知）
    assert.match(script, /bootPull\(\) \{[\s\S]{0,200}const uid = readUidCloud\(\)/);
    assert.doesNotMatch(script, /拉取失败，使用本地数据'|拉取过于频繁，稍后重试'/);
    // 仅保留 push 成功 / push 失败 / pull 覆盖 三类通知
    assert.match(script, /已上传配置/);
    assert.match(script, /上传失败（/);
    assert.match(script, /云端数据已覆盖本地/);
});

test('云同步市场收藏：payload 纳入 favorites、归一化比对、覆盖前确认、挂钩自动上传', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    // 游戏收藏存 localStorage.favorite（itemId 数字数组）
    assert.match(script, /function cloudNormalizeFavorites\(v\)/);
    assert.match(script, /function cloudFavorites\(\)/);
    assert.match(script, /localStorage\.getItem\('favorite'\)/);
    assert.match(script, /!Number\.isInteger\(n\) \|\| n <= 0/);
    // payload 纳入 favorites，schema 仍为 1
    assert.match(script, /favorites: cloudFavorites\(\)/);
    // 比对口径一致：cloudPayloadBody 用同一归一化函数，纳入 favorites
    assert.match(script, /const favorites = cloudNormalizeFavorites\(p && p\.favorites\)/);
    assert.match(script, /favorites: favorites\.slice\(0, 500\)/);
    // 结构校验：旧 payload 无字段兼容
    assert.match(script, /p\.favorites != null && \(!Array\.isArray\(p\.favorites\)/);
    // 覆盖前弹窗对比两端数量，用户决定整份覆盖
    assert.match(script, /function cloudConfirmFavorites\(p\)/);
    assert.match(script, /云端收藏：' \+ remote\.length/);
    assert.match(script, /本地收藏：' \+ local\.length/);
    assert.match(script, /window\.confirm\(msg\)/);
    assert.match(script, /if \(p\.favorites != null\) \{[\s\S]{0,200}cloudConfirmFavorites\(p\)/);
    assert.match(script, /localStorage\.setItem\('favorite', JSON\.stringify\(cloudNormalizeFavorites\(p\.favorites\)\)\)/);
    // 挂钩 Utils.setData('favorite') 自动上传，且只包一次；cloudApply 走 setItem 不回环
    assert.match(script, /function hookFavoriteCloud\(tries\)/);
    assert.match(script, /Utils\._nekCloudFavWrapped/);
    assert.match(script, /if \(key === 'favorite'\) cloudMark\(\)/);
    assert.match(script, /hookFavoriteCloud\(\);   \/\/ 装好收藏写入挂钩/);
});

test('toolbar 手动同步按钮：签到按钮旁仅上传本地，不拉取', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    // 样式与挂载
    assert.match(script, /function injectCloudSyncStyle\(\)/);
    assert.match(script, /\.btn\.nek-cloud-sync-btn \{ opacity: 1; background: rgba\(75, 225, 216, 0\.5\)/);
    assert.match(script, /color: var\(--color-mian\); box-shadow: rgba\(85, 84, 70, 0\.7\) 0 0 15px/);
    assert.match(script, /function ensureCloudSyncButton\(\)/);
    assert.match(script, /bar\.querySelector\('\.checkIn-btn'\)/);
    assert.match(script, /btn\.className = 'btn nek-cloud-sync-btn'/);
    assert.match(script, /btn\.textContent = '手动云同步'/);
    assert.match(script, /const checkIn = entry\.querySelector\('\.checkIn-btn'\)/);
    assert.match(script, /setInterval\(ensureCloudSyncButton, 1000\)/);
    assert.match(script, /injectCloudSyncStyle\(\);/);
    assert.match(script, /ensureCloudSyncButton\(\);/);
    // 点击调用 pushNow（仅上传），带 busy 防抖
    assert.match(script, /await cloud\.pushNow\(\)/);
    assert.match(script, /btn\.classList\.add\('busy'\)[\s\S]{0,120}btn\.classList\.remove\('busy'\)/);
    // pushNow：仅上传，忽略 booting（flush(true)），保留 uid/登录页闸门
    assert.match(script, /async pushNow\(\)/);
    assert.match(script, /手动同步按钮：仅上传本地（含收藏），不拉取/);
    assert.match(script, /await this\.flush\(true\)/);
    assert.match(script, /async flush\(force\)/);
    assert.match(script, /if \(\(!force && this\.booting\) \|\| !isCloudEnabled\(\)/);
});

test('云同步研究队列：覆盖与比对均按实时等级丢弃已完成项，避免复活多研一级', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 覆盖与比对共用同一过滤口径
    assert.match(script, /function cloudQueueAlive\(queue\)/);
    assert.match(script, /enh\.queue = cloudQueueAlive\(/);
    assert.match(script, /queue: cloudQueueAlive\(/);
    // 权威等级口径与 context() 一致：UI.researchInfo.levels → game.researchLevels
    assert.match(script, /info\.levels\) \|\| \(g && g\.researchLevels\)/);
    assert.match(script, /snapshot\[pid\] = \(Number\(snapshot\[pid\]\) \|\| 0\) \+ 1/);
    assert.match(script, /return lv < target;/);

    // 真正执行过滤函数验证行为（不依赖游戏页面）
    const start = script.indexOf('        function cloudQueueAlive(queue) {');
    const end = script.indexOf('        // 组装 payload', start);
    assert.ok(start > 0 && end > start);
    const body = script.slice(start, end);
    const load = (ctx) => vm.runInNewContext(body + '\ncloudQueueAlive;', Object.assign({ Number, Object, Array }, ctx));

    const q = [
        { key: 'done', projectId: 11, record: { fromLevel: 1, targetLevel: 2 } },
        { key: 'next', projectId: 11, record: { fromLevel: 2, targetLevel: 3 } },
        { key: 'other', projectId: 12, record: { fromLevel: 1, targetLevel: 2 } },
        { key: 'legacy', projectId: 13 }
    ];
    const alive = (ctx) => load(ctx)(q).map(e => e.key);
    // UI.researchInfo 权威：项目 11 已到 2 级 → done 丢弃，其余保留
    assert.deepEqual(alive({ UI: { researchInfo: { levels: { 11: 2, 12: 1 }, task: null } }, game: {} }), ['next', 'other', 'legacy']);
    // 正在研究 1→2（task 使有效等级=2）：done 同样丢弃
    assert.deepEqual(alive({ UI: { researchInfo: { levels: { 11: 1, 12: 1 }, task: { projectId: 11 } } }, game: {} }), ['next', 'other', 'legacy']);
    // 等级到 3：done 与 next 均达成
    assert.deepEqual(alive({ UI: { researchInfo: { levels: { 11: 3, 12: 1 }, task: null } }, game: {} }), ['other', 'legacy']);
    // UI 无研究信息 → 回退 game.researchLevels
    assert.deepEqual(alive({ UI: {}, game: { researchLevels: { 11: 2, 12: 1 } } }), ['next', 'other', 'legacy']);
    // 研究数据未就绪：原样保留，绝不误删
    assert.deepEqual(alive({}), ['done', 'next', 'other', 'legacy']);
    assert.deepEqual(alive({ UI: { researchInfo: null }, game: null }), ['done', 'next', 'other', 'legacy']);
});

test('市场行情：全量快照缺底数时先单物品强刷确认，不直接判无行情', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 缺底数分支：走带 fallback 的单物品强刷，不再直接写死「暂无市场行情」
    assert.match(script, /mkForceItem\(id, enh, key, true\)/);
    assert.doesNotMatch(script, /if \(mkBulkAt && Date\.now\(\) - mkBulkAt < MK_CACHE_TTL && mkNoData\(id, enh\)\) \{\s*\n\s*mkMarkNoData\(key\);/);
    // 只有强刷返回仍无该等级才落终态；超时/失败延时重试，避免永久挂「获取中」
    assert.match(script, /function mkForceItem\(id, enh, key, noDataFallback\)/);
    assert.match(script, /if \(noDataFallback && mkBulkAt && Date\.now\(\) - mkBulkAt < MK_CACHE_TTL\) mkMarkNoData\(key\)/);
    assert.match(script, /function mkScheduleRetry\(id, enh, key\)/);
    assert.match(script, /\}, 6000\);/);
    // 单物品快照到达后恢复同物品其他等级；成功渲染时清掉重试定时器
    assert.match(script, /function mkRefreshId\(id\)/);
    assert.match(script, /mkRefreshId\(id\);\s*\/\/ 同物品其他等级/);
    assert.match(script, /clearTimeout\(retry\); mkRetryTimers\.delete\(key\)/);
    // 注释保留实测来源，便于回归
    assert.match(script, /松露意面 id 5003/);
});

test('库存成本：浮窗三按钮、悬停行情新增行、成本表列与小计差额', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 按钮尺寸：不再覆盖原生 .btn 字号/内边距
    assert.doesNotMatch(script, /\.nek-cost-head \.nek-cost-sub-btn\.btn\{font-size:inherit/);
    // 浮窗：确定 / 清空 / 取消，清空删除本地记录
    assert.match(script, /actions\.append\(confirm, clear, cancel\)/);
    assert.match(script, /clear\.textContent = '清空'/);
    assert.match(script, /delete map\[String\(id\)\]/);
    assert.match(script, /库存成本 · /);
    // 悬停行情新增库存成本行，保存/清空/买入后推送刷新事件
    assert.match(script, /function mkStockCost\(id\)/);
    assert.match(script, /<span class="nek-mk-lbl">库存成本：<\/span>/);
    assert.match(script, /function publishStockCost\(id\)/);
    assert.match(script, /document\.addEventListener\('nek-stock-cost-updated'/);
    // 成本卡片：两块可展开，直接买入材料=一层+库存成本列+括号，基础制作=完整树无库存成本/括号
    assert.match(script, /row\(oneLevel, 'th', \['材料', '库存成本', '出售小计', '收购小计'\]\)/);
    assert.match(script, /row\(tree, 'th', \['材料', '出售小计', '收购小计'\]\)/);
    assert.match(script, /summaryRow\(direct, '直接买入材料'/);
    assert.match(script, /summaryRow\(full, '从基础原料制作'/);
    assert.match(script, /direct\.dataset\.nekView = 'direct'/);
    assert.match(script, /full\.dataset\.nekView = 'full'/);
    assert.match(script, /d\.dataset\.nekView\)\);/);
    assert.match(script, /\.nek-cost-diff-pos\{color:rgb\(76,175,80\)\}\.nek-cost-diff-neg\{color:rgb\(255,48,33\)\}/);
    assert.match(script, /appendDiff\(tr\.cells\[2\], diffOf\(child\.sellQuote, sub\)\)/);
    assert.match(script, /appendDiff\(tr\.cells\[3\], diffOf\(child\.demandQuote, sub\)\)/);
    assert.doesNotMatch(script, /function subtotalText\(node, side, root\)/);
    assert.match(script, /\+ ' x' \+ qtyText\(node\.quantity\)/);
    // 行情取数复用主脚本 API，不再在成本页另拉全量快照
    assert.match(script, /window\.__NEK_MARKET__ = \{/);
    assert.match(script, /ensureBulk: function \(\) \{ return mkEnsureBulk\(\); \}/);
    assert.match(script, /api && typeof api\.quote === 'function'\) return api\.quote\(id, 0\)/);
    assert.match(script, /document\.dispatchEvent\(new CustomEvent\('nek-market-quote-updated'/);
    assert.match(script, /doc\.addEventListener\('nek-market-quote-updated'/);
    assert.doesNotMatch(script, /const market = await env\.game\(\)\.loadMarketCache\(true\)/);
});

test('悬停行情渲染：库存成本读取本地值，缺失显示缺报价', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    const stockStart = script.indexOf('        function mkStockCost(id) {');
    const stockEnd = script.indexOf('        // 全量快照中是否缺少', stockStart);
    const lineStart = script.indexOf('        function mkLineHtml(lv, id) {');
    const lineEnd = script.indexOf('        // 渲染某 key 的全部挂载标记', lineStart);
    assert.ok(stockStart > 0 && stockEnd > stockStart && lineStart > stockEnd && lineEnd > lineStart);
    const body = script.slice(stockStart, stockEnd) + '\n' + script.slice(lineStart, lineEnd);
    const ctx = {
        fmt: n => String(n),
        game: { character: { uid: 7 } },
        localStorage: { getItem: k => k === 'nek_warehouse_cost_v1:7' ? JSON.stringify({ 2211: 80 }) : null }
    };
    const html = vm.runInNewContext(body + '\nmkLineHtml({ sell_price: 100, demand_price: 80 }, 2211);', ctx);
    assert.match(html, /库存成本：<\/span><span class="nek-mk-val">80<\/span>/);
    const missing = vm.runInNewContext(body + '\nmkLineHtml({}, 9999);', ctx);
    assert.match(missing, /库存成本：<\/span><span class="nek-mk-val">缺报价<\/span>/);
});

test('云同步 v1.52：成本数据纳入 payload、3 条/5 秒上传、未知字段暂存回传', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 成本核算条目与库存成本纳入 payload / 校验 / 覆盖 / 比对
    assert.match(script, /function cloudNormalizeCostItems\(v\)/);
    assert.match(script, /function cloudNormalizeWarehouseCost\(v\)/);
    assert.match(script, /costItems: cloudCostItems\(uid\), warehouseCost: cloudWarehouseCost\(uid\)/);
    assert.match(script, /p\.costItems != null && \(!Array\.isArray\(p\.costItems\)/);
    assert.match(script, /p\.warehouseCost != null && \(!p\.warehouseCost \|\| typeof p\.warehouseCost/);
    assert.match(script, /localStorage\.setItem\('nek_cost_items_v1:' \+ uid/);
    assert.match(script, /localStorage\.setItem\('nek_warehouse_cost_v1:' \+ uid/);
    assert.match(script, /costItems: cloudNormalizeCostItems\(p && p\.costItems\)/);
    assert.match(script, /warehouseCost: cloudNormalizeWarehouseCost\(p && p\.warehouseCost\)/);
    assert.match(script, /doc\.addEventListener\('nek-cost-items-updated'/);
    // 旧 payload 无新字段不误报覆盖
    assert.match(script, /if \(!\('costItems' in probe\)\) probe\.costItems = local\.costItems/);
    // 上传节流：3 条 / 5 秒，不再立即上传
    assert.match(script, /const CLOUD_DIRTY_BATCH = 3/);
    assert.match(script, /const CLOUD_DIRTY_DELAY = 5000/);
    assert.match(script, /this\.edits\+\+;/);
    assert.match(script, /if \(this\.edits >= CLOUD_DIRTY_BATCH\) this\.flush\(\);/);
    assert.match(script, /}, CLOUD_DIRTY_DELAY\);/);
    assert.doesNotMatch(script, /markDirty\(\) \{[\s\S]{0,400}if \(!this\.running\) this\.flush\(\);/);
    // 多版本容错：未识别字段暂存，上传原样带回
    assert.match(script, /const CLOUD_STAGED_KEY = uid => 'nek_cloud_staged_v1:' \+ uid/);
    assert.match(script, /function cloudStageUnknown\(p, uid\)/);
    assert.match(script, /cloudStageUnknown\(r\.data\.data, curUid\)/);
    assert.match(script, /cloudStageUnknown\(p, uid\);/);
    assert.match(script, /const staged = cloudStaged\(uid\);/);
    assert.match(script, /if \(!CLOUD_KNOWN_TOP\.has\(k\)\) payload\[k\] = stagedTop\[k\]/);

    // 行为验证：归一化函数按去重/两位小数口径处理
    const start = script.indexOf('        function cloudNormalizeCostItems(v) {');
    const end = script.indexOf('        function cloudSameAsLocal(remote, uid) {', start);
    assert.ok(start > 0 && end > start);
    const ctx = { Object, Number, Array, Set: global.Set, isNaN };
    const api = vm.runInNewContext(start > 0 ? script.slice(start, end) + '\n({ cloudNormalizeCostItems, cloudNormalizeWarehouseCost });' : '', ctx);
    assert.equal(JSON.stringify(api.cloudNormalizeCostItems([3, 1, 3, '2', 0, -1])), '[1,2,3]');
    assert.equal(JSON.stringify(api.cloudNormalizeWarehouseCost({ 12: 1.239, 13: '2.5', 14: -1, x: 3 })), '{"12":1.24,"13":2.5}');
});

test('v1.53：展开三角、精算范围、成本核算开关与设置项合并', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 三角提示（展开后旋转）
    assert.match(script, /append\(title, 'span', 'nek-cost-caret', '▶'\)/);
    assert.match(script, /\.nek-cost-caret\{display:inline-block;font-size:10px/);
    assert.match(script, /\.nek-cost-expand\[open\] \.nek-cost-caret\{transform:rotate\(90deg\)\}/);
    // 精算只对生产/烹饪成品显示，复用同一可核算判定
    assert.match(script, /function craftableProduct\(data, product\)/);
    assert.match(script, /const eligible = id > 0 && craftableProduct\(env\.data\(\), id\)/);
    assert.match(script, /if \(!fav \|\| !costEnabled\(\) \|\| !eligible\)/);
    assert.match(script, /const currentId = Number\(env\.ui\(\)\?\.marketplaceOption\?\.id \?\? env\.ui\(\)\?\.itemId\)/);
    assert.match(script, /const choices = Object\.values\(data\.items\)\.filter\(item => craftableProduct\(data, item\.id\)\)/);
    // 成本核算独立开关：侧栏入口 + 精算按钮 + 云同步
    assert.match(script, /const LS_COST_KEY = 'nek_assistant_cost_enabled'/);
    assert.match(script, /cost: 'nek_assistant_cost_enabled'/);
    assert.match(script, /enabled: isEnabled, costEnabled: isCostEnabled/);
    assert.match(script, /<input type="checkbox" class="nek-assist-cost-toggle">/);
    assert.match(script, /if \(!isEnabled\(\) \|\| !isCostEnabled\(\)\) \{[\s\S]{0,180}\.nek-cost-entry, \.nek-market-cost, \.page\.nek-cost/);
    // 五项合并为一个开关，旧五个 UI 开关不再出现
    assert.match(script, /<input type="checkbox" class="nek-assist-uiopt-toggle">/);
    for (const old of ['cook', 'prod', 'pick', 'alcsort', 'harvest']) {
        assert.doesNotMatch(script, new RegExp('nek-assist-' + old + '-toggle'));
    }
    // 行为验证：合并开关任一子项开启即为开启；切换时五项一起写
    const start = script.indexOf('        const isUiOptEnabled =');
    const end = script.indexOf('        // 开关切换后统一刷新队列位置按钮的文案与样式', start);
    assert.ok(start > 0 && end > start);
    const calls = [];
    const ctx = {
        isCookEnabled: () => true, isProdEnabled: () => false, isPickEnabled: () => false,
        isAlcSortEnabled: () => false, isFarmAssistEnabled: () => false,
        setCookEnabled: v => calls.push(['cook', v]), setProdEnabled: v => calls.push(['prod', v]),
        setPickEnabled: v => calls.push(['pick', v]), setAlcSortEnabled: v => calls.push(['alc', v]),
        setFarmAssistEnabled: v => calls.push(['farm', v]),
        applyCookClass() {}, applyProdClass() {}, applyPickClass() {}, applyAlcSortState() {}, applyHarvestState() {}
    };
    const api = vm.runInNewContext(script.slice(start, end) + '\n({ isUiOptEnabled, setUiOptEnabled });', ctx);
    assert.equal(api.isUiOptEnabled(), true);
    api.setUiOptEnabled(false);
    assert.deepEqual(calls, [['cook', false], ['prod', false], ['pick', false], ['alc', false], ['farm', false]]);
});
