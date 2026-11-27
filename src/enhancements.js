// 纯调度器：只通过 env.send 发消息，便于用真实响应顺序进行离线回归。
function createNekController(env) {
    const defaults = { researchQueue: true, researchFinish: true, questAccept: true, questReward: true, holdings: true };
    const now = env.now || Date.now;
    let account = '', pendingResearch = null, pendingQuest = null, connection = null;
    let synced = false, infoAt = -Infinity, researchAfter = 0, questAfter = 0, issuing = false;
    let infoQuery = null, ownsLease = false, questNeedsSync = false, snapshotAt = -Infinity;
    let researchNeedsRefresh = false;
    let researchStatus = '等待研究数据', questStatus = '等待任务数据';
    const prefix = 'nek_enhancements_v1:';

    function context() {
        const c = env.context();
        const uid = c && c.uid != null ? String(c.uid) : '';
        if (uid !== account) {
            account = uid;
            pendingResearch = pendingQuest = null;
            connection = null; synced = false; infoAt = -Infinity;
            infoQuery = null; ownsLease = false; questNeedsSync = false; snapshotAt = -Infinity;
            researchNeedsRefresh = false;
            researchAfter = questAfter = 0;
            researchStatus = '等待研究数据'; questStatus = '等待任务数据';
        }
        if (uid && c.connected && connection !== c.connection) {
            if (connection !== null) {
                questNeedsSync = researchNeedsRefresh = true;
                pendingResearch = pendingQuest = null;
                snapshotAt = -Infinity;
            }
            connection = c.connection;
            synced = false; infoAt = -Infinity; infoQuery = null;
        }
        return c;
    }
    function key() { return prefix + account; }
    function read() {
        let saved = {};
        let readable = true;
        try { saved = JSON.parse(env.storage.getItem(key()) || '{}') || {}; }
        catch (e) { readable = false; researchStatus = '本地存储读取失败，辅助已暂停'; }
        const settings = Object.assign({}, defaults);
        Object.keys(defaults).forEach(k => { if (typeof saved.settings?.[k] === 'boolean') settings[k] = saved.settings[k]; });
        const queue = Array.isArray(saved.queue) ? saved.queue.filter(e => e && typeof e.key === 'string' && Number.isInteger(e.projectId) && e.projectId > 0).slice(0, 100) : [];
        return { settings, queue, readable };
    }
    function save(state) {
        try { env.storage.setItem(key(), JSON.stringify({ settings: state.settings, queue: state.queue })); return true; }
        catch (e) { researchStatus = '本地存储不可用，队列已暂停'; return false; }
    }
    function leader() {
        try {
            const lk = key() + ':lease';
            const prev = JSON.parse(env.storage.getItem(lk) || 'null');
            if (prev && prev.owner !== env.instance && Number(prev.until) > now()) { ownsLease = false; return false; }
            env.storage.setItem(lk, JSON.stringify({ owner: env.instance, until: now() + 12000 }));
            const acquired = JSON.parse(env.storage.getItem(lk)).owner === env.instance;
            if (acquired && !ownsLease) {
                synced = false; infoAt = -Infinity; infoQuery = null;
                if (prev && prev.owner !== env.instance) questNeedsSync = researchNeedsRefresh = true;
            }
            ownsLease = acquired;
            return acquired;
        } catch (e) { return false; }
    }
    function release() {
        try {
            const lk = key() + ':lease';
            const value = JSON.parse(env.storage.getItem(lk) || 'null');
            // 保留所有者记录，让接管标签页先刷新任务快照。
            if (value?.owner === env.instance) env.storage.setItem(lk, JSON.stringify({ owner: env.instance, until: 0 }));
            ownsLease = false;
        } catch (e) { /* 租约会自动过期 */ }
    }
    function project(id) { return env.project(Number(id)); }
    function plan(state, c) {
        const levels = Object.assign({}, c?.levels || {});
        const active = c?.task;
        if (active) levels[active.projectId] = (Number(levels[active.projectId]) || 0) + 1;
        const totals = {};
        const entries = state.queue.map(entry => {
            const found = project(entry.projectId);
            const level = Number(levels[entry.projectId]) || 0;
            const targetLevel = level + 1;
            let cost = null, error = '';
            if (!found) error = '研究项目不存在';
            else if (found.locked) error = '研究项目暂未开放';
            else if (level >= found.maxLevel) error = '研究项目已达上限';
            else cost = env.cost(found.facility, level);
            if (!error && (!cost || !Number.isFinite(cost.reports) || !Number.isFinite(cost.elementQuantity) || cost.reports < 0 || cost.elementQuantity < 0)) error = '研究消耗数据不可用';
            if (!error && ((cost.reports > 0 && !(cost.reportItem > 0)) || (cost.elementQuantity > 0 && !(cost.elementItem > 0)))) error = '研究材料数据不可用';
            const materials = {};
            if (!error) {
                [[cost.reportItem, cost.reports], [cost.elementItem, cost.elementQuantity]].forEach(([id, qty]) => {
                    if (qty > 0) { materials[id] = (materials[id] || 0) + qty; totals[id] = (totals[id] || 0) + qty; }
                });
            }
            // 出错条目同样推进计划等级：否则同一项目的前一条报错（如临时锁定）后，
            // 后续条目会重复用同一等级计费，显示的消耗与计划等级错位。
            levels[entry.projectId] = targetLevel;
            return { entry, found, level, targetLevel, cost, materials, error };
        });
        return { entries, totals };
    }
    function shortages(materials) {
        return Object.keys(materials).filter(id => !Number.isFinite(Number(env.quantity(Number(id)))) || Number(env.quantity(Number(id))) < materials[id]);
    }
    function materialText(materials) {
        return Object.keys(materials).map(id => env.itemName(Number(id)) + '×' + materials[id]).join('、') || '无';
    }
    function recordPlan(state, p) {
        let changed = false;
        p.entries.forEach(e => {
            if (e.entry.submitted) return;
            const record = { fromLevel: e.level, targetLevel: e.targetLevel, cost: e.cost };
            if (JSON.stringify(e.entry.record) !== JSON.stringify(record)) { e.entry.record = record; changed = true; }
        });
        if (changed) return save(state);
        return true;
    }
    function enqueue(projectId) {
        const c = context();
        if (!account || !c?.connected || !c.researchReady || questNeedsSync || researchNeedsRefresh) {
            return { ok: false, message: '请等待背包和研究数据同步' };
        }
        const state = read();
        if (!state.readable) return { ok: false, message: '无法读取本地研究队列' };
        if (state.queue.some(e => e.submitted)) return { ok: false, message: '研究开研请求正在确认，请稍后加入' };
        if (state.queue.length >= 100) return { ok: false, message: '研究队列最多 100 项' };
        const entry = { key: env.instance + ':' + now() + ':' + Math.random().toString(36).slice(2), projectId: Number(projectId) };
        state.queue.push(entry);
        const p = plan(state, c);
        const invalid = p.entries.find(e => e.error);
        if (invalid) return { ok: false, message: invalid.error + '，请先调整队列' };
        const lack = shortages(p.totals);
        // 背包数量无法读取（非有限值）仍拦截；材料真实不足只提示、不拦截，
        // 队列的等待机制（队首材料不足暂不开研）本身能兜底。
        const unreadable = lack.filter(id => !Number.isFinite(Number(env.quantity(Number(id)))));
        if (unreadable.length) return { ok: false, message: '无法核对背包数量（' + unreadable.map(id => env.itemName(Number(id))).join('、') + '），请稍后再试' };
        p.entries.forEach(e => { e.entry.record = { fromLevel: e.level, targetLevel: e.targetLevel, cost: e.cost }; });
        if (!save(state)) return { ok: false, message: '无法保存研究队列' };
        const last = p.entries[p.entries.length - 1];
        const warn = lack.length ? '；材料不足：' + lack.map(id => env.itemName(Number(id)) + ' 缺 ' + (p.totals[id] - env.quantity(Number(id)))).join('、') + '（开研时将等待材料补充）' : '';
        return { ok: true, warn: lack.length > 0, message: '已加入研究队列（' + (last.found ? last.found.project.name : '#' + last.entry.projectId) +
            ' Lv.' + last.level + '→Lv.' + last.targetLevel + '）；预留 ' + materialText(last.materials) + '（开研时才扣除）' + warn };
    }
    function remove(entryKey) {
        const c = context(), state = read();
        if (!state.readable || state.queue.some(e => e.submitted)) return false;
        const entry = state.queue.find(e => e.key === entryKey);
        if (entry?.submitted) return false;
        state.queue = state.queue.filter(e => e.key !== entryKey);
        const p = plan(state, c);
        p.entries.forEach(e => { e.entry.record = { fromLevel: e.level, targetLevel: e.targetLevel, cost: e.cost }; });
        return save(state);
    }
    function setting(name, value) {
        context();
        if (!account || !(name in defaults)) return false;
        const state = read(); state.settings[name] = !!value;
        if (!state.readable) return false;
        return save(state);
    }
    function send(type, data, lane, detail) {
        const request = Object.assign({ type, at: now(), automatic: true }, detail);
        if (lane === 'research') pendingResearch = request;
        else pendingQuest = request;
        issuing = true;
        let sent = false;
        try { sent = env.send(type, data) === true; } catch (e) { /* 下次重试 */ }
        finally { issuing = false; }
        if (!sent) {
            if (lane === 'research') { pendingResearch = null; researchAfter = now() + 10000; }
            else { pendingQuest = null; questAfter = now() + 10000; }
        }
        return sent;
    }
    function requestInfo() {
        if (now() - infoAt < 10000) return;
        infoAt = now();
        infoQuery = { pending: pendingResearch };
        try { env.send('research_info'); } catch (e) { /* 重连后重试 */ }
    }
    function requestSnapshot() {
        if (now() - snapshotAt < 30000) return;
        snapshotAt = now();
        try { env.send('init_character_data'); } catch (e) { /* 保持暂停直到快照到达 */ }
    }
    function settleSubmitted(state, c, allowRetry) {
        if (!state.readable) return;
        const head = state.queue[0];
        if (!head?.submitted) return;
        const sent = head.submitted;
        const actualLevel = Number(c.levels?.[head.projectId]) || 0;
        if ((c.task && Number(c.task.projectId) === head.projectId && actualLevel + 1 === sent.targetLevel) || actualLevel >= sent.targetLevel) {
            state.queue.shift();
            // 状态查询无法补发 research_started 的背包扣款，须刷新角色快照。
            if (allowRetry) questNeedsSync = researchNeedsRefresh = true;
        } else if (allowRetry && now() - sent.at >= 15000) {
            delete head.submitted;
            researchAfter = now() + 60000;
            researchStatus = '开研状态已核对，等待重试';
        }
        save(state);
    }
    function observeSend(type, data, sent) {
        if (issuing || !sent) return;
        context();
        if (type === 'init_character_data') {
            // 游戏切回前台或重连时也会主动拉取角色快照。
            questNeedsSync = researchNeedsRefresh = true;
            snapshotAt = now();
        } else if (type === 'research_start' || type === 'research_finish') {
            pendingResearch = { type, at: now(), automatic: false, projectId: Number(data?.projectId) };
        } else if (type === 'quest_accept' || type === 'quest_reward') {
            pendingQuest = { type, at: now(), automatic: false, questType: data?.type, id: data?.id };
        }
    }
    function isAutomaticReward(content) {
        context();
        return !!(pendingQuest?.automatic && pendingQuest.type === 'quest_reward' && String(content?.id) === String(pendingQuest.id) && content?.type === pendingQuest.questType);
    }
    function message(type, content) {
        const c = context();
        if (!account) return;
        if (type === 'init_character_data') {
            synced = false; infoAt = -Infinity;
            researchNeedsRefresh = true;
            // 快照可能先于刚提交的请求到达。保留未超时的请求，等待它自己的响应。
            if (pendingQuest && now() - pendingQuest.at >= 60000) pendingQuest = null;
            questNeedsSync = false;
            return;
        }
        if (type === 'research_info' && content && Object.prototype.hasOwnProperty.call(content, 'task')) {
            // 开研前发出的查询可能延迟到达，不能用它判定本次开研失败。
            if (pendingResearch && infoQuery?.pending !== pendingResearch) return;
            synced = true;
            if (!questNeedsSync) researchNeedsRefresh = false;
            settleSubmitted(read(), c, true);
            pendingResearch = null;
            infoQuery = null;
        } else if (type === 'research_started') {
            settleSubmitted(read(), c, false);
            pendingResearch = null; synced = !researchNeedsRefresh;
        } else if (type === 'research_finished') {
            pendingResearch = null; synced = !researchNeedsRefresh;
        } else if (type === 'research_error') {
            // 保留 submitted，等待原生随后拉取的 research_info 确认服务端真实状态。
            pendingResearch = { type: 'reconcile', at: now(), automatic: false };
            researchAfter = now() + 60000;
            researchStatus = '研究请求失败，等待服务端核对后重试';
            infoAt = -Infinity;
            requestInfo();
        } else if (type === 'new_quests' && pendingQuest?.type === 'quest_accept') {
            const requested = pendingQuest.questType;
            if (content?.type === requested || Array.isArray(content?.quests?.[requested])) {
                pendingQuest = null; questAfter = now() + 2000;
            }
        } else if (type === 'quest_reward_claimed' && pendingQuest?.type === 'quest_reward' && String(content?.id) === String(pendingQuest.id) && content?.type === pendingQuest.questType) {
            pendingQuest = null; questAfter = now() + 2000;
        } else if (type === 'error' && typeof content === 'string' && /^(quest_|no_available_quest)/.test(content)) {
            pendingQuest = null; questAfter = now() + 60000;
            questStatus = '任务请求暂不可用，稍后重试';
        }
    }
    function workAvailable(c) {
        const works = c.quests?.work;
        const cap = Number(c.character?.quest_max);
        if (!Array.isArray(works) || !Number.isFinite(cap) || cap <= works.length) return 0;
        let stored = Number(c.character.quest) || 0;
        const time = Number(c.character.quest_time) * 1000;
        if (!time) stored = cap - works.length;
        else {
            // 北京时间固定 0/6/12/18 点，与原生 getNextQuestBoundary 一致。
            const six = 21600000, offset = 28800000;
            const first = (Math.floor((time + offset) / six) + 1) * six - offset;
            if (first <= now()) stored += Math.min(1 + Math.floor((now() - first) / six), Math.max(0, cap - works.length - stored));
        }
        return Math.max(0, Math.min(stored, cap - works.length));
    }
    function claimable(q, template, c) {
        if (Number(q.status) === 1 || !template) return false;
        return (template.objectives || []).some((obj, i) => {
            const need = Number(obj.count);
            if (!Number.isFinite(need) || need < 0) return false;
            const have = obj.type === 'level' ? Number(c.character.level) : Number(q.progress?.[i]) || 0;
            return have >= need;
        });
    }
    function tickResearch(state, c) {
        if (!state.settings.researchQueue && !state.settings.researchFinish) return;
        if (pendingResearch) {
            if (now() - pendingResearch.at >= 15000) {
                synced = false; researchStatus = '请求未确认，正在核对服务端研究状态'; requestInfo();
            }
            return;
        }
        if (!synced || !c.researchReady) { researchStatus = '正在读取研究数据'; requestInfo(); return; }
        if (state.queue[0]?.submitted) { synced = false; requestInfo(); return; }
        if (now() < researchAfter) return;
        if (c.task) {
            const finish = Number(c.task.finishTime);
            if (Number.isFinite(finish) && finish > 0 && finish * 1000 <= c.researchNow) {
                researchStatus = state.settings.researchFinish ? '正在领取已完成研究' : '研究已到期，等待领取';
                if (state.settings.researchFinish && !c.researchSettling) send('research_finish', undefined, 'research');
            } else researchStatus = '等待当前研究完成';
            return;
        }
        if (!state.settings.researchQueue) { researchStatus = '队列已暂停'; return; }
        const p = plan(state, c);
        if (!recordPlan(state, p)) return;
        const head = p.entries[0];
        if (!head) { researchStatus = '研究队列为空'; return; }
        if (head.error) { researchStatus = head.error + '，请移除或调整队首'; return; }
        const missing = shortages(head.materials);
        if (missing.length) {
            researchStatus = '队首材料不足，等待补充：' + missing.map(id => env.itemName(Number(id)) + ' 缺 ' + (head.materials[id] - env.quantity(Number(id)))).join('、');
            return;
        }
        head.entry.submitted = { at: now(), targetLevel: head.targetLevel };
        if (!save(state)) return;
        researchStatus = '正在开始队首研究';
        if (!send('research_start', { projectId: head.entry.projectId }, 'research', { key: head.entry.key })) {
            delete head.entry.submitted; save(state);
        }
    }
    function tickQuests(state, c) {
        if (!state.settings.questAccept && !state.settings.questReward) return;
        if (!Array.isArray(c.quests?.main) || !Array.isArray(c.quests?.work)) return;
        if (pendingQuest) {
            if (now() - pendingQuest.at < 60000) return;
            questNeedsSync = true;
        }
        if (questNeedsSync) { questStatus = '正在核对任务快照'; requestSnapshot(); return; }
        if (now() < questAfter) return;
        if (state.settings.questReward) {
            for (const questType of ['main', 'work']) {
                const q = c.quests[questType].find(q => claimable(q, questType === 'main' ? env.quest(q.id) : q, c));
                if (q) {
                    questStatus = '正在领取已完成任务奖励';
                    send('quest_reward', { type: questType, id: q.id }, 'quest', { questType, id: q.id }); return;
                }
            }
        }
        if (state.settings.questAccept) {
            const main = c.quests.main;
            const available = env.questTemplates().some(t => {
                if (!t || !t.id || ![1, 2].includes(Number(t.type)) || main.some(q => String(q.id) === String(t.id))) return false;
                return !t.prerequisite_quest || main.some(q => String(q.id) === String(t.prerequisite_quest) && Number(q.status) === 1);
            });
            if (available) {
                questStatus = '正在接受主线或支线任务';
                send('quest_accept', { type: 'main' }, 'quest', { questType: 'main' }); return;
            }
            if (workAvailable(c) > 0) {
                questStatus = '正在接受劳务派遣';
                send('quest_accept', { type: 'work' }, 'quest', { questType: 'work' }); return;
            }
        }
        questStatus = '暂无可自动领取的任务或奖励';
    }
    function tick() {
        const c = context();
        if (!account || !c?.connected || !env.enabled()) { release(); return; }
        const state = read();
        if (!state.readable) { release(); return; }
        if (!state.settings.researchQueue && !state.settings.researchFinish && !state.settings.questAccept && !state.settings.questReward) { release(); return; }
        if (!leader()) { researchStatus = '自动化由另一个游戏标签页处理'; return; }
        if (questNeedsSync) { researchStatus = '正在核对角色数据'; questStatus = '正在核对角色与任务快照'; requestSnapshot(); return; }
        tickResearch(state, c);
        tickQuests(state, c);
    }
    function view() {
        const c = context(), state = read();
        return { account, settings: state.settings, queue: plan(state, c), researchStatus, questStatus };
    }
    // 某研究项目的「计划执行等级」：已完成等级 + 进行中任务(+1) + 队列中同项目条目数。
    // 与 plan() 的计费口径一致——队列条目与待加入卡片都按该等级显示消耗。
    // 本地存储不可用时返回 null，调用方按原生视图渲染。
    function plannedLevel(projectId) {
        const c = context();
        const state = read();
        if (!state.readable) return null;
        const levels = Object.assign({}, c?.levels || {});
        const active = c?.task;
        if (active) levels[active.projectId] = (Number(levels[active.projectId]) || 0) + 1;
        let planned = Number(levels[Number(projectId)]) || 0;
        state.queue.forEach(e => { if (Number(e.projectId) === Number(projectId)) planned += 1; });
        return planned;
    }
    return { tick, enqueue, remove, setting, view, plannedLevel, message, observeSend, isAutomaticReward, workAvailable, claimable, release };
}

