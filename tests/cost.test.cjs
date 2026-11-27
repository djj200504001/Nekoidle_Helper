const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recipeCost, substituteOptions, mergeWarehouseCost, claimCosts, stockTotalOf, directStockTotal, parseStockCost, round2, craftableProduct } = require('../src/enhancements.js');

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
