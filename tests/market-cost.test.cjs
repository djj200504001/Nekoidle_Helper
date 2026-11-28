const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Document } = require('./helpers/dom.cjs');
const { recomputeProductionCost } = require('../src/enhancements.js');

// 构造最小 env，加载 enhancement 模块并触发 install()（init 内的 pulse）。
// 返回 msg / storage，便于模拟「挂单 → 撮合成交进结算池 → 领取 → 入库回包」链路。
function setup() {
    const document = new Document();
    const intervals = [], store = new Map();
    const data = { items: { 10: { id: 10, name: '绒毛' } }, quests: {}, research: { facilities: [] } };
    const quantities = { '10-0': 0 };
    const game = {
        character: { uid: 669 }, quests: {}, queue: [], order: [], orderHistory: [], settlement: [],
        getItem: id => data.items[id],
        getItemQuantity: (id, enh = 0, raw) => quantities[id + '-' + enh] || 0,
        getQuest: () => null, getAction: () => null, getLifeBonusActionType: s => s,
        getResearchFacilityIdForAction: a => a.action, getResearchEffectPct: () => 0,
        getOverLevelProductMultiplier: () => 1
    };
    const ui = {
        researchInfo: { task: null, levels: {} }, researchOffset: 0,
        getActionLevelState: () => ({ successRate: 100 }), getCookingLevelState: () => ({ successRate: 100 }),
        getRewardBonusEffect: () => 0, getActionChestPreview: () => [],
        notifier: { show: () => {} }, getResearchCost: () => ({}),
        createItemElement: () => document.createElement('div'), showItem: () => {},
        addOutsideClickHandler: () => {}, removeOutsideClickHandler: () => {},
        bindItemTooltip: () => {}, showItemMenu: () => {},
        renderResearchPage: () => {}
    };
    ui.researchTaskHost = document.createElement('div'); ui.researchRoot = document.createElement('div');
    ui.marketplaceRoot = document.createElement('div'); ui.marketplacePageHost = document.createElement('div');
    const settingsSection = document.createElement('div'); document.body.appendChild(settingsSection);
    const msg = {
        ws: { readyState: 1 }, sent: [],
        send(type, data) { this.sent.push({ type, data }); return true; },
        // 原生 handler 模拟真正入库（在脚本记录 before 库存之后执行）
        handlers: { market_update: function (message) {
            (message?.content?.add || []).forEach(row => {
                const key = row.item + '-' + (row.enhancement || 0);
                quantities[key] = (quantities[key] || 0) + (Number(row.quantity) || 0);
            });
            return 'native';
        } }
    };
    const storage = {
        getItem: k => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k)
    };
    const sandbox = {
        module: { exports: {} }, console,
        setInterval: fn => { intervals.push(fn); return 1; },
        setTimeout: fn => { fn(); return 1; }, clearTimeout: () => {},
        getComputedStyle: () => ({ borderTopWidth: '0px', paddingTop: '0px' }),
        CustomEvent: function (type, opts) { this.type = type; this.detail = opts?.detail; },
        Date, Math, Number, String, Object, Array, JSON, Set, Map, WeakMap, RegExp, isNaN
    };
    sandbox.window = { addEventListener: () => {}, removeEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }), innerWidth: 1200, innerHeight: 800 };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/enhancements.js'), 'utf8'), sandbox);
    const feature = sandbox.module.exports.createNekEnhancements({
        document, window: sandbox.window, storage, game: () => game, ui: () => ui, msg: () => msg,
        data: () => data, enabled: () => true, costEnabled: () => true,
        identifyAction: () => ({}), cookingChestDivisor: 21600
    });
    feature.init();
    return { feature, msg, game, store, document, setQty: (id, qty, enh = 0) => { quantities[id + '-' + enh] = qty; } };
}

function stockCost(store, uid) {
    return JSON.parse(store.get('nek_warehouse_cost_v1:' + uid) || '{}');
}

