const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recipeCost } = require('../src/enhancements.js');

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
