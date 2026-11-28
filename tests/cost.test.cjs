const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recipeCost, substituteOptions, mergeWarehouseCost, claimCosts, stockTotalOf, directStockTotal, parseStockCost, round2, craftableProduct, normalizeInventoryLedger, normalizeThreshold, thresholdCheck, productionFormula, migrateEmptyBatchItems, inventorySummary, inventoryDaySegments, archiveExhaustedBatches, dayStartOf, addInventoryBatch, consumeInventoryFifo, pushInventoryTrade, inventoryDelta, inventoryReconcile, fifoPrice,
    productionQueueCost, mergeQueueOutputBatches, productionSourcesOf, productionCostOf, recomputeProductionCost, findInventoryBatch,
    stockRecipe, planStockReplenishment, stockReplenishment, stockItemNames, productionRemovedItems,
    importFifoPurchases, inventoryValuation, migrateAverageInventory, clearInventoryPrices } = require('../src/enhancements.js');

test('补货按 FIFO 双阈值取较高值，低于阈值触发并持续到充裕目标', () => {
    const data = { items: { 10: { id: 10 } } };
    const check = { have: 1900, qtyLimit: 2000, pctLimit: 50, peak: 4200, short: true };
    assert.equal(stockReplenishment(data, 10, check, () => 1900, 25).target, 2625);
    const above = { ...check, have: 2200, short: false, qtyShort: false, pctShort: false };
    assert.equal(stockReplenishment(data, 10, above, () => 2200, 25), null);
    assert.equal(stockReplenishment(data, 10, above, () => 2200, 25, true).deficit, 425);
    const now = Date.now();
    const row = { batches: [{ at: now, qty: 10000 }] };
    const fixed = { qty: 2000, pct: 0 };
    const low = thresholdCheck(row, fixed, 1900, now);
    const plan = stockReplenishment(data, 10, low, () => 1900, 25);
    assert.equal(plan.target, 2500);
    assert.equal(plan.deficit, 600);
    const atThreshold = thresholdCheck(row, fixed, 2000, now);
    assert.equal(stockReplenishment(data, 10, atThreshold, () => 2000, 25), null);
});

test('采购历史仅补已领取且尚在背包的差额，重新读取不会重复记账', () => {
    const ledger = normalizeInventoryLedger(null);
    const time = 1700000000000;
    addInventoryBatch(ledger, { id: 10, at: time, reason: '初始库存', qty: 10, unitPrice: 3 });
    const history = [{ id: 1, item: 10, side: 2, traded: 12, price: 7, close_time: time + 1000 }];
    let result = importFifoPurchases(ledger, history, [{ order_id: 1, side: 2, quantity: 4 }], () => 16);
    assert.deepEqual([...result.affected], [10]);
    assert.equal(ledger.items[10].batches[1].qty, 6);
    assert.equal(ledger.orders[1].quantity, 8);
    assert.equal(importFifoPurchases(ledger, history, [{ order_id: 1, side: 2, quantity: 4 }], () => 16).changed, false);
    result = importFifoPurchases(ledger, history, [], () => 20);
    assert.deepEqual([...result.affected], [10]);
    assert.equal(ledger.items[10].batches[2].qty, 4);
    assert.equal(inventorySummary(ledger.items[10]).total, 100);
});

test('库存总价值保留 FIFO 成本，单列配方估值并排除账本外物品', () => {
    const data = { items: { 10: { id: 10 }, 20: { id: 20, sources: { actions: [{ id: 7 }] } }, 30: { id: 30 } },
        actions: { 7: { action: 6, requirements: [{ itemId: 10, quantity: 2 }],
            rewards: [{ itemId: 20, chance: 100, min: 1, max: 1 }] } } };
    const ledger = normalizeInventoryLedger(null);
    addInventoryBatch(ledger, { id: 10, at: 1000, reason: '初始库存', qty: 5, unitPrice: 4 });
    addInventoryBatch(ledger, { id: 20, at: 1000, reason: '初始库存', qty: 3, unitPrice: null });
    assert.deepEqual(inventoryValuation(ledger, data, { 30: 999 }), { total: 44, estimated: 24, unpriced: 0 });
});

test('均价账本迁移保留余额和旧均价，采购明细只作为历史流水', () => {
    const old = { products: [], items: { 10: { quantity: 3, since: 1000, purchases: [
        { at: 2000, quantity: 100, price: 10, source: '历史采购' }
    ] } }, thresholds: { 10: 5 }, orders: { 99: { quantity: 100 } } };
    const ledger = normalizeInventoryLedger(migrateAverageInventory(old, { 10: 12.34 }));
    assert.equal(ledger.items[10].batches.length, 1);
    assert.equal(ledger.items[10].batches[0].qty, 3);
    assert.equal(ledger.items[10].batches[0].unitPrice, 12.34);
    assert.equal(ledger.trades[0].qty, 100);
    assert.deepEqual(ledger.thresholds[10], { qty: 5 });
    assert.equal(ledger.orders[99].quantity, 100);
});

test('市场卖出扣 FIFO 成本，旧批次归档后不再重复扣库存余额', () => {
    const today = new Date(2026, 10, 28, 12).getTime();
    const ledger = normalizeInventoryLedger(null);
    addInventoryBatch(ledger, { id: 10, at: today - 86400000, reason: '初始库存', qty: 5, unitPrice: 4 });
    addInventoryBatch(ledger, { id: 10, at: today, reason: '市场买入', qty: 3, unitPrice: 9 });
    consumeInventoryFifo(ledger, 10, 5, today, 'sale', false, '市场卖出');
    assert.equal(inventorySummary(ledger.items[10]).total, 27);
    assert.equal(archiveExhaustedBatches(ledger, today), true);
    assert.deepEqual(inventoryReconcile(ledger, [10], () => 3), []);
    assert.equal(inventorySummary(ledger.items[10]).total, 27);
});

test('多层生产按实际产量折算，直接买料与原料成本独立，单边缺价只影响该侧', () => {
    const items = Object.fromEntries([1, 2, 3].map(id => [id, { sources: { actions: [{ id }] } }]));
    const make = (id, yieldQty, input, quantity) => ({ action: 6,
        rewards: [{ itemId: id, min: yieldQty, max: yieldQty, chance: 100 }],
        requirements: [{ itemId: input, quantity }] });
    const data = { items, actions: { 1: make(1, 1, 2, 4), 2: make(2, 2, 3, 3), 3: { action: 1 } } };
    const market = new Map([[2, { levels: [{ sell_price: 20, demand_price: 12 }] }],
        [3, { levels: [{ sell_price: 5, demand_price: null }] }]]);
    const result = recipeCost(data, 1, market);
    assert.deepEqual([result.sellDirect, result.demandDirect, result.sell, result.demand], [80, 48, 30, null]);
    assert.equal(result.children[0].children[0].quantity, 6);
    data.actions[3] = make(3, 1, 1, 2);
    assert.equal(recipeCost(data, 1, market).sell, null);
});