test('挂单收购：挂单成功回包不再清空暂存单价，结算领取后入库按真实成交价记成本', () => {
    const h = setup(), uid = 669, marketUpdate = h.msg.handlers.market_update;

    // 1) 用户挂单求购 10 号 5 个，单价 100（side=2）
    h.msg.send('market_order_place', { side: 2, item: 10, enhancement: 0, price: 100, quantity: 5, fill_or_kill: 0 });
    // 2) 挂单成功回包（未成交：filled=0）——旧逻辑在此 marketBuys.clear()，导致后续匹配不到。
    marketUpdate({ content: { type: 'place', side: 2, item: 10, enhancement: 0, placed: 5, filled: 0 } });
    // 3) 撮合成交：进结算池（尚未入库），背包仍为 0
    h.game.order = [{ id: 1, side: 2, item: 10, enhancement: 0, price: 100, quantity: 5, traded: 5, residue: 0, status: 0 }];
    h.game.settlement = [{ id: 501, order_id: 1, side: 2, item: 10, enhancement: 0, quantity: 5, price: 100, order_item: 10 }];
    // 4) 用户领取结算
    h.msg.send('market_settlement_claim', { id: 501 });
    // 5) 领取回包：物品入库（原生 handler 加库存）
    marketUpdate({ content: { type: 'claim', add: [{ id: 1, item: 10, enhancement: 0, quantity: 5 }] } });

    assert.equal(stockCost(h.store, uid)[10], 100, '结算领取入库应按订单真实单价 100 记成本');
});

test('挂单收购：无旧成本但有库存时，领取入库直接以本次成交价作为库存成本', () => {
    const h = setup(), uid = 669, marketUpdate = h.msg.handlers.market_update;
    // 本地已有 8 个 10 号物品，但没有录入库存成本
    h.setQty(10, 8);
    h.game.order = [{ id: 2, side: 2, item: 10, enhancement: 0, price: 120, quantity: 4, traded: 4, residue: 0, status: 0 }];
    h.game.settlement = [{ id: 601, order_id: 2, side: 2, item: 10, enhancement: 0, quantity: 4, price: 120, order_item: 10 }];
    h.msg.send('market_settlement_claim', { id: 601 });
    marketUpdate({ content: { add: [{ id: 2, item: 10, enhancement: 0, quantity: 4 }] } });

    assert.equal(stockCost(h.store, uid)[10], 120, '有库存无成本时直接采用本次成交价 120，不做加权');
});

test('部分成交：两批结算分别点领取，各自按该批成交价入库加权', () => {
    const h = setup(), uid = 669, marketUpdate = h.msg.handlers.market_update;
    // 求购金粒(id=1401) 500 个，分两批成交：先 200@100，再 300@120
    h.game.settlement = [
        { id: 701, order_id: 90, side: 2, item: 1401, enhancement: 0, quantity: 200, price: 100, order_item: 1401 },
        { id: 702, order_id: 90, side: 2, item: 1, enhancement: 0, quantity: 30000, price: 100, order_item: 1401 } // 找零
    ];
    h.setQty(1401, 0);
    h.msg.send('market_settlement_claim', { id: 701 });   // 第一批：点单条领取
    marketUpdate({ content: { add: [{ id: 1, item: 1401, enhancement: 0, quantity: 200 }] } });
    assert.equal(stockCost(h.store, uid)[1401], 100, '第一批按 100 记');

    h.game.settlement = [
        { id: 703, order_id: 90, side: 2, item: 1401, enhancement: 0, quantity: 300, price: 120, order_item: 1401 }
    ];
    h.msg.send('market_settlement_claim', { id: 703 });   // 第二批：另一批成交、另一单价
    marketUpdate({ content: { add: [{ id: 2, item: 1401, enhancement: 0, quantity: 300 }] } });
    // 200@100 + 300@120 → (20000+36000)/500 = 112
    assert.equal(stockCost(h.store, uid)[1401], 112, '第二批 120 入库后按两批数量加权到 112');
});

