const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Document } = require('./helpers/dom.cjs');

function setup() {
    const document = new Document(), intervals = [], sent = [], notifications = [], popups = [], calls = [];
    const data = { items: { 10: { id: 10, name: '绒毛' }, 20: { id: 20, name: '果实' }, 30: { id: 30, name: '成品' }, 40: { id: 40, name: '料理' } }, quests: {},
        research: { facilities: [{ name: '梳毛研究所', reportItem: 9610, elementBase: 1101, projects: [{ id: 11, name: '绒毛解析', maxLevel: 30, basePct: 1000 }] }] } };
    const quantities = { '10-0': 12345, '20-0': 200, '30-3': 12, '40-0': 0, '9610-0': 10000, '1101-0': 10000 };
    const game = { character: { uid: 123, level: 1, quest_max: 0 }, quests: { main: [], work: [] }, queue: [],
        getItem: id => data.items[id], getItemQuantity: (id, enhancement = 0) => quantities[id + '-' + enhancement] || 0,
        getQuest: id => data.quests[id], getAction: id => data.actions?.[id], getLifeBonusActionType: skill => skill,
        getResearchFacilityIdForAction: action => action.action,
        getResearchEffectPct: () => 0, getOverLevelProductMultiplier: () => 1 };
    const node = (cls, parent = document.body, text) => {
        const el = document.createElement('div'); el.className = cls;
        if (text) el.textContent = text; parent?.appendChild(el); return el;
    };
    const ui = {
        researchInfo: { task: null, levels: {} }, researchOffset: 0,
        getActionLevelState: () => ({ successRate: 100 }), getCookingLevelState: () => ({ successRate: 100 }),
        getRewardBonusEffect: () => 0, getActionChestPreview: () => [],
        notifier: { show: (...args) => notifications.push(args) },
        getResearchCost: () => ({ reportItem: 9610, reports: 500, elementItem: 1101, elementQuantity: 100 }),
        createResearchProjectRow(facility, project) {
            calls.push(['row', this, facility, project]);
            const row = node('research-project', null);
            if (!project.running) node('research-start-btn', node('research-project-action', row), '开始研究');
            return row;
        },
        createItemElement(def, options) { calls.push(['item', this, def, options]); return node('item', null); },
        showItem(el, def, options) { calls.push(['showItem', this, def, options]); el.className = 'item'; },
        showQuestRewardModal(rewards) { popups.push(rewards); return 'modal-result'; },
        renderResearchPage() { this.researchTaskHost.replaceChildren(); }
    };
    const msg = { ws: { readyState: 1 }, send(type, data) { assert.equal(this, msg); sent.push({ type, data }); return true; }, handlers: {} };
    for (const type of ['research_info', 'research_started', 'research_finished']) {
        msg.handlers[type] = function (message) {
            calls.push([type, this, message]); Object.assign(ui.researchInfo, message.content); return 'response-result';
        };
    }
    msg.handlers.quest_reward_claimed = function (message) {
        calls.push(['reward', this, message]);
        game.quests.main.find(q => q.id === message.content.id).status = 1;
        ui.showQuestRewardModal(message.content.rewards); return 'reward-result';
    };
    msg.handlers.init_character_data = function (message) {
        game.inventory = message.content.inventory;
        calls.push(['snapshot-holdings', game.getItemQuantity(20)]);
        return 'snapshot-result';
    };
    msg.handlers.action_added = ({ content }) => {
        const { type, id, remaining, count, item } = content;
        game.queue.splice(content.mold === 'before' ? 1 : game.queue.length, 0, { type, id, remaining, count, item });
    };
    msg.handlers.update_queue = ({ content }) => { game.queue = content; };
    msg.handlers.action_update = () => {};
    msg.handlers.action_complete = () => 'completed';
    msg.handlers.action_canceled = () => {};
    ui.researchTaskHost = node('task-host'); ui.researchRoot = node('research-root');
    const setting = node('nek-assist-section'); node('setting-list', setting);
    const store = new Map(), listeners = {};
    const storage = { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
    let enabled = true, narrow = true;   // 默认手机端（吸顶折叠模式），setNarrow 可切换 PC 模式
    const sandbox = { module: { exports: {} }, console, setInterval: fn => { intervals.push(fn); return 1; } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/enhancements.js'), 'utf8'), sandbox);
    const feature = sandbox.module.exports.createNekEnhancements({ document, window: { addEventListener: (type, fn) => { listeners[type] = fn; }, matchMedia: q => ({ matches: narrow, media: q }) },
        storage, game: () => game, ui: () => ui, msg: () => msg, data: () => data,
        enabled: () => enabled, identifyAction: el => ({ action: el.actionType }), cookingChestDivisor: 21600 });
    feature.init(); feature.core.setting('questAccept', false); feature.core.setting('questReward', false);
    msg.handlers.research_info.call(msg, { content: { task: null, levels: {} } });
    sent.length = 0; calls.length = 0;
    function output(rootClass, id, options = {}) {
        let parent = document.body;
        if (rootClass === 'cooking-detail') parent = node('cooking-page');
        const root = node(rootClass, parent); root.actionType = options.actionType || 1;
        const section = node(options.native ? 'modal-box-item' : 'cooking-detail-section', root);
        node('modal-container-title', section, options.title || '获得');
        const row = node('action-item-container', section), iconHolder = node('action-item-container-icon', row);
        const info = node('action-item-container-info', row), name = node('action-item-container-text', info);
        const label = document.createElement('span'); label.textContent = data.items[id].name; name.appendChild(label);
        const icon = options.fallback ? node('item', iconHolder) : ui.createItemElement(data.items[id], { enhancement: options.enhancement || 0 });
        if (!options.fallback) iconHolder.appendChild(icon);
        return { root, row, name, icon, section };
    }
    return { feature, ui, msg, game, data, quantities, sent, notifications, popups, calls, document, node, output, intervals, listeners, enable: v => { enabled = v; }, setNarrow: v => { narrow = v; } };
}

test('研究开始按钮旁加入队列按钮，点击展示记录与材料预留，保持背包不变', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    const row = h.ui.createResearchProjectRow(facility, { id: 11, level: 0, maxLevel: 30, locked: false });
    h.document.body.appendChild(row);
    const action = row.querySelector('.research-project-action');
    assert.equal(action.children.length, 2); assert.equal(action.children[1].textContent, '加入研究队列');
    assert.ok(action.children[1].classList.contains('research-start-btn'));
    assert.equal(h.calls[0][1], h.ui);
    const before = { ...h.quantities }; action.children[1].fire('click');
    assert.deepEqual(h.quantities, before); assert.equal(h.sent.length, 0);
    const panel = h.ui.researchRoot.querySelector('.nek-research-queue');
    assert.ok(panel.classList.contains('neon-section'));
    assert.equal(panel.querySelectorAll('.setting-item .slider-container .toggle-switch .toggle-slider').length, 2);
    assert.match(panel.textContent, /绒毛解析 Lv\.0 → Lv\.1/); assert.match(panel.textContent, /预留 500 \/ 背包 10000/);
    assert.match(panel.textContent, /开研时才扣除/);
    panel.querySelector('.nek-research-entry .btn').fire('click');
    assert.equal(h.feature.core.view().queue.entries.length, 0);
});
test('研究队列面板嵌入列表滚动流并支持点击标题折叠吸顶', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    h.ui.createResearchProjectRow(facility, { id: 11, level: 0, maxLevel: 30, locked: false });
    // 手机端：面板插入在 researchRoot（项目列表滚动容器）开头，而非固定 taskHost
    const panel = h.ui.researchRoot.querySelector('.nek-research-queue');
    assert.ok(panel && h.ui.researchRoot.firstElementChild === panel);
    assert.ok(panel.classList.contains('nek-float'));
    assert.ok(panel.querySelector('.nek-research-head .section-title').textContent === '研究队列');
    // 点击标题手动折叠/展开（先复位到未贴顶基准态：创建时初始 _nekSync 在 mock 默认 rect 下会先折叠）
    panel._rectTop = 189; h.ui.researchRoot._rectTop = 183;
    panel._nekSync();
    assert.ok(!panel.classList.contains('nek-collapsed'), '未贴顶时应展开');
    const head = panel.querySelector('.nek-research-head');
    head.fire('click');
    assert.ok(panel.classList.contains('nek-collapsed'));
    assert.match(panel.querySelector('.nek-research-head-arrow').textContent, /▸/);
    assert.match(panel.querySelector('.nek-research-head-hint').textContent, /研究/);   // 折叠时标题条显示状态摘要
    head.fire('click');
    assert.ok(!panel.classList.contains('nek-collapsed'));
    assert.match(panel.querySelector('.nek-research-head-arrow').textContent, /▾/);
    assert.equal(panel.querySelector('.nek-research-head-hint').textContent, '');
    // 滚动自动折叠：面板顶部越过滚动容器顶（模拟 rect）→ 折叠；回到原位 → 展开
    h.ui.researchRoot._rectTop = 183; panel._rectTop = -10;
    panel._nekSync();
    assert.ok(panel.classList.contains('nek-collapsed'), '滚过容器顶自动折叠');
    panel._rectTop = 189;
    panel._nekSync();
    assert.ok(!panel.classList.contains('nek-collapsed'), '滚回原位自动展开');
});
test('PC 宽屏保留 v1.40 固定面板样式（无吸顶折叠结构）', () => {
    const h = setup(); h.setNarrow(false);
    const facility = h.data.research.facilities[0];
    h.ui.createResearchProjectRow(facility, { id: 11, level: 0, maxLevel: 30, locked: false });
    h.feature.decorate();   // 触发装饰创建面板
    const panel = h.ui.researchTaskHost.querySelector('.nek-research-queue');
    assert.ok(panel, '面板挂在固定 taskHost');
    assert.ok(!panel.classList.contains('nek-float'), '无吸顶样式');
    assert.equal(panel.querySelector('.nek-research-head'), null, '无折叠头');
    assert.equal(h.ui.researchRoot.querySelector('.nek-research-queue'), null, '列表滚动流内无面板');
    // 跨断点切换：恢复窄屏后旧面板清理并重建为吸顶结构
    h.setNarrow(true); h.feature.decorate();
    assert.equal(h.ui.researchTaskHost.querySelector('.nek-research-queue'), null);
    const moved = h.ui.researchRoot.querySelector('.nek-research-queue');
    assert.ok(moved && moved.classList.contains('nek-float'));
});
test('已有研究时原生不带开始区也可加入队列，锁定与满级项目不增加按钮', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    for (const project of [{ id: 11, level: 30, maxLevel: 30 }, { id: 11, level: 0, maxLevel: 30, locked: true }]) {
        const row = h.ui.createResearchProjectRow(facility, project); assert.equal(row.querySelector('.nek-research-add'), null);
    }
    const running = h.ui.createResearchProjectRow(facility, { id: 11, level: 0, maxLevel: 30, running: true });
    assert.ok(running.querySelector('.research-project-action .nek-research-add'));
    assert.equal(running.querySelectorAll('.research-project-action .btn').length, 1);
    assert.equal(h.document.querySelectorAll('[data-nek-option]').length, 7);
});
test('四类行动输出及额外奖励显示实时库存，强化按同等级，输入与其他行动不显示', () => {
    const h = setup();
    const comb = h.output('action-modal-content', 10, { native: true, actionType: 1 });
    const pick = h.output('nek-pick-detail', 20, { fallback: true });
    const prod = h.output('nek-prod-detail', 30, { enhancement: 3 });
    const cook = h.output('cooking-detail', 40, { title: '产出' });
    const extra = h.output('action-modal-content', 20, { native: true, actionType: 2, title: '额外奖励' });
    const input = h.output('nek-prod-detail', 20, { title: '消耗' });
    const unrelated = h.output('action-modal-content', 20, { native: true, actionType: 3 });
    h.feature.decorate();
    assert.equal(comb.name.querySelector('.nek-output-holding').textContent, '背包：12,345');
    assert.equal(pick.name.querySelector('.nek-output-holding').textContent, '背包：200');
    assert.equal(prod.name.querySelector('.nek-output-holding').textContent, '背包：12');
    assert.equal(cook.name.querySelector('.nek-output-holding').textContent, '背包：0');
    assert.ok(extra.name.querySelector('.nek-output-holding'));
    assert.equal(input.name.querySelector('.nek-output-holding'), null); assert.equal(unrelated.name.querySelector('.nek-output-holding'), null);
    h.quantities['10-0'] = 22222; h.feature.decorate();
    assert.equal(comb.name.querySelector('.nek-output-holding').textContent, '背包：22,222');
    h.feature.core.setting('holdings', false); h.feature.decorate();
    assert.equal(h.document.querySelectorAll('.nek-output-holding').length, 0);
    assert.equal(h.document.querySelectorAll('.nek-output-name').length, 0);
});
test('showItem 原生返回值不变且绑定真实 ID，静止装饰不产生 DOM 写循环', () => {
    const h = setup(), row = h.output('nek-prod-detail', 30, { fallback: true });
    assert.equal(h.ui.showItem(row.icon, h.data.items[30], { enhancement: 3 }), undefined);
    h.feature.decorate(); assert.equal(row.name.querySelector('.nek-output-holding').textContent, '背包：12');
    const facility = h.data.research.facilities[0]; h.document.body.appendChild(h.ui.createResearchProjectRow(facility, { id: 11, level: 0, maxLevel: 30 }));
    h.feature.decorate(); h.document.mutations = 0; h.feature.decorate();
    assert.equal(h.document.mutations, 0);
    assert.equal(h.intervals.length, 1); h.feature.init(); assert.equal(h.intervals.length, 1);
});
test('角色快照替换背包前清空数量缓存，产出和原生渲染都读取更新后的库存', () => {
    const h = setup(), row = h.output('nek-prod-detail', 20);
    h.game.inventory = [{ item: 20, quantity: 200 }];
    h.game.itemQuantityCache = new Map();
    h.game.getItemQuantity = id => {
        if (!h.game.itemQuantityCache.has(id)) {
            h.game.itemQuantityCache.set(id, h.game.inventory.find(item => item.item === id)?.quantity || 0);
        }
        return h.game.itemQuantityCache.get(id);
    };
    h.feature.decorate();
    assert.equal(row.name.querySelector('.nek-output-holding').textContent, '背包：200');
    assert.equal(h.msg.handlers.init_character_data({ content: { inventory: [{ item: 20, quantity: 5 }] } }), 'snapshot-result');
    assert.deepEqual(h.calls.at(-1), ['snapshot-holdings', 5]);
    h.feature.decorate();
    assert.equal(row.name.querySelector('.nek-output-holding').textContent, '背包：5');
});
test('注入前已经打开的产出面板应读取原生图标上的强化等级', () => {
    const h = setup(), row = h.output('nek-prod-detail', 30, { fallback: true });
    h.node('item-enhancement enhancement-1', row.icon, '+3');
    h.feature.decorate();
    assert.equal(row.name.querySelector('.nek-output-holding').textContent, '背包：12');
});
test('跨行动合计同一物品，使用待执行的实际倍数和服务端剩余次数', () => {
    const h = setup(), row = h.output('nek-prod-detail', 20);
    const drop = { itemId: 20, num: 2, chance: 100 };
    h.data.actions = { 50: { action: 6, rewards: [drop] }, 66: { action: 2, rewards: [drop] } };
    h.msg.handlers.update_queue({ content: [{ type: 'action', id: 66, token: 10, remaining: 5, count: 200 }] });
    h.msg.handlers.action_added({ content: { type: 'action', id: 50, remaining: 4, count: 80, multiplier: 3, mold: 'after' } });
    const read = () => { h.feature.decorate(); return row.name.querySelector('.nek-output-queue').textContent; };
    assert.equal(read(), '队列产出：34');
    assert.equal(h.msg.handlers.action_complete({ content: { type: 'action', id: 66, token: 10, remaining: 4 } }), 'completed');
    assert.equal(read(), '队列产出：32');
    h.msg.handlers.action_update({ content: { type: 'action', id: 66, token: 9, remaining: 900 } });
    assert.equal(read(), '队列产出：32');
    h.msg.handlers.action_canceled({});
    assert.equal(read(), '队列产出：24');
    h.msg.handlers.update_queue({ content: [{ type: 'action', id: 50, remaining: 3, multiplier: 2 }] });
    assert.equal(read(), '队列产出：12');
    h.msg.handlers.action_complete({ content: { type: 'action', id: 50, remaining: 2 } });
    assert.equal(read(), '队列产出：8');
    h.msg.handlers.update_queue({ content: [] });
    assert.equal(read(), '队列产出：0');
});
test('队列期望计入等级成功率、幸运、研究和熟练度，料理宝箱不乘批次', () => {
    const h = setup(), fruit = h.output('nek-pick-detail', 20), wool = h.output('nek-pick-detail', 10, { title: '额外奖励' });
    h.data.items[9816] = { id: 9816, name: '料理箱' };
    const chest = h.output('cooking-detail', 9816, { title: '额外奖励' });
    const dish = h.output('cooking-detail', 40, { title: '产出' });
    h.data.actions = { 5: { action: 2, rewards: [{ itemId: 20, min: 1, max: 3, chance: 50 }],
        extraRewards: [{ itemId: 10, num: 3, chance: 20, proficiency: 10 }] } };
    h.data.cookingRecipes = { 9: { time: 21600, rewards: [{ itemId: 40, num: 2, chance: 100 }] } };
    h.game.getResearchEffectPct = (facility, kind) => kind === 'product' ? 100 : 5;
    h.game.getOverLevelProductMultiplier = () => 2;
    h.game.lifeBonus = { 2: { luck: 50 }, 7: { luck: 50 } };
    h.ui.getRewardBonusEffect = () => 50;
    h.ui.getActionLevelState = h.ui.getCookingLevelState = () => ({ successRate: 50 });
    h.game.queue = [{ type: 'action', id: 5, remaining: 10 }, { type: 'cooking', id: 9, count: 100, remaining: 10, item: { multiplier: 3 } }];
    h.feature.decorate();
    const value = row => row.name.querySelector('.nek-output-queue').textContent;
    assert.equal(value(fruit), '队列产出：约 25');
    assert.equal(value(wool), '队列产出：0');
    assert.equal(value(chest), '队列产出：约 0.1');
    assert.equal(value(dish), '队列产出：约 60');
    h.game.proficiency = { action: { 5: 10 } }; h.feature.decorate();
    assert.equal(value(wool), '队列产出：约 15');
});
test('取消响应在队列刷新后到达时保留同种行动的新队首', () => {
    const h = setup(), row = h.output('nek-pick-detail', 20);
    h.data.actions = { 5: { action: 2, rewards: [{ itemId: 20, num: 2, chance: 100 }] } };
    h.game.queue = [{ type: 'action', id: 5, token: 1, remaining: 10 }];
    h.msg.send('queue', { type: 'cancel' });
    h.msg.handlers.update_queue({ content: [{ type: 'action', id: 5, token: 2, remaining: 3 }] });
    h.msg.handlers.action_canceled({});
    h.feature.decorate();
    assert.equal(row.name.querySelector('.nek-output-queue').textContent, '队列产出：6');
});
test('同物品的有限和不限次产出分别显示，强化产出独立统计', () => {
    const h = setup(), row = h.output('nek-prod-detail', 30, { enhancement: 3 });
    const base = h.output('nek-prod-detail', 30);
    h.data.actions = {
        5: { action: 6, rewards: [{ itemId: 30, enhancement: 3, num: 2, chance: 100 }] },
        6: { action: 2, rewards: [{ itemId: 30, num: 1, chance: 0 }] }
    };
    h.game.queue = [{ type: 'action', id: 5, remaining: 2 }, { type: 'action', id: 5, remaining: '-1' },
        { type: 'action', id: 6, remaining: -1 }];
    h.feature.decorate();
    assert.equal(row.name.querySelector('.nek-output-queue').textContent, '队列产出：4 + 不限次');
    assert.equal(base.name.querySelector('.nek-output-queue').textContent, '队列产出：0');
    h.feature.core.setting('holdings', false); h.feature.decorate();
    assert.equal(h.document.querySelector('.nek-output-queue'), null);
});
test('自动领奖只隐藏对应弹窗，原生消息 this、参数、返回值和手工弹窗保留', () => {
    const h = setup(); h.feature.core.setting('researchQueue', false); h.feature.core.setting('researchFinish', false);
    h.feature.core.setting('questReward', true);
    h.data.quests[1] = { id: 1, objectives: [{ type: 'action', count: 1 }] };
    h.game.quests.main.push({ id: 1, status: 0, progress: [1] });
    h.feature.core.tick(); assert.equal(h.sent[0].type, 'quest_reward');
    const response = { content: { type: 'main', id: 1, rewards: [{ item: 10, quantity: 1 }] } };
    assert.equal(h.msg.handlers.quest_reward_claimed.call(h.msg, response), 'reward-result');
    assert.equal(h.popups.length, 0); assert.equal(h.game.quests.main[0].status, 1);
    const call = h.calls.find(c => c[0] === 'reward'); assert.equal(call[1], h.msg); assert.equal(call[2], response);
    assert.match(h.notifications.at(-1)[0], /已领取任务奖励/);
    assert.equal(h.ui.showQuestRewardModal(['manual']), 'modal-result'); assert.equal(h.popups.length, 1);
    h.msg.send('quest_reward', { type: 'main', id: 1 });
    h.msg.handlers.quest_reward_claimed.call(h.msg, response); assert.equal(h.popups.length, 2);
});
test('总开关关闭清除队列面板和库存装饰，隐藏新增按钮', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    h.output('nek-prod-detail', 30); h.document.body.appendChild(h.ui.createResearchProjectRow(facility, { id: 11, level: 0, maxLevel: 30 }));
    h.feature.decorate(); h.enable(false); h.feature.decorate();
    assert.equal(h.document.querySelector('.nek-research-queue'), null);
    assert.equal(h.document.querySelector('.nek-output-holding'), null);
    assert.equal(h.document.querySelector('.nek-research-add').hidden, true);
});