test('烹饪配方按产量折算，可按食材替代价值比换料，研究未解锁时不给替代选项', () => {
    const items = {
        100: { name: '烤肉', sources: { actions: [{ id: 7, cooking: true }] } },
        200: { name: '生肉', substitute_group: 'battle', substitute_value: 1, sources: { actions: [{ id: 9 }] } },
        201: { name: '高级肉', substitute_group: 'battle', substitute_value: 2, sources: { actions: [{ id: 9 }] } },
        300: { name: '采集物', sources: { actions: [{ id: 3 }] } }
    };
    const data = {
        items,
        actions: { 3: { action: 2 }, 9: { action: 2 } },
        cookingRecipes: { 7: { rewards: [{ itemId: 100, min: 4, max: 5, chance: 100 }],
            ingredients: [{ itemId: 200, quantity: 8 }] } },
        food: { battle: 0.5 },
        research: { facilities: [{ id: 12, projects: [{ id: 126, key: 'cook_reconstruct' }] }] }
    };
    const market = new Map([[200, { levels: [{ sell_price: 10, demand_price: 8 }] }],
        [201, { levels: [{ sell_price: 3, demand_price: 2 }] }],
        [300, { levels: [{ sell_price: 5, demand_price: 4 }] }]]);
    const base = recipeCost(data, 100, market);
    assert.equal(base.children[0].name, '生肉');
    assert.equal(base.children[0].quantity, 2);
    assert.equal(base.sell, 20);
    const replaced = recipeCost(data, 100, market, 1, new Set(), { substitutes: { 200: 201 } });
    assert.equal(replaced.children[0].name, '高级肉');
    assert.equal(replaced.children[0].quantity, 1.5); // 8 × 1 × 1.5 / 2 ÷ 产量 4
    assert.equal(replaced.sell, 4.5);
    assert.deepEqual(substituteOptions(data, { 126: 0 }, 100), null);
    const opts = substituteOptions(data, { 126: 1 }, 100);
    assert.deepEqual(opts, [{ itemId: 200, group: 'battle', candidates: [{ id: 201, name: '高级肉' }] }]);
});

test('采集/掉落类食材（无生产配方）按市场报价作叶子，不误标配方不可用', () => {
    const items = {
        100: { name: '烤肉', sources: { actions: [{ id: 7, cooking: true }] } },
        200: { name: '牛排', sources: { actions: [], monsters: [{ id: 1 }] } },  // 只有怪物掉落
        201: { name: '蘑菇', sources: { actions: [], battles: [] } }
    };
    const data = {
        items,
        actions: {},
        cookingRecipes: { 7: { rewards: [{ itemId: 100, min: 2, max: 2, chance: 100 }],
            ingredients: [{ itemId: 200, quantity: 1 }, { itemId: 201, quantity: 2 }] } }
    };
    const market = new Map([[200, { levels: [{ sell_price: 30, demand_price: 20 }] }],
        [201, { levels: [{ sell_price: 5, demand_price: 4 }] }]]);
    const cost = recipeCost(data, 100, market);
    assert.equal(cost.children.length, 2);
    assert.equal(cost.children[0].source, '战斗掉落');
    assert.equal(cost.children[1].source, '基础材料');
    assert.equal(cost.children[0].sell, 15);   // 1 ÷ 2 × 30
    assert.equal(cost.children[1].sell, 5);    // 2 ÷ 2 × 5
    assert.equal(cost.sell, 20);
    assert.equal(cost.demand, 14);
});

test('仓库成本按已有库存与本次买入价加权平均，无旧成本时取买入价', () => {
    assert.equal(mergeWarehouseCost(30, 100, 50, 10), 31.82);
    assert.equal(mergeWarehouseCost(undefined, 100, 50, 10), 50);
    assert.equal(mergeWarehouseCost(0, 0, 50, 10), 50);
    assert.equal(mergeWarehouseCost(30, 100, 50, 0), null);
    assert.equal(mergeWarehouseCost(30, 100, -1, 10), null);
    assert.equal(mergeWarehouseCost(30, 100, 40, 5), 30.48);
});

test('结算领取待入库成本：用结算项自带 side/price，部分成交分批按数量加权，排除金币找零与卖单', () => {
    const settlements = [
        { id: 101, order_id: 1, side: 2, item: 10, enhancement: 0, quantity: 2, price: 100, order_item: 10 },
        { id: 102, order_id: 1, side: 2, item: 1, enhancement: 0, quantity: 10000, price: 100, order_item: 10 }, // 金币找零，跳过
        { id: 103, order_id: 1, side: 2, item: 10, enhancement: 0, quantity: 8, price: 200, order_item: 10 },    // 同单部分成交第二批
        { id: 104, order_id: 2, side: 2, item: 20, enhancement: 3, quantity: 5, price: 50, order_item: 20 },
        { id: 105, order_id: 3, side: 1, item: 1, enhancement: 0, quantity: 9990, price: 90, order_item: 1401 }  // 卖单收到金币，跳过
    ];
    const all = claimCosts(settlements);
    assert.equal(all['10:0'].price, 180);   // 部分成交两批：(100*2 + 200*8)/10
    assert.equal(all['10:0'].quantity, 10);
    assert.equal(all['20:3'].price, 50);
    assert.equal(all['20:3'].quantity, 5);
    assert.equal(all['1:0'], undefined);    // 金币找零/卖单收款都不记成本
    // 单条领取：只算指定结算项（点单条「领取」按钮）
    const one = claimCosts(settlements, 101);
    assert.equal(one['10:0'].price, 100);
    assert.equal(one['10:0'].quantity, 2);
    assert.equal(one['20:3'], undefined);
});

test('库存合计优先取节点自身库存成本（含中间产物），未记录才递归/市场兜底', () => {
    const leafA = { id: 11, name: 'A', quantity: 30, children: [], sell: 100500, demand: 97500 };
    const leafB = { id: 12, name: 'B', quantity: 30, children: [], sell: 117000, demand: 46800 };
    const middle = { id: 20, name: '锭', quantity: 10, children: [leafA, leafB], sell: 217500, demand: 144300 };
    const root = { id: 30, name: '成品', quantity: 1, children: [middle], sell: 217500, demand: 144300 };
    // 中间产物录了库存成本：按 500000×10 算，不能再展开叶子得到 217500（否则差值误显示 +0）。
    assert.equal(stockTotalOf(root, { 20: 500000 }, 'sell'), 5000000);
    // 未录中间产物、叶子也没录：回退市场小计 217500，差值 0。
    assert.equal(stockTotalOf(root, {}, 'sell'), 217500);
    // 只录叶子：按叶子库存单价×用量合计。
    assert.equal(stockTotalOf(root, { 11: 100, 12: 200 }, 'sell'), 3000 + 6000);
    // 根自身录了库存成本时以根为准。
    assert.equal(stockTotalOf(root, { 30: 7 }, 'sell'), 7);
});

test('直接买入材料库存合计：只按一层直接材料计，未录成本的材料按市场报价兜底', () => {
    const leafA = { id: 11, name: 'A', quantity: 30, children: [], sell: 100500, sellQuote: 100500, demandQuote: 97500 };
    const leafB = { id: 12, name: 'B', quantity: 30, children: [], sell: 117000, sellQuote: 117000, demandQuote: 46800 };
    const middle = { id: 20, name: '锭', quantity: 10, children: [leafA, leafB], sell: 217500, demand: 144300 };
    const root = { id: 30, name: '成品', quantity: 1, children: [middle], sell: 217500, demand: 144300 };
    // 一层直接材料只有「锭」，录 500000 则库存合计 500000×10，不再展开 A/B。
    assert.equal(directStockTotal(root, { 20: 500000 }, 'sell'), 5000000);
    // 未录任何直接材料：返回 null，不显示括号（避免 (+0)）。
    assert.equal(directStockTotal(root, {}, 'sell'), null);
    // 录部分直接材料：其余按市场报价兜底。
    const two = { id: 30, quantity: 1, children: [leafA, leafB] };
    assert.equal(directStockTotal(two, { 11: 100 }, 'sell'), 100 * 30 + 117000);
    assert.equal(directStockTotal(two, { 12: 200 }, 'demand'), 97500 + 200 * 30);
});

