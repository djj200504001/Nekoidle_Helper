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
    msg.handlers.action_complete = ({ content }) => {
        for (const item of content.remove || []) quantities[item.item + '-' + (item.enhancement || 0)] -= item.quantity;
        return 'completed';
    };
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
    // v1.42.0 面板内不再放开关（设置页已有同款），只保留说明/状态/条目/汇总
    assert.equal(panel.querySelectorAll('.setting-item .slider-container .toggle-switch .toggle-slider').length, 0);
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
test('手机端队列可用按钮收起，并在未手动切换时随研究列表滚动折叠', () => {
    const h = setup(), host = h.ui.researchRoot;
    const panel = host.querySelector('.nek-research-queue');
    const control = panel.querySelector('.nek-research-collapse');
    const body = panel.querySelector('.nek-research-body');
    const hint = panel.querySelector('.nek-research-head-hint');
    assert.equal(host.firstElementChild, panel);
    assert.ok(panel.classList.contains('nek-float'));
    assert.equal(control.tagName, 'BUTTON');
    assert.ok(control.classList.contains('research-task-finish'));
    assert.equal(control.attributes['aria-controls'], body.id);
    host._rectTop = 183; panel._rectTop = 189;
    host.fire('scroll');
    assert.equal(control.textContent, '收起队列');
    assert.equal(control.ariaExpanded, 'true');
    panel._rectTop = 183;
    host.fire('scroll');
    assert.equal(body.hidden, true);
    assert.equal(control.ariaExpanded, 'false');
    panel._rectTop = 189;
    host.fire('scroll');
    assert.equal(body.hidden, false);

    control.fire('click');
    assert.equal(body.hidden, true);
    assert.equal(control.textContent, '展开队列');
    assert.equal(hint.textContent, '0 项');
    panel._rectTop = 183; host.fire('scroll');
    panel._rectTop = 189; host.fire('scroll');
    assert.equal(body.hidden, true, '滚动后保持手动收起');
    control.fire('click');
    assert.equal(body.hidden, false);
});
test('桌面队列可折叠，原生重绘及切换屏幕宽度保留手动状态', () => {
    const h = setup(), root = h.ui.researchRoot, taskHost = h.ui.researchTaskHost;
    h.setNarrow(false); h.feature.decorate();
    const panel = taskHost.querySelector('.nek-research-queue');
    assert.ok(panel && !panel.classList.contains('nek-float'));
    assert.equal(root.querySelector('.nek-research-queue'), null);
    assert.equal(root.listeners.scroll.length, 0);
    panel.querySelector('.nek-research-collapse').fire('click');
    assert.equal(panel.querySelector('.nek-research-body').hidden, true);

    h.ui.renderResearchPage();
    h.feature.decorate();
    const replacement = taskHost.querySelector('.nek-research-queue');
    assert.notEqual(replacement, panel);
    assert.equal(replacement.querySelector('.nek-research-body').hidden, true);
    h.setNarrow(true); h.feature.decorate();
    assert.equal(taskHost.querySelector('.nek-research-queue'), null);
    const moved = root.querySelector('.nek-research-queue');
    assert.ok(moved.classList.contains('nek-float'));
    assert.equal(moved.querySelector('.nek-research-body').hidden, true);
    h.feature.decorate();
    assert.equal(root.listeners.scroll.length, 1);
    h.enable(false); h.feature.decorate();
    assert.equal(root.listeners.scroll.length, 0);
});
test('按队列顺序标红缺料条目并说明缺多少，补足材料或移除前项后恢复', () => {
    const h = setup();
    assert.equal(h.feature.core.enqueue(11).ok, true);
    assert.equal(h.feature.core.enqueue(11).ok, true);
    h.quantities['9610-0'] = 700;
    h.feature.decorate();
    const panel = h.ui.researchRoot.querySelector('.nek-research-queue');
    const labels = () => panel.querySelectorAll('.nek-research-entry span');
    const hint = panel.querySelector('.nek-research-head-hint');
    const isRed = el => el.classList.contains('nek-research-insufficient');
    assert.equal(isRed(labels()[0]), false);
    assert.equal(isRed(labels()[1]), true);
    assert.match(labels()[1].textContent, /材料不足：分析数据 缺 300/);
    assert.equal(hint.textContent, '2 项 · 1 项受阻');
    assert.equal(isRed(hint), true);
    h.quantities['9610-0'] = 1000;
    h.feature.decorate();
    assert.equal(isRed(labels()[1]), false);
    assert.equal(hint.textContent, '2 项');
    h.quantities['9610-0'] = 700;
    h.feature.decorate();
    panel.querySelector('.nek-research-entry .btn').fire('click');
    assert.equal(labels().length, 1);
    assert.equal(isRed(labels()[0]), false);
});
test('被改为锁定的研究条目标红，解除锁定后恢复', () => {
    const h = setup(), project = h.data.research.facilities[0].projects[0];
    assert.equal(h.feature.core.enqueue(11).ok, true);
    const label = () => h.ui.researchRoot.querySelector('.nek-research-entry span');
    project.basePct = 0;
    h.feature.decorate();
    assert.ok(label().classList.contains('nek-research-insufficient'));
    assert.match(label().textContent, /研究项目暂未开放/);
    project.basePct = 1000;
    h.feature.decorate();
    assert.ok(!label().classList.contains('nek-research-insufficient'));
});
test('开研确认期间暂停缺料判断，到账并确认后按剩余队列判断', () => {
    const h = setup();
    assert.equal(h.feature.core.enqueue(11).ok, true);
    assert.equal(h.feature.core.enqueue(11).ok, true);
    h.intervals[0]();
    assert.ok(h.sent.some(message => message.type === 'research_start'));
    h.quantities['9610-0'] = 500;
    h.feature.decorate();
    const panel = h.ui.researchRoot.querySelector('.nek-research-queue');
    assert.match(panel.textContent, /开研确认中/);
    assert.equal(panel.querySelectorAll('.nek-research-entry .nek-research-insufficient').length, 0);
    h.msg.handlers.research_started({ content: { task: { projectId: 11 }, levels: {} } });
    h.feature.decorate();
    assert.equal(panel.querySelectorAll('.nek-research-entry').length, 1);
    assert.equal(panel.querySelectorAll('.nek-research-entry .nek-research-insufficient').length, 0);
});
test('已有研究时原生不带开始区也可加入队列，锁定与满级项目不增加按钮', () => {
    const h = setup(), facility = h.data.research.facilities[0];
    for (const project of [{ id: 11, level: 30, maxLevel: 30 }, { id: 11, level: 0, maxLevel: 30, locked: true }]) {
        const row = h.ui.createResearchProjectRow(facility, project); assert.equal(row.querySelector('.nek-research-add'), null);
    }
    const running = h.ui.createResearchProjectRow(facility, { id: 11, level: 0, maxLevel: 30, running: true });
    assert.ok(running.querySelector('.research-project-action .nek-research-add'));
    assert.equal(running.querySelectorAll('.research-project-action .btn').length, 1);
    // v1.42.0 面板开关剔除后，仅设置页保留 5 个开关（研究队列 2 + 任务 2 + 产出 1）
    assert.equal(h.document.querySelectorAll('[data-nek-option]').length, 5);
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
test('生产可用量按队首剩余次数和待执行批次扣算，结算不会重复扣料', () => {
    const h = setup();
    h.quantities['20-0'] = 100;
    h.game.getLifeBonusActionType = skill => skill === 6 ? 7 : skill;
    h.game.getLifeMasterRate = type => type === 7 ? 0.25 : 0;
    h.data.actions = { 61: { action: 6, requirements: [{ itemId: 20, quantity: 4 }] } };
    const production = h.output('nek-prod-detail', 20, { title: '消耗', fallback: true });
    const unrelated = h.output('nek-pick-detail', 20, { title: '消耗' });
    const active = { type: 'action', id: 61, count: 20, remaining: 3, item: { multiplier: 2 } };
    h.msg.handlers.update_queue({ content: [active] });
    h.msg.handlers.action_added({ content: { type: 'action', id: 61, count: 2, multiplier: 3, mold: 'after' } });
    const value = () => production.row.querySelector('.nek-material-available')?.textContent;
    h.feature.decorate();
    assert.equal(value(), '剩余可用：64'); // 100 − (3 × 2 + 2 × 3) × 4 × 0.75
    assert.equal(unrelated.row.querySelector('.nek-material-available'), null);
    assert.equal(production.row.querySelector('.nek-output-holding'), null);
    h.msg.handlers.action_complete({ content: { ...active, remaining: 2, remove: [{ item: 20, quantity: 6 }] } });
    h.feature.decorate();
    assert.equal(value(), '剩余可用：64');
    h.msg.handlers.update_queue({ content: [{ ...active, remaining: 2 }] });
    h.feature.decorate();
    assert.equal(value(), '剩余可用：82');
    h.msg.send('queue', { type: 'cancel' });
    h.msg.handlers.action_canceled({});
    h.feature.decorate();
    assert.equal(value(), '剩余可用：94');
    h.feature.core.setting('holdings', false);
    h.feature.decorate();
    assert.equal(value(), undefined);
});
test('原生生产弹窗只在消耗列表显示可用量，计入烹饪替代和炼金同物品消耗', () => {
    const h = setup(), native = h.output('action-modal-content', 20, { native: true, actionType: 6, title: '基本信息' });
    const consume = h.node('action-item-container-list', native.section);
    native.section.insertBefore(h.node('modal-container-title', null, '消耗'), consume);
    const input = h.output('nek-prod-detail', 20, { title: '消耗' });
    const popupInput = h.output('action-modal-content', 20, { native: true, actionType: 6, title: '消耗' });
    consume.appendChild(popupInput.row);
    popupInput.root.remove();
    const plain = () => input.row.querySelector('.nek-material-available');
    const nativeLabel = () => consume.querySelector('.nek-material-available');
    h.quantities['20-0'] = 20;
    Object.assign(h.data.items[10], { substitute_group: 'fruit', substitute_value: 4 });
    Object.assign(h.data.items[20], { substitute_group: 'fruit', substitute_value: 3 });
    h.game.getLifeMasterRate = type => type === 9 ? 0.25 : 0;
    h.data.food = { fruit: 0.25 };
    h.data.cookingRecipes = { 81: { ingredients: [{ itemId: 10, quantity: 2 }] } };
    h.data.alchemyQuantum = { 30: [{ secondary: 20, quantity: 2 }] };
    h.game.queue = [
        { type: 'cooking', id: 81, remaining: 2, item: { multiplier: 2, choices: { 0: 20 } } },
        { type: 'alchemy', id: 9, remaining: 3, item: { primaryItem: 30, enhancement: 3, secondaryItem: 20 } },
        { type: 'alchemy', id: 2, remaining: 100, item: { primaryItem: 20, enhancement: 1 } }
    ];
    h.feature.decorate();
    assert.equal(nativeLabel().textContent, '剩余可用：4'); // 20 − 2 × 5 − 3 × 2
    assert.equal(plain().textContent, nativeLabel().textContent);
    assert.equal(native.row.querySelector('.nek-material-available'), null);
    h.game.queue[0].remaining = -1;
    h.feature.decorate();
    assert.equal(nativeLabel().textContent, '剩余可用：0');
    assert.match(nativeLabel().title, /不限次/);
    h.game.queue[0].remaining = 5;
    h.feature.decorate();
    assert.equal(nativeLabel().textContent, '剩余可用：0');
    h.document.mutations = 0;
    h.feature.decorate();
    assert.equal(h.document.mutations, 0);
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
test('同一物品在产物和生产消耗栏共用队列产出，并随队列更新', () => {
    const h = setup();
    h.data.items[20].name = '毛线团';
    const product = h.output('nek-prod-detail', 20);
    const material = h.output('nek-prod-detail', 20, { title: '消耗', fallback: true });
    const modalMaterial = h.output('action-modal-content', 20, { title: '消耗', native: true, actionType: 6 });
    const cookingMaterial = h.output('cooking-detail', 20, { title: '消耗' });
    h.data.actions = {
        5: { action: 6, rewards: [{ itemId: 20, num: 2, chance: 50 }] },
        6: { action: 6, requirements: [{ itemId: 20, quantity: 3 }] }
    };
    h.msg.handlers.update_queue({ content: [
        { type: 'action', id: 5, remaining: 3, item: { multiplier: 2 } },
        { type: 'action', id: 6, remaining: 1 },
        { type: 'action', id: 5, remaining: -1 }
    ] });
    const label = view => view.row.querySelector('.nek-output-queue')?.textContent;
    h.feature.decorate();
    assert.equal(label(product), '队列产出：约 6 + 不限次');
    assert.equal(label(material), label(product));
    assert.equal(label(modalMaterial), label(product));
    assert.equal(label(cookingMaterial), undefined);
    assert.equal(material.row.querySelector('.nek-material-available').textContent, '剩余可用：197');

    product.root.remove();
    h.msg.handlers.update_queue({ content: [{ type: 'action', id: 6, remaining: 2 }] });
    h.feature.decorate();
    assert.equal(label(material), '队列产出：0');
    assert.equal(label(modalMaterial), label(material));
    assert.equal(material.row.querySelectorAll('.nek-output-queue').length, 1);
    h.feature.core.setting('holdings', false);
    h.feature.decorate();
    assert.equal(label(material), undefined);
    assert.equal(label(modalMaterial), undefined);
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