test('直购仍按回包成交价加权，结算领取映射不干扰直购', () => {
    const h = setup(), uid = 669, marketUpdate = h.msg.handlers.market_update;
    h.store.set('nek_warehouse_cost_v1:' + uid, JSON.stringify({ 10: 30 }));
    h.setQty(10, 100);
    h.msg.send('market_instant', { side: 2, item: 10, enhancement: 0, price: 50, quantity: 10, fill_or_kill: 1 });
    marketUpdate({ content: { type: 'place', side: 2, item: 10, filled: 10, price: 50, add: [{ id: 3, item: 10, enhancement: 0, quantity: 10 }] } });
    assert.equal(stockCost(h.store, uid)[10], 31.82, '直购按旧库存 100@30 + 买入 10@50 加权');
});

// 队列生产：材料在执行中逐步消耗（此处用原生 handler 完成时统一体现），
// 增强层在队列结束时按「账本理论库存 vs 实际仓库」差额对账补记。
function queueSetup() {
    const document = new Document();
    const intervals = [], store = new Map();
    let clock = Date.now();
    class TestDate extends Date {
        static now() { return clock; }
    }
    const data = { items: { 10: { id: 10, name: '材料' }, 20: { id: 20, name: '成品' } }, quests: {}, research: { facilities: [] } };
    const quantities = { '10-0': 100, '20-0': 0 };
    const game = {
        character: { uid: 669 }, quests: {}, queue: [], order: [], orderHistory: [], settlement: [],
        getItem: id => data.items[id],
        getItemQuantity: (id, enh = 0) => quantities[id + '-' + enh] || 0,
        getQuest: () => null, getAction: () => null, getLifeBonusActionType: s => s,
        getResearchFacilityIdForAction: a => a.action, getResearchEffectPct: () => 0,
        getOverLevelProductMultiplier: () => 1
    };
    const ui = {
        researchInfo: { task: null, levels: {} }, researchOffset: 0,
        getActionLevelState: () => ({ successRate: 100 }), getCookingLevelState: () => ({ successRate: 100 }),
        getRewardBonusEffect: () => 0, getActionChestPreview: () => [],
        notifier: { show: () => {} }, getResearchCost: () => ({}),
        createItemElement: () => document.createElement('div'), showItem: () => {},
        addOutsideClickHandler: () => {}, removeOutsideClickHandler: () => {},
        bindItemTooltip: () => {}, showItemMenu: () => {}, renderResearchPage: () => {}
    };
    ui.researchTaskHost = document.createElement('div'); ui.researchRoot = document.createElement('div');
    ui.marketplaceRoot = document.createElement('div'); ui.marketplacePageHost = document.createElement('div');
    document.body.appendChild(document.createElement('div'));
    const msg = {
        ws: { readyState: 1 }, sent: [], send(type, d) { this.sent.push({ type, data: d }); return true; },
        handlers: {
            action_complete: function (message) {
                (message?.content?.remove || []).forEach(r => {
                    const id = Number(r.item ?? r.id), key = id + '-0';
                    quantities[key] = Math.max(0, (quantities[key] || 0) - (Number(r.quantity) || 0));
                });
                (message?.content?.add || []).forEach(r => {
                    const key = Number(r.item) + '-0';
                    quantities[key] = (quantities[key] || 0) + (Number(r.quantity) || 0);
                });
            },
            action_canceled: function (message) {
                (message?.content?.add || []).forEach(r => {
                    const key = Number(r.item) + '-0';
                    quantities[key] = (quantities[key] || 0) + (Number(r.quantity) || 0);
                });
            }
        }
    };
    const storage = {
        getItem: k => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k)
    };
    const sandbox = {
        module: { exports: {} }, console,
        setInterval: fn => { intervals.push(fn); return 1; },
        setTimeout: fn => { fn(); return 1; }, clearTimeout: () => {},
        getComputedStyle: () => ({ borderTopWidth: '0px', paddingTop: '0px' }),
        CustomEvent: function (type, opts) { this.type = type; this.detail = opts?.detail; },
        Date: TestDate, Math, Number, String, Object, Array, JSON, Set, Map, WeakMap, RegExp, isNaN
    };
    sandbox.window = { addEventListener: () => {}, removeEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }), innerWidth: 1200, innerHeight: 800 };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/enhancements.js'), 'utf8'), sandbox);
    const feature = sandbox.module.exports.createNekEnhancements({
        document, window: sandbox.window, storage, game: () => game, ui: () => ui, msg: () => msg,
        data: () => data, enabled: () => true, costEnabled: () => true,
        identifyAction: () => ({}), cookingChestDivisor: 21600
    });
    // 建账：材料 100 个 @10。
    const led = JSON.parse(store.get('nek_inventory_ledger_v1:669') || '{"items":{},"thresholds":{},"trades":[]}');
    led.items['10'] = { batches: [{ id: 'seed', at: 1000, reason: '初始库存', qty: 100, unitPrice: 10, amount: 1000, verified: false }], quantity: 100, since: 1000 };
    // 成品需先由用户加入核算（初始库存 0），否则生产新产出不自动建账。
    led.items['20'] = { batches: [{ id: 'outseed', at: 1000, reason: '初始库存', qty: 0, unitPrice: null, amount: null, verified: false }], quantity: 0, since: 1000 };
    store.set('nek_inventory_ledger_v1:669', JSON.stringify(led));
    feature.init();
    function replaceLedger(ledger) {
        store.set('nek_inventory_ledger_v1:669', JSON.stringify(ledger));
        for (const listener of document.listeners['nek-inventory-cloud-applied'] || []) listener({ detail: { uid: '669' } });
    }
    return { feature, msg, game, store, quantities, replaceLedger,
        advance(ms) { clock += ms; for (const tick of intervals) tick(); } };
}