test('库存成本输入最多两位小数，超过三位或非法输入拒绝', () => {
    assert.equal(parseStockCost('12'), 12);
    assert.equal(parseStockCost('12.3'), 12.3);
    assert.equal(parseStockCost('12.34'), 12.34);
    assert.equal(parseStockCost('.5'), 0.5);
    assert.equal(parseStockCost('0'), 0);
    assert.equal(parseStockCost('12.345'), null);
    assert.equal(parseStockCost('abc'), null);
    assert.equal(parseStockCost('-1'), null);
    assert.equal(parseStockCost('1e3'), null);
    assert.equal(round2(0.1 + 0.2), 0.3);
});

test('可核算成品判定：仅生产/烹饪配方可展开的成品为 true', () => {
    const data = {
        items: {
            1: { sources: { actions: [{ id: 1 }] } },              // 生产成品
            2: { sources: { actions: [{ id: 2, cooking: true }] } }, // 烹饪成品
            3: { sources: { actions: [{ id: 3 }] } },              // 采集叶子
            4: { sources: { actions: [{ id: 4 }] } },              // 配方不完整
            5: { sources: { actions: [{ id: 5, cooking: true }] } } // 烹饪奖励概率不足
        },
        actions: {
            1: { action: 6, rewards: [{ itemId: 1, min: 1, max: 1, chance: 100 }], requirements: [{ itemId: 3, quantity: 2 }] },
            3: { action: 1 }, 4: { action: 1 }
        },
        cookingRecipes: {
            2: { rewards: [{ itemId: 2, min: 4, max: 4, chance: 100 }], ingredients: [{ itemId: 3, quantity: 1 }] },
            5: { rewards: [{ itemId: 5, min: 4, max: 4, chance: 50 }], ingredients: [{ itemId: 3, quantity: 1 }] }
        }
    };
    assert.equal(craftableProduct(data, 1), true);
    assert.equal(craftableProduct(data, 2), true);
    assert.equal(craftableProduct(data, 3), false);
    assert.equal(craftableProduct(data, 4), false);
    assert.equal(craftableProduct(data, 5), false);
    assert.equal(craftableProduct(data, 999), false);
    assert.equal(craftableProduct(null, 1), false);
});

// ===== 库存核算账本纯函数 =====
test('库存账本归一化：过滤非法批次、按时间排序、无价批次 amount 为 null', () => {
    const led = normalizeInventoryLedger({
        items: {
            10: { quantity: 8, since: 100, batches: [
                { id: 'b2', at: 300, reason: '市场买入', qty: 5, unitPrice: 12.345 },
                { id: 'b1', at: 100, reason: '初始库存', qty: 8, unitPrice: 10 },
                { id: 'b3', at: 200, reason: '市场卖出', qty: -2, unitPrice: null }
            ] },
            1: { quantity: 5, batches: [] },   // 金币 item=1 排除
            20: { quantity: -1, batches: [{ at: 1, reason: '市场买入', qty: 0 }] }   // 非初始库存的 qty=0 批次被过滤
        },
        thresholds: { 10: 5, 1: 9, 30: -1 }
    });
    assert.deepEqual(Object.keys(led.items), ['10']);
    assert.deepEqual(led.items['10'].batches.map(b => b.reason), ['初始库存', '市场卖出', '市场买入']);
    assert.equal(led.items['10'].batches[2].unitPrice, 12.35);
    assert.equal(led.items['10'].batches[2].amount, 61.75);
    assert.equal(led.items['10'].batches[1].amount, null);
    assert.deepEqual(led.thresholds, { 10: { qty: 5 } });
});

test('库存汇总：综合单价按有价批次加权，总额含卖出扣减', () => {
    const led = normalizeInventoryLedger({ items: {
        10: { quantity: 11, batches: [
            { at: 1, reason: '初始库存', qty: 10, unitPrice: 10 },
            { at: 2, reason: '市场买入', qty: 5, unitPrice: 20 },
            { at: 3, reason: '市场卖出', qty: -4, unitPrice: 16 },
            { at: 4, reason: '生产消耗', qty: -2, unitPrice: null }
        ] }
    } });
    const s = inventorySummary(led.items['10']);
    assert.equal(s.quantity, 9);
    assert.equal(s.total, 10 * 10 + 5 * 20 - 4 * 16);  // 136
    assert.equal(s.unitPrice, Math.round(136 / 11 * 100) / 100); // 有价批次数量 10+5-4=11
    assert.equal(s.priced, 3);
});

test('追加批次：数量和流水去重，同 ref 不重复记账', () => {
    const led = normalizeInventoryLedger(null);
    assert.equal(addInventoryBatch(led, { id: 10, at: 100, reason: '初始库存', qty: 5, unitPrice: 10 }), true);
    assert.equal(addInventoryBatch(led, { id: 10, at: 200, reason: '市场买入', qty: 3, unitPrice: 12, ref: 'o1' }), true);
    assert.equal(addInventoryBatch(led, { id: 10, at: 200, reason: '市场买入', qty: 3, unitPrice: 12, ref: 'o1' }), false);
    assert.equal(led.items['10'].quantity, 8);
    assert.equal(led.items['10'].batches.length, 2);
    assert.equal(addInventoryBatch(led, { id: 1, at: 1, reason: '市场买入', qty: 1, unitPrice: 1 }), false); // 金币排除
});

test('生产消耗按 FIFO 从初始库存起算，生成负批次', () => {
    const led = normalizeInventoryLedger({ items: {
        10: { quantity: 8, batches: [
            { at: 100, reason: '初始库存', qty: 5, unitPrice: 10 },
            { at: 200, reason: '市场买入', qty: 3, unitPrice: 20 }
        ] }
    } });
    const used = consumeInventoryFifo(led, 10, 6, 300, 'r1');
    assert.equal(used.length, 2);
    assert.deepEqual(used.map(u => u.qty), [5, 1]);
    assert.deepEqual(used.map(u => u.unitPrice), [10, 20]);
    assert.equal(led.items['10'].quantity, 2);
    const consume = led.items['10'].batches.filter(b => b.reason === '生产消耗');
    assert.equal(consume.length, 2);
    assert.equal(consume[0].amount, -50);
    assert.equal(consume[1].amount, -20);
});

test('流水滚动保留最近 200 条', () => {
    const led = normalizeInventoryLedger(null);
    for (let i = 1; i <= 205; i++) pushInventoryTrade(led, { at: i, id: 10, reason: '市场买入', qty: 1, unitPrice: i });
    assert.equal(led.trades.length, 200);
    assert.equal(led.trades[0].at, 6);
    assert.equal(led.trades[199].at, 205);
});

