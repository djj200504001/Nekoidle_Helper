const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Document } = require('./helpers/dom.cjs');
const { stockReplenishment, planStockReplenishment } = require('../src/enhancements.js');

// 构造最小 env，加载 enhancement 模块并触发 install()（init 内的 pulse）。
// 返回 msg / storage，便于模拟「挂单 → 撮合成交进结算池 → 领取 → 入库回包」链路。
function setup(minutes = 5, buffer = 0) {
    const document = new Document();
    const intervals = [], store = new Map();
    const data = { items: { 10: { id: 10, name: '绒毛' } }, quests: {}, research: { facilities: [] } };
    const quantities = { '10-0': 0 };
    let now = Date.now();
    class TestDate extends Date { static now() { return now; } }
    let uploads = 0;
    const notices = [];
    const reads = [];
    const game = {
        character: { uid: 669 }, quests: {}, queue: [], order: [], orderHistory: [], settlement: [],
        getItem: id => data.items[id],
        getItemQuantity: (id, enh = 0) => { reads.push(id); return quantities[id + '-' + enh] || 0; },
        getQuest: () => null, getAction: () => null, getLifeBonusActionType: s => s,
        getResearchFacilityIdForAction: a => a.action, getResearchEffectPct: () => 0,
        getOverLevelProductMultiplier: () => 1
    };
    const ui = {
        researchInfo: { task: null, levels: {} }, researchOffset: 0,
        getActionLevelState: () => ({ successRate: 100 }), getCookingLevelState: () => ({ successRate: 100 }),
        getRewardBonusEffect: () => 0, getActionChestPreview: () => [],
        notifier: { show: message => notices.push(message) }, getResearchCost: () => ({}),
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
            for (const row of message.content.remove || []) {
                const stack = game.inventory.find(item => item.id === row.id);
                quantities[stack.item + '-0'] -= row.quantity;
            }
            (message?.content?.add || []).forEach(row => {
                const key = row.item + '-' + (row.enhancement || 0);
                quantities[key] = (quantities[key] || 0) + (Number(row.quantity) || 0);
            });
            return 'native';
        }, update_queue: function (message) {
            game.queue = message.content;
        }, action_complete: function (message) {
            for (const row of message.content.add) quantities[row.item + '-0'] = (quantities[row.item + '-0'] || 0) + row.quantity;
            for (const row of message.content.remove || []) {
                const stack = game.inventory.find(item => item.id === row.id);
                quantities[stack.item + '-0'] -= row.quantity;
            }
        }, market_history: function (message) {
            game.orderHistory = message.content;
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
        Date: TestDate, Math, Number, String, Object, Array, JSON, Set, Map, WeakMap, RegExp, isNaN
    };
    sandbox.window = { addEventListener: () => {}, removeEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }), innerWidth: 1200, innerHeight: 800 };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/enhancements.js'), 'utf8'), sandbox);
    const feature = sandbox.module.exports.createNekEnhancements({
        document, window: sandbox.window, storage, game: () => game, ui: () => ui, msg: () => msg,
        data: () => data, enabled: () => true, costEnabled: () => true,
        productionCloudMinutes: () => minutes, canSyncWarehouse: () => true, syncWarehouseNow: () => uploads++,
        stockBufferPercentage: () => buffer,
        identifyAction: () => ({}), cookingChestDivisor: 21600
    });
    feature.init();
    return { feature, msg, game, store, document, data, ui, pulse: intervals[0],
        advance: ms => { now += ms; intervals[0](); }, uploads: () => uploads, notices, reads,
        setQty: (id, qty, enh = 0) => { quantities[id + '-' + enh] = qty; } };
}

test('库存低于 2000 时按充裕 25% 补到 2500，共用原料只扣一次，按整批生产', () => {
    const data = { items: {}, actions: {} };
    function recipe(id, output, requirements) {
        data.items[id] = { sources: { actions: [{ id }] } };
        data.actions[id] = { action: 6, rewards: [{ itemId: id, chance: 100, min: output, max: output }],
            requirements: requirements.map(([itemId, quantity]) => ({ itemId, quantity })) };
    }
    recipe(30, 4, [[20, 2], [10, 1]]);
    recipe(20, 3, [[10, 2]]);
    const stock = { 30: 1900, 20: 100, 10: 200 };
    const held = id => stock[id] || 0;
    const plan = stockReplenishment(data, 30, 2000, 25, held);
    assert.equal(plan.target, 2500);
    assert.equal(stockReplenishment(data, 30, 2000, undefined, held).target, 2500);
    assert.equal(stockReplenishment(data, 30, 2000, 0, held).target, 2000);
    assert.equal(plan.deficit, 600);
    assert.deepEqual(plan.production, [[20, 201], [30, 600]]);
    assert.deepEqual(plan.purchases, [[10, 84]]);

    stock[20] = 300;
    assert.deepEqual(stockReplenishment(data, 30, 2000, 25, held).production, [[30, 600]]);
    assert.deepEqual(stockReplenishment(data, 30, 2000, 25, held).purchases, []);
    stock[30] = 2000;
    assert.equal(stockReplenishment(data, 30, 2000, 25, held), null);
    assert.equal(stockReplenishment(data, 30, 2000, 25, held, true).deficit, 500);
    assert.equal(stockReplenishment(data, 10, 201, 1000, held).target, 2211);
    assert.equal(stockReplenishment(data, 10, 201, 0.01, held).target, 202);
});