function ledgerOf(h) { return JSON.parse(h.store.get('nek_inventory_ledger_v1:669')); }

test('生产逐次保留 FIFO 记账，预警在两分钟或队列结束时才随背包变化', () => {
    const h = queueSetup(), led = ledgerOf(h);
    led.thresholds[10] = { qty: 90 };
    h.replaceLedger(led);
    const head = { type: 'action', id: 7, token: 'active', remaining: 3 };
    h.game.queue = [head];
    const complete = (remaining, quantity) => h.msg.handlers.action_complete({ content: { ...head, remaining,
        remove: [{ item: 10, quantity }] } });
    complete(2, 20);
    assert.equal(ledgerOf(h).items[10].quantity, 80);
    h.advance(119999);
    assert.equal(h.feature.stockShortages().length, 0);
    h.advance(1);
    assert.equal(h.feature.stockShortages()[0].have, 80);
    complete(0, 10);
    assert.equal(h.feature.stockShortages()[0].have, 70);
    assert.equal(h.feature.stockShortages()[0].th, 113);
});

test('生产队列完成：账本 vs 实际差额补记，原料 FIFO 消耗、成品入账，共享队列 ref', () => {
    const h = queueSetup(), complete = h.msg.handlers.action_complete;
    // 原生 handler 完成：仓库材料 100→60、成品 0→20（回包记载量与实际一致）。
    complete({ content: { type: 'action', id: 7, token: 'tk1',
        remove: [{ id: 11, item: 10, quantity: 40 }],
        add: [{ id: 12, item: 20, quantity: 20 }] } });
    const led = ledgerOf(h);
    const uses = led.items['10'].batches.filter(b => b.reason === '生产消耗');
    const outs = led.items['20'].batches.filter(b => b.reason === '生产成品');
    assert.equal(uses.length, 1);
    assert.equal(uses[0].qty, -40);
    assert.equal(uses[0].unitPrice, 10);     // FIFO 取初始库存单价
    assert.equal(outs.length, 1);
    assert.equal(outs[0].qty, 20);
    assert.equal(outs[0].unitPrice, 20);     // 40×10 ÷ 20 = 20
    assert.match(uses[0].ref, /^queue:tk1$/);
    assert.equal(outs[0].ref, uses[0].ref);
});

