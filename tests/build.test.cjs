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
    assert.match(script, /@version\s+1\.58\.7\n/);
    assert.match(script, /@description\s+v1\.58\.7：/);
    assert.match(script, /const CURRENT_VERSION = '1\.58\.7';/);
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
    assert.match(script, /markDirty\(low\) \{[\s\S]{0,120}this\.booting/);
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
    // 材料名与用量分两段渲染，材料名交给 bindMaterial 绑定原生交互
    assert.match(script, /qty\.textContent = ' x' \+ qtyText\(node\.quantity\)/);
    assert.match(script, /bindMaterial\(tr\.cells\[0\], (node|child)\)/);
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
    // 成本数据本地写入必须打云同步脏标记，否则单独改成本不会触发上传
    assert.match(script, /k\.indexOf\('nek_cost_items_v1:'\) === 0 \|\| k\.indexOf\('nek_warehouse_cost_v1:'\) === 0 \|\| k\.indexOf\('nek_inventory_ledger_v1:'\) === 0/);
    // 旧 payload 无新字段不误报覆盖
    assert.match(script, /if \(!\('costItems' in probe\)\) probe\.costItems = local\.costItems/);
    // 上传节流：3 条 / 5 秒，不再立即上传
    assert.match(script, /const CLOUD_DIRTY_BATCH = 3/);
    assert.match(script, /const CLOUD_DIRTY_DELAY = 5000/);
    assert.match(script, /this\.edits\+\+;/);
    assert.match(script, /if \(!low && this\.edits >= CLOUD_DIRTY_BATCH\) this\.flush\(\);/);
    assert.match(script, /}, delay\);/);
    assert.doesNotMatch(script, /markDirty\(low\) \{[\s\S]{0,400}if \(!this\.running\) this\.flush\(\);/);
    // 生产账本补记：低优先级合并且相同内容不重复上传
    assert.match(script, /const CLOUD_LOW_DELAY = 5 \* 60 \* 1000/);
    assert.match(script, /if \(!low\) this\.edits\+\+;/);
    assert.match(script, /const delay = low \? CLOUD_LOW_DELAY : CLOUD_DIRTY_DELAY/);
    assert.match(script, /if \(!force && sig === this\.lastBodySig\) return;/);
    assert.match(script, /cloudMarkLow: \(\) =>/);
    assert.match(script, /setItem: \(k, v, silent\) =>/);
    assert.match(script, /if \(!silent && \(\(k\.indexOf\('nek_enhancements_v1:'\)/);
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

    // 行为验证：成本条目/库存成本写入必须打脏标记，lease 与无关键不打标，避免 pull→push 回环
    const storageSrc = script.match(/storage: \{ getItem: k => localStorage\.getItem\(k\), setItem:[\s\S]*?removeItem: k => localStorage\.removeItem\(k\) \}/);
    assert.ok(storageSrc);
    let marks = 0;
    const ls = {};
    const storageCtx = { localStorage: { getItem: k => ls[k], setItem: (k, v) => { ls[k] = v; }, removeItem: k => { delete ls[k]; } }, cloudMark: () => { marks++; } };
    const storage = vm.runInNewContext('(' + storageSrc[0].replace(/^storage: /, '') + ')', storageCtx);
    storage.setItem('nek_cost_items_v1:7', '[1]');
    assert.equal(marks, 1);
    storage.setItem('nek_warehouse_cost_v1:7', '{}');
    assert.equal(marks, 2);
    storage.setItem('nek_enhancements_v1:7', '{}');
    assert.equal(marks, 3);
    storage.setItem('nek_enhancements_v1:7:lease', '1');
    storage.setItem('favorite', '[]');
    assert.equal(marks, 3);
});

test('成本材料名复用原生悬浮说明与点击菜单，缺失退化为纯文本', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.match(script, /ui\.bindItemTooltip\(name, def, \{ item \}\)/);
    assert.match(script, /ui\.showItemMenu\(name, \{ itemDef: def, enhancement: 0 \}\)/);
    assert.match(script, /\.nek-cost-material-live\{cursor:pointer/);

    const from = script.indexOf('            function bindMaterial(cell, node) {');
    const to = script.indexOf('            // 展开块标题行', from);
    assert.ok(from > 0 && to > from);
    const source = script.slice(from, to);

    const { Document } = require('./helpers/dom.cjs');
    function makeEnv(opts = {}) {
        const doc = new Document();
        const calls = [];
        const ui = {
            bindItemTooltip: (el, def, param) => calls.push(['tip', el, def, param]),
            showItemMenu: (el, param) => calls.push(['menu', el, param])
        };
        const game = { getItem: opts.getItem || (id => ({ id, name: '材料' + id })), getItemQuantity: () => 7 };
        const data = { items: {} };
        const qtyText = n => String(n);
        const api = vm.runInNewContext(source + '\nbindMaterial', { doc, ui, game, data, qtyText, Number });
        return { doc, calls, api };
    }

    // 有 def：材料名带 live 类，绑定原生说明，点击展开原生物品菜单且阻断冒泡
    const ok = makeEnv();
    const cell = ok.doc.createElement('td');
    ok.api(cell, { id: 2211, name: '小麦', source: '采集', quantity: 3 });
    const name = cell.children[0];
    assert.equal(name.textContent, '小麦（采集）');
    assert.equal(cell.children[1].textContent, ' x3');
    assert.ok(name.classList.contains('nek-cost-material-live'));
    assert.equal(ok.calls.length, 1);
    assert.equal(ok.calls[0][0], 'tip');
    assert.equal(ok.calls[0][2].id, 2211);
    assert.equal(ok.calls[0][3].item.id, 2211);
    assert.equal(ok.calls[0][3].item.quantity, 7);
    let stopped = false;
    name.listeners.click[0]({ stopPropagation() { stopped = true; } });
    assert.equal(stopped, true);
    assert.equal(ok.calls[1][0], 'menu');
    assert.equal(ok.calls[1][2].itemDef.id, 2211);

    // def 缺失：退化为纯文本，不绑定任何原生交互
    const missing = makeEnv({ getItem: () => null });
    const cell2 = missing.doc.createElement('td');
    missing.api(cell2, { id: 9999, name: '未知物', quantity: 1 });
    assert.equal(cell2.children[0].textContent, '未知物');
    assert.equal(cell2.children[1].textContent, ' x1');
    assert.equal(cell2.children[0].classList.contains('nek-cost-material-live'), false);
    assert.equal(missing.calls.length, 0);
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

test('v1.57：库存核算双标签、市场分类选择、批次列表与流水账本', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 双标签与页面结构：库存核算在前且为默认标签，市场面板默认隐藏。
    assert.match(script, /<div class="page-tab nek-cost-tabs"><div class="page-tab-item active" data-tab="inventory">库存核算<\/div><div class="page-tab-item" data-tab="market">市场成本<\/div><\/div>/);
    assert.match(script, /class="page-main nek-market-main" hidden/);
    assert.match(script, /class="page-main nek-inventory-main"/);
    assert.match(script, /function mountInventoryPanel\(\)/);
    assert.match(script, /if \(typeof mountInventoryPanel === 'function'\) mountInventoryPanel\(\);/);
    // 账本数据结构与批次原因（初始库存 + 借贷流水，无换日缺口）
    assert.match(script, /const INVENTORY_REASONS = \['初始库存', '市场买入', '市场卖出', '生产消耗', '生产成品'\]/);
    assert.match(script, /const MAX_INVENTORY_TRADES = 200/);
    assert.match(script, /'nek_inventory_ledger_v1:' \+ uid/);
    assert.match(script, /function normalizeInventoryLedger\(value\)/);
    assert.match(script, /function consumeInventoryFifo\(ledger, id, qty, at, ref, merge, reason = '生产消耗'\)/);
    // 市场分类选择浮窗：排除罐头、一级 itemTypes、二级 sub_type、搜索
    assert.match(script, /const CANNED_IDS = new Set\(\[2, 4, 201, 207, 208\]\)/);
    assert.match(script, /return String\(item\.slot \|\| item\.sub_type \|\| '0'\);/);
    assert.match(script, /game\.searchItems\(keyword\)/);
    // 批次行：5 列与主表头严格对齐（时间+原因在物品名列）、严格按时间正序、核对状态。
    assert.match(script, /append\(box, 'div', 'nek-inventory-batch-row'\)/);
    assert.match(script, /append\(cell1, 'span', 'nek-inventory-batch-time'/);
    assert.match(script, /严格按时间正序：先入库\/消耗在上，后入库\/消耗在下/);
    assert.doesNotMatch(script, /const rank = b => b\.reason === '初始库存' \? 1 : 0;/);
    // 借贷方向：仅用颜色区分，批次名称前不显示「借/贷」文字。
    assert.match(script, /return \['市场卖出', '生产消耗'\]\.includes\(reason\) \? '贷' : '借';/);
    assert.match(script, /dir === '贷' \? 'nek-inventory-credit' : 'nek-inventory-debit', b\.reason/);
    assert.doesNotMatch(script, /dir \+ ' · ' \+ b\.reason/);
    assert.match(script, /nek-inventory-verified/);
    assert.match(script, /库存总价值 '/);
    // 物品菜单改为跳转，不再弹浮窗；跳转时先确保成本页结构已构建。
    assert.match(script, /item-menu-button-name">库存核算/);
    assert.match(script, /if \(page && !page\.querySelector\('\.nek-cost-tabs'\) && entry\) \{/);
    assert.match(script, /entry\.classList\.remove\('active'\);[\s\S]{0,40}entry\.click\(\);/);
    assert.match(script, /if \(tab && !tab\.classList\.contains\('active'\)\) tab\.click\(\);/);
    // 从物品详情跳转：每次重新查 DOM，延时再确认，防止落到市场成本标签。
    assert.match(script, /const ensureInventoryTab = \(\) =>/);
    assert.match(script, /setTimeout\(assertLater, 150\)/);
    assert.match(script, /new CustomEvent\('nek-inventory-updated', \{ detail: \{ uid: String\(uid\), focus: id \} \}\)/);
    // 表头 + 整行展开（含三角） + 浮窗改由批次单价触发 + focus 定位。
    assert.match(script, /\['物品', '可用', '综合单价', '库存价值', '预警', ''\]/);
    assert.match(script, /append\(list, 'div', 'nek-inventory-head'\)/);
    assert.match(script, /nameText\.title = '点击展开\/收起批次明细';/);
    assert.match(script, /priceCell\.addEventListener\('click', e => \{[\s\S]{0,140}openInventoryEditor\(uid, id, b\)/);
    assert.match(script, /function openInventoryEditor\(uid, id, batch\)/);
    assert.match(script, /const focus = Number\(e\.detail\?\.focus\);/);
    assert.match(script, /row\?\.scrollIntoView\(\{ block: 'nearest' \}\);/);
    // 两个面板的 hidden 都要显式 display:none，避免原生 .page-main 覆盖导致库存页混入市场内容。
    assert.match(script, /\.nek-inventory-main\[hidden\],\.nek-market-main\[hidden\]\{display:none\}/);
    // 市场/生产/历史校验拦截
    assert.match(script, /function captureInventoryProduction\(content\)/);
    assert.match(script, /function verifyInventoryRecords\(content\)/);
    assert.match(script, /function verifyInventoryTrades\(\)/);
    assert.match(script, /msg\.handlers\.action_records = function \(data\)/);
    assert.match(script, /msg\.handlers\.market_history = function \(data\)/);
});

test('v1.57：库存核算交互细化——装备分类/左一价标识/借贷流水/初始库存', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 装备二级严格按市场页 5 组归并（weapon/armor/accessory/tool/life），不再按 slot 细分。
    assert.match(script, /const EQUIP_SUBS = \[\s*\{ key: 'weapon', name: '武器' \}, \{ key: 'armor', name: '防具' \},/);
    assert.match(script, /if \(\['ring', 'amulet', 'earring', 'bracelet'\]\.includes\(slot\)\) return 'accessory';/);
    assert.match(script, /if \(\/\^tool\\d\+\$\/\.test\(slot\)\) return 'tool';/);
    assert.match(script, /if \(slot === 'life_chip' \|\| \/\^life_\[abc\]\$\/\.test\(slot\)\) return 'life';/);
    assert.match(script, /if \(type === 4\) return EQUIP_SUBS\.map\(s => s\.key\)\.filter\(k => owned\.has\(k\)\);/);
    // 二级筛选作用域修复：subKeys 由调用方传入 all，不再引用浮窗内的局部变量（否则 ReferenceError 导致筛选失效）。
    assert.match(script, /function subKeys\(all, type\) \{/);
    assert.match(script, /const owned = new Set\(all\.filter\(i => typeOf\(i\) === type\)\.map\(subKeyOf\)\);/);
    assert.match(script, /const keys = subKeys\(all, type\);/);
    assert.doesNotMatch(script, /subKeys\(type\)/);
    // 旧账本「有数量无批次」迁移：补初始库存批次，数量取仓库实际，读取时一次性写回。
    assert.match(script, /function migrateEmptyBatchItems\(ledger, getQuantity, getPrice\)/);
    assert.match(script, /const migrated = migrateEmptyBatchItems\(led,/);
    assert.match(script, /migrateEmptyBatchItems\(led,[\s\S]{0,200}id => game\.getItemQuantity\(id\)/);
    assert.match(script, /if \(migrated \|\| archived \|\| mergedOutputs \|\| compatible !== saved\) \{[\s\S]{0,120}storage\.setItem\(inventoryKey\(uid\), JSON\.stringify\(led\), true\)/);
    // 单价浮窗：只有一个输入框 + 左一价自动填入 + 来源标识；预警独立入口。
    assert.match(script, /function openInventoryEditor\(uid, id, batch\)/);
    assert.match(script, /quote = Number\(leftPrice\(id, 0\)\) \|\| 0;/);
    // 左一价统一复用主脚本 __NEK_MARKET__.quote（含 v1.44.4 单物品强刷），不再直读缓存造轮子；API 缺失才回退。
    assert.match(script, /function leftPrice\(id, enh\) \{[\s\S]{0,220}api\.quote\(Number\(id\), Number\(enh\) \|\| 0\)/);
    assert.match(script, /const lv = api\.quote\(Number\(id\), Number\(enh\) \|\| 0\);[\s\S]{0,80}Number\(lv\?\.sell_price\) \|\| 0;/);
    assert.match(script, /return Number\(env\.game\(\)\.marketCacheData\.get\(Number\(id\)\)\?\.levels/);
    assert.match(script, /markSource\('auto'\)/);
    assert.match(script, /markSource\('saved'\)/);
    assert.match(script, /'已自动填入市场左一价（尚未录入）'/);
    assert.match(script, /'已读取本地已有的单价数据'/);
    assert.match(script, /function openThresholdEditor\(uid, id\)/);
    assert.match(script, /append\(head, 'span', 'nek-inventory-threshold'/);
    // 预警列：数值阈值 + 当日峰值百分比阈值，均为 0 则未设置。
    assert.match(script, /const check = thresholdCheck\(ledger\.items\[id\], ledger\.thresholds\[id\], held\(id\), now\);/);
    assert.match(script, /const check = warnings\?\.checks\.get\(id\)/);
    assert.match(script, /'峰值 ' \+ check\.pct \+ '%\/' \+ check\.pctLimit \+ '%'/);
    assert.match(script, /qtyInput\.value = th\.qty \? String\(th\.qty\) : '0'/);
    assert.match(script, /pctInput\.value = th\.pct \? String\(th\.pct\) : '0'/);
    assert.doesNotMatch(script, /thresholdInput\.value = led\.thresholds\[String\(id\)\]/);
    // 核对列语义：初始库存=历史记录、核对到=操作时间、其余待核对（换日缺口下阶段才在历史记录展示）。
    assert.match(script, /if \(b\.reason === '初始库存'\) return \{ text: '历史记录', cls: 'nek-inventory-history'/);
    assert.match(script, /if \(b\.verified && b\.checkAt > 0\)/);
    assert.match(script, /hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'/);
    assert.doesNotMatch(script, /if \(b\.reason === '换日缺口'\)/);
    // 核对写入操作时间：历史记录 start_time 秒→毫秒，市场 close_time 秒→毫秒。
    assert.match(script, /b\.verified = true; b\.checkAt = best\.startMs; changed = true;/);
    assert.match(script, /const WINDOW = 600000;/);
    assert.match(script, /b\.checkAt = Number\(matched\.close_time \|\| 0\) \* 1000 \|\| b\.at;/);
    // 初始库存：建账时仓库无货填 0；允许 qty=0；无换日对账机制。
    assert.match(script, /reason: '初始库存', qty: qty \|\| 0, unitPrice: price/);
    assert.match(script, /qty === 0 && reason !== '初始库存'\) return false;/);
    assert.doesNotMatch(script, /function reconcileDailyGap\(/);
    assert.doesNotMatch(script, /reconcileDailyGap\(uid\);/);
    assert.doesNotMatch(script, /lastGapDay/);
    // 批次更新机制：仓库前后快照差额入账；市场单次=1批次、挂单结算单物品=1批次、队列=1批次。
    assert.match(script, /function warehouseSnapshot\(candidateIds\)/);
    assert.match(script, /function inventoryDelta\(before, after\)/);
    assert.match(script, /function fifoPrice\(used\)/);
    assert.match(script, /const tradeRef = 'mkt:' \+ at\.toString\(36\)/);
    assert.match(script, /ref: 'claim:' \+ sid, order: Number\(claim\.order_id\)/);
    // 生产：按 token 标识队列批次；材料执行中实时消耗，完成时按账本 vs 实际差额对账补记；FIFO 来源写入 from。
    assert.match(script, /function productionBatchIdentity\(type, content\)/);
    assert.match(script, /return \{ ref: 'queue:' \+ key \};/);
    assert.match(script, /function inventoryReconcile\(ledger, candidateIds, qtyOf\)/);
    assert.match(script, /function recordQueueDelta\(uid, \{ deltas, at, ref \}\)/);
    assert.doesNotMatch(script, /生产退料/);
    assert.match(script, /from: from != null \? String\(from\)\.slice\(0, 80\) : undefined/);
    assert.match(script, /taken\.set\(b\.from, \(taken\.get\(b\.from\) \|\| 0\) \+ Math\.abs\(b\.qty\)\)/);
    assert.match(script, /数量不再要求相等（实际差额可能与历史记载不同），只要求内容（物品）对得上。/);
    // 连续生产：同 token 多次完成 merge 累加到同一批次组，不拆批、以最终结算为准。
    assert.match(script, /const existing = ref != null \? row\.batches\.find\(b => b\.reason === reason/);
    assert.match(script, /if \(!merge\) return false;\s*\/\/ 默认防重放/);
    assert.match(script, /consumeInventoryFifo\(led, d\.id, -d\.delta, at, ref, true\)/);
    assert.match(script, /if \(b\.manualPrice === true\) return;\s*\n\s*const amount = cost\.amount/);
});

test('v1.57：FIFO 三色可视化 + 耗尽批次归档与 5 天历史', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 纯函数进入安装文件
    assert.match(script, /function dayStartOf\(ts\)/);
    assert.match(script, /function inventoryDaySegments\(row, now\)/);
    assert.match(script, /function archiveExhaustedBatches\(ledger, now\)/);
    assert.match(script, /const ARCHIVE_TTL = 5 \* 24 \* 3600 \* 1000/);
    // 方案 A 三色 + 斑马纹 CSS
    assert.match(script, /\.nek-fifo-base\{background:#2E7D8F\}/);
    assert.match(script, /\.nek-fifo-inc\{background:#3FB98C\}\.nek-fifo-inc\.alt\{background:#34A279\}/);
    assert.match(script, /\.nek-fifo-dec\{background:#D9536E\}\.nek-fifo-dec\.alt\{background:#BE455E\}/);
    // 折叠三色 / 展开两行斑马纹渲染
    assert.match(script, /FIFO 三色条：折叠仅显示三色/);
    assert.match(script, /seg\.decBatches\.forEach\(\(b, i\) => \{/);
    assert.match(script, /nek-fifo-inc nek-inventory-fifo-seg' \+ \(i % 2 \? ' alt' : ''\)/);
    // 展开行1恒为峰值满值：用完整基准 baseFullPct，而非压缩后的 basePct。
    assert.match(script, /展开行1恒为满值（峰值100%）/);
    assert.match(script, /s\.style\.width = seg\.baseFullPct \+ '%'/);
    // 归档接入账本读取 + 历史字段进入云同步
    assert.match(script, /const archived = archiveExhaustedBatches\(led, Date\.now\(\)\)/);
    assert.match(script, /out\.items\[id\] = \{ batches, history, quantity, since/);
    assert.match(script, /now - h\.archivedAt <= 5 \* 24 \* 3600 \* 1000/);
    assert.match(script, /历史记录（' \+ history\.length \+ ' 条 · 保留 5 天）/);
});

test('v1.57：库存核算账本纳入云同步 payload/校验/比对/回写', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.match(script, /'costItems', 'warehouseCost', 'inventoryLedger'/);
    assert.match(script, /function cloudNormalizeInventory\(v, costs\)/);
    assert.match(script, /function cloudInventoryLedger\(uid\)/);
    assert.match(script, /inventoryLedger: cloudInventoryLedger\(uid\)/);
    assert.match(script, /inventoryLedger: cloudNormalizeInventory\(p && p\.inventoryLedger, p && p\.warehouseCost\)/);
    assert.match(script, /if \(p\.inventoryLedger != null && \(!p\.inventoryLedger/);
    assert.match(script, /if \(!\('inventoryLedger' in probe\)\) probe\.inventoryLedger = local\.inventoryLedger/);
    assert.match(script, /localStorage\.setItem\('nek_inventory_ledger_v1:' \+ uid, JSON\.stringify\(cloudNormalizeInventory\(p\.inventoryLedger, p\.warehouseCost\)\)\)/);
    // 200 条上限与批次原因在云同步侧同样归一
    assert.match(script, /const reasons = \['初始库存', '市场买入', '市场卖出', '生产消耗', '生产成品'\]/);
    assert.match(script, /out\.trades = \(Array\.isArray\(v\.trades\) \? v\.trades : \[\]\)\.slice\(-200\)/);
    assert.match(script, /checkAt: Number\.isFinite\(b\.checkAt\) && b\.checkAt > 0 \? b\.checkAt : undefined/);
    // 云同步侧同样允许 qty=0 初始库存、丢弃旧换日缺口、无 lastGapDay。
    assert.match(script, /\(qty === 0 && reason !== '初始库存'\) \|\| !Number\.isFinite\(at\)/);
    assert.match(script, /rawReason === '换日缺口'\) return null;/);
    assert.doesNotMatch(script, /v\.lastGapDay/);
});

test('v1.58：斑马纹悬浮提示、物品列收窄、删除入口与库存提醒按钮', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 展开斑马纹逐段提示：原因 + 带符号数量（时分秒）。
    assert.match(script, /const batchTip = b =>/);
    assert.match(script, /s\.title = batchTip\(b\);/);
    assert.match(script, /'换日基准 \+' \+ seg\.base\.toLocaleString\('zh-CN'\)/);
    // 物品列由 1.6fr 收窄到 0.8fr，汇总/表头/批次三处共用模板并留删除按钮列。
    assert.equal((script.match(/minmax\(0,0\.8fr\) repeat\(4,minmax\(0,1fr\)\) 26px/g) || []).length, 3);
    assert.doesNotMatch(script, /minmax\(0,1\.6fr\) repeat\(4,minmax\(0,1fr\)\)/);
    // 预警列后方删除按钮。
    assert.match(script, /append\(head, 'button', 'nek-inventory-delete', '×'\)/);
    assert.match(script, /delete current\.items\[String\(id\)\];/);
    assert.match(script, /delete current\.thresholds\[String\(id\)\];/);
    assert.match(script, /与汇总行的删除按钮列对齐/);
    // 队列按钮行的库存提醒：正常「库存充足」，不足时显示物品与数量并复用红色内发光动画。
    assert.match(script, /function ensureStockAlertButton\(\)/);
    assert.match(script, /function paintStockAlertButton\(btn\)/);
    assert.match(script, /btn\.className = 'nek-stock-alert-toggle'/);
    assert.match(script, /let text = '库存充足';/);
    assert.match(script, /text = first\.name \+ '不足：' \+ first\.have/);
    assert.match(script, /btn\.classList\.toggle\('nek-stock-short', list\.length > 0\)/);
    assert.match(script, /\.nek-stock-alert-toggle\.nek-stock-short[\s\S]{0,160}animation: nek-research-lack-breathe/);
    assert.match(script, /setInterval\(ensureStockAlertButton, 1000\)/);
});

test('v1.58.1：只登记已选物品、缺报价与手动价优先', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    // 新进仓库物品不自动纳入：对账与市场买卖都先查账本登记。
    assert.match(script, /const row = ledger\.items\[String\(id\)\];\s*\n\s*if \(!row\) return;/);
    assert.match(script, /if \(!led\.items\[String\(id\)\]\) return false;/);
    // FIFO 来源快照与手动价合并逻辑仍在，成本规则由 v1.58.3 统一到队列口径。
    assert.match(script, /function findInventoryBatch\(ledger, batchId\)/);
    assert.match(script, /function recomputeProductionCost\(ledger, changedIds, nameOf\)/);
    assert.match(script, /const cost = productionQueueCost\(led, ref, nameOf\)/);
    assert.match(script, /if \(keepManual\) \{[\s\S]{0,120}existing\.unitPrice == null/);
    // 缺报价显示与补录后立即重算；只有成品手动价锁定，消耗手动价参与重算。
    assert.match(script, /function quoteLackText\(row, led\)/);
    assert.match(script, /names\.join\('、'\) \+ '缺报价'/);
    assert.match(script, /\.nek-price-missing\{color:#ff8a6b/);
    assert.match(script, /target\.manualPrice = target\.reason === '生产成品' && price != null;/);
    assert.match(script, /recomputeProductionCost\(led, \[target\.id\], itemName\)/);
    assert.match(script, /if \(b\.ref && b\.reason === '生产消耗' && pending\.has\(String\(b\.id\)\)\) refs\.add\(String\(b\.ref\)\)/);
    // 云同步保留来源快照、缺报价与手动价标记。
    assert.match(script, /source, missing: missing\.length \? missing : undefined, manualPrice: b\.manualPrice === true/);
    assert.match(script, /manualPrice: h\.manualPrice === true/);
});

test('v1.58.2：库存页清空数据按钮、移除物品免确认、历史批次缺报价反推', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.match(script, /class="btn nek-inventory-clear-btn">清空数据/);
    assert.match(script, /const refresh = marketMain\.querySelector\('\.nek-cost-tools button:not\(\.nek-cost-pick\)'\)/);
    assert.match(script, /clearBtn\.addEventListener\('click'/);
    assert.match(script, /saveInventoryLedger\(uid, \{ items: \{\}, thresholds: \{\}, trades: \[\] \}\)/);
    // 移除物品不再二次确认；清空全部数据仍保留确认。
    assert.doesNotMatch(script, /env\.window\.confirm\('从库存核算移除/);
    assert.match(script, /env\.window\.confirm\('清空库存核算的全部数据/);
    // 旧批次没有 source/missing 时按同队列消耗反推来源并计算缺报价。
    assert.match(script, /function productionSourcesOf\(ledger, batch\)/);
    assert.match(script, /function productionCostOf\(ledger, batch, nameOf\)/);
    assert.match(script, /if \(b\.reason === '生产成品'\) productionCostOf\(led, b, itemName\)\.missing\.forEach\(collect\)/);
});

test('v1.58.3：一个队列一条成品批次，成本合计除以总产出，历史拆分批次自动合并', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.match(script, /function productionQueueCost\(ledger, ref, nameOf\)/);
    assert.match(script, /全部材料成本合计 ÷ 全部产出/);
    assert.match(script, /function mergeQueueOutputBatches\(ledger\)/);
    assert.match(script, /const mergedOutputs = mergeQueueOutputBatches\(led\)/);
    assert.match(script, /reason: '生产成品', qty: d\.delta, unitPrice: null, ref, merge: true/);
    assert.doesNotMatch(script, /from: 'out:' \+ u\.from/);
    assert.match(script, /const amount = cost\.amount == null \? null : round2\(cost\.amount \* \(Number\(b\.qty\) \|\| 0\) \/ totalOut\)/);
    assert.match(script, /const amount = r\.amount == null \? null : round2\(r\.amount \* \(Number\(b\.qty\) \|\| 0\) \/ totalOut\)/);
});

test('v1.58.4：成品单价悬浮显示完整公式、预警双阈值与队列按钮/云端同步一致', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.match(script, /function productionFormula\(ledger, batch, nameOf\)/);
    assert.match(script, /'综合单价计算公式：' \+ formula/);
    assert.match(script, /outputBatches\.map\(b => productionFormula\(led, b, itemName\)\)/);
    assert.match(script, /点击录入\/修改该批次单价/);
    assert.match(script, /function normalizeThreshold\(value\)/);
    assert.match(script, /function thresholdCheck\(row, th, qty, now\)/);
    // 队列快捷提醒复用同一份预警缓存。
    assert.match(script, /const list = nekEnhancements\.stockShortages\(\);/);
    assert.match(script, /const pctShort = pctLimit > 0 && peak > 0 && pct < pctLimit;/);
    // 云端归一化保留双阈值字段。
    assert.match(script, /if \(Number\.isFinite\(th\.pct\) && th\.pct > 0\) keep\.pct = r2\(Math\.min\(100, th\.pct\)\);/);
});

test('v1.58.5：手动价只锁定生产成品，生产消耗批次仍随上游重算', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.match(script, /const keepManual = reason === '生产成品' && existing\.manualPrice === true;/);
    assert.match(script, /const price = upstream\?\.unitPrice \?\? b\.unitPrice \?\? null;/);
    assert.match(script, /手动录入的消耗价也参与重算：上游价变化时同步覆盖，再重算成品。/);
    assert.match(script, /target\.manualPrice = target\.reason === '生产成品' && price != null;/);
    assert.match(script, /当前为手动录入的综合单价，不再随材料价重算/);
});