function* queuedBatches(game, metadata) {
    for (const entry of game.queue || []) {
        if (!entry) continue;
        const state = metadata.get(entry);
        const remaining = Number(state?.remaining ?? entry.remaining ?? entry.count);
        if (remaining !== -1 && (!Number.isSafeInteger(remaining) || remaining <= 0)) continue;
        const multiplier = Number(state?.multiplier ?? entry.multiplier ?? entry.item?.multiplier);
        const batch = Number.isSafeInteger(multiplier) && multiplier > 0 ? multiplier : 1;
        yield { entry, remaining, batch };
    }
}

// 按已排定的剩余次数估算毛产出，使用当前等级、研究、祝福与装备。
function estimateQueueOutputs(game, ui, data, metadata, cookingChestDivisor) {
    const totals = new Map();
    for (const { entry, remaining, batch: multiplier } of queuedBatches(game, metadata)) {
        if (!['action', 'cooking'].includes(entry.type)) continue;
        const cooking = entry.type === 'cooking';
        const action = cooking ? data?.cookingRecipes?.[entry.id] : game.getAction(entry.id);
        const skill = cooking ? 7 : Number(action?.action);
        if (!action || ![1, 2, 6, 7].includes(skill)) continue;
        const success = (cooking ? ui.getCookingLevelState(action) : ui.getActionLevelState(action)).successRate / 100;
        if (!(success > 0)) continue;
        const batch = cooking || skill === 6 ? multiplier : 1;
        const facility = cooking ? 12 : game.getResearchFacilityIdForAction(action);
        const productBonus = Math.max(0, Number(game.getResearchEffectPct(facility, 'product')) || 0);
        const researchLuck = Math.max(0, Number(game.getResearchEffectPct(facility, 'lucky')) || 0);
        const equipLuck = Math.max(0, Number(game.lifeBonus?.[game.getLifeBonusActionType(skill)]?.luck) || 0);
        const luck = 1 + researchLuck / 10 + equipLuck / 100;
        const collectBonus = [1, 2].includes(skill) ? ui.getRewardBonusEffect('collect') : 0;
        const overLevel = cooking ? 1 : game.getOverLevelProductMultiplier(action);
        const proficiency = Number(game.proficiency?.[cooking ? 'cooking' : 'action']?.[entry.id]) || 0;
        const chests = cooking
            ? [{ itemId: 9816, num: 1, chance: action.time / cookingChestDivisor * luck, luckyApplied: true, noBonus: true }]
            : ui.getActionChestPreview(action, researchLuck);

        const add = (rewards, extra) => {
            for (const reward of rewards || []) {
                if (Number(reward.proficiency) > proficiency) continue;
                const itemId = Number(reward.itemId);
                const enhancement = Number(reward.enhancement) || 0;
                const min = Number(reward.num ?? reward.min);
                const max = Number(reward.num ?? reward.max);
                let chance = Number(reward.chance ?? 100);
                if (!itemId || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min || chance <= 0) continue;
                if (extra && !reward.luckyApplied && !cooking) chance *= luck;
                const quantityBonus = reward.noBonus ? 1 : 1 + Math.max(0, productBonus + collectBonus) / 100;
                const yieldPerAttempt = (min + max) / 2 * quantityBonus * (reward.noBonus ? 1 : batch)
                    * (extra ? 1 : overLevel) * Math.min(100, chance) / 100 * success;
                if (!Number.isFinite(yieldPerAttempt) || yieldPerAttempt <= 0) continue;
                const key = itemId + ':' + enhancement;
                const total = totals.get(key) || { amount: 0, unlimited: false, approximate: false };
                if (remaining === -1) total.unlimited = true;
                else {
                    total.amount += yieldPerAttempt * remaining;
                    total.approximate ||= success < 1 || chance < 100 || min !== max || !Number.isInteger(yieldPerAttempt);
                }
                totals.set(key, total);
            }
        };
        add(action.rewards, false);
        add(action.extraRewards, true);
        add(chests, true);
    }
    return totals;
}

function queueIngredient(game, data, ingredient, choice, batch, saveRate) {
    let itemId = ingredient.itemId;
    // 与游戏的烹饪材料计算一致：先按份数及省料取整，再换算替代食材。
    let quantity = Math.floor(ingredient.quantity * batch * (1 - saveRate));
    if (choice && Number(itemId) !== Number(choice)) {
        const original = game.getItem(Number(itemId)), substitute = game.getItem(Number(choice));
        const group = original?.substitute_group;
        const loss = Number(data?.food?.[group]);
        if (group && group !== 'processed' && substitute?.substitute_group === group && loss > 0
            && original.substitute_value > 0 && substitute.substitute_value > 0) {
            itemId = choice;
            quantity = Math.ceil(quantity * original.substitute_value * (1 + loss) / substitute.substitute_value);
        }
    }
    return { itemId, quantity };
}

function estimateQueueMaterials(game, data, metadata) {
    const totals = new Map();
    const saving = type => Math.max(0, Math.min(1, Number(game.getLifeMasterRate?.(type)) || 0));
    for (const { entry, remaining, batch } of queuedBatches(game, metadata)) {
        const add = (itemId, quantity, enhancement = 0) => {
            const id = Number(itemId), level = Number(enhancement);
            if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(level) || !Number.isFinite(quantity) || quantity <= 0) return;
            const key = id + ':' + level;
            totals.set(key, remaining === -1 ? Infinity : (totals.get(key) || 0) + quantity * remaining);
        };
        if (entry.type === 'action') {
            const action = game.getAction(entry.id);
            const production = Number(action?.action) === 6;
            const scale = production ? batch * (1 - saving(game.getLifeBonusActionType(6))) : 1;
            for (const ingredient of action?.requirements || []) add(ingredient.itemId, ingredient.quantity * scale);
        } else if (entry.type === 'cooking') {
            const ingredients = data?.cookingRecipes?.[entry.id]?.ingredients || [];
            const saveRate = saving(9);
            ingredients.forEach((ingredient, index) => {
                const { itemId, quantity } = queueIngredient(game, data, ingredient, entry.item?.choices?.[index], batch, saveRate);
                add(itemId, quantity);
            });
        } else if (entry.type === 'alchemy') {
            const { primaryItem, secondaryItem, enhancement } = entry.item || {};
            const recipe = Number(entry.id);
            const occult = { 3: 'up', 4: 'down', 5: 'change' }[recipe];
            if (recipe === 9) {
                const upgrade = data?.alchemyQuantum?.[primaryItem]?.find(row => Number(row.secondary) === Number(secondaryItem));
                if (!upgrade) continue;
                add(primaryItem, 1, enhancement);
                add(secondaryItem, Number(upgrade.quantity));
            } else if (occult) {
                add(primaryItem, Number(data?.alchemyOccultism?.[primaryItem]?.[occult]?.quantity ?? 1), enhancement);
            } else if (recipe === 1 || recipe === 2 || recipe === 6) {
                const quantity = recipe === 1 ? Number(game.getItem(Number(primaryItem))?.auri || 1) : 1;
                add(primaryItem, quantity, enhancement);
            }
        } else if (entry.type === 'fishing') {
            add(entry.item?.primaryItem, 1);
        }
    }
    return totals;
}

// 统一两位小数口径：录入、行情默认、加权结果与云同步归一化共用。
function round2(n) {
    const value = Number(n);
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}
// 库存成本输入：仅接受非负、最多两位小数的数字（含 .5 写法），返回归一化数值；非法返回 null。
function parseStockCost(raw) {
    if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? round2(raw) : null;
    const text = String(raw == null ? '' : raw).trim();
    if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text)) return null;
    const value = round2(text);
    return value != null && value >= 0 ? value : null;
}

// 库存成本：买入后按「原有库存 × 旧单件成本 + 本次买入量 × 成交单价」加权平均。
// 无有效旧成本/旧数量时直接采用本次买入价；结果保留两位小数。
function mergeWarehouseCost(oldCost, oldQty, buyPrice, buyQty) {
    const price = Number(buyPrice), qty = Number(buyQty);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) return null;
    const base = oldCost == null ? NaN : Number(oldCost), held = Number(oldQty);
    // 无有效旧成本（含本地有库存但未录成本）时直接采用本次成交价，不做加权。
    if (!Number.isFinite(base) || base < 0 || !Number.isFinite(held) || held <= 0) return price;
    return Math.round((base * held + price * qty) / (held + qty) * 100) / 100;
}

