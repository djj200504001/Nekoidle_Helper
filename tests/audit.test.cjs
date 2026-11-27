const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '../银河猫娘放置小助手.user.js'), 'utf8');

function section(first, last) {
    const start = script.indexOf(first), end = script.indexOf(last, start);
    assert.ok(start >= 0 && end > start);
    return script.slice(start, end);
}

test('定时钓鱼补回缺失配置，使用剩余次数、原倍率，并跳过已完成行动', () => {
    const sent = [];
    const context = { game: { queue: [{ type: 'action', id: 4, item: { multiplier: 2 } }],
        startAction: (...args) => sent.push(args) }, flog() {}, UI: { notifier: { show() {} } } };
    const restore = vm.runInNewContext(section('function cloudStable(', 'function cloudCurrentBookings(') +
        section('function restoreQueueSnapshot(', '// 包装 update_queue') + '\nrestoreQueueSnapshot', context);
    restore([{ type: 'action', id: 4, count: 20, remaining: 3, multiplier: 5 },
        { type: 'action', id: 4, count: 10, item: { multiplier: 2 } },
        { type: 'action', id: 7, count: 30, remaining: 0 },
        { type: 'fishing', id: 2, remaining: -1, item: { primaryItem: 7 } }]);
    assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
        ['action', 4, 3, { multiplier: 5 }, 'after'], ['fishing', 2, -1, { primaryItem: 7 }, 'after']
    ]);
});

test('云同步保留默认开关、已关闭的开关和进行中的钓鱼链，只同步有效预约', () => {
    const storage = new Map(), uid = '7', key = 'nek_enhancements_v1:7';
    const { normalizeInventoryLedger } = require('../src/enhancements.js');
    const ledger = { items: { 10: { quantity: 8, since: 1700000000000 } }, orders: { 3: { quantity: 2 } }, products: [21] };
    const context = { localStorage: {
        getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k)
    }, LS_FISH_STATE_KEY: 'fish', CLOUD_ENH_SETTING_KEYS: ['holdings', 'researchQueue'], CLOUD_SETTING_KEYS: { harvest: 'hv' },
    currentFishPeriod: () => 32, cloudFavorites: () => [], cloudUidGuard() {}, cloudQueueAlive: q => q,
    cloudStaged: () => ({}), cloudCostItems: () => [], cloudWarehouseCost: () => ({ 10: 2.5 }),
    cloudInventoryLedger: () => normalizeInventoryLedger(ledger), normalizeInventoryLedger,
    cloudNormalizeCostItems: v => v, cloudNormalizeWarehouseCost: v => v, cloudStageUnknown() {},
    document: { dispatchEvent() {} }, CustomEvent: function () {} };
    const api = vm.runInNewContext(section('function cloudBuildPayload(', '// 收藏整份覆盖前的确认') +
        '\n;({ cloudBuildPayload, cloudApply, todayLocal })', context);
    const today = api.todayLocal();
    storage.set(key, JSON.stringify({ settings: { holdings: false }, queue: [] }));
    storage.set('hv', '0');
    storage.set('fish', JSON.stringify({ chain: { currentPeriod: 31, snapshot: [2] }, bookings: [
        { pondId: 1, period: 31, day: today }, { pondId: 2, period: 33, day: today }, { pondId: 3, period: 34, day: '2000-01-01' }
    ] }));
    const payload = api.cloudBuildPayload(uid);
    assert.equal(payload.settings.researchQueue, true);
    assert.equal(payload.settings.holdings, false);
    assert.deepEqual(Array.from(payload.fish.bookings, b => b.pondId), [2]);
    delete payload.favorites;
    payload.settings.harvest = null;
    api.cloudApply(payload, uid);
    assert.deepEqual(JSON.parse(storage.get('nek_inventory_ledger_v1:7')), normalizeInventoryLedger(ledger));
    assert.deepEqual(JSON.parse(storage.get('nek_warehouse_cost_v1:7')), { 10: 2.5 });
    assert.equal(storage.has('hv'), false);
    const fish = JSON.parse(storage.get('fish'));
    assert.deepEqual(fish.chain.snapshot, [2]);
    assert.deepEqual(fish.bookings.map(b => b.pondId), [1, 2]);
    storage.set(key, JSON.stringify({ queue: [{ submitted: { targetLevel: 1 } }] }));
    const before = [...storage];
    assert.throws(() => api.cloudApply(payload, uid), /研究正在确认/);
    assert.deepEqual([...storage], before);
});

test('开启同步后立即关闭：迟到的 404 不得重新开启或上传', async () => {
    let resolveRequest;
    const enabled = [], notices = [];
    const context = {
        cloud: { request: () => new Promise(resolve => { resolveRequest = resolve; }),
            markDirty() { assert.fail('取消后不应触发上传'); } },
        isLoginScreen: () => false, readUidCloud: () => '7',
        setCloudEnabled: value => enabled.push(value), cloudNotify: msg => notices.push(msg)
    };
    const toggle = vm.runInNewContext(section('let cloudToggleRevision', '// ---------------- toolbar 手动同步按钮') +
        '\ncloudOnToggle', context);
    const control = { checked: true };
    const pending = toggle(true, control);
    control.checked = false;
    await toggle(false, control);
    resolveRequest({ status: 404 });
    await pending;
    assert.deepEqual(enabled, [false]);
    assert.equal(notices.length, 1);
});

test('构建标记缺失、重复或颠倒时拒绝写入安装文件', () => {
    const build = fs.readFileSync(path.join(__dirname, '../tools/build-enhancements.cjs'), 'utf8');
    for (const damaged of [
        script.replace('// NEK_ENHANCEMENTS_END', '// missing'),
        script + '\n        // NEK_ENHANCEMENTS_START',
        script.replace('// NEK_ENHANCEMENTS_START', '// TEMP')
            .replace('// NEK_ENHANCEMENTS_END', '// NEK_ENHANCEMENTS_START')
            .replace('// TEMP', '// NEK_ENHANCEMENTS_END')
    ]) {
        const probe = { readFileSync: file => file.endsWith('.user.js') ? damaged : 'function moduleSource() {}',
            writeFileSync() { assert.fail('不能写入损坏的安装文件'); } };
        assert.throws(() => vm.runInNewContext(build, { __dirname: __dirname, require: id =>
            id === 'node:fs' ? probe : require(id) }), /Expected one ordered pair/);
    }
});