test('汇总预警共用背包材料和整批产量，并为自身触发预警的材料保留补货数量', () => {
    const items = { 10: {} }, actions = {};
    for (const [id, output, itemId, quantity] of [[20, 4, 10, 2], [30, 1, 20, 3], [40, 1, 20, 2]]) {
        items[id] = { sources: { actions: [{ id }] } };
        actions[id] = { action: 6, rewards: [{ itemId: id, chance: 100, min: output, max: output }],
            requirements: [{ itemId, quantity }] };
    }
    const data = { items, actions };
    const held = id => ({ 10: 1, 20: 3 }[id] || 0);
    const combined = planStockReplenishment(data, [[30, 1], [40, 1]], held);
    assert.deepEqual(combined.purchases, [[10, 1]]);
    assert.deepEqual(new Map(combined.production), new Map([[20, 4], [30, 1], [40, 1]]));
    const withYarnTarget = planStockReplenishment(data, [[30, 1], [40, 1], [20, 1]], held);
    assert.deepEqual(withYarnTarget.purchases, [[10, 3]]);
    assert.deepEqual(new Map(withYarnTarget.production), new Map([[20, 8], [30, 1], [40, 1]]));
});

test('预警读取实际库存，提醒采购且同一状态只提示一次，补到目标后重新触发', () => {
    const h = setup(5, 25);
    h.store.set('nek_inventory_ledger_v1:669', JSON.stringify({
        items: { 10: { quantity: 2300, since: Date.now() } }, thresholds: { 10: 2000 }
    }));
    h.setQty(10, 1900);
    h.feature.syncInventoryBalances('669', true);
    h.reads.length = 0;
    h.pulse();
    h.advance(120000);
    assert.deepEqual(h.reads, [], '空闲时不读取预警物品库存');
    assert.equal(h.notices.length, 1);
    assert.match(h.notices[0], /绒毛需采购 绒毛 × 600/);
    h.setQty(10, 2000);
    h.feature.syncInventoryBalances('669', true);
    assert.equal(h.notices.length, 1);
    h.setQty(10, 2500);
    h.feature.syncInventoryBalances('669', true);
    h.setQty(10, 1999);
    h.feature.syncInventoryBalances('669', true);
    assert.equal(h.notices.length, 2);
    assert.match(h.notices[1], /绒毛 × 501/);
});

function stockCost(store, uid) {
    return JSON.parse(store.get('nek_warehouse_cost_v1:' + uid) || '{}');
}

test('生产批次每两分钟记账，无生产流水，同物品交易实时加权并同步', () => {
    const h = setup(), uid = 669, key = 'nek_inventory_ledger_v1:' + uid;
    h.data.items[20] = { id: 20, name: '面料', sources: { actions: [{ id: 220 }] } };
    h.data.actions = { 220: { action: 6, requirements: [{ itemId: 10, quantity: 3 }],
        rewards: [{ itemId: 20, min: 1, max: 1, chance: 100 }] } };
    h.game.inventory = [{ id: 1, item: 10, quantity: 9 }];
    h.setQty(10, 9);
    h.setQty(20, 2);
    h.store.set('nek_warehouse_cost_v1:' + uid, JSON.stringify({ 10: 10 }));
    h.store.set(key, JSON.stringify({ products: [20] }));
    h.feature.syncInventoryBalances('669', true);
    h.msg.handlers.update_queue({ content: [{ type: 'action', id: 220 }] });
    assert.equal(h.feature.warehouseValue(20).price, 30);
    assert.equal(h.feature.warehouseValue(20).label, '生产成本');
    h.msg.handlers.action_complete({ content: { type: 'action', id: 220,
        add: [{ item: 20, quantity: 2 }], remove: [{ id: 1, quantity: 3 }] } });
    assert.equal(stockCost(h.store, uid)[20], undefined);
    h.advance(119999);
    assert.equal(stockCost(h.store, uid)[20], undefined);
    h.advance(1);
    assert.equal(stockCost(h.store, uid)[20], 22.5, '实际多产一件，本批单价 15');
    assert.equal(h.uploads(), 0);
    const payloadLedger = JSON.parse(h.store.get(key));
    assert.equal(h.feature.warehouseForCloud(String(uid), payloadLedger, stockCost(h.store, uid)).costs[20], undefined);
    h.msg.send('market_instant', { side: 2, item: 20, price: 60, quantity: 1 });
    h.msg.handlers.market_update({ content: { type: 'place', side: 2, price: 60, add: [{ item: 20, quantity: 1 }] } });
    assert.equal(h.feature.warehouseValue(20).price, 30);
    assert.equal(h.feature.warehouseValue(20).label, '库存成本');
    assert.equal(h.uploads(), 1);
    h.msg.handlers.action_complete({ content: { type: 'action', id: 220, add: [], remove: [] } });
    h.setQty(20, 3);
    h.pulse();
    assert.equal(JSON.parse(h.store.get(key)).items[20].quantity, 5);
    h.advance(120000);
    const ledger = JSON.parse(h.store.get(key));
    assert.equal(ledger.items[20].quantity, 3);
    assert.deepEqual(ledger.items[20].purchases.map(p => p.source), ['直购']);
    assert.equal(stockCost(h.store, uid)[20], 30);
    h.advance(299999 - 240000);
    assert.equal(h.uploads(), 1);
    h.advance(1);
    assert.equal(h.uploads(), 2, '剩余库存的生产变化默认五分钟才同步');
});

