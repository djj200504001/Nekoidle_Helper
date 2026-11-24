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
    assert.match(script, /@version\s+1\.43\.3\n/);
    assert.match(script, /@description\s+v1\.43\.3：/);
    assert.match(script, /const CURRENT_VERSION = '1\.43\.3';/);
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
    // 启动：4 个 init 在前立即执行，pull 后台并行、不阻塞加载
    assert.match(script, /async function bootWithCloud\(\)/);
    assert.match(script, /nekEnhancements\.init\(\);\s*initHarvest\(\);[\s\S]{0,400}await cloud\.bootPull\(\)/);
    assert.match(script, /await cloud\.bootPull\(\);[\s\S]{0,120}finally \{ cloud\.booting = false; \}/);
    // 设置页开关唯一
    assert.match(script, /nek-assist-cloud-toggle/);
    assert.match(script, /const CLOUD_LS_KEY = 'nek_cloud_enabled'/);
});

test('云同步加载顺序：启动只 pull 不 push，一致不覆盖不通知，仅三类反馈', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8');
    // 决策2：pull 后比对，一致 applied:false 不通知；仅覆盖时反馈
    assert.match(script, /function cloudSameAsLocal\(remote, uid\)/);
    assert.match(script, /if \(cloudSameAsLocal\(r\.data\.data, curUid\)\) return \{ found: true, applied: false \}/);
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
    assert.match(script, /async flush\(\) \{[\s\S]{0,120}this\.booting/);
    assert.match(script, /catch \(e\) \{ console\.warn\('\[云同步\] 启动拉取异常', e\); \}\s*finally \{ cloud\.booting = false; \}/);
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
