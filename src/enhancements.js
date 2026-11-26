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

// Each node represents the quantity needed for one finished product.
function recipeCost(data, product, market, quantity = 1, ancestors = new Set()) {
    const item = data?.items?.[product];
    const actions = (item?.sources?.actions || []).map(source => data.actions?.[source.id]).filter(Boolean);
    const node = { name: item?.name || String(product), quantity, children: [], sell: null, demand: null };
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
    const recipe = actions.find(action => action.action === 6 && action.rewards?.some(r => r.itemId === product));
    const reward = recipe?.rewards.find(r => r.itemId === product);
    if (ancestors.has(product) || !reward || reward.chance !== 100 || reward.min !== reward.max ||
        !(reward.min > 0) || !recipe.requirements?.length ||
        !recipe.requirements.every(r => Number.isFinite(r.quantity) && r.quantity > 0)) {
        node.source = '配方不可用';
        return node;
    }
    const path = new Set(ancestors).add(product);
    node.children = recipe.requirements.map(r => recipeCost(data, r.itemId, market, quantity * r.quantity / reward.min, path));
    for (const side of ['sell', 'demand']) {
        const total = key => node.children.some(child => child[key] == null) ? null :
            node.children.reduce((sum, child) => sum + child[key], 0);
        node[side] = total(side);
        node[side + 'Direct'] = total(side + 'Quote');
    }
    return node;
}