test('旧账本 purchases 迁移为批次（生产入库→生产成品，其余→市场买入）', () => {
    const led = normalizeInventoryLedger({ items: {
        4006: { quantity: 10, since: 100, purchases: [
            { quantity: 5, price: 12, at: 100, source: '历史采购' },
            { quantity: 3, price: 0, at: 200, source: '生产入库' }
        ] }
    } });
    const batches = led.items['4006'].batches;
    assert.equal(batches.length, 2);
    assert.equal(batches[0].reason, '市场买入');
    assert.equal(batches[0].unitPrice, 12);
    assert.equal(batches[1].reason, '生产成品');
    assert.equal(batches[1].unitPrice, 0);
});

test('账本归一化：旧换日库存迁移初始库存、丢弃换日缺口、保留核对时间、无对账日期', () => {
    const led = normalizeInventoryLedger({
        lastGapDay: '2026-11-28',
        items: {
            10: { quantity: 20, batches: [
                { id: 'a', at: 100, reason: '换日库存', qty: 10, unitPrice: 10 },
                { id: 'b', at: 200, reason: '换日缺口', qty: -3, unitPrice: null },
                { id: 'c', at: 300, reason: '生产成品', qty: 5, unitPrice: null, verified: true, checkAt: 123456 }
            ] },
            11: { quantity: 0, batches: [ { id: 'd', at: 150, reason: '初始库存', qty: 0, unitPrice: 8 } ] }
        }
    });
    assert.equal(led.lastGapDay, undefined);
    const batches = led.items['10'].batches;
    assert.deepEqual(batches.map(b => b.reason), ['初始库存', '生产成品']);
    assert.equal(batches[0].qty, 10);
    assert.equal(batches[1].verified, true);
    assert.equal(batches[1].checkAt, 123456);
    // 仓库无货的初始库存 qty=0 被保留。
    assert.equal(led.items['11'].batches.length, 1);
    assert.equal(led.items['11'].batches[0].qty, 0);
    // 非初始库存的 qty=0 批次被拒绝。
    assert.equal(addInventoryBatch(led, { id: 10, at: 400, reason: '市场买入', qty: 0, unitPrice: null }), false);
    // 初始库存 qty=0 允许写入。
    assert.equal(addInventoryBatch(led, { id: 12, at: 400, reason: '初始库存', qty: 0, unitPrice: null }), true);
    assert.equal(led.items['12'].batches.length, 1);
});

test('迁移旧账本有数量无批次的物品：补初始库存，数量取仓库实际（无货则 0）', () => {
    const led = normalizeInventoryLedger({
        items: {
            4006: { quantity: 51824, batches: [], since: 1000 },   // 旧账本有数量无批次，仓库实际 25912
            9010: { quantity: 105314, batches: [], since: 2000 },  // 仓库实际 52517
            7047: { quantity: 0, batches: [], since: 3000 },       // 仓库无货
            1002: { quantity: 147, batches: [{ at: 100, reason: '初始库存', qty: 147, unitPrice: 500 }] } // 已有批次不动
        }
    });
    // 归一化：无批次且 quantity=0 的物品被丢弃；有数量无批次的仍保留（等待迁移补批次）。
    assert.ok(led.items['4006'] && led.items['9010']);
    assert.equal(led.items['1002'].batches.length, 1);
    const quantityOf = { 4006: 25912, 9010: 52517, 7047: 0 };
    const changed = migrateEmptyBatchItems(led,
        id => quantityOf[id] ?? 0,
        id => id === 4006 ? 1.5 : null);
    assert.equal(changed, true);
    // 三个无批次物品各补一条初始库存，数量取仓库实际值。
    assert.deepEqual(led.items['4006'].batches.map(b => [b.reason, b.qty, b.unitPrice]), [['初始库存', 25912, 1.5]]);
    assert.deepEqual(led.items['9010'].batches.map(b => [b.reason, b.qty, b.unitPrice]), [['初始库存', 52517, null]]);
    // 已有批次的物品不被改动。
    assert.equal(led.items['1002'].batches.length, 1);
    assert.equal(led.items['1002'].batches[0].qty, 147);
    // 再次迁移无改动（幂等）。
    assert.equal(migrateEmptyBatchItems(led, id => quantityOf[id] ?? 0, () => null), false);
});

test('FIFO 按来源批次去重：同批早期单价不会被反复取用，来源写入 from', () => {
    const led = normalizeInventoryLedger({ items: {
        10: { quantity: 6, batches: [
            { at: 100, reason: '初始库存', qty: 3, unitPrice: 10 },
            { at: 200, reason: '市场买入', qty: 3, unitPrice: 20 },
            { at: 300, reason: '生产成品', qty: 2, unitPrice: 30 }
        ] }
    } });
    // 第一批消耗 4：初始 3@10 + 买入 1@20。
    const a = consumeInventoryFifo(led, 10, 4, 400, 'q1');
    assert.deepEqual(a.map(u => [u.qty, u.unitPrice]), [[3, 10], [1, 20]]);
    // 第二批消耗 4：跳过取尽的初始库存，买入剩 2@20 + 成品 2@30。
    const b = consumeInventoryFifo(led, 10, 4, 500, 'q2');
    assert.deepEqual(b.map(u => [u.qty, u.unitPrice]), [[2, 20], [2, 30]]);
    // 第三批只剩 0，取不到。
    assert.equal(consumeInventoryFifo(led, 10, 1, 600, 'q3').length, 0);
    const uses = led.items['10'].batches.filter(x => x.reason === '生产消耗');
    assert.equal(uses.length, 4);
    assert.ok(uses.every(x => x.from));
    assert.equal(uses[0].ref, 'q1');
    assert.equal(uses[3].unitPrice, 30);
    assert.equal(fifoPrice(b), 25);
    assert.equal(fifoPrice([]), null);
});

test('仓库快照差额：只返回变动物品，数量取实际（可小于历史记载）', () => {
    const before = { 10: 100, 20: 50, 30: 7 };
    const after = { 10: 80, 20: 70, 30: 7 };
    const d = inventoryDelta(before, after);
    assert.deepEqual(d, [{ id: 10, delta: -20 }, { id: 20, delta: 20 }]);
    // 历史记载消耗 100 个材料，但仓库实际只少 20 → 入账取实际 20，内容（物品 id）对上即可。
    assert.equal(Math.abs(d[0].delta), 20);
    assert.deepEqual(inventoryDelta({ 10: 5 }, { 10: 5 }), []);
});

test('非白名单 reason 被归一为初始库存，生产退料不再合法', () => {
    const led = normalizeInventoryLedger(null);
    assert.equal(addInventoryBatch(led, { id: 10, at: 100, reason: '生产退料', qty: 5, unitPrice: 12 }), false);
    assert.equal(addInventoryBatch(led, { id: 10, at: 100, reason: '生产成品', qty: 5, unitPrice: 12 }), true);
});