test('启动前开始的队列：实际差额小于回包记载量时按实际差额入账', () => {
    const h = queueSetup(), complete = h.msg.handlers.action_complete;
    // 启动前开始的队列：回包不再带逐次 remove，仓库实际已逐步扣到 70（消耗 30）。
    h.quantities['10-0'] = 70;   // 账本理论 100，实际 70 → 差额 30
    complete({ content: { type: 'action', id: 7, token: 'tkGap' } });
    const led = ledgerOf(h);
    const uses = led.items['10'].batches.filter(b => b.reason === '生产消耗');
    assert.equal(uses.length, 1);
    assert.equal(uses[0].qty, -30, '按实际差额 30 入账，不用回包的 80');
});

test('取消队列：执行中已消耗的材料按差额补记，退料不再单独入账', () => {
    const h = queueSetup(), complete = h.msg.handlers.action_complete, cancel = h.msg.handlers.action_canceled;
    // 队列执行中材料 100→70（消耗 30），排队中取消不再退回（仓库仍是 70）。
    h.quantities['10-0'] = 70;
    cancel({ content: { type: 'action', id: 7, token: 'tk2' } });
    const led = ledgerOf(h);
    const uses = led.items['10'].batches.filter(b => b.reason === '生产消耗');
    assert.equal(uses.length, 1);
    assert.equal(uses[0].qty, -30, '执行中消耗的 30 按差额补记');
    assert.equal(uses[0].unitPrice, 10);
    assert.match(uses[0].ref, /^queue:tk2$/);
});

test('排队中取消（未开始执行、材料无变动）不产生任何批次', () => {
    const h = queueSetup(), cancel = h.msg.handlers.action_canceled;
    // 仓库与账本一致（100），无差额。
    cancel({ content: { type: 'action', id: 7, token: 'tk3' } });
    const led = ledgerOf(h);
    const uses = led.items['10'].batches.filter(b => b.reason === '生产消耗');
    assert.equal(uses.length, 0);
});

test('连续生产流程：同一队列多次完成合并为一批次组，不拆成多批，以最终结算为准', () => {
    const h = queueSetup(), complete = h.msg.handlers.action_complete;
    // 第一次循环：材料 100→80、成品 0→10。
    complete({ content: { type: 'action', id: 7, token: 'tkCont',
        remove: [{ id: 11, item: 10, quantity: 20 }],
        add: [{ id: 12, item: 20, quantity: 10 }] } });
    // 第二次循环（同 token）：材料 80→50、成品 10→25。
    complete({ content: { type: 'action', id: 7, token: 'tkCont',
        remove: [{ id: 11, item: 10, quantity: 30 }],
        add: [{ id: 12, item: 20, quantity: 15 }] } });
    const led = ledgerOf(h);
    const uses = led.items['10'].batches.filter(b => b.reason === '生产消耗');
    const outs = led.items['20'].batches.filter(b => b.reason === '生产成品');
    assert.equal(uses.length, 1, '两次完成的消耗合并为一个批次组');
    assert.equal(uses[0].qty, -50, '消耗总量 = 20+30');
    assert.equal(outs.length, 1, '两次完成的产出合并为一个批次组');
    assert.equal(outs[0].qty, 25, '产出总量 = 10+15');
    assert.equal(outs[0].unitPrice, 20, '成品单价按 FIFO 成本合计 ÷ 产出量');
    assert.equal(uses[0].ref, 'queue:tkCont');
    assert.equal(outs[0].ref, uses[0].ref);
});