function createNekEnhancements(env) {
    const doc = env.document, storage = env.storage;
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
    function install() {
        const ui = env.ui(), msg = env.msg();
        if (!ui || !msg?.handlers || !env.game()?.character?.uid) return;
        if (installed) return;
        installed = true;
        const send = msg.send;
        msg.send = function (type, data) {
            const stopping = type === 'queue' && data?.type === 'cancel';
            const head = stopping ? env.game()?.queue?.[0] : null;
            const result = send.apply(this, arguments);
            if (stopping && result === true) cancelRequest = { head, connection: msg.ws };
            core.observeSend(type, data, result === true); return result;
        };
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
        // 已打开的研究页也补上按钮，后续重绘由原生行构造器处理。
        if (ui.researchRoot?.isConnected) ui.renderResearchPage();
    }
    function style() {
        if (doc.getElementById('nek-enhancements-style')) return;
        const el = doc.createElement('style'); el.id = 'nek-enhancements-style';
        el.textContent = [
            '.sidebar-item.nek-cost-entry::after{box-sizing:border-box;width:18px;height:14px;left:13px;margin-top:-7px;border:1px solid currentColor;border-radius:1px;background:linear-gradient(currentColor,currentColor) center top/1px 100% no-repeat,linear-gradient(currentColor,currentColor) left 33%/100% 1px no-repeat,linear-gradient(currentColor,currentColor) left 66%/100% 1px no-repeat}',
            '.nek-cost > .page-body > .page-main{overflow-y:auto}',
            '.nek-cost .page-main{container-type:inline-size}.nek-cost-results{width:100%;max-width:76rem;display:grid;grid-template-columns:minmax(0,1fr);align-items:start;gap:6px}',
            '@media(min-width:761px){@container(min-width:44rem){.nek-cost-results{grid-template-columns:repeat(2,minmax(0,1fr))}}}',
            '.nek-cost-tools,.nek-cost-head{display:flex;flex-wrap:wrap;align-items:center;gap:4px}.nek-cost-tools select{max-width:100%}.nek-cost-head .modal-container-title{margin-right:auto}',
            '.nek-cost-results>.neon-section{margin:0;padding:6px 8px;min-width:0}',
            '.nek-cost .page-main>.btn{align-self:flex-start}.nek-cost .page-main>p{margin:4px 0}',
            '.nek-cost-table{width:100%;border-collapse:collapse;table-layout:fixed;font-variant-numeric:tabular-nums}',
            '.nek-cost-table :is(th,td){padding:2px 4px;text-align:right;line-height:1.35;overflow-wrap:anywhere}',
            '.nek-cost-table :is(th,td):first-child{text-align:left}',
            '.nek-cost-table th:nth-last-child(-n+2){width:23%}.nek-cost-detail th:nth-child(2){width:12%}',
            '.nek-cost-table tr:nth-child(even){background:rgba(var(--r),var(--g),var(--b),.06)}',
            '.nek-cost-results summary{cursor:pointer;padding:3px 4px}',
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
    function decorateCostEntry() {
        const entry = doc.querySelector('.nek-cost-entry');
        if (!env.enabled()) { entry?.remove(); return; }
        const anchor = doc.querySelector('.sidebar-group-items .sidebar-item.action-8');
        if (!anchor || entry) return;
        const button = doc.createElement('div');
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
        button.className = 'sidebar-item nek-cost-entry';
        button.title = '成本核算';
        button.innerHTML = '<div class="sidebar-item-name"><span>成本核算</span></div>';
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
            page.innerHTML = '<div class="page-body neon"><div class="page-tab"><div class="page-tab-item active">成本核算</div></div><div class="page-main"><button type="button" class="btn">刷新行情</button><p role="status"></p><div class="nek-cost-results"></div></div></div>';
            const refresh = page.querySelector('button');
            const status = page.querySelector('[role="status"]');
            const results = page.querySelector('.nek-cost-results');
            const uid = core.view().account;
            const key = 'nek_cost_items_v1:' + uid;
            const data = env.data();
            const choices = Object.values(data.items).filter(item => recipeCost(data, item.id, null).children.length);
            const allowed = new Set(choices.map(item => item.id));
            let products = [6103, 6113, 6123];
            try {
                const saved = JSON.parse(storage.getItem(key));
                if (Array.isArray(saved)) products = [...new Set(saved.filter(id => allowed.has(id)))];
            } catch { /* 旧配置损坏时使用初始清单 */ }
            let replacing = null, snapshot = null;
            const append = (parent, tag, cls, value) => {
                const el = doc.createElement(tag);
                el.className = cls;
                if (value != null) el.textContent = value;
                parent.appendChild(el);
                return el;
            };
            const tools = doc.createElement('div');
            tools.className = 'nek-cost-tools';
            refresh.before(tools);
            const search = append(tools, 'input', '');
            search.type = 'search';
            search.placeholder = '搜索生产物品';
            search.setAttribute('aria-label', search.placeholder);
            const select = append(tools, 'select', '');
            select.setAttribute('aria-label', '选择生产物品');
            const apply = append(tools, 'button', 'btn', '添加物品');
            const cancel = append(tools, 'button', 'btn', '取消');
            tools.appendChild(refresh);
            function updatePicker() {
                select.replaceChildren();
                const query = search.value.trim();
                for (const item of choices) {
                    if (products.includes(item.id) || !(item.name.includes(query) || String(item.id).includes(query))) continue;
                    append(select, 'option', '', item.name).value = String(item.id);
                }
                apply.disabled = !select.options.length;
                if (apply.disabled) append(select, 'option', '', '没有可选物品');
                apply.textContent = replacing == null ? '添加物品' : '替换「' + data.items[replacing].name + '」';
                cancel.hidden = replacing == null;
            }
            function save(next) {
                if (core.view().account !== uid) return;
                try { storage.setItem(key, JSON.stringify(next)); }
                catch { status.textContent = '清单保存失败，请重试。'; return; }
                products = next;
                replacing = null;
                search.value = '';
                updatePicker();
                render(snapshot);
            }
            search.addEventListener('input', updatePicker);
            apply.addEventListener('click', () => {
                const id = Number(select.value);
                if (!allowed.has(id) || products.includes(id)) return;
                save(replacing == null ? [...products, id] : products.map(old => old === replacing ? id : old));
            });
            cancel.addEventListener('click', () => { replacing = null; updatePicker(); });
            updatePicker();
            function render(market) {
                snapshot = market;
                const expanded = new Set(Array.from(results.querySelectorAll('details[open]'), d => d.closest('section').dataset.product));
                results.replaceChildren();
                const format = n => n == null ? (market ? '缺报价' : '—') : n.toLocaleString('zh-CN');
                if (!products.length) append(results, 'p', '', '清单为空，可在上方选择并添加物品。');
                for (const product of products) {
                    const cost = recipeCost(data, product, market);
                    const card = append(results, 'section', 'neon-section');
                    card.dataset.product = String(product);
                    const head = append(card, 'div', 'nek-cost-head');
                    append(head, 'div', 'modal-container-title', cost.name);
                    append(head, 'button', 'btn', '替换').addEventListener('click', () => {
                        replacing = product;
                        search.value = '';
                        updatePicker();
                        search.focus();
                    });
                    append(head, 'button', 'btn', '删除').addEventListener('click', () => save(products.filter(id => id !== product)));
                    const table = append(card, 'table', 'nek-cost-table');
                    function row(table, tag, values) {
                        const tr = table.insertRow();
                        values.forEach(v => append(tr, tag, '', v));
                        return tr;
                    }
                    row(table, 'th', ['单件成本（喵点）', '按出售价', '按收购价']);
                    row(table, 'td', ['买入直接材料', format(cost.sellDirect), format(cost.demandDirect)]);
                    row(table, 'td', ['从基础原料制作', format(cost.sell), format(cost.demand)]);
                    const details = append(card, 'details', '');
                    details.open = expanded.has(String(product));
                    append(details, 'summary', '', '逐层配方与用量');
                    const tree = append(details, 'table', 'nek-cost-table nek-cost-detail');
                    row(tree, 'th', ['材料', '用量', '出售小计', '收购小计']);
                    function branch(node, depth) {
                        const label = node.name + (node.source ? '（' + node.source + '）' : '');
                        const tr = row(tree, 'td', [label, format(node.quantity), format(node.sell), format(node.demand)]);
                        tr.firstChild.style.paddingInlineStart = (4 + depth * 5) + 'px';
                        node.children.forEach(child => branch(child, depth + 1));
                    }
                    branch(cost, 0);
                }
            }
            async function load() {
                refresh.disabled = true;
                render(null);
                status.textContent = '正在读取市场行情…';
                try {
                    const market = await env.game().loadMarketCache(true);
                    if (!page.isConnected) return;
                    if (!market?.size) throw new Error('empty market');
                    render(market);
                    status.textContent = '按市场快照中的材料单价估算，单位为喵点。';
                } catch {
                    if (page.isConnected) status.textContent = '未取得市场行情，请刷新重试。';
                } finally { refresh.disabled = false; }
            }
            refresh.addEventListener('click', load);
            load();
        });
    }
    function decorate() {
        const v = core.view();
        if (!v.account) return;
        style(); decorateResearch(v); decorateSettings(v); decorateHoldings(v); decorateCostEntry();
        doc.querySelectorAll('[data-nek-option]').forEach(input => {
            const checked = v.settings[input.dataset.nekOption]; if (input.checked !== checked) input.checked = checked;
        });
    }
    function pulse() {
        try { install(); if (installed) { core.tick(); decorate(); } }
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
if (typeof module !== 'undefined') module.exports = { createNekController, createNekEnhancements, recipeCost };