test('对账差额：只覆盖账本已登记物品，未登记的新产出不自动纳入核算', () => {
    const led = normalizeInventoryLedger({
        items: {
            10: { batches: [{ id: 'b1', at: 1, reason: '初始库存', qty: 100, unitPrice: 10, amount: 1000 }], quantity: 100, since: 1 },
            11: { batches: [{ id: 'b2', at: 1, reason: '初始库存', qty: 50, unitPrice: 5, amount: 250 }], quantity: 50, since: 1 },
            20: { batches: [{ id: 'b3', at: 1, reason: '初始库存', qty: 0, unitPrice: null }], quantity: 0, since: 1 }
        }, thresholds: {}, trades: []
    });
    const actual = { 10: 70, 11: 50, 20: 25, 30: 10 };  // 10 消耗 30；11 无变动；20 已登记产出 25；30 未登记产出 10
    const d = inventoryReconcile(led, [10, 11, 20, 30, 1], id => actual[id] || 0);
    assert.deepEqual(d, [{ id: 10, delta: -30 }, { id: 20, delta: 25 }]);
});

test('FIFO 三色分段：换日基准 + 当日增加为满长，消耗从左侧覆盖基准', () => {
    const day = new Date(2026, 10, 28, 12, 0, 0).getTime();
    const start = dayStartOf(day);
    const row = { batches: [
        { id: 'b1', at: start - 86400000, reason: '初始库存', qty: 100, unitPrice: 10 },
        { id: 'b2', at: start + 1000, reason: '市场买入', qty: 20, unitPrice: 12 },
        { id: 'b3', at: start + 2000, reason: '生产消耗', qty: -30, unitPrice: 10, from: 'b1' }
    ] };
    const s = inventoryDaySegments(row, day);
    assert.equal(s.base, 100);
    assert.equal(s.inc, 20);
    assert.equal(s.dec, 30);
    assert.equal(s.peak, 120);            // 基准 100 + 增 20
    assert.equal(s.covered, 30);          // 消耗 30 全在基准内
    assert.equal(s.basePct, 58.33);       // (100-30)/120
    assert.equal(s.incPct, 16.67);        // 20/120
    assert.equal(s.decPct, 25);           // 30/120
    assert.equal(s.incBatches.length, 1);
    assert.equal(s.decBatches.length, 1);
});

test('FIFO 三色分段：消耗超出基准时压缩增加段，三色之和恒为 100%', () => {
    const day = new Date(2026, 10, 28, 12, 0, 0).getTime();
    const start = dayStartOf(day);
    const row = { batches: [
        { id: 'b1', at: start - 1000, reason: '初始库存', qty: 50, unitPrice: 10 },
        { id: 'b2', at: start + 1000, reason: '生产成品', qty: 30, unitPrice: 8 },
        { id: 'b3', at: start + 2000, reason: '生产消耗', qty: -70, unitPrice: 10, from: 'b1' }
    ] };
    const s = inventoryDaySegments(row, day);
    assert.equal(s.peak, 80);
    assert.equal(s.covered, 50);          // 消耗覆盖全部基准
    assert.equal(s.over, 20);             // 超出部分吃掉增加
    assert.equal(s.incLeft, 10);
    assert.equal(s.basePct, 0);
    assert.equal(s.decPct, 87.5);         // 全部消耗 70/80（从左覆盖基准+增加）
    assert.equal(s.incPct, 12.5);         // 剩余增加 10/80
    assert.ok(Math.abs(s.basePct + s.incPct + s.decPct - 100) < 0.01, '三色之和恒为峰值 100%');
});

test('FIFO 归档：来源批次耗尽且早于当日 00:00 才归档，保留 5 天后清除', () => {
    const day = new Date(2026, 10, 28, 12, 0, 0).getTime();
    const start = dayStartOf(day);
    const led = normalizeInventoryLedger({ items: { 10: { quantity: 0, batches: [
        { id: 'b1', at: start - 86400000, reason: '初始库存', qty: 10, unitPrice: 5 },
        { id: 'b2', at: start - 3600000, reason: '生产消耗', qty: -10, unitPrice: 5, from: 'b1' },
        { id: 'b3', at: start - 7200000, reason: '初始库存', qty: 6, unitPrice: 3 },
        { id: 'b4', at: start + 1000, reason: '生产消耗', qty: -2, unitPrice: 3, from: 'b3' }
    ] } }, thresholds: {}, trades: [] });
    assert.equal(archiveExhaustedBatches(led, day), true);
    const row = led.items['10'];
    assert.equal(row.batches.some(b => b.id === 'b1'), false, '耗尽的 b1 被归档');
    assert.equal(row.history.length, 1);
    assert.equal(row.history[0].id, 'b1');
    assert.ok(row.batches.some(b => b.id === 'b3'), '未耗尽的 b3 保留');
    assert.equal(archiveExhaustedBatches(led, day), false, '幂等');
    // 5 天后历史过期清除（b1 归档满 5 天）；b3 的消耗在当日，未满足归档条件仍留在 batches。
    assert.equal(archiveExhaustedBatches(led, day + 6 * 86400000), true);
    assert.equal(led.items['10'].history.length, 0, 'b1 历史超 5 天被清除');
    assert.ok(led.items['10'].batches.some(b => b.id === 'b3'), 'b3 未满足早于当日的条件，保留');
});

test('FIFO 三色分段：展开行1基准为完整基准（满值峰值），非压缩后的剩余', () => {
    const day = new Date(2026, 10, 28, 12, 0, 0).getTime();
    const start = dayStartOf(day);
    const row = { batches: [
        { id: 'b1', at: start - 86400000, reason: '初始库存', qty: 100, unitPrice: 10 },
        { id: 'b2', at: start + 1000, reason: '市场买入', qty: 20, unitPrice: 12 },
        { id: 'b3', at: start + 2000, reason: '生产消耗', qty: -30, unitPrice: 10, from: 'b1' }
    ] };
    const s = inventoryDaySegments(row, day);
    // 折叠基准段被消耗压缩到 58.33%，但展开行1须显示完整基准（100/120=83.33%）→ 行1 = 基准+增 = 100% 满值
    assert.equal(s.basePct, 58.33, '折叠压缩');
    assert.equal(s.baseFullPct, 83.33, '展开行1完整基准');
    assert.ok(Math.abs(s.baseFullPct + s.inc / s.peak * 100 - 100) < 0.01, '展开行1恒为峰值满值');
});

test('addInventoryBatch merge：同队列多次完成累加到同批次，单价按累计金额/数量加权', () => {
    const led = normalizeInventoryLedger(null);
    assert.equal(addInventoryBatch(led, { id: 20, at: 100, reason: '生产成品', qty: 10, unitPrice: 20, ref: 'queue:tk1', merge: true }), true);
    assert.equal(addInventoryBatch(led, { id: 20, at: 200, reason: '生产成品', qty: 30, unitPrice: 30, ref: 'queue:tk1', merge: true }), true);
    const batches = led.items['20'].batches;
    assert.equal(batches.length, 1, '同队列只保留一个批次组');
    assert.equal(batches[0].qty, 40);
    assert.equal(batches[0].unitPrice, 27.5, '(10×20+30×30)/40');
    assert.equal(batches[0].at, 200, '结算时间取最后一次');
    // 非 merge 模式仍拒绝重放
    assert.equal(addInventoryBatch(led, { id: 20, at: 300, reason: '生产成品', qty: 5, unitPrice: 1, ref: 'queue:tk1' }), false);
});