test('跨批次生产：成品仍为一个批次，综合单价 = 全部来源材料成本合计 ÷ 总产出', () => {
    const h = queueSetup(), complete = h.msg.handlers.action_complete;
    const led = ledgerOf(h);
    led.items['10'].batches.push({ id: 'b2', at: 1100, reason: '市场买入', qty: 100, unitPrice: 20, amount: 2000, verified: false });
    h.replaceLedger(led);
    // 原生 handler 会先扣料：设材料 200 使回包后实际为 50（消耗 150 = 100@10 + 50@20），成品 0→30。
    h.quantities['10-0'] = 200; h.quantities['20-0'] = 0;
    complete({ content: { type: 'action', id: 7, token: 'tkSplit',
        remove: [{ id: 11, item: 10, quantity: 150 }], add: [{ id: 12, item: 20, quantity: 30 }] } });
    const after = ledgerOf(h);
    const uses = after.items['10'].batches.filter(b => b.reason === '生产消耗');
    const outs = after.items['20'].batches.filter(b => b.reason === '生产成品');
    assert.deepEqual(uses.map(b => b.qty), [-100, -50], '消耗按 FIFO 跨两个来源批次');
    assert.deepEqual(uses.map(b => b.unitPrice), [10, 20], '消耗批次各自带来源单价');
    assert.equal(outs.length, 1, '跨来源批次仍只记一条综合成品批次');
    assert.equal(outs[0].qty, 30);
    assert.equal(outs[0].unitPrice, 66.67, '(100×10 + 50×20) ÷ 30 = 66.67');
    assert.equal(outs[0].amount, 2000, '成品金额 = 材料成本合计');
    assert.equal(outs[0].source, undefined, '来源按同队列消耗批次反推，不再存单一快照');
});

test('材料缺单价时成品标记「材料缺报价」，补录来源单价后立即重算', () => {
    const h = queueSetup(), complete = h.msg.handlers.action_complete;
    const led = ledgerOf(h);
    led.items['10'].batches[0].unitPrice = null; led.items['10'].batches[0].amount = null;
    h.replaceLedger(led);
    // 回包扣除 40 后实际 60，与账本 100 相差 40（该批次无价）。
    h.quantities['10-0'] = 100; h.quantities['20-0'] = 0;
    complete({ content: { type: 'action', id: 7, token: 'tkLack',
        remove: [{ id: 11, item: 10, quantity: 40 }], add: [{ id: 12, item: 20, quantity: 20 }] } });
    let out = ledgerOf(h).items['20'].batches.find(b => b.reason === '生产成品');
    assert.equal(out.unitPrice, null);
    assert.deepEqual(out.missing, [{ id: 10, name: '材料' }]);
    const fresh = ledgerOf(h);
    fresh.items['10'].batches.find(b => b.id === 'seed').unitPrice = 10;
    assert.equal(recomputeProductionCost(fresh, ['seed'], id => '材料'), true);
    out = fresh.items['20'].batches.find(b => b.reason === '生产成品');
    assert.equal(out.unitPrice, 20, '补录后按 10×40÷20 重算');
    assert.equal(out.missing, undefined);
});

test('未加入核算的物品即使生产产出也不自动建立账本', () => {
    const h = queueSetup(), complete = h.msg.handlers.action_complete;
    const led = ledgerOf(h);
    delete led.items['20'];
    h.replaceLedger(led);
    h.quantities['10-0'] = 80; h.quantities['20-0'] = 10;
    complete({ content: { type: 'action', id: 7, token: 'tkNew',
        remove: [{ id: 11, item: 10, quantity: 20 }], add: [{ id: 12, item: 20, quantity: 10 }] } });
    const after = ledgerOf(h);
    assert.equal(after.items['20'], undefined, '新产出物品不自动纳入核算');
    assert.equal(after.items['10'].batches.filter(b => b.reason === '生产消耗').length, 1, '已登记材料的消耗仍入账');
});