test('交易刷新下游预警，队首切换立即入账，两个路径都不读取无关库存', () => {
    const h = setup();
    h.data.items[20] = { id: 20, name: '面料', sources: { actions: [{ id: 220 }] } };
    h.data.items[30] = { id: 30, name: '其他材料' };
    h.data.actions = { 220: { action: 6, requirements: [{ itemId: 10, quantity: 2 }],
        rewards: [{ itemId: 20, min: 1, max: 1, chance: 100 }] } };
    h.game.inventory = [{ id: 11, item: 10 }];
    h.setQty(10, 8);
    h.setQty(30, 99);
    h.store.set('nek_warehouse_cost_v1:669', JSON.stringify({ 10: 2, 30: 7 }));
    const key = 'nek_inventory_ledger_v1:669';
    h.store.set(key, JSON.stringify({ products: [20], thresholds: { 20: 4, 30: 1 } }));
    h.feature.syncInventoryBalances('669', true);
    assert.match(h.notices.at(-1), /面料可生产补货/);
    h.reads.length = 0;
    h.msg.handlers.market_update({ content: { type: 'place', side: 1, remove: [{ id: 11, quantity: 2 }] } });
    assert.deepEqual([...new Set(h.reads)], [10]);
    assert.match(h.notices.at(-1), /面料需采购 绒毛 × 2/);
    h.msg.handlers.update_queue({ content: [{ type: 'action', id: 220, token: 1 }] });
    h.msg.handlers.action_complete({ content: { type: 'action', id: 220,
        add: [{ item: 20, quantity: 1 }], remove: [{ id: 11, quantity: 2 }] } });
    assert.equal(JSON.parse(h.store.get(key)).items[20].quantity, 0);
    h.reads.length = 0;
    h.msg.handlers.update_queue({ content: [] });
    const ledger = JSON.parse(h.store.get(key));
    assert.equal(ledger.items[10].quantity, 4);
    assert.equal(ledger.items[20].quantity, 1);
    assert.equal(stockCost(h.store, 669)[20], 4);
    assert.deepEqual([...new Set(h.reads)].sort(), [10, 20]);
});

test('生产数量按设定间隔上传，市场出库不带走其他物品待同步的生产数据', () => {
    const h = setup(2), uid = 669, key = 'nek_inventory_ledger_v1:' + uid;
    h.game.inventory = [{ id: 11, item: 10 }];
    h.setQty(10, 10);
    h.setQty(20, 10);
    h.store.set('nek_warehouse_cost_v1:' + uid, JSON.stringify({ 10: 15, 20: 5 }));
    h.store.set(key, JSON.stringify({ items: { 10: { quantity: 10, since: Date.now() },
        20: { quantity: 10, since: Date.now(), purchases: [{ source: '生产入库', quantity: 1, price: 5, at: Date.now() }] } } }));
    h.msg.handlers.action_complete({ content: { type: 'action', id: 999, remaining: 0, add: [{ item: 20, quantity: 2 }] } });
    h.msg.handlers.market_update({ content: { type: 'place', side: 1, remove: [{ id: 11, quantity: 3 }] } });
    assert.equal(h.uploads(), 1);
    const local = JSON.parse(h.store.get(key));
    assert.equal(local.items[20].quantity, 12);
    assert.deepEqual(local.items[20].purchases, []);
    const pending = h.feature.warehouseForCloud(String(uid), local, stockCost(h.store, uid)).ledger;
    assert.equal(pending.items[10].quantity, 7);
    assert.equal(pending.items[10].purchases[0].source, '市场出库');
    assert.equal(pending.items[20].quantity, 10);
    h.advance(119999);
    assert.equal(h.uploads(), 1);
    h.advance(1);
    assert.equal(h.uploads(), 2);
    const synced = h.feature.warehouseForCloud(String(uid), JSON.parse(h.store.get(key)), stockCost(h.store, uid));
    assert.equal(synced.ledger.items[20].quantity, 12);
    h.advance(120000);
    assert.equal(h.uploads(), 2, '库存无变化时不发重复上传');
});

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
    const ledger = JSON.parse(h.store.get('nek_inventory_ledger_v1:' + uid));
    assert.equal(ledger.items[10].quantity, 110);
    assert.equal(ledger.items[10].purchases[0].quantity, 10);
});