test('consumeInventoryFifo merge：同队列多次消耗累加到同 ref+from 批次', () => {
    const led = normalizeInventoryLedger({ items: { 10: { batches: [
        { id: 'b1', at: 1, reason: '初始库存', qty: 100, unitPrice: 10 }
    ] } }, thresholds: {}, trades: [] });
    consumeInventoryFifo(led, 10, 20, 100, 'queue:tk2', true);
    consumeInventoryFifo(led, 10, 30, 200, 'queue:tk2', true);
    const uses = led.items['10'].batches.filter(b => b.reason === '生产消耗');
    assert.equal(uses.length, 1, '同队列多次消耗合并为一个批次');
    assert.equal(uses[0].qty, -50);
    assert.equal(uses[0].from, 'b1', 'from 记录 FIFO 来源批次 id');
});

test('队列成本按全部材料来源合计 ÷ 总产出，来源无价时标记缺报价', () => {
    const nameOf = id => ({ 10: '蟹', 11: '碎片', 20: '鱼饵' }[id] || '#' + id);
    const led = normalizeInventoryLedger({ items: {
        10: { batches: [
            { id: 'c1', at: 2, reason: '生产消耗', qty: -16, unitPrice: 3500, from: 'crab', ref: 'queue:one' }
        ] },
        11: { batches: [
            { id: 'c2', at: 2, reason: '生产消耗', qty: -24, unitPrice: 100, from: 'shard', ref: 'queue:one' }
        ] },
        20: { batches: [
            { id: 'o1', at: 2, reason: '生产成品', qty: 102, unitPrice: null, ref: 'queue:one' }
        ] }
    }, thresholds: {}, trades: [] });
    const cost = productionQueueCost(led, 'queue:one', nameOf);
    assert.equal(cost.price, round2((56000 + 2400) / 102), '蟹与碎片成本合计 ÷ 产出 = 综合单价');
    assert.equal(cost.amount, 58400);
    assert.equal(cost.missing.length, 0);
    // 任一来源无价 → 整条成品无价并显示缺报价。
    findInventoryBatch(led, 'c2').unitPrice = null;
    findInventoryBatch(led, 'c2').from = 'shardMissing';
    const lack = productionQueueCost(led, 'queue:one', nameOf);
    assert.equal(lack.price, null);
    assert.deepEqual(lack.missing, [{ id: 11, name: '碎片' }]);
});

test('补录来源材料单价后重算消耗与成品，手动录入的成品价保持不变', () => {
    const led = normalizeInventoryLedger({ items: {
        10: { batches: [
            { id: 'b1', at: 1, reason: '市场买入', qty: 100, unitPrice: 10 },
            { id: 'b2', at: 2, reason: '市场买入', qty: 100, unitPrice: null },
            { id: 'c1', at: 3, reason: '生产消耗', qty: -100, unitPrice: null, from: 'b2' }
        ] },
        20: { batches: [
            { id: 'o1', at: 3, reason: '生产成品', qty: 50, unitPrice: 20,
                source: { id: 10, from: 'b1', qty: 100, unitPrice: 10 } },
            { id: 'o2', at: 4, reason: '生产成品', qty: 50, unitPrice: null,
                source: { id: 10, from: 'b2', qty: 100, unitPrice: null }, missing: [{ id: 10, name: '铁矿' }] },
            { id: 'o3', at: 5, reason: '生产成品', qty: 10, unitPrice: 999, manualPrice: true,
                source: { id: 10, from: 'b1', qty: 20, unitPrice: 10 } }
        ] }
    }, thresholds: {}, trades: [] });
    const nameOf = () => '铁矿';
    const b2 = findInventoryBatch(led, 'b2');
    assert.ok(b2, '能在账本中找到来源批次');
    b2.unitPrice = 8; b2.amount = 800;
    assert.equal(recomputeProductionCost(led, ['b1', 'b2'], nameOf), true);
    const use = findInventoryBatch(led, 'c1');
    assert.equal(use.unitPrice, 8, '生产消耗同步补上来源单价');
    assert.equal(use.amount, -800);
    const out = findInventoryBatch(led, 'o2');
    assert.equal(out.unitPrice, 16, '成品按 8×100÷50 重算');
    assert.equal(out.amount, 800);
    assert.equal(out.missing, undefined, '缺报价标记被清除');
    assert.equal(findInventoryBatch(led, 'o1').unitPrice, 20);
    assert.equal(findInventoryBatch(led, 'o3').unitPrice, 999, '手动录入价不参与重算');
    assert.equal(recomputeProductionCost(led, ['b2'], nameOf), false, '数据无变化时不重复重算');
});

test('账本归一化保留来源快照、缺报价与手动价标记', () => {
    const led = normalizeInventoryLedger({ items: { 20: { batches: [
        { id: 'o1', at: 1, reason: '生产成品', qty: 10, unitPrice: 12, manualPrice: true,
            source: { id: 10, from: 'b1', qty: 20, unitPrice: 6 }, missing: [{ id: 10, name: '铁矿' }] }
    ] } }, thresholds: {}, trades: [] });
    const b = led.items['20'].batches[0];
    assert.equal(b.manualPrice, true);
    assert.deepEqual(b.source, { id: 10, from: 'b1', qty: 20, unitPrice: 6 });
    assert.deepEqual(b.missing, [{ id: 10, name: '铁矿' }]);
});

test('同队列成品合并时手动录入价不被自动价覆盖', () => {
    const led = normalizeInventoryLedger(null);
    addInventoryBatch(led, { id: 20, at: 1, reason: '生产成品', qty: 10, unitPrice: 999,
        ref: 'queue:x', from: 'out:b1', merge: true, manualPrice: true });
    addInventoryBatch(led, { id: 20, at: 2, reason: '生产成品', qty: 5, unitPrice: 20,
        ref: 'queue:x', from: 'out:b1', merge: true });
    const b = led.items['20'].batches[0];
    assert.equal(b.qty, 15);
    assert.equal(b.unitPrice, 999);
    assert.equal(b.amount, 14985);
    assert.equal(b.manualPrice, true);
});

test('历史批次按同队列消耗反推来源：缺报价显示，补录上游单价后重算成品', () => {
    const led = normalizeInventoryLedger({ items: {
        10: { batches: [
            { id: 'm1', at: 1, reason: '市场买入', qty: 100, unitPrice: null },
            { id: 'c1', at: 2, reason: '生产消耗', qty: -40, unitPrice: null, from: 'm1', ref: 'queue:legacy' }
        ] },
        20: { batches: [
            { id: 'o1', at: 2, reason: '生产成品', qty: 20, unitPrice: null, ref: 'queue:legacy' }
        ] }
    }, thresholds: {}, trades: [] });
    const nameOf = () => '铁矿';
    const out = findInventoryBatch(led, 'o1');
    const sources = productionSourcesOf(led, out);
    assert.equal(sources.length, 1, '旧成品批次没有 source 时从同队列消耗批次反推来源');
    assert.equal(sources[0].from, 'm1');
    const lack = productionCostOf(led, out, nameOf);
    assert.equal(lack.price, null);
    assert.deepEqual(lack.missing, [{ id: 10, name: '铁矿' }]);
    const m1 = findInventoryBatch(led, 'm1');
    m1.unitPrice = 10; m1.amount = 1000;
    assert.equal(recomputeProductionCost(led, ['m1'], nameOf), true);
    assert.equal(findInventoryBatch(led, 'c1').unitPrice, 10, '生产消耗同步补上来源价');
    assert.equal(out.unitPrice, 20, '旧成品按 10×40÷20 重算');
    assert.equal(out.amount, 400);
    assert.equal(out.missing, undefined, '补录后缺报价标记清除');
});

