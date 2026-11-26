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
    assert.match(script, /@version\s+1\.45\.0\n/);
    assert.match(script, /@description\s+v1\.45\.0：/);
    assert.match(script, /const CURRENT_VERSION = '1\.45\.0';/);
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
    assert.match(script, /fish: \{ bookings \}, favorites: cloudFavorites\(\)/);
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