function marketTime(value) {
    const numeric = Number(value);
    if (numeric > 0 && Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeInventoryLedger(value) {
    const items = {}, orders = {};
    const isId = id => /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0;
    for (const [id, row] of Object.entries(value?.items || {}).slice(0, 500)) {
        if (!isId(id) || !Number.isSafeInteger(row?.quantity) || row.quantity < 0 ||
            !Number.isFinite(row.since) || row.since <= 0) continue;
        const purchases = Array.isArray(row.purchases) ? row.purchases.slice(-20).filter(p =>
            Number.isSafeInteger(p?.quantity) && p.quantity > 0 && Number.isFinite(p.at) && p.at > 0 &&
            Number.isFinite(p.price) && p.price > 0 && ['直购', '直购已核对', '求购领取', '历史采购'].includes(p.source))
            .map(({ quantity, at, price, source }) => ({ quantity, at, price, source })) : [];
        items[id] = { quantity: row.quantity, since: row.since, purchases };
    }
    for (const [id, row] of Object.entries(value?.orders || {})) {
        if (isId(id) && Number.isSafeInteger(row?.quantity) && row.quantity > 0) orders[id] = { quantity: row.quantity };
    }
    const products = Array.isArray(value?.products) ? [...new Set(value.products.filter(Number.isSafeInteger).filter(id => id > 0))].slice(0, 500) : [];
    const excluded = Array.isArray(value?.excluded) ? [...new Set(value.excluded.filter(Number.isSafeInteger).filter(id => id > 0))] : [];
    return { items, orders, products, excluded };
}

// History has cumulative fills rather than individual trades. Subtract both
// unclaimed fills and quantities already recorded by another session/device.
function warehouseHistoryBatches(history, settlement, ledger) {
    const unclaimed = new Map();
    for (const row of settlement) {
        if (Number(row.side) !== 2 || Number(row.item) <= 1) continue;
        const key = Number(row.order_id);
        unclaimed.set(key, (unclaimed.get(key) || 0) + (Number(row.quantity) || 0));
    }
    const batches = [];
    for (const row of history) {
        const id = Number(row.id), item = Number(row.item), price = Number(row.price);
        const tracked = ledger.items[item], at = marketTime(row.close_time);
        const claimed = Number(row.traded) - (unclaimed.get(id) || 0);
        if (!tracked || Number(row.side) !== 2 || Number(row.enhancement || 0) !== 0 ||
            !Number.isSafeInteger(id) || id <= 0 || !(price > 0) || !Number.isFinite(price) ||
            !Number.isSafeInteger(claimed) || claimed <= 0 || at < tracked.since || !at) continue;
        const quantity = claimed - (ledger.orders[id]?.quantity || 0);
        if (quantity > 0) batches.push({ id, item, quantity, price, at });
    }
    return batches.sort((a, b) => a.at - b.at || a.id - b.id);
}

function inventoryRecipeTotal(node, costs, root = true) {
    const price = costs[node.id];
    if (!root && typeof price === 'number' && Number.isFinite(price)) return price * node.quantity;
    if (!node.children.length) return null;
    let total = 0;
    for (const child of node.children) {
        const cost = inventoryRecipeTotal(child, costs, false);
        if (cost == null) return null;
        total += cost;
    }
    return total;
}

// 结算领取前的待入库成本：挂单（含部分成交）先进结算池，点领取才入库。
// 结算项自带 side/price/item：side=2 为求购入库，price 即该批成交单价；
// item=1 是金币（找零/退款），不记库存成本。生成 'item:enh' -> {price, quantity}。
// 部分成交会分批产生多条结算项，同一物品按数量加权单价；wantedId 为单条领取 id（不传=全部）。
function claimCosts(settlements, wantedId) {
    const result = {};
    const wanted = wantedId == null ? null : Number(wantedId);
    (settlements || []).forEach(s => {
        if (!s) return;
        if (wanted != null && Number(s.id) !== wanted) return;
        if (Number(s.side) !== 2) return;               // 求购入库才计入；出售结算是收到金币
        const id = Number(s.item), enh = Number(s.enhancement) || 0, qty = Number(s.quantity) || 0;
        const price = Number(s.price) || 0;
        if (!(id > 1) || !(qty > 0) || !(price > 0)) return;  // item=1 金币找零排除
        const key = id + ':' + enh;
        const prev = result[key];
        if (prev) {
            const total = prev.quantity + qty;
            prev.price = round2((prev.price * prev.quantity + price * qty) / total);
            prev.quantity = total;
        } else result[key] = { price, quantity: qty };
    });
    return result;
}

// 直接买入材料的库存合计：按每层直接材料自身库存单价 × 用量累加；
// 没录成本的材料按市场报价兜底。全部材料都没有库存成本时不显示括号，避免 (+0) 噪声。
function directStockTotal(node, stockMap, side) {
    if (!node) return null;
    const children = node.children || [];
    const saved = stockMap && stockMap[String(node.id)];
    if (!children.length) {
        if (saved != null && String(saved).trim() !== '') {
            const own = Number(saved);
            if (Number.isFinite(own) && own >= 0) return own * Number(node.quantity) || 0;
        }
        return null;
    }
    let total = 0, hasStock = false;
    for (const child of children) {
        const savedChild = stockMap && stockMap[String(child.id)];
        if (savedChild != null && String(savedChild).trim() !== '') {
            const own = Number(savedChild);
            if (Number.isFinite(own) && own >= 0) {
                total += own * Number(child.quantity) || 0;
                hasStock = true;
                continue;
            }
        }
        const quote = child[side + 'Quote'];
        if (quote == null) return null;
        total += quote;
    }
    return hasStock ? total : null;
}

// 库存合计：节点自身录了库存成本就按它算（含中间产物），不再展开子节点；
// 只有没录库存成本时才递归到叶子，并用市场小计兜底未记录材料。
function stockTotalOf(node, stockMap, side) {
    if (!node) return null;
    const saved = stockMap && stockMap[String(node.id)];
    if (saved != null && String(saved).trim() !== '') {
        const value = Number(saved);
        if (Number.isFinite(value) && value >= 0) return value * Number(node.quantity) || 0;
    }
    if (!node.children.length) return node[side] == null ? null : node[side];
    let total = 0;
    for (const child of node.children) {
        const value = stockTotalOf(child, stockMap, side);
        if (value == null) return null;
        total += value;
    }
    return total;
}

// Each node represents the quantity needed for one finished product.
// options.substitutes maps cooking ingredient itemId -> replacement itemId (食材重构).
function recipeCost(data, product, market, quantity = 1, ancestors = new Set(), options = {}) {
    const item = data?.items?.[product];
    const sources = item?.sources?.actions || [];
    const actions = sources.map(source => data.actions?.[source.id]).filter(Boolean);
    const node = { id: Number(product), name: item?.name || String(product), quantity, children: [], sell: null, demand: null };
    const level = market?.get(product)?.levels?.[0];
    for (const side of ['sell', 'demand']) {
        const price = Number(level?.[side + '_price']);
        node[side + 'Quote'] = Number.isFinite(price) && price > 0 ? price * quantity : null;
    }
    const raw = actions.find(action => action.action === 1 || action.action === 2);
    if (raw) {
        node.source = raw.action === 1 ? '梳毛' : '采集';
        node.sell = node.sellQuote;
        node.demand = node.demandQuote;
        return node;
    }
    const substitutes = options.substitutes || null;
    const replace = id => {
        const to = substitutes?.[id];
        return to && Number(to) > 0 && to !== id ? Number(to) : Number(id);
    };
    // 生产配方：actions 中 action===6 且奖励含该产品。
    let reward = null, requirements = null;
    const prod = actions.find(action => action.action === 6 && action.rewards?.some(r => r.itemId === product));
    if (prod) {
        reward = prod.rewards.find(r => r.itemId === product);
        requirements = prod.requirements;
    } else {
        // 烹饪配方：source.cooking 指向 Data.cookingRecipes，ingredients 为需求。
        const source = sources.find(s => s.cooking && data?.cookingRecipes?.[s.id]);
        if (source) {
            const cr = data.cookingRecipes[source.id];
            const cooked = cr.rewards?.find(r => r.itemId === product);
            if (cooked && cooked.chance === 100) {
                // 烹饪产量常为区间（如 4~5），按名义产量 min 折算，与"保守上限"口径一致。
                reward = { min: cooked.min, max: cooked.min, chance: cooked.chance };
                requirements = (cr.ingredients || []).map(ing => {
                    const orig = Number(ing.itemId);
                    const chosen = replace(orig);
                    const origDef = data?.items?.[orig];
                    const qty = Number(ing.quantity);
                    if (chosen === orig) return { itemId: orig, quantity: qty };
                    // 与游戏 getCookingMaterialMaxCount 同口径：用量 × 原价值 × (1+餐损) / 替代价值。
                    const baseValue = Number(origDef?.substitute_value) || 0;
                    const candDef = data?.items?.[chosen];
                    const candValue = Number(candDef?.substitute_value) || 0;
                    const group = origDef?.substitute_group;
                    const loss = group && group !== 'processed' ? Number(data?.food?.[group]) || 0 : 0;
                    if (!(baseValue > 0 && candValue > 0 && candDef?.substitute_group === group)) return { itemId: orig, quantity: qty };
                    return { itemId: chosen, quantity: qty * baseValue * (1 + loss) / candValue };
                });
            }
        }
    }
    if (ancestors.has(product)) {
        node.source = '配方循环';
        return node;
    }
    if (reward && (reward.chance !== 100 || reward.min !== reward.max || !(reward.min > 0) ||
        !requirements?.length || !requirements.every(r => Number.isFinite(r.quantity) && r.quantity > 0))) {
        node.source = '配方不可用';
        return node;
    }
    if (!reward) {
        // 无生产/烹饪配方的叶子：按市场报价处理，不再误标「配方不可用」。
        // 怪物/战斗掉落（含面包）单独标注，避免与采集或直接购买的「基础材料」混淆。
        // 无报价时 sell/demand 保持 null，显示「缺报价」。
        const drops = item?.sources || {};
        node.source = (drops.monsters?.length || drops.battles?.length) ? '战斗掉落' : '基础材料';
        node.sell = node.sellQuote;
        node.demand = node.demandQuote;
        return node;
    }
    const path = new Set(ancestors).add(product);
    node.children = requirements.map(r => recipeCost(data, r.itemId, market, quantity * r.quantity / reward.min, path, options));
    for (const side of ['sell', 'demand']) {
        const total = key => node.children.some(child => child[key] == null) ? null :
            node.children.reduce((sum, child) => sum + child[key], 0);
        node[side] = total(side);
        node[side + 'Direct'] = total(side + 'Quote');
    }
    return node;
}

// 该烹饪成品是否支持食材替代：研究「食材重构」(cook_reconstruct) 达 1 级，且配方至少有一味可替代食材。
function substituteOptions(data, levels, product) {
    const facilities = data?.research?.facilities || [];
    let projectId = 0;
    for (const facility of facilities) {
        const project = (facility.projects || []).find(item => item.key === 'cook_reconstruct');
        if (project) { projectId = Number(project.id); break; }
    }
    if (!projectId || !(Number(levels?.[projectId]) > 0)) return null;
    const source = (data?.items?.[product]?.sources?.actions || []).find(s => s.cooking && data?.cookingRecipes?.[s.id]);
    if (!source) return null;
    const cr = data.cookingRecipes[source.id];
    const food = data?.food || {};
    const groups = [];
    for (const ing of cr.ingredients || []) {
        const def = data?.items?.[Number(ing.itemId)];
        const group = def?.substitute_group;
        const loss = group && group !== 'processed' ? Number(food[group]) : NaN;
        if (!group || group === 'processed' || !(Number(def?.substitute_value) > 0) || !(loss > 0)) continue;
        const candidates = Object.entries(data?.items || {})
            .filter(([key, c]) => Number(c.id ?? key) !== Number(ing.itemId) && c.substitute_group === group && Number(c.substitute_value) > 0)
            .map(([key, c]) => ({ id: Number(c.id ?? key), name: c.name }));
        if (candidates.length) groups.push({ itemId: Number(ing.itemId), group, candidates });
    }
    return groups.length ? groups : null;
}

// 可核算成品：与成本选择浮层同口径——存在可展开的生产/烹饪配方。
// Data 对象稳定，按 data + itemId 缓存，避免每次装饰市场详情都递归整棵配方树。
const craftCache = new WeakMap();
function craftableProduct(data, product) {
    const id = Number(product);
    if (!(id > 0) || !data || !data.items?.[id]) return false;
    let cache = craftCache.get(data);
    if (!cache) craftCache.set(data, cache = new Map());
    if (!cache.has(id)) cache.set(id, recipeCost(data, id, null).children.length > 0);
    return cache.get(id);
}

function createNekEnhancements(env) {
    const doc = env.document, storage = env.storage;
    // 成本核算是独立功能：总开关 + 「成本核算」开关同时打开才显示入口与精算按钮。
    const costEnabled = () => env.enabled() && (typeof env.costEnabled !== 'function' || env.costEnabled());
    const itemInfo = new WeakMap();
    const queueMetadata = new WeakMap();
    let detachResearchScroll = null;
    let installed = false, timer = null, silentReward = false;
    let cancelRequest = null;
    const core = createNekController({
        instance: 'nek-' + Math.random().toString(36).slice(2), storage,
        enabled: env.enabled,
        context() {
            const g = env.game(), ui = env.ui(), msg = env.msg();
            return {
                uid: g?.character?.uid, character: g?.character, quests: g?.quests,
                connected: msg?.ws?.readyState === 1, connection: msg?.ws,
                levels: ui?.researchInfo?.levels || g?.researchLevels || {},
                task: ui?.researchInfo?.task || null,
                researchReady: !!(ui?.researchInfo && Object.prototype.hasOwnProperty.call(ui.researchInfo, 'task')),
                researchNow: Date.now() - (Number(ui?.researchOffset) || 0), researchSettling: ui?.researchSettling
            };
        },
        send: (type, data) => env.msg().send(type, data),
        quantity: id => env.game().getItemQuantity(id),
        itemName: id => env.game()?.getItem(id)?.name || '#' + id,
        quest: id => env.game()?.getQuest(id),
        questTemplates: () => Object.values(env.data()?.quests || {}),
        project(id) {
            for (const facility of env.data()?.research?.facilities || []) {
                const p = (facility.projects || []).find(p => Number(p.id) === id);
                if (p) return { project: p, facility, maxLevel: Number(p.maxLevel) || 30, locked: !(Number(p.basePct) > 0) && Number(p.direction) !== 5 };
            }
            return null;
        },
        cost: (facility, level) => env.ui()?.getResearchCost(facility, level)
    });
    function text(el, value) { if (el.textContent !== value) el.textContent = value; }
    function button(label, className, fn) {
        const b = doc.createElement('button'); b.type = 'button'; b.className = 'btn ' + className; b.textContent = label;
        b.addEventListener('click', e => { e.stopPropagation(); if (!b.disabled) fn(); }); return b;
    }
    function toggle(label, name, holder) {
        const row = doc.createElement('div'); row.className = 'setting-item';
        const title = doc.createElement('div'); title.className = 'setting-name'; title.textContent = label;
        const spacer = doc.createElement('div'); spacer.className = 'setting-input';
        const wrap = doc.createElement('label'); wrap.className = 'slider-container';
        const control = doc.createElement('div'); control.className = 'toggle-switch';
        const slider = doc.createElement('span'); slider.className = 'toggle-slider';
        const input = doc.createElement('input'); input.type = 'checkbox'; input.dataset.nekOption = name;
        input.ariaLabel = label;
        input.addEventListener('change', () => { core.setting(name, input.checked); decorate(); });
        control.append(input, slider); wrap.appendChild(control); row.append(title, spacer, wrap); holder.appendChild(row);
    }
    // 重绘研究页：入队/移出后计划等级变化，待加入卡片须按新计划等级重新渲染
    function refreshResearchRows() {
        const u = env.ui();
        try { if (u && typeof u.renderResearchPage === 'function') u.renderResearchPage(); }
        catch (e) { /* 研究页未就绪时忽略，下次 research_info 刷新会重绘 */ }
    }
    function observeQueue(type, content) {
        const queue = env.game()?.queue;
        if (!Array.isArray(queue)) return;
        if (type === 'action_added') {
            // 增量入队消息的倍率可能在顶层，原生处理器只将 item 等字段复制到队列。
            const added = content?.mold === 'before' ? queue[1] : content?.mold === 'after' ? queue.at(-1) : null;
            if (added) queueMetadata.set(added, { multiplier: content.multiplier, token: content.token });
            return;
        }
        const head = queue[0];
        if (type === 'action_canceled') {
            // 完整队列可能先到。迟到的取消确认不能清掉新队首。
            const canceled = cancelRequest && cancelRequest.connection === env.msg()?.ws ? cancelRequest.head : head;
            cancelRequest = null;
            if (canceled && head && (canceled === head || (canceled.token != null && canceled.token === head.token))) {
                queueMetadata.set(head, { remaining: 0 });
            }
            return;
        }
        if (!head || !content || head.type !== content.type || String(head.id) !== String(content.id)) return;
        const metadata = { ...queueMetadata.get(head) };
        const token = head.token ?? metadata.token;
        if (token != null && content.token != null && token !== content.token) return;
        if (content.remaining != null) metadata.remaining = content.remaining;
        const multiplier = content.multiplier ?? content.item?.multiplier;
        if (multiplier != null) metadata.multiplier = multiplier;
        queueMetadata.set(head, metadata);
    }
    // ---- 物品菜单「库存成本」：背包有该物品才显示，点击弹出录入浮窗 ----
    let whModal = null, whOutside = null;
    function closeWarehouseModal() {
        if (!whModal) return;
        const ui = env.ui();
        if (whOutside) {
            if (typeof ui?.removeOutsideClickHandler === 'function' && !whOutside._doc) ui.removeOutsideClickHandler(whOutside);
            else doc.removeEventListener('click', whOutside);
        }
        whModal.remove(); whModal = null; whOutside = null;
    }
    function openWarehouseCostModal(def, enh) {
        closeWarehouseModal();
        const ui = env.ui(), g = env.game();
        const uid = core.view().account, id = Number(def?.id);
        if (!ui || !uid || !(id > 0)) return;
        const saved = warehouseCosts(uid)[String(id)];
        const quote = leftPrice(id, enh);
        const modal = doc.createElement('div');
        modal.className = 'selector neon nek-warehouse-cost-modal';
        const name = doc.createElement('div'); name.className = 'whc-name';
        name.textContent = '库存成本 · ' + (def.name || '#' + id) + (Number(enh) > 0 ? ' +' + enh : '');
        const hint = doc.createElement('div'); hint.className = 'whc-hint';
        hint.textContent = '背包 ' + Number(g.getItemQuantity(id, enh) || 0).toLocaleString('zh-CN') + ' 个 · 未记录时默认填左一价 · 最多两位小数';
        const input = doc.createElement('input'); input.className = 'whc-input'; input.type = 'text';
        input.inputMode = 'decimal';
        input.value = saved != null && Number.isFinite(Number(saved)) && String(saved).trim() !== ''
            ? String(round2(saved)) : (quote > 0 ? String(round2(quote)) : '');
        input.setAttribute('aria-label', '库存成本单价');
        const actions = doc.createElement('div'); actions.className = 'whc-actions';
        const confirm = doc.createElement('button'); confirm.type = 'button'; confirm.className = 'btn';
        confirm.textContent = '确定';
        const clear = doc.createElement('button'); clear.type = 'button'; clear.className = 'btn';
        clear.textContent = '清空';
        const cancel = doc.createElement('button'); cancel.type = 'button'; cancel.className = 'btn';
        cancel.textContent = '取消';
        actions.append(confirm, clear, cancel);
        modal.append(name, hint, input, actions);
        doc.body.appendChild(modal);
        whModal = modal;
        const commit = () => {
                    const raw = input.value.trim();
                    const value = parseStockCost(raw);
                    if (value == null) {
                        ui.notifier?.show?.('请输入有效的库存成本（最多两位小数）', 'error'); return;
                    }
            const map = warehouseCosts(uid), ledger = warehouseLedger(uid);
            if (core.view().account !== uid) return;
            map[id] = value;
            recordWarehouseBase(ledger, id, Number(g.getItemQuantity(id)) || 0);
            if (saveWarehouseLedger(uid, ledger, map)) {
                publishStockCost(id);
                ui.notifier?.show?.('已保存「' + (def.name || '#' + id) + '」库存成本：' + value, 'success', 3000);
                closeWarehouseModal();
            } else ui.notifier?.show?.('保存失败，请重试', 'error');
        };
        const clearSaved = () => {
            if (core.view().account !== uid) return;
            const map = warehouseCosts(uid), ledger = warehouseLedger(uid);
            if (!(String(id) in map)) { closeWarehouseModal(); return; }
            delete map[String(id)];
            delete ledger.items[id];
            if (!ledger.excluded.includes(id)) ledger.excluded.push(id);
            if (saveWarehouseLedger(uid, ledger, map)) {
                publishStockCost(id);
                ui.notifier?.show?.('已清空「' + (def.name || '#' + id) + '」库存成本', 'success', 3000);
                closeWarehouseModal();
            } else ui.notifier?.show?.('清空失败，请重试', 'error');
        };
        confirm.addEventListener('click', e => { e.stopPropagation(); commit(); });
        clear.addEventListener('click', e => { e.stopPropagation(); clearSaved(); });
        cancel.addEventListener('click', e => { e.stopPropagation(); closeWarehouseModal(); });
        input.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); closeWarehouseModal(); }
        });
        if (typeof ui.addOutsideClickHandler === 'function') {
            whOutside = e => { if (!modal.contains(e.target)) closeWarehouseModal(); };
            ui.addOutsideClickHandler(whOutside);
        } else {
            whOutside = e => { if (!modal.contains(e.target)) closeWarehouseModal(); };
            whOutside._doc = true;
            setTimeout(() => doc.addEventListener('click', whOutside), 0);
        }
        input.focus(); input.select();
    }
    function install() {
        const ui = env.ui(), msg = env.msg();
        if (!ui || !msg?.handlers || !env.game()?.character?.uid) return;
        if (installed) return;
        installed = true;
        // 市场买入请求（side=2 求购）暂存单价；成交回包 add 到达时与本地库存成本加权。
        const marketBuys = new Map();
        // 挂单成交先进结算池、领取才入库：领取时按 order_id 从订单取真实成交单价，
        // 暂存为待入库映射，领取回包 add 到达时用该单价加权。
        const pendingClaims = new Map();
        let marketSession = null, marketAccount = null;
        function alignMarketSession() {
            const uid = core.view().account;
            if (marketSession !== msg.ws || marketAccount !== uid) {
                marketBuys.clear();
                pendingClaims.clear();
                marketSession = msg.ws;
                marketAccount = uid;
            }
            return uid;
        }
        const send = msg.send;
        msg.send = function (type, data) {
            alignMarketSession();
            const stopping = type === 'queue' && data?.type === 'cancel';
            const head = stopping ? env.game()?.queue?.[0] : null;
            const result = send.apply(this, arguments);
            if (stopping && result === true) cancelRequest = { head, connection: msg.ws };
            if (result === true && type === 'market_instant' && Number(data?.side) === 2) {
                const id = Number(data.item), enh = Number(data.enhancement) || 0;
                if (id > 0 && Number(data.quantity) > 0) {
                    marketBuys.set(id + ':' + enh, { price: Number(data.price) || 0, quantity: Number(data.quantity), at: Date.now() });
                }
            }
            if (result === true && type === 'market_settlement_claim') {
                const g = env.game();
                const picked = (g?.settlement || []).filter(row => (data?.id == null || Number(data.id) === Number(row.id)) &&
                    Number(row.side) === 2 && Number(row.item) > 1 && Number(row.price) > 0 && Number(row.quantity) > 0);
                for (const row of picked) pendingClaims.set(Number(row.id), { ...row, requestedAt: Date.now() });
            }
            core.observeSend(type, data, result === true); return result;
        };
        const originalMarketUpdate = msg.handlers.market_update;
        if (typeof originalMarketUpdate === 'function') {
            msg.handlers.market_update = function (data) {
                const content = data?.content || {};
                const uid = alignMarketSession();
                const before = new Map();
                (content.add || []).forEach(row => {
                    const id = Number(row.item), enh = Number(row.enhancement) || 0;
                    before.set(id + ':' + enh, Number(env.game().getItemQuantity(id, enh, true)) || 0);
                });
                const result = originalMarketUpdate.apply(this, arguments);
                try {
                    const map = warehouseCosts(uid);
                    const ledger = warehouseLedger(uid);
                    let changed = false;
                    (content.add || []).forEach(row => {
                        const id = Number(row.item), enh = Number(row.enhancement) || 0;
                        if (id <= 1 || enh !== 0 || !uid) return;
                        const key = id + ':' + enh;
                        const bought = Number(row.quantity);
                        if (!Number.isSafeInteger(bought) || bought <= 0) return;
                        const direct = marketBuys.get(key);
                        for (const [claimId, claim] of pendingClaims) {
                            if (Date.now() - claim.requestedAt > 15000) pendingClaims.delete(claimId);
                        }
                        const claims = [...pendingClaims].filter(([, claim]) => Number(claim.item) === id &&
                            Number(claim.enhancement || 0) === 0);
                        let batches = [];
                        if (content.type === 'claim' || (!content.type && !direct)) {
                            let remaining = bought;
                            for (const [claimId, claim] of claims) {
                                if (!remaining) break;
                                const quantity = Math.min(remaining, Number(claim.quantity));
                                batches.push({ id: Number(claim.order_id), price: Number(claim.price), quantity });
                                remaining -= quantity;
                                if (quantity === Number(claim.quantity)) pendingClaims.delete(claimId);
                                else pendingClaims.set(claimId, { ...claim, quantity: Number(claim.quantity) - quantity });
                            }
                        } else if ((!content.type || content.type === 'place') && direct &&
                            Date.now() - direct.at < 15000 && Number(content.side ?? 2) === 2) {
                            marketBuys.delete(key);
                            batches = [{ id: Number(content.order_id), price: Number(content.price) || direct.price, quantity: bought }];
                        }
                        let held = before.get(key) || 0;
                        for (const batch of batches) {
                            if (ledger.excluded.includes(id)) continue;
                            const merged = mergeWarehouseCost(map[id], held, batch.price, batch.quantity);
                            if (merged == null || batch.price <= 0) continue;
                            map[id] = merged;
                            held += batch.quantity;
                            changed = true;
                            if (ledger.items[id]) {
                                const knownOrder = Number.isSafeInteger(batch.id) && batch.id > 0;
                                addPurchase(ledger.items[id], batch, content.type === 'claim' || claims.length && !direct
                                    ? '求购领取' : knownOrder ? '直购已核对' : '直购');
                                if (knownOrder) ledger.orders[batch.id] = { quantity: (ledger.orders[batch.id]?.quantity || 0) + batch.quantity };
                            }
                        }
                        if (batches.length) {
                            before.set(key, (before.get(key) || 0) + bought);
                            if (ledger.items[id]) ledger.items[id].quantity = env.game().getItemQuantity(id);
                        }
                    });
                    if (changed) saveWarehouseLedger(uid, ledger, map);
                } catch (e) { /* 成本更新失败不影响原生成交处理 */ }
                return result;
            };
        }
        const originalMarketHistory = msg.handlers.market_history;
        if (typeof originalMarketHistory === 'function') {
            msg.handlers.market_history = function (data) {
                const result = originalMarketHistory.apply(this, arguments);
                const uid = alignMarketSession();
                if (uid && Array.isArray(data?.content) && historyReady()) importWarehouseHistory(uid, data.content);
                return result;
            };
        }
        const marketError = msg.handlers.market_error;
        if (typeof marketError === 'function') {
            msg.handlers.market_error = function () {
                marketBuys.clear();
                pendingClaims.clear();
                return marketError.apply(this, arguments);
            };
        }
        for (const type of ['action_added', 'action_update', 'action_complete', 'action_canceled']) {
            const original = msg.handlers[type];
            if (typeof original !== 'function') continue;
            msg.handlers[type] = function (data) {
                const result = original.apply(this, arguments);
                observeQueue(type, data?.content);
                return result;
            };
        }
        ['init_character_data', 'research_info', 'research_started', 'research_finished', 'research_error', 'new_quests', 'quest_reward_claimed', 'quest_progress', 'error'].forEach(type => {
            const original = msg.handlers[type];
            if (typeof original !== 'function') return;
            msg.handlers[type] = function (data) {
                // 原生全量快照替换背包数组，但不会使旧的数量缓存失效。
                if (type === 'init_character_data' && Array.isArray(data?.content?.inventory)) {
                    env.game()?.itemQuantityCache?.clear();
                }
                const autoReward = type === 'quest_reward_claimed' && core.isAutomaticReward(data?.content);
                silentReward = autoReward;
                let result;
                try { result = original.apply(this, arguments); }
                finally { silentReward = false; }
                core.message(type, data?.content);
                if (autoReward) ui.notifier?.show('小助手：已领取任务奖励', 'success', 3000);
                return result;
            };
        });
        if (typeof ui.showQuestRewardModal === 'function') {
            const original = ui.showQuestRewardModal;
            ui.showQuestRewardModal = function () { if (!silentReward) return original.apply(this, arguments); };
        }
        if (typeof ui.createResearchProjectRow === 'function') {
            // v1.41.3 待加入卡片的材料行「持有 → 可用」：队列里已有条目会预留材料（开研时才扣），
            // 卡片继续显示背包总量会高估可用量。改为「可用 = 持有 − 队列预留」，不足标红；
            // 库存变化时原生 refreshResearchCostHoldings 会把数值重写回持有，需在包装层重新应用。
            function applyAvailableMaterials(row) {
                if (!row || !row.querySelector('.nek-research-add')) return;
                let totals;
                try { totals = core.view().queue.totals || {}; } catch (e) { return; }
                if (!Object.keys(totals).some(id => Number(totals[id]) > 0)) return;
                row.querySelectorAll('.research-cost-items .action-item-container').forEach(container => {
                    const icon = container.querySelector('.action-item-container-icon .item');
                    const item = icon && itemInfo.get(icon);
                    const reserve = item ? Number(totals[item.id]) || 0 : 0;
                    if (!(reserve > 0)) return;
                    const display = container.querySelector('.quantity-display');
                    const value = display?.querySelector('.quantity-value');
                    if (!display || !value) return;
                    // 「需要」行是第二行文本，取末尾数值做对比。
                    const need = Number((container.querySelectorAll('.action-item-container-text')[1]
                        ?.lastElementChild?.textContent || '').replace(/,/g, '')) || 0;
                    const held = Number(env.game()?.getItemQuantity(item.id)) || 0;
                    const available = held - reserve;
                    const label = display.querySelector('span');
                    if (label) label.textContent = '可用';
                    value.textContent = available.toLocaleString('zh-CN');
                    value.classList.toggle('nek-research-avail-insufficient', available < need);
                    display.classList.toggle('disabled', available < need);
                });
            }
            const original = ui.createResearchProjectRow;
            ui.createResearchProjectRow = function (facility, project) {
                // v1.41.2 待加入卡片按「计划执行等级」显示：进行中的研究占掉一级（Lv.11 研究中
                // 时入队的是 Lv.12→Lv.13 那次），队列中同项目条目再逐条推进。合成调整后的项目
                // 视图（等级/效果/下一级/消耗）交给原生渲染，点击入队后卡片随之显示下一计划
                // 等级的数据。数据不可用时按原生视图渲染。
                let view = project;
                if (!project.locked) {
                    try {
                        // 计划等级只上不下：以行内当前等级为底，叠加任务与队列偏移。
                        // plannedLevel 基于全局等级快照，行内视图等级更新（或不可用时）以行内为准。
                        const stored = core.plannedLevel(project.id);
                        const base = Number(project.level) || 0;
                        const planned = stored == null ? base : Math.max(base, stored);
                        const maxLevel = Number(project.maxLevel) || 30;
                        if (planned != null && planned !== Number(project.level)) {
                            const shown = Math.min(planned, maxLevel);
                            const basePct = Number(project.basePct) || 0;
                            const growthPct = Number(project.growthPct) || 0;
                            const direction = Number(project.direction) || 0;
                            const eff = lv => direction === 5 ? lv
                                : (basePct + growthPct * (Math.max(0, Math.min(lv, maxLevel)) - 1)) / 100;
                            view = Object.assign({}, project, {
                                level: shown,
                                effect: eff(shown),
                                nextEffect: shown < maxLevel ? eff(shown + 1) : null,
                                cost: shown >= maxLevel ? null : (env.ui()?.getResearchCost(facility, shown) || null)
                            });
                        }
                    } catch (e) { /* 计划等级不可用时按原生视图渲染 */ }
                }
                const row = original.apply(this, [facility, view]);
                if (row && !view.locked && view.level < view.maxLevel) {
                    const control = button('加入研究队列', 'research-start-btn nek-research-add', () => {
                        const r = core.enqueue(project.id);
                        ui.notifier?.show(r.message, r.ok && !r.warn ? 'success' : 'error', 5000);
                        if (r.ok) refreshResearchRows();
                        decorate();
                    });
                    control.dataset.projectId = project.id;
                    let actions = row.querySelector('.research-project-action');
                    if (!actions) { actions = doc.createElement('div'); actions.className = 'research-project-action'; row.appendChild(actions); }
                    actions.classList.add('nek-research-actions');
                    actions.appendChild(control);
                }
                applyAvailableMaterials(row);
                return row;
            };
            // 库存变化后原生按「持有」重写数值，这里对全部待加入卡片重新应用「可用」显示。
            if (typeof ui.refreshResearchCostHoldings === 'function') {
                const originalRefresh = ui.refreshResearchCostHoldings;
                ui.refreshResearchCostHoldings = function () {
                    const result = originalRefresh.apply(this, arguments);
                    doc.querySelectorAll('.research-project').forEach(applyAvailableMaterials);
                    return result;
                };
            }
        }
        ['showItem', 'createItemElement'].forEach(name => {
            const original = ui[name];
            if (typeof original !== 'function') return;
            ui[name] = function () {
                const result = original.apply(this, arguments);
                const element = name === 'showItem' ? arguments[0] : result;
                const def = name === 'showItem' ? arguments[1] : arguments[0];
                const options = (name === 'showItem' ? arguments[2] : arguments[1]) || {};
                if (element && Number(def?.id) > 0) itemInfo.set(element, { id: Number(def.id), enhancement: Number(options.enhancement) || 0 });
                return result;
            };
        });
        // 物品菜单「库存成本」：背包里没有该物品时不插入选项；有则点击打开录入浮窗。
        if (typeof ui.showItemMenu === 'function' && !ui.showItemMenu.__nekWarehouse) {
            const originalMenu = ui.showItemMenu;
            const wrappedMenu = function (slotElement, param) {
                const result = originalMenu.apply(this, arguments);
                try {
                    if (!env.enabled()) return result;
                    const menu = this.itemMenu;
                    const list = menu && menu.querySelector('.item-menu-button-list');
                    const def = param?.itemDef;
                    const id = Number(def?.id), enh = Number(param?.enhancement) || 0;
                    if (!list || !(id > 0) || !(Number(env.game().getItemQuantity(id, enh)) > 0)) return result;
                    const btn = doc.createElement('div');
                    btn.className = 'item-menu-button nek-warehouse-cost-btn';
                    btn.innerHTML = '<div class="item-menu-icon"><div class="menu-icon nek-icon-warehouse-cost"></div></div>' +
                        '<div class="item-menu-button-name">库存成本</div>';
                    btn.addEventListener('click', e => {
                        e.stopPropagation();
                        if (slotElement) slotElement.classList.remove('menu-active');
                        menu.remove();
                        ui.itemMenu = null;
                        openWarehouseCostModal(def, enh);
                    });
                    list.appendChild(btn);
                } catch (e) { /* 不影响原生物品菜单 */ }
                return result;
            };
            wrappedMenu.__nekWarehouse = true;
            ui.showItemMenu = wrappedMenu;
        }
        // 已打开的研究页也补上按钮，后续重绘由原生行构造器处理。
        if (ui.researchRoot?.isConnected) ui.renderResearchPage();
    }
    function style() {
        if (doc.getElementById('nek-enhancements-style')) return;
        const el = doc.createElement('style'); el.id = 'nek-enhancements-style';
        el.textContent = [
            // 侧栏图标：位置/尺寸沿用原生 ::after 规则（普通 28px、grid 模式 scale(2)），仅替换图形。
            '.sidebar-item.nek-cost-entry::after{left:8px;margin-top:-14px;width:28px;height:28px;border:0;background-image:none;background-color:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27black%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27M3%203v18h18%27/%3E%3Cpath%20d=%27m7%2014%204-4%203%203%205-6%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27black%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27M3%203v18h18%27/%3E%3Cpath%20d=%27m7%2014%204-4%203%203%205-6%27/%3E%3C/svg%3E") center/contain no-repeat}',
            '.sidebar-menu.sidebar-grid .sidebar-item.nek-cost-entry::after{position:static;margin:8px auto;transform:scale(2);width:28px;height:28px}',
            '.sidebar-item.nek-cost-entry .sidebar-item-name{flex-direction:column;align-items:flex-start;gap:0;line-height:1.15}',
            '.sidebar-item.nek-cost-entry .nek-cost-alias{font-size:10px;opacity:.65;white-space:nowrap}',
            '.sidebar-menu.sidebar-grid .sidebar-item.nek-cost-entry .sidebar-item-name{align-items:center;text-align:center}',
            // 市场详情「精算」：直接复用原生 .marketplace-favorite 的尺寸/悬停/激活态，仅替换 ::before 图标。
            '.marketplace-favorite.nek-market-cost{margin-left:0}',
            '.marketplace-favorite.nek-market-cost:before{background-image:none;background-color:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27black%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27M14%202H6a2%202%200%200%200-2%202v16a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V8z%27/%3E%3Cpath%20d=%27M14%202v6h6M8%2013h8M8%2017h8%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27black%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27M14%202H6a2%202%200%200%200-2%202v16a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V8z%27/%3E%3Cpath%20d=%27M14%202v6h6M8%2013h8M8%2017h8%27/%3E%3C/svg%3E") center/contain no-repeat}',
            '.nek-cost > .page-body > .page-main{overflow-y:auto}',
            '.nek-cost button.page-tab-item{appearance:none;background:none;border:0;font-family:inherit;font-size:inherit}',
            '.nek-inventory-form,.nek-inventory-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px}',
            '.nek-inventory-form input{width:8em}.nek-inventory-form select{max-width:100%}.nek-inventory-name{display:flex;align-items:center;gap:5px}.nek-inventory-name>.item{flex:none}.nek-cost .page-main[hidden]{display:none}',
            '.nek-cost .page-main{container-type:inline-size}.nek-cost-results{width:100%;max-width:76rem;display:grid;grid-template-columns:minmax(0,1fr);align-items:start;gap:6px}',
            '@media(min-width:761px){@container(min-width:44rem){.nek-cost-results{grid-template-columns:repeat(2,minmax(0,1fr))}}}',
            '.nek-cost-tools,.nek-cost-head{display:flex;flex-wrap:wrap;align-items:center;gap:4px}.nek-cost-head .modal-container-title{margin-right:auto}',
            // 物品选择浮层：仿原生 .selector.neon，两层筛选 + 网格（含背包数量）。
            '.nek-cost-picker{position:absolute;z-index:1000;width:360px;max-width:94vw;max-height:80vh;overflow:auto;padding:6px 8px 8px}',
            '.nek-cost-picker .selector-tabs{margin-bottom:4px}',
            '.nek-cost-picker .nek-cost-subtabs{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}',
            '.nek-cost-picker .nek-cost-subtabs[hidden]{display:none}',
            '.nek-cost-picker .nek-cost-subtabs .ui-tab-item{font-size:12px;padding:2px 8px}',
            '.nek-cost-picker .selector-list{margin:6px}',
            '.nek-cost-picker .selector-grid{display:grid;grid-template-columns:repeat(auto-fill,60px);grid-template-rows:max-content;justify-content:center;gap:4px;border:8px solid transparent;overflow-y:auto;max-height:280px;box-sizing:border-box}',
            '.nek-cost-picker .selector-item{cursor:pointer;position:relative}',
            '.nek-cost-picker .selector-item.selected-outline:after,.nek-cost-picker .selector-item.selector-active:after{opacity:1;border-bottom-color:var(--c-main-bright,#74F9BC)}',
            // 替换食材不覆盖原生 .btn：任何 font-size/padding 继承改写都会让它与「删除」按钮高度不一致。
            // 库存成本输入浮窗：复用 .selector.neon 外观，居中显示，点击外部关闭。
            '.nek-warehouse-cost-modal{position:absolute;z-index:3000;left:50%;top:32%;transform:translateX(-50%);width:300px;max-width:92vw;padding:10px 12px}',
            '.nek-warehouse-cost-modal .whc-name{font-size:14px;font-weight:700;margin-bottom:4px}',
            '.nek-warehouse-cost-modal .whc-hint{font-size:12px;color:var(--c-text-dim,#83c3c3);margin-bottom:8px}',
            '.nek-warehouse-cost-modal .whc-input{width:100%;box-sizing:border-box}',
            '.nek-warehouse-cost-modal .whc-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}',
            // 替换食材面板复用原生 .cooking-substitute-panel 组件，仅补充分组标题间距。
            '.nek-cost-sub-picker .selector-list{padding:0 6px 6px}',
            '.nek-cost-sub-picker .cooking-sub-ingredient-label{font-size:12px;color:var(--c-main-bright,#74F9BC);margin:6px 0 2px}',
            '.nek-cost-sub-picker .selector-grid{gap:6px}',
            '.nek-cost-results>.neon-section{margin:0;padding:6px 8px;min-width:0}',
            '.nek-cost .page-main>.btn{align-self:flex-start}.nek-cost .page-main>p{margin:4px 0}',
            '.nek-cost-table{width:100%;border-collapse:collapse;table-layout:fixed;font-variant-numeric:tabular-nums}',
            '.nek-cost-table :is(th,td){padding:2px 4px;text-align:right;line-height:1.35;overflow-wrap:anywhere}',
            '.nek-cost-table :is(th,td):first-child{text-align:left}',
            '.nek-cost-table th:nth-last-child(-n+2){width:23%}.nek-cost-detail th:nth-child(2){width:12%}',
            '.nek-cost-table tr:nth-child(even){background:rgba(var(--r),var(--g),var(--b),.06)}',
            '.nek-cost-results summary{cursor:pointer;padding:3px 4px}',
            '.nek-cost-summary{display:grid;grid-template-columns:54% 23% 23%;align-items:center;cursor:pointer;user-select:none;padding:3px 4px}',
            '.nek-cost-summary>span:not(:first-child){text-align:right}',
            '.nek-cost-summary-label{display:inline-flex;align-items:center;gap:5px;min-width:0}',
            '.nek-cost-caret{display:inline-block;font-size:10px;line-height:1;opacity:.7;transition:transform .15s}',
            '.nek-cost-expand[open] .nek-cost-caret{transform:rotate(90deg)}',
            '.nek-cost-diff-pos{color:rgb(76,175,80)}.nek-cost-diff-neg{color:rgb(255,48,33)}',
            // 材料名复用原生悬浮/点击：可交互时给手型与下划线提示，和普通文本区分。
            '.nek-cost-material-live{cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}',
            '.nek-cost-material-live:hover{color:var(--c-main-bright,#74f9bc)}',
            // 手机端吸顶折叠（nek-float 仅窄屏添加）：面板嵌在研究列表滚动流内，滚过容器顶自动折叠成标题条并 sticky 吸顶。
            // 背景必须不透明：neon-section 原背景 rgba(0,0,0,.18) 半透明，吸顶时下方滚动内容会透过面板造成文字重叠
            '.nek-research-queue.nek-float{position:sticky;top:0;z-index:20;margin-top:8px;background-color:var(--c-bg,#092653);background-image:linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18))}',
            '.nek-research-queue.nek-float.nek-collapsed{box-shadow:0 2px 6px rgba(0,0,0,.35)}',
            '.nek-research-queue.nek-collapsed > .nek-research-body{display:none}',
            '.nek-research-queue .nek-research-head{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;-webkit-user-select:none}',
            '.nek-research-queue .nek-research-head .section-title{flex:0 0 auto;margin:0;cursor:pointer}',
            '.nek-research-queue .nek-research-head-hint{flex:1;min-width:0;font-size:12px;line-height:20px;color:var(--c-text-dim,#83c3c3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}',
            '.nek-research-queue .nek-research-head-hint.nek-research-insufficient{color:#FF4B88}',
            '.nek-research-queue .nek-research-head-arrow{flex:0 0 auto;font-size:12px;color:var(--color-mian,#74F9BC);transition:transform .2s ease}',
            '.nek-research-queue.nek-collapsed .nek-research-head-arrow{transform:rotate(-90deg)}',
            '.nek-research-queue .setting-item{grid-template-columns:auto 1fr auto}',
            '.nek-research-entries,.nek-research-total{max-height:min(24vh,14rem);overflow:auto}',
            '.nek-research-queue{font-size:13px}',
            // 游戏的进度底色 .research-task-progress-inner 是 absolute 定位，但父级 .research-task 是 static，
            // 会以最近定位祖先 .research-task-host（含本队列面板）为基准铺满整个 host；
            // 让 .research-task 自己成为定位基准，进度背景就限制在「正在研究」块内（task-top + task-actions）
            '.research-task{position:relative}',
            '.nek-research-heading{display:flex;align-items:center;justify-content:space-between}',
            '.nek-research-queue .icon-help{flex-shrink:0}',
            '.nek-research-entry{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0}',
            '.nek-research-entry span,.nek-research-total{white-space:pre-line}',
            '.nek-research-queue .btn{flex-shrink:0}',
            '.research-project-action.nek-research-actions{flex-wrap:wrap;gap:6px}',
            '.nek-output-holding,.nek-output-queue{white-space:nowrap}',
            '.nek-material-available{white-space:nowrap}',
            '.nek-output-name{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:flex-start;row-gap:2px}',
            // 缺少材料提醒：红色加粗（含状态行与材料明细行）
            '.nek-research-insufficient{color:#FF4B88;font-weight:700}',
            // 待加入卡片「可用」数值不足：固定红色（与标签的提示色区分，压过原生 disabled 配色）
            '.nek-research-avail-insufficient{color:rgb(255,48,33)!important;font-weight:700}'
        ].join('\n');
        doc.head.appendChild(el);
    }
    // 面板右上角帮助问号：样式复用游戏原生 .icon-help（种植页/市场页同款圆形问号），
    // 点击走游戏原生 showHelpModal 弹窗（无此 API 时降级为顶部通知）
    function researchHelpBadge() {
        const h = doc.createElement('div'); h.className = 'icon-help nek-research-help'; h.textContent = '?';
        h.addEventListener('click', e => {
            e.stopPropagation();
            const tip = '加入队列仅预留材料；轮到开研时才扣除。移出队列不会取消正在进行的研究。开关见设置页。';
            const u = env.ui();
            if (u?.showHelpModal) u.showHelpModal('研究队列帮助', tip);
            else u?.notifier?.show?.(tip, 'tip', 5000);
        });
        return h;
    }
    function decorateResearch(v) {
        const ui = env.ui();
        if (detachResearchScroll && (!detachResearchScroll.panel.isConnected || !env.enabled() || !v.account)) {
            detachResearchScroll();
        }
        doc.querySelectorAll('.nek-research-add').forEach(b => { const hidden = !env.enabled(); if (b.hidden !== hidden) b.hidden = hidden; });
        if (!env.enabled() || !v.account) { doc.querySelectorAll('.nek-research-queue').forEach(p => p.remove()); return; }
        // 窄屏/触屏（与游戏断点一致）才启用「嵌入列表+吸顶折叠」；PC 端空间足够，保留 v1.40.0 固定面板样式
        const narrow = (function () { try { return env.window.matchMedia('(hover: none), (max-width: 768px)').matches; } catch (e) { return false; } })();
        const host = narrow && ui?.researchRoot?.isConnected ? ui.researchRoot
            : (ui?.researchTaskHost?.isConnected ? ui.researchTaskHost : null);
        if (!host) return;
        let panel = host.querySelector('.nek-research-queue');
        // 跨断点切换（旋转屏幕/拉伸窗口）时结构与宿主都会变：清掉所有不匹配当前模式的面板
        doc.querySelectorAll('.nek-research-queue').forEach(p => {
            if (p !== panel || (panel && panel._nekNarrow !== narrow)) {
                if (detachResearchScroll?.panel === p) detachResearchScroll();
                p.remove();
            }
        });
        if (panel && !panel.isConnected) panel = null;
        if (!panel && narrow) {
            panel = doc.createElement('div'); panel.className = 'neon-section nek-research-queue nek-float';
            panel._nekNarrow = true;
            const head = doc.createElement('div'); head.className = 'nek-research-head';
            const title = doc.createElement('div'); title.className = 'section-title'; title.textContent = '研究队列';
            const hint = doc.createElement('div'); hint.className = 'nek-research-head-hint';
            const arrow = doc.createElement('div'); arrow.className = 'nek-research-head-arrow'; arrow.textContent = '▾';
            head.append(title, hint, researchHelpBadge(), arrow);
            panel.appendChild(head);
            const body = doc.createElement('div'); body.className = 'nek-research-body';
            // v1.42.1 面板只显示队列条目与材料预留/背包/可用；说明移入右上角「?」弹窗，
            // 研究状态不再整行显示（折叠标题摘要仅在缺材料时出现）
            const entries = doc.createElement('div'); entries.className = 'nek-research-entries'; body.appendChild(entries);
            const total = doc.createElement('div'); total.className = 'nek-research-total'; body.appendChild(total);
            panel.appendChild(body);
            // 折叠状态应用（点击标题与自动折叠共用）；IO 回调不产生 childList 变更，标题摘要须在此处直接刷新
            panel._nekApply = function () {
                const collapsed = panel._nekManual !== undefined && panel._nekManual !== null
                    ? panel._nekManual : !!panel._nekAutoOver;
                if (panel.classList.contains('nek-collapsed') !== collapsed) {
                    if (collapsed) {
                        // 吸顶面板折叠后自身变矮，下方内容整体上移：scrollTop 补偿 +grow 让视口内内容保持不动。
                        // 注意方向必须为 +（原 - 会令面板脱离吸顶立即回展开，形成折叠↔展开抖动循环）
                        const grow = body.offsetHeight;
                        panel.classList.add('nek-collapsed');
                        try { if (grow > 0 && host.scrollTop > 0) host.scrollTop = host.scrollTop + grow; } catch (e) { /* 忽略 */ }
                    } else {
                        panel.classList.remove('nek-collapsed');
                    }
                }
                arrow.textContent = collapsed ? '▸' : '▾';
                try {
                    // v1.42.1 折叠摘要仅在缺材料时显示（红色）；「等待当前研究完成」等常驻状态一律不显示
                    const v2 = core.view();
                    const st = String(v2.researchStatus || '');
                    const warn = collapsed && st.includes('材料不足');
                    text(hint, warn ? st : '');
                    hint.classList.toggle('nek-research-insufficient', warn);
                } catch (e) { /* 忽略 */ }
            };
            head.addEventListener('click', e => { e.stopPropagation(); panel._nekManual = !panel.classList.contains('nek-collapsed'); panel._nekApply(); });
            host.insertBefore(panel, host.firstElementChild);
            // 滚动检测：面板顶部贴住容器可视区顶即折叠吸顶，离开即展开。
            // 不用 IntersectionObserver——沙盒环境中 IO 回调不触发（实测），scroll + 几何判定跨环境可靠。
            // 阈值须计入容器 padding/border：sticky top:0 贴的是 content 区顶，而非 border-box 顶
            panel._nekSync = function () {
                if (!panel.isConnected || !host.isConnected) return;
                let over = false;
                try {
                    const cs = getComputedStyle(host);
                    const top = host.getBoundingClientRect().top + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.paddingTop) || 0);
                    over = panel.getBoundingClientRect().top <= top + 1;
                } catch (e) { return; }
                if (over !== !!panel._nekAutoOver) { panel._nekAutoOver = over; panel._nekManual = null; panel._nekApply(); }
            };
            host.addEventListener('scroll', panel._nekSync, { passive: true });
            detachResearchScroll = () => {
                host.removeEventListener('scroll', panel._nekSync);
                detachResearchScroll = null;
            };
            detachResearchScroll.panel = panel;
            panel._nekSync();   // 刷新时可能已在列表中部：立即同步折叠状态
        } else if (!panel) {
            panel = doc.createElement('div'); panel.className = 'neon-section nek-research-queue';
            panel._nekNarrow = false;
            // v1.42.1 标题行右侧放帮助问号（种植页 .icon-help 同款），说明移入弹窗
            const heading = doc.createElement('div'); heading.className = 'section-title nek-research-heading';
            const titleSpan = doc.createElement('span'); titleSpan.textContent = '研究队列';
            heading.append(titleSpan, researchHelpBadge()); panel.appendChild(heading);
            const entries = doc.createElement('div'); entries.className = 'nek-research-entries'; panel.appendChild(entries);
            const total = doc.createElement('div'); total.className = 'nek-research-total'; panel.appendChild(total);
            host.appendChild(panel);
        }
        // v1.42.1 状态行已删：面板仅显示队列条目与材料预留/背包/可用；
        // 折叠标题摘要仅在缺材料时出现（红色），「等待当前研究完成」等常驻状态不显示
        const headHint = panel.querySelector('.nek-research-head-hint');
        if (headHint) {
            const st = String(v.researchStatus || '');
            const warn = panel.classList.contains('nek-collapsed') && st.includes('材料不足');
            text(headHint, warn ? st : '');
            headHint.classList.toggle('nek-research-insufficient', warn);
        }
        const signature = JSON.stringify(v.queue.entries.map(e => [e.entry.key, e.entry.projectId, e.targetLevel, e.materials, e.error, !!e.entry.submitted]));
        if (panel._nekQueueSignature !== signature) {
            panel._nekQueueSignature = signature;
            const entries = panel.querySelector('.nek-research-entries'); entries.replaceChildren();
            const queueLocked = v.queue.entries.some(row => row.entry.submitted);
            v.queue.entries.forEach((e, i) => {
                const row = doc.createElement('div'); row.className = 'nek-research-entry';
                const label = doc.createElement('span');
                const name = e.found ? e.found.facility.name + ' · ' + e.found.project.name : '#' + e.entry.projectId;
                const cost = Object.keys(e.materials).map(id => (env.game().getItem(Number(id))?.name || '#' + id) + '×' + e.materials[id]).join('、');
                // 显示起止等级：消耗对应「从当前计划等级升到目标等级」的那次研究，便于核对
                label.textContent = (i + 1) + '. ' + name + ' Lv.' + e.level + ' → Lv.' + e.targetLevel +
                    (e.entry.submitted ? '（开研确认中）' : '') + '\n' + (e.error || '预留：' + (cost || '无'));
                const remove = button('移出', 'research-task-finish', () => { if (core.remove(e.entry.key)) refreshResearchRows(); decorate(); });
                remove.disabled = queueLocked;
                if (remove.disabled) remove.classList.add('disabled');
                row.append(label, remove); entries.appendChild(row);
            });
            if (!v.queue.entries.length) entries.textContent = '队列为空，请在研究项目旁点击「加入研究队列」。';
        }
        let insufficient = false;
        const totals = Object.keys(v.queue.totals).map(id => {
            const have = env.game().getItemQuantity(Number(id)), reserved = v.queue.totals[id];
            if (have < reserved) insufficient = true;
            return (env.game().getItem(Number(id))?.name || '#' + id) + '：预留 ' + reserved + ' / 背包 ' + have + (have < reserved ? '（缺 ' + (reserved - have) + '）' : ' / 可用 ' + (have - reserved));
        }).join('\n');
        const totalEl = panel.querySelector('.nek-research-total'); text(totalEl, totals);
        totalEl.classList.toggle('nek-research-insufficient', insufficient);
        // 缺少材料提醒统一红色：材料汇总行 + 折叠标题摘要（红色 warn 已在上面的 headHint 块处理）
    }
    function decorateSettings(v) {
        const section = doc.querySelector('.nek-assist-section .setting-list');
        if (!section || !v.account) return;
        let block = section.querySelector('.nek-auto-settings');
        if (!block) {
            block = doc.createElement('div'); block.className = 'nek-auto-settings';
            toggle('队列自动开研', 'researchQueue', block); toggle('自动领取已完成研究', 'researchFinish', block);
            toggle('自动接受任务', 'questAccept', block); toggle('自动领取任务奖励', 'questReward', block);
            toggle('显示产出库存、队列产出和生产材料可用量', 'holdings', block);
            const status = doc.createElement('div'); status.className = 'nek-quest-status stat-sub'; block.appendChild(status); section.appendChild(block);
        }
        text(block.querySelector('.nek-quest-status'), v.questStatus);
    }
    function resolveInventoryItem(row, name) {
        const icon = row.querySelector('.action-item-container-icon .item');
        if (!icon) return null;
        const known = itemInfo.get(icon);
        if (known) return known;
        // 注入前已经渲染的面板按完整物品名唯一匹配，不把贴图编号当物品 ID。
        const label = name.firstElementChild?.textContent.trim();
        const matches = Object.values(env.data()?.items || {}).filter(d => d.name === label);
        const enhancement = Number(icon.querySelector('.item-enhancement')?.textContent.trim() || 0);
        return matches.length === 1 && Number.isInteger(enhancement) ? { id: Number(matches[0].id), enhancement } : null;
    }
    function decorateHoldings(v) {
        if (!env.enabled() || !v.settings.holdings) {
            doc.querySelectorAll('.nek-output-holding, .nek-output-queue, .nek-material-available').forEach(el => el.remove());
            doc.querySelectorAll('.nek-output-name').forEach(el => el.classList.remove('nek-output-name')); return;
        }
        const g = env.game(); if (!g?.character?.uid) return;
        let projection, reservations;
        const decorated = new Set(), materialLabels = new Set(), queueLabels = new Set();
        function decorateQueueOutput(holder, item, material = false) {
            projection ??= estimateQueueOutputs(g, env.ui(), env.data(), queueMetadata, env.cookingChestDivisor);
            const total = projection.get(item.id + ':' + item.enhancement);
            let label = holder.querySelector('.nek-output-queue');
            if (!label) {
                label = doc.createElement(material ? 'div' : 'span');
                label.className = (material ? 'action-item-container-text ' : '') + 'stat-sub nek-output-queue';
                label.title = '当前行动及待执行队列的计划毛产出，按当前加成估算，假设材料足够。随机掉落按期望值计算，不限次行动单独标出。';
                holder.appendChild(label);
            }
            queueLabels.add(label);
            const amount = total?.amount || 0;
            const finite = amount > 0 && amount < 0.01 ? '<0.01' : (total?.approximate ? '约 ' : '') +
                amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
            const display = total?.unlimited ? (amount > 0 ? finite + ' + 不限次' : '不限次') : finite;
            text(label, '队列产出：' + display);
        }
        const decorateMaterial = row => {
            const info = row.querySelector('.action-item-container-info');
            const name = info?.querySelector('.action-item-container-text');
            const item = name && resolveInventoryItem(row, name);
            if (!item) return;
            reservations ??= estimateQueueMaterials(g, env.data(), queueMetadata);
            const have = Number(g.getItemQuantity(item.id, item.enhancement) || 0);
            const reserved = reservations.get(item.id + ':' + item.enhancement) || 0;
            let label = info.querySelector('.nek-material-available');
            if (!label) {
                label = doc.createElement('div');
                label.className = 'action-item-container-text stat-sub nek-material-available';
                info.appendChild(label);
            }
            materialLabels.add(label);
            const available = Math.max(0, have - reserved);
            text(label, '剩余可用：' + available.toLocaleString('zh-CN', { maximumFractionDigits: 2 }));
            const hint = reserved === Infinity ? '不限次行动已预留该材料' :
                '当前背包数量减去进行中和待执行行动的计划用量，按当前加成估算。';
            if (label.title !== hint) label.title = hint;
            decorateQueueOutput(info, item, true);
        };
        doc.querySelectorAll('.cooking-page .cooking-detail, .nek-prod-detail, .nek-pick-detail, .action-modal-content').forEach(root => {
            let production = root.matches('.nek-prod-detail');
            if (root.matches('.action-modal-content')) {
                const action = env.identifyAction(root);
                if (!action || ![1, 2, 6, 7].includes(Number(action.action))) return;
                production = Number(action.action) === 6;
            }
            root.querySelectorAll('.cooking-detail-section, .modal-box-item').forEach(section => {
                const titles = section.querySelectorAll('.modal-container-title');
                if (production) {
                    titles.forEach(heading => {
                        if (heading.textContent.trim() !== '消耗') return;
                        // 原生弹窗将「基本信息」和「消耗」放在同一 section，各自有材料/信息列表。
                        const list = heading.nextElementSibling;
                        if (list?.matches('.action-item-container-list')) list.querySelectorAll('.action-item-container').forEach(decorateMaterial);
                        else if (titles.length === 1) section.querySelectorAll('.action-item-container').forEach(decorateMaterial);
                    });
                }
                const title = titles[0]?.textContent.trim();
                if (!['获得', '产出', '额外奖励'].includes(title)) return;
                section.querySelectorAll('.action-item-container').forEach(row => {
                    const name = row.querySelector('.action-item-container-info .action-item-container-text');
                    const item = name && resolveInventoryItem(row, name);
                    if (!item) return;
                    decorated.add(name);
                    let tag = name.querySelector('.nek-output-holding');
                    if (!tag) {
                        tag = doc.createElement('span'); tag.className = 'stat-sub nek-output-holding';
                        tag.title = '当前背包同物品、同强化等级的数量（不含已装备物品）';
                        name.classList.add('nek-output-name'); name.appendChild(tag);
                    }
                    text(tag, '背包：' + Number(g.getItemQuantity(item.id, item.enhancement) || 0).toLocaleString('zh-CN'));
                    decorateQueueOutput(name, item);
                });
            });
        });
        doc.querySelectorAll('.nek-output-name').forEach(name => {
            if (decorated.has(name)) return;
            name.querySelectorAll('.nek-output-holding').forEach(el => el.remove());
            name.classList.remove('nek-output-name');
        });
        doc.querySelectorAll('.nek-output-queue').forEach(label => { if (!queueLabels.has(label)) label.remove(); });
        doc.querySelectorAll('.nek-material-available').forEach(label => { if (!materialLabels.has(label)) label.remove(); });
    }
    // ---- 库存成本：按账号保存的单件平均成本，手动录入与市场买入加权更新共用 ----
    // 存储键沿用旧名以免升级后丢失已录入数据；界面文案统一为「库存成本」。
    const warehouseKey = uid => 'nek_warehouse_cost_v1:' + uid;
    function warehouseCosts(uid) {
        try {
            const raw = JSON.parse(storage.getItem(warehouseKey(uid)) || '{}');
            return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        } catch { return {}; }
    }
    const ledgerKey = uid => 'nek_inventory_ledger_v1:' + uid;
    function warehouseLedger(uid) {
        try {
            const saved = JSON.parse(storage.getItem(ledgerKey(uid)) || 'null');
            if (saved) return normalizeInventoryLedger(saved);
        } catch { /* 新建账本 */ }
        return normalizeInventoryLedger(null);
    }
    function saveWarehouseLedger(uid, ledger, costs) {
        try {
            if (costs && env.saveWarehouseState) env.saveWarehouseState(uid, ledger, costs);
            else {
                if (costs) storage.setItem(warehouseKey(uid), JSON.stringify(costs));
                storage.setItem(ledgerKey(uid), JSON.stringify(ledger));
            }
        } catch { return false; }
        publishStockCost(0);
        return true;
    }
    function recordWarehouseBase(ledger, id, quantity) {
        const game = env.game();
        const now = Date.now();
        ledger.excluded = ledger.excluded.filter(item => item !== id);
        ledger.items[id] = { ...ledger.items[id], quantity, since: now };
        for (const order of game.order || []) {
            if (Number(order.item) !== id || Number(order.side) !== 2 || Number(order.enhancement || 0) !== 0) continue;
            const pending = (game.settlement || []).filter(row => Number(row.order_id) === Number(order.id) && Number(row.item) === id)
                .reduce((total, row) => total + (Number(row.quantity) || 0), 0);
            const claimed = Number(order.traded) - pending;
            if (Number.isSafeInteger(claimed) && claimed > 0) ledger.orders[order.id] = { quantity: claimed };
        }
    }
    function addPurchase(entry, batch, source) {
        entry.purchases = [...(entry.purchases || []), {
            at: batch.at || Date.now(), quantity: batch.quantity, price: batch.price, source
        }].slice(-20);
    }
    const historyReady = () => costEnabled() && (env.warehouseReady?.() ?? true);
    let historyRequest = null;
    function requestWarehouseHistory(uid, force = false) {
        const msg = env.msg();
        if (!historyReady() || msg?.ws?.readyState !== 1 || typeof msg.handlers?.market_history !== 'function') return;
        const now = Date.now();
        if (historyRequest?.uid === uid && historyRequest.socket === msg.ws && now - historyRequest.at < (force ? 3000 : 60000)) return;
        const ledger = warehouseLedger(uid), costs = warehouseCosts(uid);
        let migrated = false;
        for (const id of Object.keys(costs).map(Number)) {
            if (ledger.items[id]) continue;
            recordWarehouseBase(ledger, id, Number(env.game().getItemQuantity(id)) || 0);
            migrated = true;
        }
        if (migrated) saveWarehouseLedger(uid, ledger);
        if (!force && !Object.keys(ledger.items).length) return;
        if (msg.send('market_history', {}) !== true) return false;
        historyRequest = { uid, socket: msg.ws, at: now };
        return true;
    }
    function importWarehouseHistory(uid, history) {
        const ledger = warehouseLedger(uid), costs = warehouseCosts(uid), g = env.game();
        const groups = new Map();
        for (const batch of warehouseHistoryBatches(history, g.settlement || [], ledger)) {
            if (!groups.has(batch.item)) groups.set(batch.item, []);
            groups.get(batch.item).push(batch);
        }
        let changed = false;
        for (const [item, batches] of groups) {
            const entry = ledger.items[item];
            // Direct fills can arrive without an order ID. Match an identical nearby
            // receipt once, when the game later exposes its historical order ID.
            const fresh = batches.filter(batch => {
                const receipt = (entry.purchases || []).find(r => r.source === '直购' &&
                    Math.abs(r.at - batch.at) <= 5000 && r.quantity === batch.quantity && r.price === batch.price);
                if (!receipt) return true;
                receipt.source = '直购已核对';
                ledger.orders[batch.id] = { quantity: (ledger.orders[batch.id]?.quantity || 0) + batch.quantity };
                changed = true;
                return false;
            });
            const actual = Number(g.getItemQuantity(item)) || 0;
            const acquired = fresh.reduce((sum, batch) => sum + batch.quantity, 0);
            // 剩余旧库存沿用旧单价。背包数量少于未入账采购量时，
            // 旧库存视为耗尽，按这些采购批次的加权单价计剩余库存。
            let balance = Math.max(0, actual - acquired);
            for (const batch of fresh) {
                costs[item] = mergeWarehouseCost(costs[item], balance, batch.price, batch.quantity);
                balance += batch.quantity;
                ledger.orders[batch.id] = { quantity: (ledger.orders[batch.id]?.quantity || 0) + batch.quantity };
                addPurchase(entry, batch, '历史采购');
                changed = true;
            }
            if (fresh.length) entry.quantity = actual;
        }
        if (changed) saveWarehouseLedger(uid, ledger, costs);
    }
    // 通知主脚本刷新悬停行情里的「库存成本」行（成本页自身在 render 时直接读取）。
    function publishStockCost(id) {
        try { doc.dispatchEvent(new CustomEvent('nek-stock-cost-updated', { detail: { id: Number(id) || 0 } })); }
        catch { /* 不支持 CustomEvent 时不影响保存 */ }
    }
    // 左一价 = 市场快照 levels[enh].sell_price（与物品说明中的「左一价」同口径）。
    function leftPrice(id, enh) {
        try {
            return Number(env.game().marketCacheData.get(Number(id))?.levels?.[Number(enh) || 0]?.sell_price) || 0;
        } catch { return 0; }
    }
    const costKey = uid => 'nek_cost_items_v1:' + uid;
    function costProducts(uid) {
        try {
            const saved = JSON.parse(storage.getItem(costKey(uid)) || '[]');
            return Array.isArray(saved) ? [...new Set(saved.map(Number).filter(id => id > 0))] : [];
        } catch { return []; }
    }
    function saveCostProducts(uid, list) {
        try { storage.setItem(costKey(uid), JSON.stringify(list)); return true; }
        catch { return false; }
    }
    // 市场详情「精算」：切换当前物品是否在成本核算清单中。
    function decorateMarketCost() {
        const fav = doc.querySelector('.marketplace-content-good .marketplace-favorite');
        const id = Number(env.ui()?.marketplaceOption?.id ?? env.ui()?.itemId);
        // 只有生产/烹饪成品（与成本选择浮层同口径）才显示精算入口。
        const eligible = id > 0 && craftableProduct(env.data(), id);
        if (!fav || !costEnabled() || !eligible) {
            doc.querySelectorAll('.nek-market-cost').forEach(b => b.remove());
            return;
        }
        let btn = doc.querySelector('.marketplace-content-good .nek-market-cost');
        if (!btn) {
            btn = doc.createElement('div');
            btn.className = 'marketplace-favorite nek-market-cost';
            btn.setAttribute('role', 'button');
            btn.tabIndex = 0;
            btn.title = '加入/剔除成本核算清单';
            btn.innerHTML = '<span>精算</span>';
            fav.before(btn);
            const activate = () => {
                // 市场详情切换物品时按钮可能被复用，点击时重新读取当前 id。
                const currentId = Number(env.ui()?.marketplaceOption?.id ?? env.ui()?.itemId);
                const uid = core.view().account;
                if (!(currentId > 0) || !uid) return;
                const list = costProducts(uid);
                const next = list.includes(currentId) ? list.filter(x => x !== currentId) : [...list, currentId];
                if (saveCostProducts(uid, next)) decorateMarketCost();
            };
            btn.addEventListener('click', e => { e.stopPropagation(); activate(); });
            btn.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
            });
        }
        const uid = core.view().account;
        const on = id > 0 && uid && costProducts(uid).includes(id);
        btn.classList.toggle('active', !!on);
        btn.title = on ? '从成本核算清单剔除' : '加入成本核算清单';
    }
    let refreshInventoryPanel = null;
    function mountInventoryCost(page, uid, data, game, ui) {
        const main = page.querySelector('.page-main');
        const tabs = page.querySelectorAll('.page-tab-item');
        function add(parent, tag, name, text) {
            const el = doc.createElement(tag);
            el.className = name;
            if (text != null) el.textContent = text;
            parent.appendChild(el);
            return el;
        }
        const panel = add(main.parentNode, 'div', 'page-main nek-inventory-panel');
        panel.hidden = true;
        const form = add(panel, 'div', 'nek-inventory-form');
        const mode = add(form, 'select', '');
        mode.setAttribute('aria-label', '核算方式');
        add(mode, 'option', '', '录入库存成本').value = 'stock';
        add(mode, 'option', '', '按材料成本核算产物').value = 'recipe';
        const search = add(form, 'input', '');
        search.type = 'search';
        search.placeholder = '物品名或 ID';
        search.setAttribute('aria-label', search.placeholder);
        const picker = add(form, 'select', '');
        picker.setAttribute('aria-label', '选择物品');
        const quantity = add(form, 'input', '');
        const price = add(form, 'input', '');
        for (const [input, label, inputMode] of [[quantity, '期初数量', 'numeric'], [price, '单件成本', 'decimal']]) {
            input.placeholder = label;
            input.setAttribute('aria-label', label);
            input.inputMode = inputMode;
        }
        const saveButton = add(form, 'button', 'btn', '录入物品');
        const sync = add(form, 'button', 'btn', '读取采购历史');
        const status = add(panel, 'p', '', '');
        status.setAttribute('role', 'status');
        const results = add(panel, 'div', 'nek-cost-results');
        const choices = Object.values(data.items).filter(item => item.id > 1);
        const held = id => Number(game.getItemQuantity(id)) || 0;
        const fmt = value => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
        const editingAllowed = () => core.view().account === uid && (env.warehouseReady?.() ?? true);
        function setInputs() {
            const id = Number(picker.value);
            quantity.value = id ? String(held(id)) : '';
            price.value = warehouseCosts(uid)[id] ?? '';
            saveButton.disabled = !id;
        }
        function updatePicker(selected) {
            picker.replaceChildren();
            const query = search.value.trim().toLowerCase();
            const isRecipe = mode.value === 'recipe';
            quantity.hidden = price.hidden = isRecipe;
            saveButton.textContent = isRecipe ? '添加产物' : '录入物品';
            for (const item of choices) {
                if (!item.name.toLowerCase().includes(query) && !String(item.id).includes(query)) continue;
                if (isRecipe && !craftableProduct(data, item.id)) continue;
                add(picker, 'option', '', item.name).value = String(item.id);
            }
            if (selected) picker.value = String(selected);
            setInputs();
        }
        search.addEventListener('input', () => updatePicker());
        mode.addEventListener('change', () => updatePicker());
        picker.addEventListener('change', setInputs);
        updatePicker();
        let lastView = '';
        function render() {
            if (!page.isConnected) { refreshInventoryPanel = null; return; }
            if (panel.hidden || core.view().account !== uid) return;
            const ledger = warehouseLedger(uid), costs = warehouseCosts(uid);
            const ids = [...new Set([...Object.keys(costs).map(Number), ...ledger.products])];
            const view = JSON.stringify([ledger, costs, ids.map(held)]);
            if (view === lastView) return;
            lastView = view;
            results.replaceChildren();
            function cardFor(id, isRecipe) {
                const card = add(results, 'section', 'neon-section');
                const head = add(card, 'div', 'nek-inventory-name');
                const def = data.items[id];
                if (def && typeof ui.showItem === 'function') {
                    const icon = add(head, 'div', '');
                    ui.showItem(icon, def, { enhancement: 0 });
                    ui.bindItemTooltip?.(icon, def, { item: { id, enhancement: 0, quantity: held(id) } });
                }
                add(head, 'strong', '', def?.name || '#' + id);
                const actions = add(card, 'div', 'nek-inventory-actions');
                if (!isRecipe) add(actions, 'button', 'btn', '修改').addEventListener('click', () => {
                    mode.value = 'stock';
                    search.value = '';
                    updatePicker(id);
                    price.focus();
                });
                add(actions, 'button', 'btn', '删除').addEventListener('click', () => {
                    if (!editingAllowed()) return;
                    const next = warehouseLedger(uid), prices = warehouseCosts(uid);
                    if (isRecipe) next.products = next.products.filter(product => product !== id);
                    else {
                        delete next.items[id];
                        delete prices[id];
                        if (!next.excluded.includes(id)) next.excluded.push(id);
                    }
                    if (!saveWarehouseLedger(uid, next, prices)) status.textContent = '删除失败，请重试。';
                });
                return card;
            }
            for (const id of Object.keys(costs).map(Number)) {
                const card = cardFor(id, false), entry = ledger.items[id], actual = held(id);
                add(card, 'div', '', '背包 ' + fmt(actual) + ' · 单件 ' + fmt(Number(costs[id])) + ' · 总额 ' + fmt(actual * costs[id]));
                if (entry && entry.quantity !== actual) add(card, 'div', '', '账面 ' + fmt(entry.quantity) + '，按背包数量核算');
                if (entry?.purchases?.length) {
                    const details = add(card, 'details', '');
                    add(details, 'summary', '', '近期采购');
                    for (const receipt of entry.purchases.slice().reverse()) {
                        add(details, 'div', '', new Date(receipt.at).toLocaleString() + ' · ' + receipt.source +
                            ' · ' + fmt(receipt.quantity) + ' 件 × ' + fmt(receipt.price));
                    }
                }
            }
            for (const id of ledger.products) {
                const card = cardFor(id, true);
                const node = recipeCost(data, id, null);
                const total = inventoryRecipeTotal(node, costs);
                add(card, 'div', '', total == null ? '生产成本待核算，部分材料缺少库存单价' : '单件生产成本 ' + fmt(total) + ' 喵点');
            }
            if (!ids.length) add(results, 'p', '', '添加材料录入期初数量和单价，或选择产物核算生产成本。');
        }
        saveButton.addEventListener('click', () => {
            const id = Number(picker.value);
            if (!editingAllowed() || !data.items[id]) return;
            const ledger = warehouseLedger(uid), costs = warehouseCosts(uid);
            if (mode.value === 'recipe') {
                if (!craftableProduct(data, id) || ledger.products.includes(id)) return;
                ledger.products.push(id);
            } else {
                const raw = quantity.value.trim(), qty = Number(raw), value = parseStockCost(price.value);
                if (!/^\d+$/.test(raw) || !Number.isSafeInteger(qty) || value == null) {
                    status.textContent = '请输入非负整数数量和最多两位小数的成本单价。';
                    return;
                }
                recordWarehouseBase(ledger, id, qty);
                costs[id] = value;
            }
            status.textContent = saveWarehouseLedger(uid, ledger, costs) ? '已保存。' : '保存失败，请重试。';
        });
        sync.addEventListener('click', () => {
            if (!editingAllowed()) return;
            status.textContent = requestWarehouseHistory(uid, true)
                ? '已请求采购历史，结果会自动更新。' : '暂时无法再次请求，请稍后重试。';
        });
        tabs.forEach((tab, index) => tab.addEventListener('click', () => {
            main.hidden = index !== 0;
            panel.hidden = index === 0;
            tabs.forEach((other, i) => other.classList.toggle('active', i === index));
            render();
        }));
        refreshInventoryPanel = render;
    }

    function decorateCostEntry() {
        const entry = doc.querySelector('.nek-cost-entry');
        if (!costEnabled()) { entry?.remove(); return; }
        const anchor = doc.querySelector('.sidebar-group-items .sidebar-item.action-8');
        if (!anchor || entry) return;
        const button = doc.createElement('div');
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
        button.className = 'sidebar-item nek-cost-entry';
        button.title = '成本核算（又名降本增笑）';
        button.innerHTML = '<div class="sidebar-item-name"><span>成本核算</span><span class="nek-cost-alias">又名降本增笑</span></div>';
        anchor.after(button);
        button.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            button.click();
        });
        button.addEventListener('click', () => {
            if (button.classList.contains('active')) return;
            env.ui().changeContent('nek-cost');
            const page = doc.querySelector('.page.nek-cost');
            if (!page) return;
            button.classList.add('active');
            page.innerHTML = '<div class="page-body neon"><div class="page-tab"><button type="button" class="page-tab-item active">市场成本</button><button type="button" class="page-tab-item">库存核算</button></div><div class="page-main"><div class="nek-cost-tools"><button type="button" class="btn nek-cost-pick">选择物品</button><button type="button" class="btn">刷新行情</button></div><p role="status"></p><div class="nek-cost-results"></div></div></div>';
            const refresh = page.querySelector('.nek-cost-tools button:not(.nek-cost-pick)');
            const pickBtn = page.querySelector('.nek-cost-pick');
            const status = page.querySelector('[role="status"]');
            const results = page.querySelector('.nek-cost-results');
            const uid = core.view().account;
            const data = env.data();
            const game = env.game(), ui = env.ui();
            mountInventoryCost(page, uid, data, game, ui);
            // 可核算物品 = 有可展开配方的生产/烹饪成品。
            const choices = Object.values(data.items).filter(item => craftableProduct(data, item.id));
            const allowed = new Set(choices.map(item => item.id));
            let products = costProducts(uid).filter(id => allowed.has(id));
            if (!costProducts(uid).length) products = [6103, 6113, 6123];
            let snapshot = null, substitutes = {}, quoteFn = null;
            try { substitutes = JSON.parse(storage.getItem('nek_cost_sub_v1:' + uid) || '{}') || {}; }
            catch { substitutes = {}; }
            const append = (parent, tag, cls, value) => {
                const el = doc.createElement(tag);
                el.className = cls;
                if (value != null) el.textContent = value;
                parent.appendChild(el);
                return el;
            };
            function save(next) {
                if (core.view().account !== uid) return;
                if (!saveCostProducts(uid, next)) { status.textContent = '清单保存失败，请重试。'; return; }
                products = next;
                render(snapshot);
            }
            // ---- 选择物品浮层：顶部 全部/生产/烹饪，第二层各四分支，网格显示图标+背包数量 ----
            const PROD_GROUPS = [
                { name: '原料', groups: [4, 5, 6] }, { name: '战斗', groups: [8, 9, 10] },
                { name: '生活', groups: [7, 16, 17] }, { name: '其他', groups: null }
            ];
            const COOK_GROUPS = [
                { name: '食物', types: [1] }, { name: '饮料', types: [2] },
                { name: '材料', types: [3] }, { name: '钓饵', types: [4] }
            ];
            function itemGroup(item) {
                const src = (item.sources?.actions || []).find(s => s.cooking && data.cookingRecipes[s.id]);
                if (src) return { kind: 'cooking', value: Number(data.cookingRecipes[src.id].type) };
                const prod = (item.sources?.actions || []).map(s => data.actions[s.id]).find(a => a && a.action === 6);
                return { kind: 'produce', value: Number(prod?.group || 0) };
            }
            function branchItems(tab, branch) {
                const used = new Set([4, 5, 6, 8, 9, 10, 7, 16, 17]);
                return choices.filter(item => {
                    const g = itemGroup(item);
                    if (tab === '生产') {
                        if (g.kind !== 'produce') return false;
                        const def = PROD_GROUPS.find(b => b.name === branch);
                        return def.groups ? def.groups.includes(g.value) : !used.has(g.value);
                    }
                    if (tab === '烹饪') return g.kind === 'cooking' && COOK_GROUPS.find(b => b.name === branch)?.types.includes(g.value);
                    // 全部：按该分支在生产/烹饪两侧任一匹配。
                    if (g.kind === 'cooking') return COOK_GROUPS.find(b => b.name === branch)?.types.includes(g.value) === true;
                    const def = PROD_GROUPS.find(b => b.name === branch);
                    if (!def) return false;
                    return def.groups ? def.groups.includes(g.value) : !used.has(g.value);
                }).sort((a, b) => a.id - b.id);
            }
            function closePicker() { doc.querySelector('.nek-cost-picker')?.remove(); }
            function openPicker(anchor) {
                closePicker();
                const picker = append(doc.body, 'div', 'selector neon nek-cost-picker');
                append(picker, 'div', 'neon-title', '选择物品');
                const content = append(picker, 'div', 'selector-content');
                const tabs = append(content, 'div', 'selector-tabs ui-tab');
                const subs = append(content, 'div', 'nek-cost-subtabs ui-tab');
                const list = append(content, 'div', 'selector-list');
                const grid = append(list, 'div', 'selector-grid');
                let tab = '全部', branch = null;
                const tabOrder = ['全部', '生产', '烹饪'];
                function drawTabs() {
                    tabs.replaceChildren();
                    tabOrder.forEach(t => {
                        const el = append(tabs, 'div', 'selector-tab-btn ui-tab-item' + (t === tab ? ' active' : ''), t);
                        // 重绘会移除被点节点，必须阻断冒泡，否则 document 上的 outside 处理器误判为「点浮层外」。
                        el.addEventListener('click', e => {
                            e.stopPropagation();
                            tab = t; branch = null; drawTabs(); drawSub(); drawGrid();
                        });
                    });
                }
                function drawSub() {
                    subs.replaceChildren();
                    subs.hidden = tab === '全部';   // 一级为「全部」时不显示第二层，直接列全部物品。
                    if (subs.hidden) { branch = null; return; }
                    const names = tab === '烹饪' ? COOK_GROUPS.map(b => b.name) : PROD_GROUPS.map(b => b.name);
                    if (branch == null || !names.includes(branch)) branch = names[0];
                    names.forEach(name => {
                        const el = append(subs, 'div', 'ui-tab-item' + (name === branch ? ' active' : ''), name);
                        el.addEventListener('click', e => {
                            e.stopPropagation();
                            branch = name; drawSub(); drawGrid();
                        });
                    });
                }
                function drawGrid() {
                    grid.replaceChildren();
                    const items = tab === '全部' ? choices.slice() : branchItems(tab, branch);
                    if (!items.length) { append(grid, 'span', 'empty-tip', '没有可以选择的物品'); return; }
                    items.forEach(item => {
                        const el = ui.createItemElement(item, { quantity: game.getItemQuantity(item.id), extraClasses: 'selector-item' + (products.includes(item.id) ? ' selected-outline' : '') });
                        el.title = (products.includes(item.id) ? '✓ ' : '') + item.name;
                        el.addEventListener('click', e => {
                            e.stopPropagation();
                            const next = products.includes(item.id) ? products.filter(id => id !== item.id) : [...products, item.id];
                            save(next);
                            el.classList.toggle('selected-outline', next.includes(item.id));
                            el.title = (next.includes(item.id) ? '✓ ' : '') + item.name;
                        });
                        grid.appendChild(el);
                    });
                }
                // 定位在按钮下方，靠右不越界。
                picker.style.visibility = 'hidden';
                const r = anchor.getBoundingClientRect();
                const w = picker.offsetWidth, h = picker.offsetHeight;
                picker.style.left = Math.max(4, Math.min(r.left, window.innerWidth - w - 4)) + 'px';
                picker.style.top = (r.bottom + h + 4 > window.innerHeight && r.top - h - 4 > 0 ? r.top - h - 4 : r.bottom + 4) + 'px';
                picker.style.visibility = 'visible';
                const outside = e => { if (!picker.contains(e.target) && e.target !== pickBtn) { closePicker(); doc.removeEventListener('click', outside); } };
                setTimeout(() => doc.addEventListener('click', outside), 0);
                drawTabs(); drawSub(); drawGrid();
            }
            pickBtn.addEventListener('click', e => { e.stopPropagation(); openPicker(pickBtn); });
            // 行情取数统一复用主脚本 v1.44.4 的缓存与单物品强刷修复，不再自己拉全量快照。
            function marketAdapter() {
                if (!quoteFn) return null;
                return { get: id => {
                    const lv = quoteFn(id);
                    return lv ? { levels: [lv] } : null;
                } };
            }
            // ---- 库存成本：与物品菜单录入共用本地单件成本，缺失返回 null ----
            function stockOf(id) {
                const saved = warehouseCosts(uid)[String(id)];
                if (saved == null || String(saved).trim() === '') return null;
                const value = Number(saved);
                return Number.isFinite(value) && value >= 0 ? value : null;
            }
            const qtyText = n => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
            const format = n => n == null ? (snapshot ? '缺报价' : '—') : n.toLocaleString('zh-CN');
            // 括号差额：市场小计 − 库存合计，+ 表示库存更省，- 表示库存更贵；正绿负红。
            function diffOf(market, inv) {
                if (market == null || inv == null) return null;
                return market - inv;
            }
            function appendDiff(cell, diff) {
                if (diff == null) return;
                const value = round2(diff);
                if (!value) return;   // +0 / -0 不显示括号
                append(cell, 'span', value > 0 ? 'nek-cost-diff-pos' : 'nek-cost-diff-neg',
                    ' (' + (value > 0 ? '+' : '-') + Math.abs(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + ')');
            }
            // 材料名复用游戏原生交互：悬浮显示物品文字说明（bindItemTooltip），
            // 点击展开原生物品菜单（showItemMenu，含查看信息/收藏/跳转烹饪/库存成本等按钮）。
            // 数量单独成段不参与绑定；def 缺失或原生 API 不可用时退化为纯文本。
            function bindMaterial(cell, node) {
                const def = game.getItem(node.id) || data.items[node.id];
                const live = def && Number(def.id) > 0 && typeof ui.bindItemTooltip === 'function';
                cell.replaceChildren();
                const name = doc.createElement('span');
                name.className = 'nek-cost-material' + (live ? ' nek-cost-material-live' : '');
                name.textContent = node.name + (node.source ? '（' + node.source + '）' : '');
                cell.appendChild(name);
                const qty = doc.createElement('span');
                qty.textContent = ' x' + qtyText(node.quantity);
                cell.appendChild(qty);
                if (!live) return;
                const item = { id: Number(def.id), enhancement: 0, quantity: Number(game.getItemQuantity(node.id)) || 0 };
                ui.bindItemTooltip(name, def, { item });
                if (typeof ui.showItemMenu === 'function') {
                    name.addEventListener('click', e => {
                        e.stopPropagation();
                        ui.showItemMenu(name, { itemDef: def, enhancement: 0 });
                    });
                }
            }
            // 展开块标题行：与单件成本表同宽的三列布局（54% / 23% / 23%）。
            function summaryRow(parent, label, sell, demand, diffSell, diffDemand) {
                const summary = append(parent, 'summary', 'nek-cost-summary');
                const title = append(summary, 'span', 'nek-cost-summary-label');
                append(title, 'span', 'nek-cost-caret', '▶');   // 三角提示可展开，展开后由 CSS 旋转
                append(title, 'span', '', label);
                const sellCell = append(summary, 'span', '', sell);
                appendDiff(sellCell, diffSell);
                const demandCell = append(summary, 'span', '', demand);
                appendDiff(demandCell, diffDemand);
                return summary;
            }
            // ---- 渲染成本卡片 ----
            function render(market) {
                snapshot = market;
                const expanded = new Set(Array.from(results.querySelectorAll('details[data-nek-view][open]'),
                    d => d.closest('section').dataset.product + '|' + d.dataset.nekView));
                results.replaceChildren();
                if (!products.length) append(results, 'p', '', '清单为空，可在上方选择物品添加。');
                for (const product of products) {
                    const subs = substitutes[String(product)] || null;
                    const cost = recipeCost(data, product, market, 1, new Set(), { substitutes: subs });
                    const card = append(results, 'section', 'neon-section');
                    card.dataset.product = String(product);
                    const head = append(card, 'div', 'nek-cost-head');
                    append(head, 'div', 'modal-container-title', cost.name);
                    // 替换食材：仅烹饪成品、研究「食材重构」解锁、且配方含可替代食材时显示。
                    const subGroups = substituteOptions(data, ui.researchInfo?.levels || game.researchLevels, product);
                    if (subGroups) {
                        const subBtn = append(head, 'button', 'btn nek-cost-sub-btn', '替换食材');
                        subBtn.addEventListener('click', () => openSubPicker(product, subBtn));
                    }
                    append(head, 'button', 'btn', '删除').addEventListener('click', () => save(products.filter(id => id !== product)));
                    const table = append(card, 'table', 'nek-cost-table');
                    function row(table, tag, values) {
                        const tr = table.insertRow();
                        values.forEach(v => append(tr, tag, '', v));
                        return tr;
                    }
                    row(table, 'th', ['单件成本（喵点）', '按出售价', '按收购价']);
                    const stockMap = warehouseCosts(uid);
                    // 两块均可展开：直接买入材料=仅一层直接材料（含库存成本列 + 小计括号）；
                    // 从基础原料制作=完整递归树（无库存成本列、无括号）。
                    const direct = append(card, 'details', 'nek-cost-expand');
                    direct.dataset.nekView = 'direct';
                    direct.open = expanded.has(String(product) + '|direct');
                    summaryRow(direct, '直接买入材料', format(cost.sellDirect), format(cost.demandDirect),
                        diffOf(cost.sellDirect, directStockTotal(cost, stockMap, 'sell')),
                        diffOf(cost.demandDirect, directStockTotal(cost, stockMap, 'demand')));
                    const oneLevel = append(direct, 'table', 'nek-cost-table nek-cost-detail');
                    row(oneLevel, 'th', ['材料', '库存成本', '出售小计', '收购小计']);
                    for (const child of cost.children) {
                        const stock = stockOf(child.id);
                        const tr = row(oneLevel, 'td', [
                            '', stock == null ? (snapshot ? '缺报价' : '—') : stock.toLocaleString('zh-CN'),
                            format(child.sellQuote), format(child.demandQuote)]);
                        bindMaterial(tr.cells[0], child);
                        const sub = stock == null ? null : stock * Number(child.quantity);
                        appendDiff(tr.cells[2], diffOf(child.sellQuote, sub));
                        appendDiff(tr.cells[3], diffOf(child.demandQuote, sub));
                    }
                    const full = append(card, 'details', 'nek-cost-expand');
                    full.dataset.nekView = 'full';
                    full.open = expanded.has(String(product) + '|full');
                    summaryRow(full, '从基础原料制作', format(cost.sell), format(cost.demand));
                    const tree = append(full, 'table', 'nek-cost-table nek-cost-full');
                    row(tree, 'th', ['材料', '出售小计', '收购小计']);
                    function branch(node, depth) {
                        const tr = row(tree, 'td', ['', format(node.sell), format(node.demand)]);
                        bindMaterial(tr.cells[0], node);
                        tr.firstChild.style.paddingInlineStart = (4 + depth * 5) + 'px';
                        node.children.forEach(child => branch(child, depth + 1));
                    }
                    branch(cost, 0);
                }
            }
            // 食材替代浮层：复用游戏原生「选择替代食材」界面（cooking-substitute-panel + 物品元素 + 需求角标）。
            let subPanel = null, subOutside = null;
            function closeSubPanel() {
                if (!subPanel) return;
                if (subOutside) ui.removeOutsideClickHandler(subOutside);
                subPanel.remove(); subPanel = null; subOutside = null;
            }
            function openSubPicker(product, anchor) {
                closeSubPanel();
                const groups = substituteOptions(data, ui.researchInfo?.levels || game.researchLevels, product);
                if (!groups) return;
                const source = (data.items[product]?.sources?.actions || []).find(s => s.cooking && data.cookingRecipes[s.id]);
                const recipe = source && data.cookingRecipes[source.id];
                const reward = recipe?.rewards?.find(r => r.itemId === product);
                const nominal = Number(reward?.min) || 1;               // 名义产量（成本页口径）
                const food = data.food || {};
                const panel = append(doc.body, 'div', 'selector neon cooking-substitute-panel nek-cost-sub-picker');
                panel.style.visibility = 'hidden';
                append(panel, 'div', 'neon-title', '选择替代食材');
                const content = append(panel, 'div', 'selector-content');
                const list = append(content, 'div', 'selector-list');
                const current = substitutes[String(product)] || {};
                groups.forEach(g => {
                    append(list, 'div', 'cooking-sub-ingredient-label', (data.items[g.itemId]?.name || g.itemId) + ' →');
                    const grid = append(list, 'div', 'selector-grid');
                    const ing = (recipe?.ingredients || []).find(i => Number(i.itemId) === g.itemId);
                    const baseQty = (Number(ing?.quantity) || 0) / nominal;   // 单件成品的基础用量
                    const baseValue = Number(data.items[g.itemId]?.substitute_value) || 0;
                    const loss = Number(food[g.group]) || 0;
                    // 与原生一致：列出原食材 + 同组候选，按单件需求数量升序。
                    const options = [{ id: g.itemId, need: baseQty }].concat(g.candidates.map(c => {
                        const candValue = Number(data.items[c.id]?.substitute_value) || 0;
                        return { id: c.id, need: Math.ceil(baseQty * baseValue * (1 + loss) / candValue) };
                    })).sort((a, b) => a.need - b.need || a.id - b.id);
                    options.forEach(opt => {
                        const def = game.getItem(opt.id) || data.items[opt.id] || { name: String(opt.id) };
                        const owned = game.getItemQuantity(opt.id);
                        const el = ui.createItemElement(def, { quantity: owned, extraLabel: opt.need });
                        const chosen = Number(current[g.itemId]) || g.itemId;
                        if (opt.id === chosen) el.classList.add('selector-active');
                        ui.bindItemTooltip(el, def, { item: { quantity: owned, id: def.id, enhancement: 0 } });
                        el.addEventListener('click', e => {
                            e.stopPropagation();
                            const next = Object.assign({}, substitutes[String(product)] || {});
                            if (opt.id === g.itemId) delete next[g.itemId]; else next[g.itemId] = opt.id;
                            if (Object.keys(next).length) substitutes[String(product)] = next; else delete substitutes[String(product)];
                            try { storage.setItem('nek_cost_sub_v1:' + uid, JSON.stringify(substitutes)); } catch { /* 忽略 */ }
                            render(snapshot);
                            closeSubPanel();
                        });
                        grid.appendChild(el);
                    });
                });
                // 定位与原生一致：transform + zoom，优先按钮下方，空间不足时翻到上方。
                const zoom = doc.body.style.zoom || 1;
                const r = anchor.getBoundingClientRect();
                const pr = panel.getBoundingClientRect();
                const margin = 4;
                let left = r.right - pr.width;
                let top = r.bottom + margin;
                if (left < margin) left = margin;
                if (left + pr.width > window.innerWidth - margin) left = window.innerWidth - pr.width - margin;
                if (top + pr.height > window.innerHeight - margin) top = Math.max(margin, r.top - pr.height - margin);
                panel.style.transform = 'translate(' + (left / zoom).toFixed(0) + 'px,' + (top / zoom).toFixed(0) + 'px)';
                panel.style.visibility = 'visible';
                subOutside = e => { if (!panel.contains(e.target) && !anchor.contains(e.target)) closeSubPanel(); };
                ui.addOutsideClickHandler(subOutside);
                subPanel = panel;
            }
            async function load() {
                refresh.disabled = true;
                render(null);
                status.textContent = '正在读取市场行情…';
                try {
                    const api = window.__NEK_MARKET__;
                    if (api && typeof api.ensureBulk === 'function') await api.ensureBulk();
                    if (!page.isConnected) return;
                    quoteFn = id => {
                        if (api && typeof api.quote === 'function') return api.quote(id, 0);
                        try { return env.game().marketCacheData?.get(Number(id))?.levels?.[0] || null; }
                        catch { return null; }
                    };
                    render(marketAdapter());
                    status.textContent = '按市场快照中的材料单价估算，单位为喵点。';
                } catch {
                    if (page.isConnected) status.textContent = '未取得市场行情，请刷新重试。';
                } finally { refresh.disabled = false; }
            }
            refresh.addEventListener('click', load);
            doc.addEventListener('nek-stock-cost-updated', () => { if (page.isConnected && snapshot) render(snapshot); });
            // 云同步覆盖成本核算清单后重绘：先按本地重新读取清单，避免闭包里的 products 过期。
            doc.addEventListener('nek-cost-items-updated', () => {
                if (!page.isConnected || core.view().account !== uid) return;
                products = costProducts(uid).filter(id => allowed.has(id));
                render(snapshot);
            });
            // 单物品强刷或全量快照更新后重绘：防抖合并，缺报价材料恢复行情后自动显示。
            let quoteTimer = null;
            doc.addEventListener('nek-market-quote-updated', () => {
                if (!page.isConnected || !quoteFn) return;
                clearTimeout(quoteTimer);
                quoteTimer = setTimeout(() => {
                    quoteTimer = null;
                    if (page.isConnected && quoteFn) render(marketAdapter());
                }, 60);
            });
            load();
        });
    }
    function decorate() {
        const v = core.view();
        if (!v.account) return;
        style(); decorateResearch(v); decorateSettings(v); decorateHoldings(v); decorateCostEntry(); decorateMarketCost();
        doc.querySelectorAll('[data-nek-option]').forEach(input => {
            const checked = v.settings[input.dataset.nekOption]; if (input.checked !== checked) input.checked = checked;
        });
    }
    function pulse() {
        try {
            install();
            if (installed) {
                core.tick();
                decorate();
                refreshInventoryPanel?.();
                const uid = core.view().account;
                if (uid) requestWarehouseHistory(uid);
            }
        }
        catch (e) { console.warn('[小助手] 研究/任务/库存辅助异常:', e); }
    }
    function init() {
        if (timer) return;
        pulse(); timer = setInterval(pulse, 2000);
        env.window.addEventListener('pagehide', core.release);
    }
    function snapshotActions() {
        return (env.game()?.queue || []).map(entry => {
            const state = queueMetadata.get(entry);
            return { ...entry, remaining: state?.remaining ?? entry.remaining ?? entry.count,
                multiplier: state?.multiplier ?? entry.multiplier ?? entry.item?.multiplier };
        });
    }
    return { init, decorate, core, snapshotActions };
}

// CommonJS test exports (not embedded into the userscript).
if (typeof module !== 'undefined') module.exports = { createNekController, createNekEnhancements, recipeCost, substituteOptions, mergeWarehouseCost, claimCosts, stockTotalOf, directStockTotal, parseStockCost, round2, craftableProduct, warehouseHistoryBatches, inventoryRecipeTotal, normalizeInventoryLedger };