test('生产消耗的手动价参与重算：上游价变化时同步更新并重算成品', () => {
    const led = normalizeInventoryLedger({ items: {
        10: { batches: [
            { id: 'm1', at: 1, reason: '市场买入', qty: 100, unitPrice: null },
            { id: 'c1', at: 2, reason: '生产消耗', qty: -40, unitPrice: 7, from: 'm1', ref: 'queue:manual', manualPrice: true }
        ] },
        20: { batches: [
            { id: 'o1', at: 2, reason: '生产成品', qty: 20, unitPrice: 14, ref: 'queue:manual' }
        ] }
    }, thresholds: {}, trades: [] });
    // 上游无价时消耗批次手动价作为兜底成本，成品按 7×40÷20 = 14。
    assert.equal(productionQueueCost(led, 'queue:manual').price, 14);
    const m1 = findInventoryBatch(led, 'm1');
    m1.unitPrice = 10; m1.amount = 1000;
    assert.equal(recomputeProductionCost(led, ['m1'], () => '铁矿'), true);
    assert.equal(findInventoryBatch(led, 'c1').unitPrice, 10, '消耗批次手动价被上游重算覆盖');
    assert.equal(findInventoryBatch(led, 'o1').unitPrice, 20, '成品按新来源价 10×40÷20 重算');
});

test('成品手动录入综合单价后锁定：材料价变化不覆盖手动值', () => {
    const led = normalizeInventoryLedger({ items: {
        10: { batches: [
            { id: 'm1', at: 1, reason: '市场买入', qty: 100, unitPrice: 10 },
            { id: 'c1', at: 2, reason: '生产消耗', qty: -40, unitPrice: 10, from: 'm1', ref: 'queue:lock' }
        ] },
        20: { batches: [
            { id: 'o1', at: 2, reason: '生产成品', qty: 20, unitPrice: 999, manualPrice: true, ref: 'queue:lock' }
        ] }
    }, thresholds: {}, trades: [] });
    const m1 = findInventoryBatch(led, 'm1');
    m1.unitPrice = 20; m1.amount = 2000;
    assert.equal(recomputeProductionCost(led, ['m1'], () => '铁矿'), true);
    assert.equal(findInventoryBatch(led, 'c1').unitPrice, 20, '材料价仍随上游更新');
    assert.equal(findInventoryBatch(led, 'o1').unitPrice, 999, '成品手动价不覆盖');
});

test('跨材料跨批次只累加金额：一条成品批次显示综合单价', () => {
    const nameOf = id => ({ 10: '蟹', 11: '碎片', 20: '鱼饵' }[id] || '#' + id);
    const led = normalizeInventoryLedger({ items: {
        10: { batches: [
            { id: 'crab1', at: 1, reason: '生产消耗', qty: -4, unitPrice: 3000, from: 'c1', ref: 'queue:multi' },
            { id: 'crab2', at: 2, reason: '生产消耗', qty: -12, unitPrice: 3500, from: 'c2', ref: 'queue:multi' }
        ] },
        11: { batches: [
            { id: 'shard1', at: 3, reason: '生产消耗', qty: -12, unitPrice: 100, from: 's1', ref: 'queue:multi' },
            { id: 'shard2', at: 4, reason: '生产消耗', qty: -12, unitPrice: 200, from: 's2', ref: 'queue:multi' }
        ] },
        20: { batches: [
            { id: 'out1', at: 5, reason: '生产成品', qty: 102, unitPrice: null, ref: 'queue:multi' }
        ] }
    }, thresholds: {}, trades: [] });
    const cost = productionQueueCost(led, 'queue:multi', nameOf);
    // 4×3000 + 12×3500 + 12×100 + 12×200 = 57600
    assert.equal(cost.amount, 57600);
    assert.equal(cost.price, round2(57600 / 102));
    assert.equal(led.items['20'].batches.length, 1, '只有一个成品批次');
});

test('旧账本同队列拆分的多条成品批次合并为一条综合批次', () => {
    const led = normalizeInventoryLedger({ items: {
        20: { batches: [
            { id: 'o1', at: 2, reason: '生产成品', qty: 59, unitPrice: 40.68, amount: 2400.12,
                ref: 'queue:legacy', from: 'out:s1', source: { id: 11, from: 's1', qty: 24, unitPrice: 100 } },
            { id: 'o2', at: 2, reason: '生产成品', qty: 43, unitPrice: 1302.33, amount: 56000.19,
                ref: 'queue:legacy', from: 'out:c1', source: { id: 10, from: 'c1', qty: 16, unitPrice: 3500 } }
        ], quantity: 102 }
    }, thresholds: {}, trades: [] });
    assert.equal(mergeQueueOutputBatches(led), true);
    const rows = led.items['20'].batches;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].qty, 102);
    assert.equal(rows[0].amount, 58400.31);
    assert.equal(rows[0].unitPrice, round2(58400.31 / 102));
    assert.equal(rows[0].source, undefined);
    assert.equal(rows[0].from, undefined);
    assert.equal(mergeQueueOutputBatches(led), false, '合并幂等');
});

test('成品综合单价公式：逐项列出 FIFO 来源材料的数量×单价，再除以总产出', () => {
    const nameOf = id => ({ 10: '蟹', 11: '碎片', 20: '鱼饵' }[id] || '#' + id);
    const led = normalizeInventoryLedger({ items: {
        10: { batches: [
            { id: 'c1', at: 1, reason: '生产消耗', qty: -4, unitPrice: 3000, from: 'a1', ref: 'queue:f' },
            { id: 'c2', at: 2, reason: '生产消耗', qty: -12, unitPrice: 3500, from: 'a2', ref: 'queue:f' }
        ] },
        11: { batches: [
            { id: 'c3', at: 3, reason: '生产消耗', qty: -12, unitPrice: 100, from: 'b1', ref: 'queue:f' },
            { id: 'c4', at: 4, reason: '生产消耗', qty: -12, unitPrice: 200, from: 'b2', ref: 'queue:f' }
        ] },
        20: { batches: [{ id: 'out', at: 5, reason: '生产成品', qty: 102, unitPrice: 564.71, ref: 'queue:f' }] }
    }, thresholds: {}, trades: [] });
    const out = findInventoryBatch(led, 'out');
    assert.equal(productionFormula(led, out, nameOf),
        '蟹 4×3,000 + 蟹 12×3,500 + 碎片 12×100 + 碎片 12×200 = 57,600 ÷ 102 = 564.71');
    const b2 = findInventoryBatch(led, 'c4');
    b2.unitPrice = null;
    assert.match(productionFormula(led, out, nameOf), /碎片 12×缺报价 = 缺报价：碎片，无法核算/);
    b2.unitPrice = 200;
    out.manualPrice = true;
    assert.match(productionFormula(led, out, nameOf), /当前为手动录入的综合单价，不再随材料价重算/);
});

