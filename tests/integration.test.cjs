const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Document } = require('./helpers/dom.cjs');

function setup() {
    const document = new Document(), intervals = [], sent = [], notifications = [], popups = [], calls = [];
    const data = { items: { 10: { id: 10, name: '绒毛' }, 20: { id: 20, name: '果实' }, 30: { id: 30, name: '成品' }, 40: { id: 40, name: '料理' }, 9610: { id: 9610, name: '分析数据' }, 1101: { id: 1101, name: '地元素水晶' } }, quests: {},
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
            if (project.cost) {
                // 模拟原生 createResearchCostItem 结构：icon(.item) + 名称/需要/持有三行文本
                const costItems = node('research-cost-items', row);
                [[project.cost.reportItem, project.cost.reports], [project.cost.elementItem, project.cost.elementQuantity]].forEach(([id, need]) => {
                    const container = node('action-item-container', costItems);
                    const iconHolder = node('action-item-container-icon', container);
                    const info = node('action-item-container-info', container);
                    const nameText = node('action-item-container-text', info);
                    const nameSpan = document.createElement('span'); nameSpan.textContent = data.items[id].name; nameText.appendChild(nameSpan);
                    const needText = node('action-item-container-text', info);
                    const needLabel = document.createElement('span'); needLabel.textContent = '需要'; needText.appendChild(needLabel);
                    const needValue = document.createElement('span'); needValue.textContent = String(need); needText.appendChild(needValue);
                    const heldText = node('action-item-container-text quantity-display', info);
                    const heldLabel = document.createElement('span'); heldLabel.textContent = '持有'; heldText.appendChild(heldLabel);
                    const heldValue = document.createElement('span'); heldValue.className = 'quantity-value'; heldValue.textContent = game.getItemQuantity(id).toLocaleString('zh-CN'); heldText.appendChild(heldValue);
                    const icon = node('item', iconHolder);
                    this.showItem(icon, data.items[id], { quantity: need });
                });
            }
            return row;
        },
        refreshResearchCostHoldings() {},
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
    const sandbox = { module: { exports: {} }, console, setInterval: fn => { intervals.push(fn); return 1; }, getComputedStyle: () => ({ borderTopWidth: '0px', paddingTop: '0px' }) };
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
test('待加入卡片按计划执行等级显示：进行中的研究占一级，入队后推进到下一级', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    // 研究中：项目 11 已完成 11 级，任务正在冲 12 级 → 待加入卡片应显示 Lv.12（下一跑）数据
    h.msg.handlers.research_info.call(h.msg, { content: { task: { projectId: 11, facilityId: 1, startTime: 0, finishTime: 0 }, levels: { 11: 11 } } });
    const view = { id: 11, name: '绒毛解析', level: 11, maxLevel: 30, locked: false, basePct: 1000, growthPct: 60, direction: 1, effect: 16, nextEffect: 16.6, cost: { reportItem: 9610, reports: 7693, elementItem: 1101, elementQuantity: 115 } };
    const row = h.ui.createResearchProjectRow(facility, view);
    h.document.body.appendChild(row);
    const passed = h.calls.find(c => c[0] === 'row')[3];
    assert.equal(passed.level, 12);                          // 任务占一级
    assert.equal(passed.effect, 16.6);                       // (1000+60×11)/100
    assert.equal(passed.nextEffect, 17.2);                   // (1000+60×12)/100
    const action = row.querySelector('.research-project-action');
    const addBtn = [...action.children].find(c => c.textContent === '加入研究队列');
    assert.ok(addBtn);
    // 入队成功后重渲染页面（卡片随计划等级推进），队列条目为 Lv.12 → Lv.13
    let rendered = 0; const origRender = h.ui.renderResearchPage;
    h.ui.renderResearchPage = function () { rendered++; return origRender.apply(this, arguments); };
    addBtn.fire('click');
    assert.ok(rendered >= 1, '入队后应重绘研究页');
    assert.match(h.ui.researchRoot.querySelector('.nek-research-queue').textContent, /绒毛解析 Lv\.12 → Lv\.13/);
    // 再次渲染行：队列占一级 → 计划等级 13
    h.calls.length = 0;
    h.ui.createResearchProjectRow(facility, Object.assign({}, view));
    assert.equal(h.calls[0][3].level, 13);
    assert.equal(h.calls[0][3].effect, 17.2);
    // 移出队列后计划等级回到 12
    const panel = h.ui.researchRoot.querySelector('.nek-research-queue');
    panel.querySelector('.nek-research-entry .btn').fire('click');
    h.calls.length = 0;
    h.ui.createResearchProjectRow(facility, Object.assign({}, view));
    assert.equal(h.calls[0][3].level, 12);
    // 无任务无队列：视图原样透传（不合成副本）
    h.msg.handlers.research_info.call(h.msg, { content: { task: null, levels: {} } });
    h.calls.length = 0;
    const plain = Object.assign({}, view, { level: 0, effect: 10, nextEffect: 10.6 });
    h.ui.createResearchProjectRow(facility, plain);
    assert.equal(h.calls[0][3], plain);
});
test('待加入卡片材料行显示扣除队列预留后的可用数量，不足标红', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    const view = { id: 11, name: '绒毛解析', level: 0, maxLevel: 30, locked: false, cost: { reportItem: 9610, reports: 500, elementItem: 1101, elementQuantity: 100 } };
    // 队列为空：显示原生「持有」
    let row = h.ui.createResearchProjectRow(facility, Object.assign({}, view));
    h.document.body.appendChild(row);
    let helds = row.querySelectorAll('.quantity-display');
    assert.equal(helds[0].querySelector('span').textContent, '持有');
    assert.equal(helds[0].querySelector('.quantity-value').textContent, '10,000');
    // 入队一条：卡片重绘后材料行变「可用」（扣除预留 500/100）
    row.querySelector('.nek-research-add').fire('click');
    row = h.ui.createResearchProjectRow(facility, Object.assign({}, view));
    h.document.body.appendChild(row);
    let displays = row.querySelectorAll('.quantity-display');
    assert.equal(displays[0].querySelector('span').textContent, '可用');
    assert.equal(displays[0].querySelector('.quantity-value').textContent, '9,500');
    assert.equal(displays[1].querySelector('.quantity-value').textContent, '9,900');
    assert.equal(displays[1].querySelector('.quantity-value').classList.contains('nek-research-avail-insufficient'), false);
    // 库存降到可用不足：数值标红；库存恢复后被 refreshResearchCostHoldings 重写，需重新应用并解除红色
    h.quantities['1101-0'] = 72;
    row = h.ui.createResearchProjectRow(facility, Object.assign({}, view));
    h.document.body.appendChild(row);
    displays = row.querySelectorAll('.quantity-display');
    assert.equal(displays[1].querySelector('span').textContent, '可用');
    assert.equal(displays[1].querySelector('.quantity-value').textContent, '-28');
    assert.ok(displays[1].querySelector('.quantity-value').classList.contains('nek-research-avail-insufficient'));
    // refreshResearchCostHoldings 原生会把数值重写回持有并去掉红色标记逻辑，包装层应重新应用「可用」
    h.ui.refreshResearchCostHoldings();
    displays = row.querySelectorAll('.quantity-display');
    assert.equal(displays[1].querySelector('span').textContent, '可用');
    assert.equal(displays[1].querySelector('.quantity-value').textContent, '-28');
    assert.ok(displays[1].querySelector('.quantity-value').classList.contains('nek-research-avail-insufficient'));
    // 移出队列后回到原生「持有」显示
    h.ui.researchRoot.querySelector('.nek-research-queue .nek-research-entry .btn').fire('click');
    row = h.ui.createResearchProjectRow(facility, Object.assign({}, view));
    h.document.body.appendChild(row);
    displays = row.querySelectorAll('.quantity-display');
    assert.equal(displays[1].querySelector('span').textContent, '持有');
    assert.equal(displays[1].querySelector('.quantity-value').textContent, '72');
});
test('材料不足仍可加入研究队列：仅提示不拦截，提示以 error 样式展示', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    // 分析数据只剩 100，低于队列预留合计（500）
    h.quantities['9610-0'] = 100;
    const view = { id: 11, name: '绒毛解析', level: 0, maxLevel: 30, locked: false, cost: { reportItem: 9610, reports: 500, elementItem: 1101, elementQuantity: 100 } };
    const row = h.ui.createResearchProjectRow(facility, Object.assign({}, view));
    h.document.body.appendChild(row);
    row.querySelector('.nek-research-add').fire('click');
    assert.equal(h.notifications.length, 1);
    assert.equal(h.notifications[0][1], 'error');                 // 警示样式
    assert.match(h.notifications[0][0], /材料不足/);
    assert.match(h.notifications[0][0], /已加入研究队列/);          // 未拦截
    assert.match(h.notifications[0][0], /等待材料补充/);
    assert.equal(h.feature.core.view().queue.entries.length, 1);  // 条目实际入队
    // 队首等待机制兜底：开研确认时材料不足保持等待
    h.feature.core.tick();
    assert.match(h.feature.core.view().researchStatus, /材料不足/);
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
