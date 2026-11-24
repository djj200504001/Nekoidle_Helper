const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createNekController } = require('../src/enhancements.js');

function memory() {
    const map = new Map();
    return { map, getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}
function harness(options = {}) {
    let clock = Date.UTC(2026, 10, 23, 0), enabled = true, successful = true;
    const storage = options.storage || memory();
    const sent = [], quantities = { 9610: 1000000, 1101: 1000000, 1102: 1000000 };
    const templates = [
        { id: 1, type: 1, objectives: [{ type: 'action', count: 1 }] },
        { id: 2, type: 2, prerequisite_quest: 1, objectives: [{ type: 'level', count: 10 }] }
    ];
    // 公开客户端 2026-11-23 的前十级研究曲线，包含元素升阶边界。
    const reports = [500, 1072, 1674, 2297, 2937, 3589, 4252, 4925, 5606, 6295];
    const elements = [100, 170, 260, 380, 520, 690, 890, 1120, 40, 60];
    const facility = { name: '梳毛研究所', reportItem: 9610, elementBase: 1101 };
    const projects = {
        11: { facility, project: { id: 11, name: '绒毛解析' }, maxLevel: 10, locked: false },
        12: { facility, project: { id: 12, name: '梳理工序' }, maxLevel: 10, locked: false },
        14: { facility, project: { id: 14, name: '未开放' }, maxLevel: 10, locked: true }
    };
    const c = { uid: 7, character: { level: 1, quest: 0, quest_max: 0 }, quests: { main: [], work: [] },
        connection: {}, connected: true, levels: {}, task: null, researchReady: true, researchNow: clock };
    const env = {
        instance: options.instance || 'tab-a', storage, now: () => clock, context: () => c,
        quantity: id => quantities[id] || 0, itemName: id => '#' + id, enabled: () => enabled,
        project: id => projects[id], quest: id => templates.find(t => t.id === Number(id)), questTemplates: () => templates,
        cost: (f, level) => level < reports.length ? { reports: reports[level], reportItem: f.reportItem,
            elementItem: f.elementBase + (level >= 8 ? 1 : 0), elementQuantity: elements[level], duration: 120 } : null,
        send(type, data) { sent.push({ type, data }); return successful; }
    };
    const core = createNekController(env);
    function advance(ms) { clock += ms; c.researchNow += ms; }
    function response(type, content) {
        // 原生消息处理器先更新角色/背包，增强处理器随后接收响应。
        if (/^research_(info|started|finished)$/.test(type)) {
            if ('task' in content) c.task = content.task;
            if (content.levels) c.levels = { ...content.levels };
            for (const item of content.settled || []) c.levels[item.projectId] = item.level;
            for (const item of content.remove || []) quantities[item.item] -= item.quantity;
        }
        if (type === 'quest_reward_claimed') {
            if (content.type === 'work') c.quests.work = c.quests.work.filter(q => q.id !== content.id);
            else c.quests.main.find(q => q.id === content.id).status = 1;
        }
        if (type === 'new_quests') {
            for (const type of ['main', 'work']) c.quests[type].push(...(content.quests?.[type] || []));
            if (content.quest_count !== undefined) c.character.quest = content.quest_count;
        }
        core.message(type, content);
    }
    function sync() { core.tick(); response('research_info', { task: c.task, levels: c.levels }); sent.length = 0; }
    function onlyResearch() { core.setting('questAccept', false); core.setting('questReward', false); }
    function onlyQuests() { core.setting('researchQueue', false); core.setting('researchFinish', false); }
    return { core, c, env, storage, sent, quantities, templates, projects, response, advance, sync, onlyResearch, onlyQuests,
        enable: v => { enabled = v; }, success: v => { successful = v; } };
}

test('入队只保存成本与预留，不发请求、不扣背包', () => {
    const h = harness(), before = { ...h.quantities };
    assert.equal(h.core.enqueue(11).ok, true);
    assert.deepEqual(h.sent, []); assert.deepEqual(h.quantities, before);
    const view = h.core.view();
    assert.deepEqual(view.queue.totals, { 9610: 500, 1101: 100 });
    assert.equal(view.queue.entries[0].entry.record.targetLevel, 1);
});
test('切换账号后第一次读取计划等级使用新账号的队列', () => {
    const h = harness();
    assert.equal(h.core.enqueue(11).ok, true);
    h.c.uid = 8;
    assert.equal(h.core.plannedLevel(11), 0);
    h.c.uid = 7;
    assert.equal(h.core.plannedLevel(11), 1);
});
test('共享材料预留不足时仍可入队，仅返回警告', () => {
    const h = harness(); h.quantities[9610] = 999;
    assert.equal(h.core.enqueue(11).ok, true);
    const second = h.core.enqueue(12);
    assert.equal(second.ok, true); assert.equal(second.warn, true);
    assert.match(second.message, /材料不足/);
    assert.equal(h.core.view().queue.entries.length, 2);
    assert.equal(h.quantities[9610], 999);   // 入队不扣材料
});
test('重复项目按将来的等级累加成本', () => {
    const h = harness(); h.core.enqueue(11); h.core.enqueue(11); h.core.enqueue(12);
    assert.deepEqual(h.core.view().queue.entries.map(e => e.targetLevel), [1, 2, 1]);
    assert.deepEqual(h.core.view().queue.totals, { 9610: 2072, 1101: 370 });
});
test('当前研究已扣材料，后续入队从下一等级计费', () => {
    const h = harness(); h.c.levels[11] = 7; h.c.task = { projectId: 11, finishTime: 9999999999 };
    h.core.enqueue(11);
    assert.deepEqual(h.core.view().queue.totals, { 9610: 5606, 1102: 40 });
    assert.equal(h.core.view().queue.entries[0].targetLevel, 9);
});
test('移出释放预留，后续相同项目按新顺序重算', () => {
    const h = harness(); h.core.enqueue(11); h.core.enqueue(11);
    assert.equal(h.core.remove(h.core.view().queue.entries[0].entry.key), true);
    assert.deepEqual(h.core.view().queue.totals, { 9610: 500, 1101: 100 });
    assert.equal(h.core.view().queue.entries[0].entry.record.targetLevel, 1);
});
test('无效、锁定、满级与队列累计满级均拒绝', () => {
    const h = harness();
    for (const id of [0, 99, 14]) assert.equal(h.core.enqueue(id).ok, false);
    h.c.levels[11] = 10; assert.equal(h.core.enqueue(11).ok, false);
    h.c.levels[11] = 9; assert.equal(h.core.enqueue(11).ok, true);
    assert.equal(h.core.enqueue(11).ok, false);
});
test('成本不可用或背包数量无效时不入队', () => {
    const h = harness(); h.env.cost = () => null;
    assert.equal(h.core.enqueue(11).ok, false);
    const other = harness(); other.env.quantity = () => NaN;
    assert.equal(other.core.enqueue(11).ok, false);
});
test('研究进行中新增队列按下一等级计费（开始 Lv.1 后加入 Lv.2、Lv.3）', () => {
    // 场景：完成等级 0、正在研究 0→1（task 存在）。加入的两条应分别是
    // Lv.1→2（cost curve[1]=1072/170）与 Lv.2→3（curve[2]=1674/260），而非都按 Lv.1 计费。
    const h = harness();
    h.c.levels[11] = 0; h.c.task = { projectId: 11, finishTime: 9999999999 };
    h.core.enqueue(11); h.core.enqueue(11);
    const view = h.core.view();
    assert.deepEqual(view.queue.entries.map(e => [e.level, e.targetLevel]), [[1, 2], [2, 3]]);
    assert.deepEqual(view.queue.totals, { 9610: 1072 + 1674, 1101: 170 + 260 });
    const last = view.queue.entries[1];
    assert.equal(last.cost.reports, 1674); assert.equal(last.cost.elementQuantity, 260);
});
test('出错条目同样推进计划等级，后续条目不重复计费', () => {
    // 两条已入队后项目 cost 对 level 0 不可用：第一条 error，第二条应推进到 level 1
    // 正常计费（修复前 error 不递增，第二条会重复用 level 0 而同样报错）。
    const h = harness(); h.c.levels[11] = 0;
    h.core.enqueue(11); h.core.enqueue(11);
    h.env.cost = (f, level) => level === 0 ? null : { reports: [500, 1072][level], reportItem: f.reportItem, elementItem: f.elementBase, elementQuantity: [100, 170][level], duration: 120 };
    const view = h.core.view();
    assert.ok(view.queue.entries[0].error);
    assert.equal(view.queue.entries[1].level, 1); assert.equal(view.queue.entries[1].targetLevel, 2);
    assert.ok(!view.queue.entries[1].error);
    assert.deepEqual(view.queue.entries[1].materials, { 9610: 1072, 1101: 170 });
});
test('FIFO 开始请求只发一次，确认后移出，扣材料由原生响应负责', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.core.enqueue(12); h.sync();
    h.core.tick(); h.core.tick();
    assert.deepEqual(h.sent.map(r => r.type), ['research_start']);
    assert.equal(h.sent[0].data.projectId, 11); assert.equal(h.core.view().queue.entries.length, 2);
    assert.equal(h.quantities[9610], 1000000);
    assert.equal(h.core.remove(h.core.view().queue.entries[0].entry.key), false);
    assert.equal(h.core.enqueue(12).ok, false);
    h.response('research_started', { task: { projectId: 11, finishTime: 9999999999 }, remove: [{ item: 9610, quantity: 500 }] });
    assert.equal(h.core.view().queue.entries.length, 1); assert.equal(h.quantities[9610], 999500);
    h.core.tick(); assert.equal(h.sent.length, 1);
});
test('到期先结算，确认完成后才启动队首', () => {
    const h = harness(); h.onlyResearch(); h.c.task = { projectId: 11, finishTime: h.c.researchNow / 1000 + 2 };
    h.core.enqueue(12); h.sync(); h.core.tick(); assert.equal(h.sent.length, 0);
    h.advance(2000); h.core.tick(); h.core.tick(); assert.deepEqual(h.sent.map(r => r.type), ['research_finish']);
    h.response('research_finished', { task: null, settled: [{ projectId: 11, level: 1 }] });
    h.core.tick(); assert.deepEqual(h.sent.map(r => r.type), ['research_finish', 'research_start']);
});
test('研究到期依据服务端相对时间', () => {
    const h = harness(); h.onlyResearch(); h.c.task = { projectId: 11, finishTime: h.c.researchNow / 1000 };
    h.c.researchNow -= 60000; h.sync(); h.core.tick(); assert.equal(h.sent.length, 0);
    h.advance(60000); h.core.tick(); assert.equal(h.sent[0].type, 'research_finish');
});
test('执行时材料不足保持队首，补充后恢复', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.core.enqueue(12); h.quantities[1101] = 99; h.sync();
    h.core.tick(); assert.equal(h.sent.length, 0); assert.match(h.core.view().researchStatus, /材料不足/);
    h.quantities[1101] = 100; h.core.tick(); assert.equal(h.sent[0].data.projectId, 11);
});
test('开研发出前的旧查询响应不会释放在途队首', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync(); h.core.tick();
    h.response('research_info', { task: null, levels: {} }); h.core.tick();
    assert.equal(h.core.view().queue.entries[0].entry.submitted.targetLevel, 1);
    assert.deepEqual(h.sent.map(r => r.type), ['research_start']);
});
test('开研响应超时先查状态，确认已开始后不重复执行', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync(); h.core.tick();
    h.advance(16000); h.core.tick(); assert.equal(h.sent.at(-1).type, 'research_info');
    h.response('research_info', { task: { projectId: 11, finishTime: 9999999999 }, levels: {} });
    h.core.tick(); assert.equal(h.core.view().queue.entries.length, 0);
    assert.equal(h.sent.filter(r => r.type === 'research_start').length, 1);
});
test('刷新后核对 persisted submitted，不能把同项目较低级研究误认为已开研', () => {
    const h = harness(); h.onlyResearch(); h.c.levels[11] = 1; h.core.enqueue(11); h.sync(); h.core.tick();
    h.core.release();
    const second = harness({ storage: h.storage, instance: 'tab-b' }); second.onlyResearch();
    second.c.task = { projectId: 11, finishTime: 9999999999 }; second.sync();
    assert.equal(second.core.view().queue.entries.length, 1);
    assert.ok(second.core.view().queue.entries[0].entry.submitted);
    second.advance(16000); second.core.tick();
    second.response('research_info', { task: null, levels: { 11: 2 } });
    assert.equal(second.core.view().queue.entries.length, 0);
});
test('核对失败保留队首，等待退避后再试', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync(); h.core.tick();
    h.advance(16000); h.core.tick(); h.response('research_info', { task: null }); h.core.tick();
    assert.equal(h.core.view().queue.entries.length, 1);
    assert.equal(h.sent.filter(r => r.type === 'research_start').length, 1);
    h.advance(60000); h.core.tick(); assert.equal(h.sent.filter(r => r.type === 'research_start').length, 2);
});
test('服务器研究错误核对后遵守退避', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync(); h.core.tick();
    h.response('research_error', { error: 'research_report_lack' });
    h.advance(16000); h.response('research_info', { task: null }); h.core.tick();
    assert.equal(h.sent.filter(r => r.type === 'research_start').length, 1);
    h.advance(60000); h.core.tick(); assert.equal(h.sent.filter(r => r.type === 'research_start').length, 2);
});
test('发送失败撤销 submitted，但保留队列并退避', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync(); h.success(false); h.core.tick(); h.core.tick();
    assert.equal(h.core.view().queue.entries.length, 1); assert.equal(h.core.view().queue.entries[0].entry.submitted, undefined);
    assert.equal(h.sent.length, 1);
});
test('断线、总开关及单项开关停用时不发自动操作', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.c.connected = false; h.core.tick();
    h.c.connected = true; h.enable(false); h.core.tick(); assert.equal(h.sent.length, 0);
    h.enable(true); h.core.setting('researchQueue', false); h.core.setting('researchFinish', false); h.core.tick();
    assert.equal(h.sent.length, 0); assert.equal(h.core.view().queue.entries.length, 1);
});
test('人工研究请求在回应前阻止自动开研', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync();
    h.core.observeSend('research_start', { projectId: 12 }, true); h.core.tick(); assert.equal(h.sent.length, 0);
    h.response('research_started', { task: { projectId: 12, finishTime: 9999999999 } }); h.core.tick();
    assert.equal(h.core.view().queue.entries.length, 1); assert.equal(h.sent.length, 0);
});
test('账户隔离且切回恢复队列', () => {
    const h = harness(); h.core.enqueue(11); h.c.uid = 8;
    assert.equal(h.core.view().queue.entries.length, 0); h.core.enqueue(12); h.c.uid = 7;
    assert.equal(h.core.view().queue.entries[0].entry.projectId, 11);
});
test('多标签页只有租约持有者自动执行，接管者先查研究和任务快照', () => {
    const a = harness(), b = harness({ storage: a.storage, instance: 'tab-b' });
    a.core.enqueue(11); a.sync(); b.core.tick(); assert.equal(b.sent.length, 0);
    a.core.tick(); assert.equal(a.sent.at(-1).type, 'research_start');
    a.core.release(); b.core.tick();
    assert.deepEqual(b.sent.map(r => r.type), ['init_character_data']);
    assert.equal(b.sent.some(r => r.type === 'research_start'), false);
});
test('超时查到开研后，刷新扣款快照之前不继续自动操作', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.core.enqueue(12); h.sync(); h.core.tick();
    h.advance(16000); h.core.tick(); h.response('research_info', { task: null, levels: { 11: 1 } });
    h.core.tick(); assert.equal(h.sent.at(-1).type, 'init_character_data');
    assert.equal(h.sent.filter(r => r.type === 'research_start').length, 1);
    h.quantities[9610] = 0; h.response('init_character_data', {}); h.core.tick();
    h.response('research_info', { task: null, levels: { 11: 1 } }); h.core.tick();
    assert.equal(h.sent.filter(r => r.type === 'research_start').length, 1);
    assert.match(h.core.view().researchStatus, /材料不足/);
});
test('本地存储读写失败均不发送开研', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync();
    h.storage.setItem = () => { throw Error('quota'); }; h.core.tick(); assert.equal(h.sent.length, 0);
    assert.equal(h.core.enqueue(12).ok, false);
    const other = harness(); other.storage.getItem = () => { throw Error('blocked'); }; other.core.tick();
    assert.equal(other.sent.length, 0); assert.equal(other.core.enqueue(11).ok, false);
});
test('任务任意一项目标完成即可领取；已领取不重复；等级读取角色', () => {
    const h = harness(), template = { objectives: [{ type: 'action', count: 10 }, { type: 'level', count: 5 }] };
    assert.equal(h.core.claimable({ status: 0, progress: [10, 0] }, template, h.c), true);
    assert.equal(h.core.claimable({ status: 1, progress: [10, 0] }, template, h.c), false);
    h.c.character.level = 5;
    assert.equal(h.core.claimable({ status: 0, progress: [0, 0] }, template, h.c), true);
    assert.equal(h.core.claimable({ status: 0 }, { objectives: [] }, h.c), false);
});
test('先串行领取主线与劳务奖励，再接受后续任务', () => {
    const h = harness(); h.onlyQuests(); h.c.quests.main = [{ id: 1, status: 0, progress: [1] }];
    h.c.quests.work = [{ id: 40, status: 0, objectives: [{ type: 'action', count: 2 }], progress: [2] }];
    h.core.tick(); h.core.tick(); assert.deepEqual(h.sent, [{ type: 'quest_reward', data: { type: 'main', id: 1 } }]);
    assert.equal(h.core.isAutomaticReward({ type: 'main', id: 1 }), true);
    assert.equal(h.core.isAutomaticReward({ type: 'work', id: 1 }), false);
    h.response('quest_reward_claimed', { type: 'main', id: 1 }); h.core.tick(); assert.equal(h.sent.length, 1);
    h.advance(2000); h.core.tick(); assert.equal(h.sent[1].data.id, 40);
    h.response('quest_reward_claimed', { type: 'work', id: 40 }); h.advance(2000); h.core.tick();
    assert.deepEqual(h.sent[2], { type: 'quest_accept', data: { type: 'main' } });
});
test('主支线仅满足前置已领奖才能接取', () => {
    const h = harness(); h.onlyQuests(); h.c.quests.main = [{ id: 1, status: 0, progress: [0] }];
    h.core.tick(); assert.equal(h.sent.length, 0);
    h.c.quests.main[0].status = 1; h.core.tick(); assert.deepEqual(h.sent[0], { type: 'quest_accept', data: { type: 'main' } });
    h.response('new_quests', { quests: { main: [{ id: 2, status: 0, progress: [0] }] } });
    h.advance(2000); h.core.tick(); assert.equal(h.sent.length, 1);
});
test('劳务按北京时间六小时边界补额度，并受容量限制', () => {
    const h = harness(); h.c.character.quest_max = 3;
    const boundary = Date.UTC(2026, 10, 23, 4); // 北京时间12点
    h.c.character.quest_time = (boundary - 1000) / 1000;
    h.advance(boundary - h.c.researchNow - 1);
    assert.equal(h.core.workAvailable(h.c), 0);
    h.advance(1); assert.equal(h.core.workAvailable(h.c), 1);
    h.advance(21600000 * 5); assert.equal(h.core.workAvailable(h.c), 3);
    h.c.quests.work = [{}, {}, {}]; assert.equal(h.core.workAvailable(h.c), 0);
});
test('刚好处于上次结算边界不会立刻多生成额度', () => {
    const h = harness(); h.c.character.quest_max = 2;
    h.c.character.quest_time = h.c.researchNow / 1000;
    assert.equal(h.core.workAvailable(h.c), 0);
    delete h.c.character.quest_time; assert.equal(h.core.workAvailable(h.c), 2);
});
test('劳务接取串行，额度响应后不重复接取', () => {
    const h = harness(); h.onlyQuests(); h.templates.length = 0;
    Object.assign(h.c.character, { quest: 1, quest_max: 2, quest_time: h.c.researchNow / 1000 });
    h.core.tick(); h.core.tick(); assert.deepEqual(h.sent[0], { type: 'quest_accept', data: { type: 'work' } });
    h.response('new_quests', { type: 'work', quests: { work: [{ id: 50, status: 0, objectives: [] }] }, quest_count: 0 });
    h.advance(2000); h.core.tick(); assert.equal(h.sent.length, 1);
});
test('人工领奖不被判定为自动弹窗，阻止同时自动操作', () => {
    const h = harness(); h.onlyQuests(); h.core.observeSend('quest_reward', { type: 'main', id: 1 }, true);
    assert.equal(h.core.isAutomaticReward({ type: 'main', id: 1 }), false);
    h.core.tick(); assert.equal(h.sent.length, 0);
});
test('任务超时先刷新快照，不能凭旧缓存重发领奖', () => {
    const h = harness(); h.onlyQuests(); h.c.quests.main = [{ id: 1, status: 0, progress: [1] }];
    h.core.tick(); h.advance(60000); h.core.tick(); h.core.tick();
    assert.deepEqual(h.sent.map(r => r.type), ['quest_reward', 'init_character_data']);
    h.c.quests.main[0].status = 1; h.response('init_character_data', {}); h.core.tick();
    assert.equal(h.sent.filter(r => r.type === 'quest_reward').length, 1);
});
test('新连接先收到原生角色快照时，不再重复拉取角色数据', () => {
    const h = harness(); h.onlyQuests(); h.templates.length = 0;
    h.core.tick();
    h.c.connection = {};
    h.core.observeSend('init_character_data', null, true);
    h.response('init_character_data', {});
    h.core.tick();
    assert.deepEqual(h.sent, []);
});
test('页面恢复期间先等原生快照，快照不会清除仍在途的领奖请求', () => {
    const h = harness(); h.onlyQuests();
    h.c.quests.main = [{ id: 1, status: 0, progress: [1] }];
    h.core.tick();
    h.core.observeSend('init_character_data', null, true);
    h.core.tick();
    h.response('init_character_data', {});
    h.core.tick();
    assert.deepEqual(h.sent, [{ type: 'quest_reward', data: { type: 'main', id: 1 } }]);
    assert.equal(h.core.isAutomaticReward({ type: 'main', id: 1 }), true);
});
test('核对已开始研究的扣款时，旧库存与旧研究快照均不能用于追加队列', () => {
    const h = harness(); h.onlyResearch(); h.core.enqueue(11); h.sync(); h.core.tick();
    h.advance(16000); h.core.tick();
    h.response('research_info', { task: null, levels: { 11: 1 } });
    assert.equal(h.core.enqueue(12).ok, false);
    h.response('init_character_data', {});
    assert.equal(h.core.enqueue(12).ok, false);
    h.response('research_info', { task: null, levels: { 11: 1 } });
    assert.equal(h.core.enqueue(12).ok, true);
});
test('任务错误退避，关闭任务开关停止接取与领奖', () => {
    const h = harness(); h.onlyQuests(); h.core.tick(); h.response('error', 'no_available_quest'); h.core.tick();
    assert.equal(h.sent.length, 1); h.advance(60000); h.core.tick(); assert.equal(h.sent.length, 2);
    h.core.setting('questAccept', false); h.core.setting('questReward', false); h.advance(60000); h.core.tick();
    assert.equal(h.sent.length, 2);
});