test('预警阈值：数值与当日峰值百分比双条件，均为 0 关闭', () => {
    assert.deepEqual(normalizeThreshold(12), { qty: 12 });
    assert.deepEqual(normalizeThreshold({ qty: 12, pct: 30 }), { qty: 12, pct: 30 });
    assert.equal(normalizeThreshold({ qty: 0, pct: 0 }), null);
    assert.deepEqual(normalizeThreshold({ qty: -1, pct: 120 }), { pct: 100 });
    const day = new Date(2026, 10, 28, 12, 0, 0).getTime();
    const start = dayStartOf(day);
    const row = { batches: [
        { id: 'b1', at: start - 86400000, reason: '初始库存', qty: 100 },
        { id: 'b2', at: start + 1000, reason: '市场买入', qty: 20 }
    ] };
    const check = thresholdCheck(row, { qty: 40, pct: 30 }, 30, day);
    assert.equal(check.peak, 120);
    assert.equal(check.pct, 25);
    assert.equal(check.qtyShort, true);
    assert.equal(check.pctShort, true);
    assert.equal(check.short, true);
    const fine = thresholdCheck(row, { qty: 40, pct: 30 }, 110, day);
    assert.equal(fine.short, false);
    assert.equal(thresholdCheck(row, null, 0, day).short, false);
});

test('逐层补货计划：折叠配方递归展开，合并采购与生产并区分不可交易材料', () => {
    const data = { items: {
        100: { name: '成品A', sources: { actions: [{ id: 1 }] } },
        200: { name: '中间B', sources: { actions: [{ id: 2 }] } },
        300: { name: '材料C', trade: true, sources: { actions: [{ id: 3 }] } },
        400: { name: '材料D', trade: false, sources: { actions: [{ id: 4 }] } }
    }, actions: {
        1: { action: 6, rewards: [{ itemId: 100, min: 2, max: 2, chance: 100 }],
            requirements: [{ itemId: 200, quantity: 2 }, { itemId: 300, quantity: 1 }] },
        2: { action: 6, rewards: [{ itemId: 200, min: 3, max: 3, chance: 100 }],
            requirements: [{ itemId: 400, quantity: 4 }] },
        3: { action: 2 }, 4: { action: 2 }
    } };
    assert.deepEqual(stockRecipe(data, 100), { output: 2,
        requirements: [{ itemId: 200, quantity: 2 }, { itemId: 300, quantity: 1 }] });
    assert.equal(stockRecipe(data, 300), null);
    const held = id => ({ 100: 0, 200: 1, 300: 0, 400: 10 })[id];
    const plan = planStockReplenishment(data, [[100, 8]], held);
    assert.equal(plan.complete, true);
    assert.deepEqual(plan.production.slice().sort((a, b) => a[0] - b[0]), [[100, 8], [200, 9]]);
    assert.deepEqual(plan.purchases, [[300, 4]]);
    assert.deepEqual(plan.unavailable, [[400, 2]]);
    assert.equal(stockItemNames(data, plan.purchases), '材料C × 4');
    const combined = planStockReplenishment(data, [[100, 8], [200, 2]], held);
    assert.equal(combined.complete, true);
    assert.ok(combined.production.some(([id]) => id === 100));
    const loop = { ...data, actions: { ...data.actions,
        1: { action: 6, rewards: [{ itemId: 100, min: 2, max: 2, chance: 100 }],
            requirements: [{ itemId: 100, quantity: 1 }] } } };
    assert.equal(planStockReplenishment(loop, [[100, 2]], held).complete, false);
});

test('回包用料按背包堆叠 ID 反查真实物品，强化与堆叠 ID 不计入消耗', () => {
    const game = { inventory: [
        { id: 501, item: 200, quantity: 8, enhancement: 0 },
        { id: 502, item: 300, quantity: 2, enhancement: 1 },
        { id: 503, item: 400, quantity: 5, enhancement: 0 }
    ] };
    const content = { remove: [
        { id: 501, item: 100, quantity: 3 },   // row.item 是原配方物品，真实用料是 200
        { id: 502, item: 300, quantity: 2 },   // 强化堆叠跳过
        { id: 503, item: 400, quantity: 2 },
        { id: 503, item: 400, quantity: 3 },   // 同一堆叠合并为 5
        { id: 999, item: 600, quantity: 1 },   // 无匹配堆叠时 row.item 兜底
        { id: 700, quantity: 2 }               // 无堆叠又无 item：不能把堆叠 ID 当物品 ID
    ] };
    assert.deepEqual([...productionRemovedItems(content, game)], [[200, 3], [400, 5], [600, 1]]);
    assert.deepEqual([...productionRemovedItems(null, game)], []);
    assert.deepEqual([...productionRemovedItems({ remove: [] }, game)], []);
});

test('补货目标按本地双阈值取较高者，已达目标不生成计划', () => {
    const data = { items: { 100: { name: '成品A' } }, actions: {} };
    const held = () => 0;
    const check = { have: 0, peak: 100, qtyLimit: 10, pctLimit: 50 };
    const plan = stockReplenishment(data, 100, check, held);
    assert.equal(plan.target, 50);
    assert.equal(plan.deficit, 50);
    assert.equal(stockReplenishment(data, 100, { have: 0, peak: 100, qtyLimit: 10, pctLimit: 0 }, held).target, 10);
    assert.equal(stockReplenishment(data, 100, { have: 60, peak: 100, qtyLimit: 10, pctLimit: 50 }, held), null);
});

test('清空单价仅清单价数据，保留批次数量/来源/队列与预警', () => {
    const led = { items: { 100: {
        batches: [
            { id: 'b1', reason: '初始库存', qty: 10, unitPrice: 100, amount: 1000, at: 1 },
            { id: 'b2', reason: '生产成品', qty: 5, unitPrice: 250, amount: 1250, manualPrice: true,
              missing: [{ id: 200, name: '原料' }], source: { id: 200, from: 'b0', qty: 5, unitPrice: 200 }, ref: 'q1', at: 2 },
            { id: 'b3', reason: '市场买入', qty: 2, unitPrice: 300, amount: 600, ref: 't1', at: 3 }
        ],
        history: [{ id: 'b4', reason: '初始库存', qty: 4, unitPrice: 90, amount: 360, at: 0 }],
        quantity: 17
    } }, thresholds: { 100: { qty: 5, pct: 20 } } };
    assert.deepEqual(clearInventoryPrices(led, 100), ['b1', 'b2', 'b3', 'b4']);
    const row = led.items[100];
    assert.equal(row.quantity, 17);
    assert.deepEqual(led.thresholds[100], { qty: 5, pct: 20 });
    row.batches.concat(row.history).forEach(b => {
        assert.equal(b.unitPrice, null);
        assert.equal(b.amount, null);
        assert.equal(b.manualPrice, false);
        assert.equal(b.missing, undefined);
    });
    assert.deepEqual(row.batches.map(b => [b.qty, b.ref, b.reason]),
        [[10, undefined, '初始库存'], [5, 'q1', '生产成品'], [2, 't1', '市场买入']]);
    assert.equal(row.batches[1].source.id, 200);
    assert.equal(row.batches[1].source.qty, 5);
    assert.equal(row.batches[1].source.unitPrice, null);
    assert.equal(row.history[0].qty, 4);
    assert.deepEqual(clearInventoryPrices(led, 999), []);
    assert.deepEqual(clearInventoryPrices({ items: {} }, 100), []);
});