test('带云端账本的历史补账按实际库存与入账顺序计算，排除未领取与重复记录', () => {
    const h = setup(), uid = 669;
    const base = Date.now() - 60000, key = 'nek_inventory_ledger_v1:' + uid;
    h.store.set(key, JSON.stringify({ items: { 10: { quantity: 100, since: base } }, orders: {}, products: [] }));
    h.store.set('nek_warehouse_cost_v1:' + uid, JSON.stringify({ 10: 30 }));
    h.setQty(10, 30);
    h.game.settlement = [{ item: 10, side: 2, order_id: 8, quantity: 4 }];
    const orders = [
        { id: 9, item: 10, side: 2, traded: 5, price: 200, close_time: base + 2000 },
        { id: 8, item: 10, side: 2, traded: 9, price: 100, close_time: base + 1000 },
        { id: 7, item: 10, side: 1, traded: 10, price: 500, close_time: base + 1000 }
    ];
    h.msg.handlers.market_history({ content: orders });
    assert.equal(stockCost(h.store, uid)[10], 70);
    const entry = JSON.parse(h.store.get(key)).items[10];
    assert.equal(entry.quantity, 30);
    assert.deepEqual(entry.purchases.map(r => [r.quantity, r.price]), [[5, 100], [5, 200]]);
    h.msg.handlers.market_history({ content: orders });
    assert.equal(stockCost(h.store, uid)[10], 70);
    assert.equal(JSON.parse(h.store.get(key)).items[10].purchases.length, 2);
});

test('同一求购单实时领取后，历史只补算另一端已领取的增量', () => {
    const h = setup(), uid = 669;
    const now = Date.now(), key = 'nek_inventory_ledger_v1:' + uid;
    h.store.set(key, JSON.stringify({ items: { 10: { quantity: 10, since: now - 60000 } }, orders: {}, products: [] }));
    h.store.set('nek_warehouse_cost_v1:' + uid, JSON.stringify({ 10: 20 }));
    h.setQty(10, 10);
    h.game.settlement = [{ id: 100, item: 10, side: 2, order_id: 25, quantity: 5, price: 50 }];
    h.msg.send('market_settlement_claim', { id: 100 });
    h.msg.handlers.market_update({ content: { type: 'claim', add: [{ item: 10, quantity: 5 }] } });
    assert.equal(stockCost(h.store, uid)[10], 30);
    h.game.settlement = [];
    h.setQty(10, 20);
    h.msg.handlers.market_history({ content: [{ id: 25, item: 10, side: 2, traded: 10, price: 50, close_time: now }] });
    assert.equal(stockCost(h.store, uid)[10], 35);
    assert.equal(JSON.parse(h.store.get(key)).orders[25].quantity, 10);
});

test('旧库存耗尽后按采购批次加权，账面数量以实际剩余库存为准', () => {
    const h = setup(), uid = 669, base = Date.now() - 60000;
    const key = 'nek_inventory_ledger_v1:' + uid;
    h.store.set(key, JSON.stringify({ items: { 10: { quantity: 100, since: base, incomplete: true } } }));
    h.store.set('nek_warehouse_cost_v1:' + uid, JSON.stringify({ 10: 30 }));
    h.setQty(10, 3);
    const orders = [
        { id: 5, item: 10, side: 2, traded: 2, price: 100, close_time: base + 1000 },
        { id: 6, item: 10, side: 2, traded: 6, price: 200, close_time: base + 2000 }
    ];
    h.msg.handlers.market_history({ content: orders });
    assert.equal(stockCost(h.store, uid)[10], 175);
    const ledger = JSON.parse(h.store.get(key));
    assert.equal(ledger.items[10].quantity, 3);
    assert.equal(ledger.orders[5].quantity, 2);
    assert.equal(ledger.orders[6].quantity, 6);
    h.msg.handlers.market_history({ content: orders });
    assert.equal(stockCost(h.store, uid)[10], 175);
    assert.equal(JSON.parse(h.store.get(key)).items[10].purchases.length, 2);
});
