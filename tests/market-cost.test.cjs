const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Document } = require('./helpers/dom.cjs');

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
