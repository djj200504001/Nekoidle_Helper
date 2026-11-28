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

// 库存成本：买入后按「初始库存 × 旧单件成本 + 本次买入量 × 成交单价」加权平均。
// 无有效旧成本/旧数量时直接采用本次买入价；结果保留两位小数。
function mergeWarehouseCost(oldCost, oldQty, buyPrice, buyQty) {
    const price = Number(buyPrice), qty = Number(buyQty);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) return null;
    const base = Number(oldCost), held = Number(oldQty);
    // 无有效旧成本（含本地有库存但未录成本）时直接采用本次成交价，不做加权。
    if (!Number.isFinite(base) || base < 0 || !Number.isFinite(held) || held <= 0) return price;
    return Math.round((base * held + price * qty) / (held + qty) * 100) / 100;
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

// ===== 库存核算账本：初始库存（建账时仓库快照，无货填 0）+ 后续借贷流水 =====
// 账本结构：{ items: { [id]: { batches: [], quantity, since } }, thresholds: {}, trades: [] }
// 批次：{ id, at, reason, qty, unitPrice, amount, ref?, from?, verified?, checkAt? }
//   reason ∈ 初始库存 / 市场买入 / 市场卖出 / 生产消耗 / 生产成品
//   借贷记账：qty 带符号——借（入库：初始库存/买入/产出/退料）为正，贷（出库：卖出/消耗）为负；
//   unitPrice 为 null 表示无价；amount = qty * unitPrice（无价为 null）
//   ref=批次归属（同一市场操作/同一队列共用）；from=生产消耗来源批次 id（FIFO 去重）。
//   verified=核对到历史/订单；checkAt=核对到的操作时间（开始时分秒）
const INVENTORY_REASONS = ['初始库存', '市场买入', '市场卖出', '生产消耗', '生产成品'];
const MAX_INVENTORY_TRADES = 200;
const MAX_INVENTORY_BATCHES = 200;
const ARCHIVE_TTL = 5 * 24 * 3600 * 1000;   // 历史记录保留 5 天

// 预警阈值：{ qty, pct }。数量为「低于该数值」预警；百分比按当日峰值 (基准+当日增加) 计算，
// 「低于该百分比」预警；两项均为 0 时删除阈值表示关闭。旧的数字阈值归一为 qty。
function normalizeThreshold(value) {
    if (value && typeof value === 'object') {
        const qty = Number(value.qty), pct = Number(value.pct);
        const out = {};
        if (Number.isSafeInteger(qty) && qty > 0) out.qty = qty;
        if (Number.isFinite(pct) && pct > 0) out.pct = round2(Math.min(100, pct));
        return Object.keys(out).length ? out : null;
    }
    const qty = Number(value);
    return Number.isSafeInteger(qty) && qty > 0 ? { qty } : null;
}

// 阈值判定：返回数量/百分比两个独立条件与合并后的预警状态。
function thresholdCheck(row, th, qty, now) {
    const t = normalizeThreshold(th);
    const have = Math.max(0, Number(qty) || 0);
    const peak = inventoryDaySegments(row, now).peak;
    const qtyLimit = Number(t?.qty) || 0, pctLimit = Number(t?.pct) || 0;
    const pct = peak > 0 ? round2(have / peak * 100) : 0;
    const qtyShort = qtyLimit > 0 && have < qtyLimit;
    const pctShort = pctLimit > 0 && peak > 0 && pct < pctLimit;
    return { short: qtyShort || pctShort, qtyShort, pctShort, have, peak, pct, qtyLimit, pctLimit };
}

// 期初单价优先级由调用方解析后传入；这里只做归一化与合法性校验。
function normalizeInventoryLedger(value) {
    const isId = id => /^\d+$/.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id) > 1;
    const items = {};
    for (const [id, row] of Object.entries(value?.items || {}).slice(0, 1000)) {
        if (!isId(id) || !row || typeof row !== 'object') continue;
        // 迁移旧账本（分支 v1.57~1.59 的 purchases 结构）为批次，避免升级后明细丢失。
        let seed = row.batches;
        if (!Array.isArray(seed) && Array.isArray(row.purchases)) {
            seed = row.purchases.map(p => ({
                at: p.at, reason: String(p.source || '').includes('生产') ? '生产成品' : '市场买入',
                qty: p.quantity, unitPrice: p.price, verified: false
            }));
        }
        const batches = (Array.isArray(seed) ? seed : []).slice(-MAX_INVENTORY_BATCHES).map((b, i) => {
            if (!b || typeof b !== 'object') return null;
            // 迁移旧账本：旧「换日库存」即期初快照→「初始库存」；旧「换日缺口」下阶段才在历史记录展示，此处丢弃。
            const rawReason = b.reason === '换日库存' ? '初始库存' : b.reason;
            if (rawReason === '换日缺口') return null;
            const reason = INVENTORY_REASONS.includes(rawReason) ? rawReason : '初始库存';
            const qty = Number(b.qty), at = Number(b.at), unitPrice = b.unitPrice == null ? null : Number(b.unitPrice);
            // 初始库存允许 qty=0（建账时仓库无货）；其余批次 qty 必须非 0。
            if (!Number.isFinite(qty) || (qty === 0 && reason !== '初始库存') || !Number.isFinite(at) || at < 0) return null;
            if (unitPrice != null && (!Number.isFinite(unitPrice) || unitPrice < 0)) return null;
            const normalizedPrice = unitPrice == null ? null : round2(unitPrice);
            const amount = normalizedPrice == null ? null : b.reason === '生产成品' && qty > 0 &&
                Number.isFinite(b.amount) && b.amount >= 0 ? round2(b.amount) : round2(qty * normalizedPrice);
            const src = b.source && typeof b.source === 'object' ? b.source : null;
            const srcId = Number(src?.id), srcQty = Number(src?.qty), srcPrice = src?.unitPrice == null ? null : Number(src.unitPrice);
            const source = src && srcId > 1 && Number.isFinite(srcQty) && srcQty > 0 &&
                (srcPrice == null || (Number.isFinite(srcPrice) && srcPrice >= 0))
                ? { id: srcId, from: String(src.from || '').slice(0, 80), qty: srcQty,
                    unitPrice: srcPrice == null ? null : round2(srcPrice) }
                : undefined;
            const missing = (Array.isArray(b.missing) ? b.missing : []).slice(0, 50).map(m => ({
                id: Number(m?.id), name: String(m?.name || '').slice(0, 60)
            })).filter(m => Number.isInteger(m.id) && m.id > 1);
            return {
                id: b.id != null ? String(b.id).slice(0, 80) : 'b' + i,
                at, reason,
                qty, unitPrice: normalizedPrice, amount,
                ref: b.ref != null ? String(b.ref).slice(0, 80) : undefined,
                from: b.from != null ? String(b.from).slice(0, 80) : undefined,
                verified: b.verified === true,
                checkAt: Number.isFinite(b.checkAt) && b.checkAt > 0 ? b.checkAt : undefined,
                // 生产成品的 FIFO 来源快照：供材料补录单价后自动重算；手动录入价不再被覆盖。
                source, missing: missing.length ? missing : undefined,
                manualPrice: b.manualPrice === true
            };
        }).filter(Boolean).sort((a, b) => a.at - b.at);
        const quantity = Number.isSafeInteger(row.quantity) && row.quantity >= 0 ? row.quantity : 0;
        // 历史归档：FIFO 耗尽批次，保留 5 天。
        const now = Date.now();
        const history = (Array.isArray(row.history) ? row.history : [])
            .filter(h => h && typeof h === 'object' && Number.isFinite(h.archivedAt) && now - h.archivedAt <= ARCHIVE_TTL)
            .slice(-MAX_INVENTORY_BATCHES)
            .map(h => {
                const qty = Number(h.qty), at = Number(h.at);
                if (!Number.isFinite(qty) || !Number.isFinite(at)) return null;
                const price = h.unitPrice == null ? null : Number(h.unitPrice);
                if (price != null && (!Number.isFinite(price) || price < 0)) return null;
                const hsrc = h.source && typeof h.source === 'object' ? h.source : null;
                const hId = Number(hsrc?.id), hQty = Number(hsrc?.qty), hPrice = hsrc?.unitPrice == null ? null : Number(hsrc.unitPrice);
                return {
                    id: h.id != null ? String(h.id).slice(0, 80) : 'h' + at,
                    at, reason: INVENTORY_REASONS.includes(h.reason) ? h.reason : '生产消耗',
                    qty, unitPrice: price == null ? null : round2(price),
                    amount: price == null ? null : round2(qty * price),
                    from: h.from != null ? String(h.from).slice(0, 80) : undefined,
                    ref: h.ref != null ? String(h.ref).slice(0, 80) : undefined,
                    archivedAt: Number(h.archivedAt),
                    source: hsrc && hId > 1 && Number.isFinite(hQty) && hQty > 0 &&
                        (hPrice == null || (Number.isFinite(hPrice) && hPrice >= 0))
                        ? { id: hId, from: String(hsrc.from || '').slice(0, 80), qty: hQty,
                            unitPrice: hPrice == null ? null : round2(hPrice) } : undefined,
                    missing: Array.isArray(h.missing) ? h.missing.slice(0, 50).map(m => ({
                        id: Number(m?.id), name: String(m?.name || '').slice(0, 60)
                    })).filter(m => Number.isInteger(m.id) && m.id > 1) : undefined,
                    manualPrice: h.manualPrice === true
                };
            }).filter(Boolean);
        if (!batches.length && !history.length && quantity <= 0) continue;   // 无批次无历史且数量无效的空物品不保留
        const since = Number.isFinite(row.since) && row.since > 0 ? row.since : now;
        items[id] = { batches, history, quantity, since };
    }
    const thresholds = {};
    for (const [id, raw] of Object.entries(value?.thresholds || {})) {
        if (!isId(id)) continue;
        const th = normalizeThreshold(raw);
        if (th) thresholds[id] = th;
    }
    const trades = (Array.isArray(value?.trades) ? value.trades : []).slice(-MAX_INVENTORY_TRADES).map(t => {
        if (!t || typeof t !== 'object') return null;
        const id = Number(t.id), at = Number(t.at), qty = Number(t.qty), price = t.unitPrice == null ? null : Number(t.unitPrice);
        if (!(id > 1) || !Number.isFinite(at) || at <= 0 || !Number.isFinite(qty) || qty === 0) return null;
        if (price != null && (!Number.isFinite(price) || price < 0)) return null;
        return {
            at, id, reason: INVENTORY_REASONS.includes(t.reason) ? t.reason : '市场买入',
            qty, unitPrice: price == null ? null : round2(price),
            ref: t.ref != null ? String(t.ref).slice(0, 80) : undefined
        };
    }).filter(Boolean).sort((a, b) => a.at - b.at);
    return { items, thresholds, trades, orders: normalizeInventoryOrders(value?.orders) };
}

function normalizeInventoryOrders(orders) {
    return Object.fromEntries(Object.entries(orders || {}).filter(([id, row]) =>
        /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) &&
        Number.isSafeInteger(row?.quantity) && row.quantity > 0).slice(-1000)
        .map(([id, row]) => [id, { quantity: row.quantity }]));
}

// 移动平均账本只知道现存数量与均价，不能从历史采购还原剩余 FIFO 批次。
function migrateAverageInventory(value, costs) {
    if (!Array.isArray(value?.products) || Object.values(value.items || {}).some(row => Array.isArray(row?.batches))) return value;
    const items = {}, trades = [];
    for (const [id, row] of Object.entries(value.items || {}).slice(0, 1000)) {
        if (!Number.isSafeInteger(row?.quantity) || row.quantity < 0) continue;
        const price = costs?.[id];
        const unitPrice = Number.isFinite(price) && price >= 0 ? price : null;
        const receipts = Array.isArray(row.purchases) ? row.purchases : [];
        const at = Math.max(Number(row.since) || 1, ...receipts.slice(-200).map(receipt => (Number(receipt?.at) || 0) + 1));
        items[id] = { quantity: row.quantity, since: at, batches: [{
            id: 'average-opening:' + id, at, reason: '初始库存', qty: row.quantity, unitPrice
        }] };
        for (const receipt of receipts) {
            if (!receipt || receipt.source === '市场返还') continue;
            const outgoing = receipt.source === '市场出库';
            trades.push({ at: receipt.at, id: Number(id), reason: outgoing ? '市场卖出' : '市场买入',
                qty: outgoing ? -receipt.quantity : receipt.quantity, unitPrice: receipt.price });
        }
    }
    trades.sort((a, b) => a.at - b.at);
    return { items, thresholds: value.thresholds, orders: value.orders, trades };
}

function orderTime(value) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number < 1e12 ? number * 1000 : number;
    return Date.parse(value) || 0;
}

function importFifoPurchases(ledger, history, settlements, getQuantity) {
    const unclaimed = new Map();
    for (const row of settlements || []) {
        if (Number(row.side) !== 2) continue;
        const order = Number(row.order_id);
        unclaimed.set(order, (unclaimed.get(order) || 0) + (Number(row.quantity) || 0));
    }
    const affected = new Set();
    let changed = false;
    ledger.orders ??= {};
    const orders = [...(history || [])].sort((a, b) => orderTime(a.close_time) - orderTime(b.close_time) || Number(a.id) - Number(b.id));
    for (const order of orders) {
        const id = Number(order.item), orderId = Number(order.id), unitPrice = Number(order.price);
        const row = ledger.items[id], at = orderTime(order.close_time);
        const claimed = Number(order.traded) - (unclaimed.get(orderId) || 0);
        if (!row || !at || at < row.since || Number(order.side) !== 2 || Number(order.enhancement || 0) !== 0 ||
            !Number.isSafeInteger(orderId) || orderId < 1 || !Number.isSafeInteger(claimed) || claimed < 1 ||
            !Number.isFinite(unitPrice) || unitPrice <= 0) continue;
        const previous = ledger.orders[orderId]?.quantity || 0;
        if (claimed <= previous) continue;
        // 已经记账或耗用的旧货无法从累计成交准确复原，只补背包确实多出的数量。
        const balance = inventorySummary(row).quantity;
        const gap = Math.max(0, stockHeld(getQuantity, id) - balance);
        const qty = Math.min(claimed - previous, gap);
        const ref = 'history:' + orderId + ':' + claimed;
        if (qty > 0 && addInventoryBatch(ledger, { id, at, reason: '市场买入', qty, unitPrice, ref })) {
            const batch = ledger.items[id].batches.find(b => b.ref === ref);
            batch.verified = true; batch.checkAt = at;
            pushInventoryTrade(ledger, { id, at, reason: '市场买入', qty, unitPrice, ref });
            affected.add(id);
        }
        ledger.orders[orderId] = { quantity: claimed };
        changed = true;
    }
    return { changed, affected };
}

// 迁移旧账本遗留的「有数量无批次」物品：补一条初始库存批次。
// 数量取仓库当前实际（无货则 0），避免用过时的 row.quantity 导致初始库存与可用对不上。
// getQuantity/getPrice 由调用方注入（闭包内可访问 game/warehouseCosts/leftPrice），便于纯函数测试。
function migrateEmptyBatchItems(ledger, getQuantity, getPrice) {
    let changed = false;
    for (const [id, row] of Object.entries(ledger?.items || {})) {
        if (!row || typeof row !== 'object' || (Array.isArray(row.batches) && row.batches.length)) continue;
        const numId = Number(id);
        const actual = Math.max(0, Number(getQuantity?.(numId)) || 0);
        const priceRaw = getPrice?.(numId);
        const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? round2(priceRaw) : null;
        row.batches = [{
            id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            at: Number.isFinite(row.since) && row.since > 0 ? row.since : Date.now(),
            reason: '初始库存',
            qty: actual,
            unitPrice: price,
            amount: price == null ? null : round2(actual * price),
            verified: false
        }];
        row.quantity = actual;
        changed = true;
    }
    return changed;
}

// 旧账本同队列被按 FIFO 来源拆成多条「生产成品」，合并为一个综合批次。
// 金额直接取各条 amount 之和（即材料成本合计），单价 = 合计 ÷ 合计数量。
function mergeQueueOutputBatches(ledger) {
    let changed = false;
    for (const row of Object.values(ledger?.items || {})) {
        if (!row || !Array.isArray(row.batches)) continue;
        const groups = new Map();
        row.batches.forEach(b => {
            if (!b || b.reason !== '生产成品' || !b.ref || b.manualPrice === true) return;
            const key = String(b.ref);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(b);
        });
        groups.forEach(list => {
            if (list.length < 2) return;
            const keep = list[0];
            let qty = 0, amount = 0, priced = true;
            const missing = [];
            list.forEach(b => {
                qty += Number(b.qty) || 0;
                if (b.unitPrice == null || b.amount == null) priced = false;
                else amount += Number(b.amount);
                (b.missing || []).forEach(m => {
                    if (!missing.some(x => String(x.id) === String(m.id))) missing.push(m);
                });
            });
            keep.qty = qty;
            keep.amount = priced ? round2(amount) : null;
            keep.unitPrice = priced && qty > 0 ? round2(amount / qty) : null;
            keep.missing = missing.length ? missing : undefined;
            // 来源改由同队列的生产消耗批次反推，避免旧快照在补录单价后失真。
            keep.source = undefined;
            keep.from = undefined;
            keep.at = Math.max(...list.map(b => Number(b.at) || 0));
            const drop = new Set(list.slice(1).map(b => String(b.id)));
            row.batches = row.batches.filter(b => !drop.has(String(b.id)));
            changed = true;
        });
    }
    return changed;
}

// 库存汇总：数量取账本登记值；综合单价为有价批次按数量加权；总额为各批次 amount 之和。
function inventoryBalanceBatches(row) {
    const batches = row?.batches || [];
    const live = new Set(batches.filter(b => b.qty > 0).map(b => b.id));
    return batches.filter(b => b.qty >= 0 || !b.from || live.has(b.from));
}

function inventorySummary(row) {
    let quantity = 0, valued = 0, total = 0, priced = 0;
    for (const b of inventoryBalanceBatches(row)) {
        quantity += b.qty;
        if (b.unitPrice != null && b.amount != null) { valued += b.qty; total += b.amount; priced++; }
    }
    return {
        quantity: Math.max(0, quantity),
        unitPrice: valued > 0 && priced > 0 ? round2(total / valued) : null,
        total: priced > 0 ? round2(total) : null,
        priced
    };
}

// 账本中有价批次按原金额汇总。未标价的净数量可按配方估算，估值不写入 FIFO 批次。
function inventoryValuation(ledger, data, costs = {}) {
    const summary = new Map(Object.entries(ledger.items).map(([id, row]) => [Number(id), inventorySummary(row)]));
    const prices = new Map();
    function recipePrice(id, path) {
        if (path.has(id) || path.size >= 100) return null;
        if (prices.has(id)) return prices.get(id);
        const recipe = stockRecipe(data, id);
        if (!recipe) return null;
        path.add(id);
        let cost = 0;
        for (const req of recipe.requirements) {
            const price = summary.get(req.itemId)?.unitPrice ?? costs[req.itemId] ?? recipePrice(req.itemId, path);
            if (price == null) { path.delete(id); return null; }
            cost += price * req.quantity;
        }
        path.delete(id);
        const unit = cost / recipe.output;
        prices.set(id, unit);
        return unit;
    }
    let booked = 0, estimated = 0, unpriced = 0;
    for (const [id, value] of summary) {
        if (!value.quantity) continue;
        booked += value.total ?? 0;
        const priced = inventoryBalanceBatches(ledger.items[id]).reduce((qty, batch) => qty +
            (batch.unitPrice != null && batch.amount != null ? batch.qty : 0), 0);
        const remaining = value.quantity - Math.max(0, priced);
        if (remaining <= 0) continue;
        const price = recipePrice(id, new Set());
        if (price != null) estimated += remaining * price;
        else unpriced++;
    }
    return { total: round2(booked + estimated), estimated: round2(estimated), unpriced };
}

// 当天 00:00 时间戳（本地时区）。
function dayStartOf(ts) {
    const d = new Date(Number.isFinite(ts) ? ts : Date.now());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

// FIFO 三色可视化分段：按批次时间拆出「换日基准 / 当日增加 / 当日消耗」。
// 换日基准 = 当天 00:00 之前所有批次净和（clamp>=0）；当日增加 = 今日正批次；当日消耗 = 今日负批次绝对值和。
// 满长 = 当日峰值 = 换日基准 + 当日增加。折叠条三段之和恒等于满长：
//   基准段 = 换日基准 - 已被覆盖的消耗；增加段 = 当日增加；消耗段 = min(当日消耗, 换日基准)。
//   超出基准的消耗（当日增加也被吃掉）用 overConsume 表示，折叠时压缩增加段。
// 每段另带 batches 明细（供展开两行斑马纹），返回比例百分比（0~100，保留两位）。
function inventoryDaySegments(row, now) {
    const dayStart = dayStartOf(now);
    let base = 0, inc = 0, dec = 0;
    const incBatches = [], decBatches = [], baseBatches = [];
    const archivedSources = new Map((row?.history || []).filter(b => b.qty > 0).map(b => [b.id, b]));
    const ledgerBatches = inventoryBalanceBatches(row);
    const present = new Set(ledgerBatches);
    for (const batch of row?.batches || []) {
        if (!present.has(batch) && batch.at >= dayStart && archivedSources.has(batch.from)) {
            const source = archivedSources.get(batch.from);
            if (!present.has(source)) { ledgerBatches.push(source); present.add(source); }
            ledgerBatches.push(batch);
        }
    }
    ledgerBatches.forEach(b => {
        const q = Number(b.qty) || 0;
        if (Number(b.at) < dayStart) {
            base += q;
            if (q > 0) baseBatches.push(b);
        } else if (q > 0) {
            inc += q;
            incBatches.push(b);
        } else if (q < 0) {
            dec += -q;
            decBatches.push(b);
        }
    });
    base = Math.max(0, base);
    const peak = base + inc;
    const covered = Math.min(dec, base);          // 覆盖基准（第一段）的消耗
    const over = Math.max(0, dec - covered);      // 超出基准、吃掉增加段的消耗
    const incLeft = Math.max(0, inc - over);      // 增加段剩余
    // 折叠三色从左到右：消耗覆盖段(全部 dec，最多到峰值) → 基准剩余 → 增加剩余，三者之和恒为峰值。
    const decShown = Math.min(dec, peak);
    const baseLeft = Math.max(0, base - dec);
    const pct = n => peak > 0 ? round2(Math.max(0, Math.min(100, n / peak * 100))) : 0;
    return {
        dayStart, base, inc, dec, peak, covered, over, incLeft, baseLeft,
        basePct: pct(baseLeft), incPct: pct(incLeft), decPct: pct(decShown),
        // 展开行1恒为满值（峰值）：完整基准 + 当日增加 = peak = 100%。
        baseFullPct: pct(base),
        incBatches, decBatches, baseBatches
    };
}

// 归档 FIFO 来源已耗尽的正批次：某来源批次被 from 指向的消耗累计 >= 其数量，视为耗尽。
// 归档条件：批次时间早于当天 00:00（显示到次日 00:00 或游戏首次加载），带 archivedAt 时间戳。
// 历史记录保留 5 天（ARCHIVE_TTL），超期清除；避免无限增长。返回是否发生变更。
function archiveExhaustedBatches(ledger, now) {
    const t = Number.isFinite(now) ? now : Date.now();
    const dayStart = dayStartOf(t);
    let changed = false;
    for (const [id, row] of Object.entries(ledger?.items || {})) {
        if (!row || !Array.isArray(row.batches)) continue;
        const used = new Map();
        row.batches.forEach(b => {
            if (b.from && b.qty < 0) used.set(String(b.from), (used.get(String(b.from)) || 0) + Math.abs(Number(b.qty) || 0));
        });
        const keep = [], arch = [];
        row.batches.forEach(b => {
            if (b.qty > 0 && Number(b.at) < dayStart && (used.get(String(b.id)) || 0) >= Number(b.qty)) {
                arch.push({ ...b, archivedAt: t });
                changed = true;
            } else keep.push(b);
        });
        if (arch.length) row.batches = keep;
        const old = Array.isArray(row.history) ? row.history : [];
        const history = old.filter(h => Number.isFinite(h.archivedAt) && t - h.archivedAt <= ARCHIVE_TTL).concat(arch);
        if (arch.length || history.length !== old.length) { row.history = history; changed = true; }
    }
    return changed;
}

// 追加批次并同步数量。默认同一 id+reason+ref+from 视为重复（防止回包重放重复记账）；
// merge=true 时把增量并入同一批次（同队列多次完成只记一个批次组，单价按累计金额/数量加权）。
// 初始库存允许 qty=0（建账时仓库无货），其余批次 qty 必须非 0。
function addInventoryBatch(ledger, { id, at, reason, qty, unitPrice, ref, from, merge, source, missing, manualPrice }) {
    const key = String(id);
    if (!(Number(key) > 1) || !INVENTORY_REASONS.includes(reason) || !Number.isFinite(qty)) return false;
    if (qty === 0 && reason !== '初始库存') return false;
    const price = unitPrice == null ? null : round2(unitPrice);
    if (price != null && !(price >= 0)) return false;
    const src = source && Number(source.id) > 1 && Number(source.qty) > 0
        ? { id: Number(source.id), from: String(source.from || ''), qty: Number(source.qty),
            unitPrice: source.unitPrice == null ? null : round2(source.unitPrice) }
        : undefined;
    const lack = Array.isArray(missing) && missing.length ? missing.slice(0, 50) : undefined;
    const row = ledger.items[key] || (ledger.items[key] = { batches: [], quantity: 0, since: at || Date.now() });
    const existing = ref != null ? row.batches.find(b => b.reason === reason && String(b.ref || '') === String(ref) &&
        String(b.from || '') === String(from || '')) : null;
    if (existing) {
        if (!merge) return false;   // 默认防重放；队列结算显式 merge 才累加
        const total = existing.qty + qty;
        if (total === 0) {
            // 正负抵消归零：移除该批次（数量统一由 row.quantity 表达）。
            row.batches = row.batches.filter(b => b !== existing);
        } else {
            const oldAmount = existing.unitPrice == null ? null : existing.qty * existing.unitPrice;
            const newAmount = price == null ? null : qty * price;
            const sum = oldAmount != null && newAmount != null ? round2(oldAmount + newAmount) : null;
            // 只有生产成品的手动综合单价在合并时锁定；生产消耗批次的手动价随上游重算更新。
            const keepManual = reason === '生产成品' && existing.manualPrice === true;
            existing.qty = total;
            if (keepManual) {
                // 手动录入价优先：合并数量时保留单价，只按新数量重算金额。
                existing.amount = existing.unitPrice == null ? null : round2(total * existing.unitPrice);
            } else {
                existing.unitPrice = sum != null ? round2(Math.abs(sum / total)) : null;
                existing.amount = sum;
            }
            if (src && existing.source && String(existing.source.from) === String(src.from)) {
                existing.source.qty = round2(Number(existing.source.qty || 0) + src.qty);
                if (!keepManual) existing.source.unitPrice = src.unitPrice;
            }
            if (lack !== undefined) existing.missing = lack;
            if (manualPrice === true) existing.manualPrice = true;
            existing.at = Math.max(existing.at, Number.isFinite(at) ? at : 0);   // 结算时间取最后一次
        }
        row.quantity = Math.max(0, row.quantity + qty);
        return true;
    }
    row.batches.push({
        id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        at: Number.isFinite(at) && at > 0 ? at : Date.now(), reason, qty,
        unitPrice: price, amount: price == null ? null : round2(qty * price),
        ref: ref != null ? String(ref).slice(0, 80) : undefined,
        from: from != null ? String(from).slice(0, 80) : undefined, verified: false,
        source: src, missing: lack, manualPrice: manualPrice === true
    });
    if (row.batches.length > MAX_INVENTORY_BATCHES) row.batches.splice(0, row.batches.length - MAX_INVENTORY_BATCHES);
    row.batches.sort((a, b) => a.at - b.at);
    row.quantity = Math.max(0, row.quantity + qty);
    return true;
}

// 生产消耗：按批次时间先进先出取价，生成负值消耗批次（含单价/金额用于核算）。
// 可来源批次：初始库存 / 市场买入 / 生产成品（数量为正）。
// 关键：不再直接扣减正批次 qty，数量变化统一由负值批次表达（保证「批次求和 == row.quantity」）；
// 因此按 from 累计已消耗量，后续 FIFO 跳过已取尽部分，避免同一批早期单价被反复取用。
function consumeInventoryFifo(ledger, id, qty, at, ref, merge, reason = '生产消耗') {
    const row = ledger.items[String(id)];
    let remaining = Number(qty);
    if (!row || !Number.isFinite(remaining) || remaining <= 0) return [];
    const taken = new Map();
    row.batches.forEach(b => {
        if (['生产消耗', '市场卖出'].includes(b.reason) && b.from) taken.set(b.from, (taken.get(b.from) || 0) + Math.abs(b.qty));
    });
    const used = [];
    for (const b of row.batches) {
        if (remaining <= 0) break;
        if (b.qty <= 0 || !['初始库存', '市场买入', '生产成品'].includes(b.reason)) continue;
        const available = b.qty - (taken.get(b.id) || 0);
        if (available <= 0) continue;
        const take = Math.min(available, remaining);
        used.push({ unitPrice: b.unitPrice, qty: take, from: b.id });
        remaining -= take;
    }
    // 同一队列的多个 FIFO 消耗段共享 ref（以 from 区分来源），便于按批次分组展示。
    // merge=true：同队列多次完成时把增量并入现有批次，避免连续生产被拆成多批。
    used.forEach(u => addInventoryBatch(ledger, {
        id, at, reason, qty: -u.qty, unitPrice: u.unitPrice, ref, from: u.from, merge
    }));
    return used;
}

// 仓库实际变动：以回包处理前后的仓库快照差额入账（内容对上即可，数量按实际）。
// before/after 为 { [id]: 数量 }，返回非零差额的 { id, delta } 列表。
function inventoryDelta(before, after) {
    const out = [];
    const ids = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    ids.forEach(id => {
        const d = (Number(after?.[id]) || 0) - (Number(before?.[id]) || 0);
        if (Number.isFinite(d) && d !== 0) out.push({ id: Number(id), delta: d });
    });
    return out.sort((a, b) => a.id - b.id);
}

// 账本理论库存 vs 实际仓库的对账差额。
// 队列材料是执行中逐步消耗的（入队不扣、取消不退），单次事件的前后快照捕捉不到整个过程，
// 因此以「账本累计数量 - 实际仓库数量」的差额作为待补记的实际消耗/产出：
//   gap > 0 → 账本比实际多，实际消耗了 gap 个（记负值生产消耗）；
//   gap < 0 → 账本比实际少，实际产出了 -gap 个（记正值生产成品）。
// qtyOf(id) 返回实际仓库数量；只对账 candidateIds 中「账本已登记」的物品。
// 新进仓库但用户未加入核算的物品不能直接建账，避免自动纳入核算范围。
function inventoryReconcile(ledger, candidateIds, qtyOf) {
    const out = [];
    (candidateIds || []).forEach(rawId => {
        const id = Number(rawId);
        if (!(id > 1)) return;
        const row = ledger.items[String(id)];
        if (!row) return;
        const book = inventorySummary(row).quantity;
        const actual = Number(qtyOf(id)) || 0;
        const gap = book - actual;
        if (Number.isFinite(gap) && Math.abs(gap) >= 1) out.push({ id, delta: -Math.round(gap) });
    });
    return out.sort((a, b) => a.id - b.id);
}

// 生产回包 remove 的 row.id 是背包堆叠 id，未必等于物品 id；替换食材/多倍行动时 row.item 也可能是配方原物品。
// 用堆叠 id 在背包里反查真实物品 id 与用量（移植自远端 captureProduction 的用料反查），强化道具不计入账本口径。
function productionRemovedItems(content, game) {
    const used = new Map();
    if (!content || !Array.isArray(content.remove)) return used;
    const stacks = Array.isArray(game?.inventory) ? game.inventory : [];
    content.remove.forEach(row => {
        if (!row || Number(row.enhancement || 0) !== 0) return;
        const qty = Number(row.quantity);
        if (!Number.isSafeInteger(qty) || qty <= 0) return;
        const stack = stacks.find(s => Number(s.id) === Number(row.id));
        if (Number(stack?.enhancement || 0) !== 0) return;
        // 远端同口径：堆叠里的 item 优先，row.item 兜底；绝不把堆叠 id 当物品 id。
        const id = Number(stack?.item ?? row.item);
        if (!Number.isSafeInteger(id) || id <= 1) return;
        const total = (used.get(id) || 0) + qty;
        if (Number.isSafeInteger(total)) used.set(id, total);
    });
    return used;
}

// FIFO 消耗批次的加权单价（全部无价时返回 null）。
function fifoPrice(used) {
    const priced = (used || []).filter(u => u.unitPrice != null && u.qty > 0);
    if (!priced.length) return null;
    return round2(priced.reduce((s, u) => s + u.unitPrice * u.qty, 0) / priced.reduce((s, u) => s + u.qty, 0));
}

// 在账本（含已归档历史）中按批次 id 查找。
function findInventoryBatch(ledger, batchId) {
    const key = String(batchId || '');
    if (!key || key === 'undefined') return null;
    for (const row of Object.values(ledger?.items || {})) {
        const hit = (row?.batches || []).find(b => String(b?.id) === key) ||
            (Array.isArray(row?.history) ? row.history.find(h => String(h?.id) === key) : null);
        if (hit) return hit;
    }
    return null;
}

// 一个队列的成品按「全部材料成本合计 ÷ 全部产出」统一计价，显示为一条成品批次。
// 材料按 FIFO 来源批次逐段取价：跨批次只累加金额，不按来源拆分成品批次。
//   例：时砂蟹 4@3000 + 12@3500、地元素碎片 12@100 + 12@200
//   成本 = 4×3000 + 12×3500 + 12×100 + 12×200，再 ÷ 总产出 = 一个综合单价。
// 任一来源批次无价 → 成品无价，返回缺报价物品供界面显示「XX物品缺报价」。
function productionQueueCost(ledger, ref, nameOf) {
    const key = String(ref || '');
    const consume = [], outs = [];
    if (!key) return { price: null, amount: null, missing: [], sources: [], consume, outs };
    Object.entries(ledger?.items || {}).forEach(([id, row]) => {
        const lists = [row?.batches || [], Array.isArray(row?.history) ? row.history : []];
        lists.forEach(list => list.forEach(b => {
            if (!b || String(b.ref || '') !== key) return;
            if (b.reason === '生产消耗' && Number(b.qty) < 0) consume.push({ id: Number(id), b });
            else if (b.reason === '生产成品' && Number(b.qty) > 0) outs.push({ id: Number(id), b });
        }));
    });
    const sources = consume.map(({ id, b }) => {
        const upstream = findInventoryBatch(ledger, b.from);
        // 生产消耗的手动价只是上游缺价时的兜底；上游有价时以重算后的来源价为准。
        const price = upstream?.unitPrice ?? b.unitPrice ?? null;
        return { id, from: String(b.from || ''), qty: Math.abs(Number(b.qty) || 0),
            unitPrice: price == null || !(price >= 0) ? null : round2(price), consId: String(b.id || '') };
    });
    const missing = [];
    let cost = 0, allPriced = true;
    sources.forEach(s => {
        if (s.unitPrice == null) {
            allPriced = false;
            if (!missing.some(m => String(m.id) === String(s.id))) {
                missing.push({ id: s.id, name: nameOf ? String(nameOf(s.id) || '') : '' });
            }
        } else cost = round2(cost + round2(s.unitPrice * s.qty));
    });
    const outQty = outs.reduce((s, o) => s + (Number(o.b.qty) || 0), 0);
    if (!sources.length || !(outQty > 0) || !allPriced) {
        return { price: null, amount: null, missing, sources, consume, outs };
    }
    return { price: round2(cost / outQty), amount: round2(cost), missing: [], sources, consume, outs };
}

// 成品批次的来源材料：按同一队列的生产消耗批次汇总；无队列信息的旧批次回退到 source 快照。
function productionSourcesOf(ledger, batch) {
    if (batch?.reason !== '生产成品') return [];
    const queue = productionQueueCost(ledger, batch.ref, null);
    if (queue.sources.length) return queue.sources;
    const src = batch?.source;
    if (src && Number(src.id) > 1 && Number(src.qty) > 0) return [{ ...src }];
    return [];
}

// 按队列核算成品金额/单价；无队列信息的旧批次按 source 快照单批核算。
function productionCostOf(ledger, batch, nameOf) {
    const queue = productionQueueCost(ledger, batch?.ref, nameOf);
    if (queue.sources.length && queue.outs.length) {
        return { price: queue.price, amount: queue.amount, missing: queue.missing, sources: queue.sources };
    }
    const sources = productionSourcesOf(ledger, batch);
    const outQty = Number(batch?.qty) || 0;
    const missing = [];
    let cost = 0, allPriced = true;
    sources.forEach(s => {
        const price = s.unitPrice == null ? null : Number(s.unitPrice);
        if (price == null || !(price >= 0)) {
            allPriced = false;
            if (!missing.some(m => String(m.id) === String(s.id))) {
                missing.push({ id: Number(s.id), name: nameOf ? String(nameOf(Number(s.id)) || '') : '' });
            }
        } else cost = round2(cost + round2(price * Number(s.qty)));
    });
    if (!sources.length || !(outQty > 0) || !allPriced) return { price: null, amount: null, missing, sources };
    const amount = round2(cost);
    return { price: round2(amount / outQty), amount, missing: [], sources };
}

// 成品综合单价的完整计算公式（悬浮提示）：逐项列出 FIFO 来源材料「数量×单价」，
// 再按「材料成本合计 ÷ 总产出 = 综合单价」展示；任一来源缺价时提示缺报价物品。
function productionFormula(ledger, batch, nameOf) {
    const label = id => {
        const n = Number(id);
        const name = nameOf ? String(nameOf(n) || '') : '';
        return name || ('#' + n);
    };
    const fmt = n => Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
    const queue = productionQueueCost(ledger, batch?.ref, nameOf);
    let sources = queue.sources, outs = queue.outs, amount = queue.amount, missing = queue.missing;
    if (!sources.length && batch?.source && Number(batch.source.id) > 1 && Number(batch.source.qty) > 0) {
        // 无队列信息的旧批次：回退到 source 快照。
        const src = batch.source;
        const price = src.unitPrice == null ? null : Number(src.unitPrice);
        sources = [{ id: Number(src.id), qty: Number(src.qty), unitPrice: price }];
        outs = [{ b: batch }];
        amount = price == null ? null : round2(price * Number(src.qty));
        missing = price == null ? [{ id: Number(src.id), name: label(src.id) }] : [];
    }
    if (!sources.length || !outs.length) return '暂无可核算的材料来源';
    const outQty = outs.reduce((s, o) => s + (Number(o.b?.qty) || 0), 0);
    if (!(outQty > 0)) return '暂无可核算的产出数量';
    const terms = sources.map(s => label(s.id) + ' ' + fmt(s.qty) + '×' + (s.unitPrice == null ? '缺报价' : fmt(s.unitPrice)));
    const head = terms.join(' + ');
    if (missing.length) {
        return head + ' = 缺报价：' + missing.map(m => m.name || label(m.id)).join('、') + '，无法核算';
    }
    const text = head + ' = ' + fmt(amount) + ' ÷ ' + fmt(outQty) + ' = ' + fmt(round2(amount / outQty));
    return batch?.reason === '生产成品' && batch?.manualPrice === true
        ? text + '（当前为手动录入的综合单价，不再随材料价重算）' : text;
}

// 材料批次补录单价后联动重算：上游价 → 消耗批次价 → 同队列成品（统一综合单价）→ 下游队列。
// 只有生产成品的 manualPrice 锁定综合单价；生产消耗批次的手动价参与重算（上游价变化时同步更新）。
function recomputeProductionCost(ledger, changedIds, nameOf) {
    const pending = new Set((changedIds || []).map(String).filter(Boolean));
    let touched = false;
    for (let pass = 0; pass < 12 && pending.size; pass++) {
        const next = new Set(), refs = new Set(), legacy = [];
        Object.values(ledger?.items || {}).forEach(row => {
            const lists = [row?.batches || [], Array.isArray(row?.history) ? row.history : []];
            lists.forEach(list => list.forEach(b => {
                if (!b || typeof b !== 'object') return;
                if (b.reason === '生产消耗' || b.reason === '市场卖出') {
                    if (b.from && pending.has(String(b.from))) {
                        // 手动录入的消耗价也参与重算：上游价变化时同步覆盖，再重算成品。
                        const src = findInventoryBatch(ledger, b.from);
                        const price = src?.unitPrice == null ? null : Number(src.unitPrice);
                        if (b.unitPrice !== price) {
                            b.unitPrice = price;
                            b.amount = price == null ? null : round2(Number(b.qty) * price);
                            touched = true;
                            next.add(String(b.id));
                        }
                        if (b.ref && b.reason === '生产消耗') refs.add(String(b.ref));
                    }
                    if (b.ref && b.reason === '生产消耗' && pending.has(String(b.id))) refs.add(String(b.ref));
                }
                // 无队列信息的旧批次：按 source.from 关联补录。
                if (b.reason === '生产成品' && !b.manualPrice && b.source && pending.has(String(b.source.from))) legacy.push(b);
            }));
        });
        refs.forEach(ref => {
            const r = productionQueueCost(ledger, ref, nameOf);
            if (!r.sources.length || !r.outs.length) return;
            const totalOut = r.outs.reduce((s, o) => s + (Number(o.b.qty) || 0), 0);
            r.outs.forEach(({ b }) => {
                if (b.manualPrice === true) return;
                const amount = r.amount == null ? null : round2(r.amount * (Number(b.qty) || 0) / totalOut);
                if (b.unitPrice !== r.price || b.amount !== amount ||
                    JSON.stringify(b.missing || []) !== JSON.stringify(r.missing)) {
                    b.unitPrice = r.price; b.amount = amount;
                    b.missing = r.missing.length ? r.missing : undefined;
                    b.source = undefined;
                    touched = true;
                    next.add(String(b.id));
                }
            });
        });
        legacy.forEach(b => {
            if (b.source) {
                const upstream = findInventoryBatch(ledger, b.source.from);
                b.source.unitPrice = upstream?.unitPrice ?? null;
            }
            const r = productionCostOf(ledger, b, nameOf);
            if (b.unitPrice !== r.price || b.amount !== r.amount ||
                JSON.stringify(b.missing || []) !== JSON.stringify(r.missing)) {
                b.unitPrice = r.price; b.amount = r.amount;
                b.missing = r.missing.length ? r.missing : undefined;
                touched = true;
                next.add(String(b.id));
            }
        });
        pending.clear();
        next.forEach(id => pending.add(id));
    }
    return touched;
}

// 滚动流水：追加一条，超过上限丢弃最早记录。
function pushInventoryTrade(ledger, entry) {
    const at = Number(entry?.at) || Date.now(), id = Number(entry?.id);
    if (!(id > 1)) return false;
    ledger.trades.push({
        at, id, reason: INVENTORY_REASONS.includes(entry.reason) ? entry.reason : '市场买入',
        qty: Number(entry.qty) || 0,
        unitPrice: entry.unitPrice == null ? null : round2(entry.unitPrice),
        ref: entry.ref != null ? String(entry.ref).slice(0, 80) : undefined
    });
    if (ledger.trades.length > MAX_INVENTORY_TRADES) ledger.trades.splice(0, ledger.trades.length - MAX_INVENTORY_TRADES);
    return true;
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
    if (raw && !options.directRecipe) {
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
    // 逐层补货计划只需要「产量 + 每层用量」，不走报价/节点树渲染；采集品若同时有生产配方，也按生产配方计划。
    if (options.directRecipe) {
        const usable = reward?.chance === 100 && Number.isSafeInteger(reward.min) && reward.min > 0 &&
            requirements?.length && requirements.every(r => Number.isSafeInteger(r.itemId) && r.itemId > 0 &&
                Number.isSafeInteger(r.quantity) && r.quantity > 0);
        return usable ? { output: reward.min, requirements } : null;
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

// 逐层补货计划（移植自远端 v1.59.0）：按现有库存逐层抵扣，能生产的记为计划生产，
// 无法生产且可交易的记为建议采购，不可交易的记为需自行获取；任一层配方缺失则整体 incomplete。
function stockHeld(getQuantity, id) {
    const quantity = getQuantity(id);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
}

const stockRecipes = new WeakMap();
function stockRecipe(data, id) {
    if (!stockRecipes.has(data)) stockRecipes.set(data, new Map());
    const recipes = stockRecipes.get(data);
    if (!recipes.has(id)) recipes.set(id, recipeCost(data, id, null, 1, new Set(), { directRecipe: true }));
    return recipes.get(id);
}

function planStockReplenishment(data, shortages, getQuantity) {
    const stock = new Map(), production = new Map(), purchases = new Map();
    const path = new Set();

    function fulfill(id, quantity) {
        if (!Number.isSafeInteger(quantity) || path.has(id) || path.size >= 100) return false;
        if (!stock.has(id)) stock.set(id, stockHeld(getQuantity, id));
        const available = stock.get(id);
        const used = Math.min(available, quantity);
        stock.set(id, available - used);
        const missing = quantity - used;
        if (!missing) return true;
        const recipe = stockRecipe(data, id);
        if (!recipe) {
            const total = (purchases.get(id) || 0) + missing;
            if (!Number.isSafeInteger(total)) return false;
            purchases.set(id, total);
            return true;
        }
        const batches = Math.ceil(missing / recipe.output);
        const output = batches * recipe.output;
        const total = (production.get(id) || 0) + output;
        if (!Number.isSafeInteger(total)) return false;
        path.add(id);
        for (const requirement of recipe.requirements) {
            if (!fulfill(requirement.itemId, requirement.quantity * batches)) return false;
        }
        path.delete(id);
        stock.set(id, output - missing);
        production.set(id, total);
        return true;
    }

    // 每个预警物品的现有数量已抵扣自身目标，不得再分给其他配方。
    for (const [id] of shortages) stock.set(id, 0);
    const complete = [...shortages].every(([id, deficit]) => fulfill(id, deficit));
    return { complete, production: complete ? [...production] : [],
        purchases: complete ? [...purchases].filter(([id]) => data.items[id]?.trade !== false) : [],
        unavailable: complete ? [...purchases].filter(([id]) => data.items[id]?.trade === false) : [] };
}

// 本地双阈值：数值阈值和当日峰值百分比阈值取较高者作为补货目标。
function normalizeStockBuffer(value) {
    const percentage = value == null || value === '' ? NaN : Number(value);
    return Number.isFinite(percentage) && percentage >= 0 && percentage <= 1000 ? round2(percentage) : 25;
}

function stockReplenishment(data, item, check, getQuantity, buffer = 0, alreadyLow = false) {
    const actual = check.have;
    const byQty = Number(check.qtyLimit) || 0;
    const byPct = Number(check.pctLimit) > 0 && check.peak > 0
        ? Math.ceil(check.peak * Number(check.pctLimit) / 100) : 0;
    if (!check.short && !alreadyLow && (check.qtyShort === false && check.pctShort === false)) return null;
    const base = Math.max(byQty, byPct);
    const factor = BigInt(10000 + Math.round(normalizeStockBuffer(buffer) * 100));
    const target = Number((BigInt(base) * factor + 9999n) / 10000n);
    if (!Number.isSafeInteger(target)) return null;
    if (!(target > actual)) return null;
    const deficit = target - actual;
    return { actual, target, deficit, ...planStockReplenishment(data, [[item, deficit]], getQuantity) };
}

function stockItemNames(data, entries) {
    return entries.map(([id, quantity]) => (data.items[id]?.name || '#' + id) + ' × ' + quantity.toLocaleString('zh-CN')).join('、');
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
    function openWarehouseCostModal(def, enh, historyPrice = null) {
        closeWarehouseModal();
        const ui = env.ui(), g = env.game();
        const uid = core.view().account, id = Number(def?.id);
        if (!ui || !uid || !(id > 0)) return;
        const initial = historyPrice != null;
        const saved = warehouseCosts(uid)[String(id)];
        const quote = initial ? historyPrice : leftPrice(id, enh);
        const modal = doc.createElement('div');
        modal.className = 'selector neon nek-warehouse-cost-modal';
        const name = doc.createElement('div'); name.className = 'whc-name';
        name.textContent = (initial ? '期初库存成本 · ' : '库存成本 · ') + (def.name || '#' + id) + (Number(enh) > 0 ? ' +' + enh : '');
        const hint = doc.createElement('div'); hint.className = 'whc-hint';
        hint.textContent = '背包 ' + Number(g.getItemQuantity(id, enh) || 0).toLocaleString('zh-CN') +
            (initial ? ' 个 · 按当前背包录入，已预填订单单价' : ' 个 · 未记录时默认填左一价 · 最多两位小数');
        const input = doc.createElement('input'); input.className = 'whc-input'; input.type = 'text';
        input.inputMode = 'decimal';
        input.value = !initial && saved != null && Number.isFinite(Number(saved)) && String(saved).trim() !== ''
            ? String(round2(saved)) : (quote > 0 ? String(round2(quote)) : '');
        input.setAttribute('aria-label', '库存成本单价');
        const actions = doc.createElement('div'); actions.className = 'whc-actions';
        const confirm = doc.createElement('button'); confirm.type = 'button'; confirm.className = 'btn';
        confirm.textContent = '确定';
        const clear = doc.createElement('button'); clear.type = 'button'; clear.className = 'btn';
        clear.textContent = '清空';
        const cancel = doc.createElement('button'); cancel.type = 'button'; cancel.className = 'btn';
        cancel.textContent = '取消';
        if (initial) actions.append(confirm, cancel); else actions.append(confirm, clear, cancel);
        modal.append(name, hint, input, actions);
        doc.body.appendChild(modal);
        whModal = modal;
        const commit = () => {
            if (core.view().account !== uid) { closeWarehouseModal(); return; }
                    const raw = input.value.trim();
                    const value = parseStockCost(raw);
                    if (value == null) {
                        ui.notifier?.show?.('请输入有效的库存成本（最多两位小数）', 'error'); return;
                    }
            if (initial) {
                const led = normalizeInventoryLedger(inventoryLedger(uid));
                const row = led.items[id];
                const opening = row?.batches.find(b => b.reason === '初始库存');
                if (inventoryUnitPrice(uid, id) != null || (row && !opening)) { closeWarehouseModal(); return; }
                if (opening) {
                    opening.unitPrice = value; opening.amount = round2(opening.qty * value);
                    recomputeProductionCost(led, [opening.id], item => g.getItem(item)?.name || '#' + item);
                } else {
                    addInventoryBatch(led, { id, at: Date.now(), reason: '初始库存',
                        qty: Number(g.getItemQuantity(id)) || 0, unitPrice: value });
                }
                if (saveInventoryLedger(uid, led)) {
                    publishStockCost(id);
                    decorateMarketHistoryCosts();
                    closeWarehouseModal();
                }
                return;
            }
                    const map = warehouseCosts(uid);
                    map[String(id)] = value;
            if (saveWarehouseCosts(uid, map)) {
                publishStockCost(id);
                ui.notifier?.show?.('已保存「' + (def.name || '#' + id) + '」库存成本：' + value, 'success', 3000);
                closeWarehouseModal();
            } else ui.notifier?.show?.('保存失败，请重试', 'error');
        };
        const clearSaved = () => {
            const map = warehouseCosts(uid);
            if (!(String(id) in map)) { closeWarehouseModal(); return; }
            delete map[String(id)];
            if (saveWarehouseCosts(uid, map)) {
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
        let marketSocket, marketUid;
        function alignMarket() {
            const uid = core.view().account;
            if (marketSocket !== msg.ws || marketUid !== uid) {
                marketBuys.clear(); pendingClaims.clear();
                marketSocket = msg.ws; marketUid = uid;
            }
            return uid;
        }
        const send = msg.send;
        msg.send = function (type, data) {
            alignMarket();
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
                for (const row of g?.settlement || []) {
                    if ((data?.id == null || Number(data.id) === Number(row.id)) && Number(row.side) === 2 &&
                        Number(row.item) > 1 && Number(row.quantity) > 0 && Number(row.price) > 0) {
                        pendingClaims.set(Number(row.id), { ...row, at: Date.now() });
                    }
                }
            }
            core.observeSend(type, data, result === true); return result;
        };
        const originalMarketUpdate = msg.handlers.market_update;
        if (typeof originalMarketUpdate === 'function') {
            msg.handlers.market_update = function (data) {
                const content = data?.content || {};
                const uid = alignMarket();
                const before = new Map();
                (content.add || []).forEach(row => {
                    const id = Number(row.item), enh = Number(row.enhancement) || 0;
                    before.set(id + ':' + enh, Number(env.game().getItemQuantity(id, enh, true)) || 0);
                });
                // 仓库前后快照：入账数量一律取实际变动，回包数量仅作内容匹配。
                const removed = productionRemovedItems(content, env.game());
                const candidateIds = [
                    ...(content.add || []).map(r => Number(r.item)),
                    ...removed.keys()
                ].filter(id => id > 1);
                const snapBefore = uid ? warehouseSnapshot(candidateIds) : null;
                const at = Date.now();
                const tradeRef = 'mkt:' + at.toString(36) + Math.random().toString(36).slice(2, 6);
                const result = originalMarketUpdate.apply(this, arguments);
                try {
                    const snapAfter = uid ? warehouseSnapshot(candidateIds) : null;
                    const deltaOf = new Map((snapBefore && snapAfter ? inventoryDelta(snapBefore, snapAfter) : []).map(d => [d.id, d.delta]));
                    for (const [id, claim] of pendingClaims) if (at - claim.at > 15000) pendingClaims.delete(id);
                    (content.add || []).forEach(row => {
                        const id = Number(row.item), enh = Number(row.enhancement) || 0;
                        if (!(id > 1)) return;   // 金币等非物品排除
                        const key = id + ':' + enh;
                        // 结算领取入库优先用领取时暂存的真实成交价；其次直购暂存单价。
                        let remaining = Math.min(Number(row.quantity) || 0, deltaOf.get(id) || 0);
                        if (!uid || !(remaining > 0)) return;
                        deltaOf.set(id, deltaOf.get(id) - remaining);
                        const lots = [];
                        let held = before.get(key) || 0;
                        const direct = marketBuys.get(key);
                        if (content.type === 'claim' || (!direct && content.type !== 'cancel')) {
                            for (const [sid, claim] of pendingClaims) {
                                if (!remaining || Number(claim.item) !== id ||
                                    Number(claim.enhancement || 0) !== enh) continue;
                                const qty = Math.min(remaining, Number(claim.quantity));
                                lots.push({ qty, price: Number(claim.price), ref: 'claim:' + sid, order: Number(claim.order_id) });
                                remaining -= qty;
                                claim.quantity -= qty;
                                if (claim.quantity <= 0) pendingClaims.delete(sid);
                            }
                        } else if (direct && at - direct.at <= 15000 && content.type !== 'cancel') {
                            marketBuys.delete(key);
                            const price = Number(content.price) || direct.price;
                            if (price > 0) lots.push({ qty: remaining, price, ref: tradeRef, order: Number(content.order_id) });
                        }
                        if (!lots.length) return;
                        const map = warehouseCosts(uid);
                        let merged = map[id];
                        for (const lot of lots) {
                            merged = mergeWarehouseCost(merged, held, lot.price, lot.qty);
                            held += lot.qty;
                            recordInventory(uid, { id, at, reason: '市场买入', qty: lot.qty,
                                unitPrice: lot.price, ref: lot.ref + ':' + id + ':' + enh, order: lot.order });
                        }
                        if (merged != null) {
                            map[String(id)] = merged;
                            if (saveWarehouseCosts(uid, map)) publishStockCost(id);
                        }
                    });
                    // 市场卖出：market_update.remove[] 带出库的堆叠 id 与数量；卖价从结账 add[item=1] 或订单取。
                    const soldCoins = (content.add || []).find(r => Number(r.item) === 1);
                    for (const id of removed.keys()) {
                        if (!(id > 1) || !uid) return;
                        const sold = -(deltaOf.get(id) || 0);
                        if (!(sold > 0)) continue;
                        let price = 0;
                        const coinGain = Number(soldCoins?.quantity) || 0;
                        if (coinGain > 0 && sold > 0) price = round2(coinGain / sold);
                        recordInventory(uid, {
                            id, at, reason: '市场卖出', qty: -sold,
                            unitPrice: price > 0 ? price : null, ref: tradeRef
                        });
                    }
                    if (uid && candidateIds.length) {
                        refreshStockAlerts(uid, new Set(candidateIds));
                        dispatchInventoryUpdate(uid);
                    }
                } catch (e) { /* 成本更新失败不影响原生成交处理 */ }
                return result;
            };
        }
        // 队列批次身份：以 token 为主键，同一队列完成/取消共享 ref。
        function productionBatchIdentity(type, content) {
            const head = env.game()?.queue?.[0];
            const meta = head ? queueMetadata.get(head) : null;
            const cancelHead = type === 'action_canceled' && cancelRequest ? cancelRequest.head : null;
            const token = content?.token ?? head?.token ?? meta?.token ?? cancelHead?.token;
            const key = token != null && token !== ''
                ? String(token)
                : String(content?.id ?? head?.id ?? cancelHead?.id ?? '0') + ':' + String(content?.type ?? head?.type ?? cancelHead?.type ?? '');
            return { ref: 'queue:' + key };
        }
        for (const type of ['action_added', 'action_update', 'action_complete', 'action_canceled', 'update_queue']) {
            const original = msg.handlers[type];
            if (typeof original !== 'function') continue;
            msg.handlers[type] = function (data) {
                const content = data?.content;
                const uid = core.view().account;
                const head = env.game()?.queue?.[0];
                // FIFO 按回包保留批次顺序。预警单独批量刷新，重复回包无背包变化则不记账。
                const isTerminal = type === 'action_complete' || type === 'action_canceled';
                const removed = isTerminal ? productionRemovedItems(content, env.game()) : new Map();
                const candidateIds = isTerminal && uid ? [...new Set([
                    ...(content?.add || []).map(r => Number(r.item)),
                    ...removed.keys()
                ])].filter(id => id > 1) : [];
                const ident = isTerminal ? productionBatchIdentity(type, content) : null;
                const at = Date.now();
                const result = original.apply(this, arguments);
                try {
                    if (isTerminal && ident && uid) {
                        const led = inventoryLedger(uid);
                        // 无物品差额的终止回包仍可能对应此前已经扣除的材料，沿用 FIFO 对账兜底。
                        const ids = candidateIds.length ? candidateIds : Object.keys(led.items).map(Number);
                        const snap = warehouseSnapshot(ids);
                        const deltas = inventoryReconcile(led, ids, id => snap[id] || 0);
                        if (deltas.length) recordQueueDelta(uid, { deltas, at, ref: ident.ref });
                        for (const id of candidateIds) productionAlertIds.add(id);
                        for (const { id } of deltas) productionAlertIds.add(id);
                    }
                } catch (e) { /* 生产记账失败不影响原生成交处理 */ }
                observeQueue(type, data?.content);
                const next = env.game()?.queue?.[0];
                const token = entry => entry?.token ?? (entry && queueMetadata.get(entry)?.token);
                const switched = head !== next && (token(head) == null || token(head) !== token(next));
                const ended = (type === 'action_complete' || type === 'action_canceled') &&
                    Number(content?.remaining ?? (next && queueMetadata.get(next)?.remaining) ?? (!next ? 0 : NaN)) === 0;
                if (uid && (switched || ended)) {
                    flushProductionAlerts(uid, head);
                }
                return result;
            };
        }
        // 历史记录回包：标记式校验——把账本批次与 action_records 对上，标 verified。
        const originalRecords = msg.handlers.action_records;
        if (typeof originalRecords === 'function') {
            msg.handlers.action_records = function (data) {
                const result = originalRecords.apply(this, arguments);
                try { verifyInventoryRecords(data?.content); } catch (e) { /* 校验失败不影响原生显示 */ }
                return result;
            };
        }
        // 市场历史订单回包：校验买卖批次（订单 closed_time + side + item + traded）。
        const originalHistory = msg.handlers.market_history;
        if (typeof originalHistory === 'function') {
            msg.handlers.market_history = function (data) {
                const result = originalHistory.apply(this, arguments);
                try {
                    const uid = core.view().account;
                    if (uid && costEnabled()) {
                        const led = normalizeInventoryLedger(inventoryLedger(uid)), game = env.game();
                        const { changed, affected } = importFifoPurchases(led, game.orderHistory, game.settlement,
                            id => game.getItemQuantity(id));
                        if (changed) saveInventoryLedger(uid, led, !affected.size, affected);
                    }
                    verifyInventoryTrades();
                    decorateMarketHistoryCosts();
                } catch (e) { /* 校验失败不影响原生显示 */ }
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
                if (type === 'init_character_data') {
                    productionAlertIds.clear();
                    nextProductionAlert = Date.now() + 120000;
                    stockAlerts = null;
                    const uid = core.view().account;
                    if (uid) {
                        inventoryCache.delete(String(uid));
                        refreshStockAlerts(uid);
                    }
                }
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
        // 物品菜单「库存核算」：背包里没有该物品时不插入选项；有则点击跳转库存核算页并定位。
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
                        '<div class="item-menu-button-name">库存核算</div>';
                    btn.addEventListener('click', e => {
                        e.stopPropagation();
                        if (slotElement) slotElement.classList.remove('menu-active');
                        menu.remove();
                        ui.itemMenu = null;
                        // 跳转成本核算页的「库存核算」标签并定位该物品。
                        // 成本页结构在侧边栏按钮首次点击时才构建；changeContent 之后游戏还可能异步重建页面，
                        // 因此每次都重新查询 DOM，并在下一帧/延时再确认一次标签，避免落到「市场成本」。
                        ui.changeContent('nek-cost');
                        let focused = false;
                        const ensureInventoryTab = () => {
                            let page = doc.querySelector('.page.nek-cost');
                            const entry = doc.querySelector('.nek-cost-entry');
                            if (page && !page.querySelector('.nek-cost-tabs') && entry) {
                                entry.classList.remove('active');
                                entry.click();
                                page = doc.querySelector('.page.nek-cost');
                            }
                            const tab = page?.querySelector('.nek-cost-tabs [data-tab="inventory"]');
                            if (!tab) return false;
                            if (!tab.classList.contains('active')) tab.click();
                            return !!(page.querySelector('.nek-inventory-main') && !page.querySelector('.nek-inventory-main').hidden);
                        };
                        const focusItem = () => {
                            if (focused) return;
                            const uid = core.view().account;
                            if (!(uid && id > 1)) return;
                            const led = inventoryLedger(uid);
                            if (!led.items[String(id)]) {
                                const price = Number(warehouseCosts(uid)[String(id)]) > 0 ? round2(warehouseCosts(uid)[String(id)]) : (leftPrice(id, enh) > 0 ? round2(leftPrice(id, enh)) : null);
                                const qty = Number(env.game().getItemQuantity(id, enh)) || 0;
                                addInventoryBatch(led, { id, at: Date.now(), reason: '初始库存', qty: qty || 0, unitPrice: price });
                                saveInventoryLedger(uid, led);
                            }
                            doc.dispatchEvent(new CustomEvent('nek-inventory-updated', { detail: { uid: String(uid), focus: id } }));
                            focused = true;
                        };
                        const tryOpen = () => { if (ensureInventoryTab()) focusItem(); };
                        tryOpen();
                        setTimeout(tryOpen, 0);
                        // 页面异步重建后再次确认标签；若目标物品尚未渲染则补发一次定位事件。
                        const assertLater = () => {
                            if (!ensureInventoryTab() || !(id > 1)) return;
                            if (!doc.querySelector('.nek-inventory-row[data-id="' + id + '"]')) {
                                const uid = core.view().account;
                                if (uid) doc.dispatchEvent(new CustomEvent('nek-inventory-updated', { detail: { uid: String(uid), focus: id } }));
                            }
                        };
                        setTimeout(assertLater, 150);
                        setTimeout(assertLater, 400);
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
            '.nek-warehouse-cost-modal .whc-field-label{font-size:12px;margin:6px 0 3px}',
            '.nek-warehouse-cost-modal .whc-input{width:100%;box-sizing:border-box}',
            // 单价来源标识：自动填左一价（青）/ 读取本地数据（绿）/ 无报价（红）。
            '.nek-warehouse-cost-modal .whc-source{font-size:11px;margin-top:4px}',
            '.whc-source-auto{color:var(--c-main-bright,#74f9bc)}',
            '.whc-source-saved{color:rgb(76,175,80)}',
            '.whc-source-blank{color:rgb(255,48,33)}',
            '.nek-inventory-threshold{cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}',
            '.nek-inventory-threshold:hover{color:var(--c-main-bright,#74f9bc)}',
            '.nek-inventory-threshold.nek-threshold-short{color:#ff6b5e}',
            // 预警列后的移除按钮：仅占一列窄位，不跟随数字列右对齐规则。
            '.nek-inventory-delete{justify-self:end;width:20px;height:18px;line-height:16px;padding:0;text-align:center;',
            '  font-size:12px;color:rgb(255,48,33);border:1px solid rgba(255,48,33,.5);border-radius:3px;background:transparent;cursor:pointer}',
            '.nek-inventory-delete:hover{background:rgba(255,48,33,.18);color:#fff}',
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
            // 库存核算页：双标签切换 + 批次明细 + 选择浮窗（复用市场分类）。
            '.nek-cost-tabs>.page-tab-item{cursor:pointer}',
            // 原生 .page-main 的 display 会覆盖 UA 的 [hidden]{display:none}，两个面板都要显式隐藏。
            '.nek-inventory-main[hidden],.nek-market-main[hidden]{display:none}',
            '.nek-inventory-total{font-weight:700;padding:4px 0}',
            '.nek-inventory-plan{width:100%;max-width:76rem;border:1px solid rgba(var(--r),var(--g),var(--b),.25);border-radius:4px;padding:4px 8px;margin-bottom:6px;font-size:12px;line-height:1.6}',
            '.nek-inventory-plan[hidden]{display:none}',
            '.nek-inventory-plan h4{margin:4px 0 0;font-size:12px}',
            '.nek-inventory-plan ul{margin:2px 0;padding-left:18px}',
            '.nek-inventory-plan li{list-style:disc}',
            '.nek-inventory-list{width:100%;max-width:76rem;display:grid;gap:4px}',
            '.nek-inventory-row{border:1px solid rgba(var(--r),var(--g),var(--b),.25);border-radius:4px;padding:4px 6px;background:rgba(var(--r),var(--g),var(--b),.04)}',
            '.nek-inventory-head{display:grid;grid-template-columns:minmax(0,0.8fr) repeat(4,minmax(0,1fr)) 26px;align-items:center;gap:4px;padding:2px 6px;font-size:12px;color:var(--c-text-dim,#83c3c3);border-bottom:1px solid rgba(var(--r),var(--g),var(--b),.25)}',
            '.nek-inventory-head>span:not(:first-child){text-align:right}',
            '.nek-inventory-summary{display:grid;grid-template-columns:minmax(0,0.8fr) repeat(4,minmax(0,1fr)) 26px;align-items:center;gap:4px;cursor:pointer;font-variant-numeric:tabular-nums}',
            '.nek-inventory-summary>span:not(:first-child){text-align:right}',
            '.nek-inventory-name{display:inline-flex;align-items:center;gap:4px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '.nek-inventory-caret{display:inline-block;font-size:10px;opacity:.7;transition:transform .15s;flex:none}',
            '.nek-inventory-row.open .nek-inventory-caret{transform:rotate(90deg)}',
            // 批次行与汇总行共用同一 grid 模板，确保逐列严格对齐：
            // 第1列(物品名下方)=时间+原因，第2列 可用↔数量变化，第3列 综合单价↔批次单价，
            // 第4列 库存价值↔总额变化，第5列 预警↔核对。
            '.nek-inventory-batches{margin-top:4px;display:grid;gap:2px}',
            '.nek-inventory-batch-row{display:grid;grid-template-columns:minmax(0,0.8fr) repeat(4,minmax(0,1fr)) 26px;align-items:center;gap:4px;font-size:12px;font-variant-numeric:tabular-nums}',
            '.nek-inventory-batch-row>span:not(:first-child){text-align:right;white-space:nowrap;min-width:0}',
            '.nek-inventory-batch-row:first-child{color:var(--c-text-dim,#83c3c3);font-size:11px}',
            '.nek-inventory-batch-cell1{display:flex;flex-direction:column;gap:1px;min-width:0}',
            '.nek-inventory-batch-time{color:var(--c-text-dim,#83c3c3);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '.nek-inventory-batch-row:nth-child(even):not(:first-child){background:rgba(var(--r),var(--g),var(--b),.06)}',
            // 批次单价：点击录入浮窗，手型 + 虚线下划线提示可交互。
            '.nek-inventory-batch-price{cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}',
            '.nek-inventory-batch-price:hover{color:var(--c-main-bright,#74f9bc)}',
            '.nek-price-missing{color:#ff8a6b;text-decoration:none;cursor:help}',
            '.nek-inventory-verified{color:rgb(76,175,80)}.nek-inventory-unverified{color:rgb(255,48,33)}',
            '.nek-inventory-history{color:var(--c-text-dim,#83c3c3)}.nek-inventory-loss{color:#e0a030}',
            '.nek-inventory-delta-pos{color:rgb(76,175,80)}.nek-inventory-delta-neg{color:rgb(255,48,33)}',
            // 借贷方向：借方（入库）青色、贷方（出库）橙色，沿用中文会计红字冲销语义的弱化版。
            '.nek-inventory-debit{color:var(--c-main,#74f9bc)}.nek-inventory-credit{color:#e0a030}',
            // FIFO 三色条（方案 A 霓虹冷调）：折叠仅三色，展开两行且增加/消耗按批次斑马纹。
            '.nek-inventory-fifo{margin:3px 0;display:grid;gap:2px}',
            '.nek-inventory-fifo-line{display:flex;height:9px;width:100%;overflow:hidden;border-radius:2px;background:rgba(0,0,0,.25)}',
            '.nek-inventory-fifo-seg{height:100%;flex:none;box-sizing:border-box;min-width:0}',
            '.nek-fifo-base{background:#2E7D8F}',
            '.nek-fifo-inc{background:#3FB98C}.nek-fifo-inc.alt{background:#34A279}',
            '.nek-fifo-dec{background:#D9536E}.nek-fifo-dec.alt{background:#BE455E}',
            '.nek-inventory-fifo-hint{font-size:11px;color:var(--c-text-dim,#83c3c3);font-variant-numeric:tabular-nums}',
            '.nek-inventory-pick .selector-grid{grid-template-columns:repeat(auto-fill,60px)}',
            '.nek-inventory-pick .nek-inventory-search{width:100%;box-sizing:border-box;margin-bottom:6px}',
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
            const label = doc.createElement('label');
            label.className = 'stat-sub';
            label.textContent = '库存补货充裕比例（%） ';
            const buffer = doc.createElement('input');
            buffer.type = 'number'; buffer.min = '0'; buffer.max = '1000'; buffer.step = '0.01';
            buffer.className = 'nek-stock-buffer';
            buffer.required = true;
            label.appendChild(buffer);
            block.appendChild(label);
            buffer.addEventListener('change', () => {
                const uid = core.view().account;
                if (!uid || !buffer.checkValidity()) return;
                try { storage.setItem(stockBufferKey, String(normalizeStockBuffer(buffer.value))); }
                catch { return; }
                refreshStockAlerts(uid);
                dispatchInventoryUpdate(uid);
            });
            const status = doc.createElement('div'); status.className = 'nek-quest-status stat-sub'; block.appendChild(status); section.appendChild(block);
        }
        const buffer = block.querySelector('.nek-stock-buffer');
        if (buffer && doc.activeElement !== buffer) buffer.value = String(stockBuffer());
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
    function saveWarehouseCosts(uid, map) {
        try { storage.setItem(warehouseKey(uid), JSON.stringify(map)); return true; }
        catch { return false; }
    }
    // ---- 库存核算账本：按批次记录库存变化，独立于旧的单一均价数据 ----
    const inventoryKey = uid => 'nek_inventory_ledger_v1:' + uid;
    const inventoryCache = new Map();
    let stockAlerts = null;
    const productionAlertIds = new Set();
    let nextProductionAlert = 0;
    const stockBufferKey = 'nek_stock_buffer_percentage';
    function stockBuffer() {
        try { return normalizeStockBuffer(storage.getItem(stockBufferKey)); }
        catch { return 25; }
    }
    function refreshStockAlerts(uid, affected = null) {
        const game = env.game(), data = env.data();
        if (!uid || !game || !data?.items || !costEnabled()) return null;
        const ledger = inventoryLedger(uid), buffer = stockBuffer(), now = Date.now();
        const configuration = JSON.stringify(ledger.thresholds);
        const day = dayStartOf(now);
        if (!stockAlerts || stockAlerts.uid !== uid || stockAlerts.configuration !== configuration ||
            stockAlerts.buffer !== buffer || stockAlerts.day !== day) {
            const previous = stockAlerts?.uid === uid && stockAlerts.configuration === configuration &&
                stockAlerts.buffer === buffer && stockAlerts.day === day ? stockAlerts.active : new Set();
            stockAlerts = { uid, configuration, buffer, day, quantities: new Map(), dependents: new Map(),
                checks: new Map(), plans: new Map(), active: previous, combined: null, notified: new Map() };
            for (const root of Object.keys(ledger.thresholds).map(Number)) {
                if (!ledger.items[root]) continue;
                const pending = [root], seen = new Set();
                while (pending.length) {
                    const id = pending.pop();
                    if (seen.has(id)) continue;
                    seen.add(id);
                    if (!stockAlerts.dependents.has(id)) stockAlerts.dependents.set(id, new Set());
                    stockAlerts.dependents.get(id).add(root);
                    for (const req of stockRecipe(data, id)?.requirements || []) pending.push(req.itemId);
                }
            }
            affected = null;
        }
        const state = stockAlerts, impacted = new Set();
        const ids = affected ?? new Set([...state.dependents.keys(), ...Object.keys(ledger.items).map(Number)]);
        for (const id of ids) {
            const dependents = state.dependents.get(id);
            if (!dependents && !ledger.items[id]) continue;
            const qty = stockHeld(item => game.getItemQuantity(item), id);
            if (qty !== state.quantities.get(id) || dependents?.has(id) || !affected) {
                state.quantities.set(id, qty);
                for (const root of dependents || []) impacted.add(root);
            }
        }
        const held = id => state.quantities.get(id) ?? 0;
        const notices = [];
        for (const id of impacted) {
            const check = thresholdCheck(ledger.items[id], ledger.thresholds[id], held(id), now);
            const plan = stockReplenishment(data, id, check, held, buffer, state.active.has(id));
            state.checks.set(id, { ...check, short: !!plan });
            if (plan) {
                state.active.add(id);
                state.plans.set(id, plan);
                const type = !plan.complete ? '需检查配方' : plan.unavailable.length ? '缺少不可交易物资' :
                    plan.purchases.length ? '需采购' : '可生产补货';
                if (state.notified.get(id) !== type) {
                    notices.push((data.items[id]?.name || '#' + id) + ' ' + type);
                    state.notified.set(id, type);
                }
            } else {
                state.active.delete(id);
                state.plans.delete(id);
                state.notified.delete(id);
            }
        }
        if (impacted.size) state.combined = null;
        if (notices.length) env.ui()?.notifier?.show?.('库存预警：' + notices.slice(0, 3).join('；') +
            (notices.length > 3 ? '等 ' + notices.length + ' 项' : '') + '。详情见补货计划。', 'tip');
        return state;
    }
    function inventoryAlertState(uid) {
        if (!uid || !costEnabled()) return null;
        if (stockAlerts?.uid !== uid || stockAlerts.buffer !== stockBuffer() || stockAlerts.day !== dayStartOf(Date.now())) {
            return refreshStockAlerts(uid);
        }
        return stockAlerts;
    }
    function stockShortages() {
        const state = inventoryAlertState(core.view().account);
        if (!state) return [];
        const data = env.data();
        return [...state.plans].map(([id, plan]) => ({
            id, name: data.items[id]?.name || '#' + id, have: plan.actual, th: plan.target
        })).sort((a, b) => a.have - b.have);
    }
    function dispatchInventoryUpdate(uid) {
        try { doc.dispatchEvent(new CustomEvent('nek-inventory-updated', { detail: { uid: String(uid) } })); }
        catch { /* 忽略 */ }
    }
    function flushProductionAlerts(uid, head) {
        const data = env.data(), game = env.game();
        const recipe = head?.type === 'action' ? data?.actions?.[head.id] :
            head?.type === 'cooking' ? data?.cookingRecipes?.[head.id] : null;
        for (const reward of recipe?.rewards || []) productionAlertIds.add(Number(reward.itemId));
        for (const [i, req] of (recipe?.ingredients || recipe?.requirements || []).entries()) {
            const id = head.type === 'cooking' ? queueIngredient(game, data, req, head.item?.choices?.[i], 1, 0).itemId : req.itemId;
            productionAlertIds.add(Number(id));
        }
        if (productionAlertIds.size) {
            refreshStockAlerts(uid, productionAlertIds);
            productionAlertIds.clear();
            dispatchInventoryUpdate(uid);
        }
        nextProductionAlert = Date.now() + 120000;
    }
    function inventoryLedger(uid) {
        if (!uid) return normalizeInventoryLedger(null);
        if (!inventoryCache.has(String(uid))) {
            let saved = null;
            try { saved = JSON.parse(storage.getItem(inventoryKey(uid)) || 'null'); } catch { /* 新建账本 */ }
            const compatible = migrateAverageInventory(saved, warehouseCosts(uid));
            const led = normalizeInventoryLedger(compatible);
            const game = env.game();
            // 迁移旧账本「有数量无批次」的物品：补初始库存批次（数量取仓库实际，无货则 0）。
            // 仅在确实补齐时写回一次，避免每次读取都重写本地存储。
            const migrated = migrateEmptyBatchItems(led,
                id => game.getItemQuantity(id),
                id => {
                    const old = warehouseCosts(uid)[String(id)];
                    return Number(old) > 0 ? round2(old) : (leftPrice(id, 0) > 0 ? round2(leftPrice(id, 0)) : null);
                });
            // 游戏首次加载账本时归档 FIFO 已耗尽批次（显示到次日 00:00 / 首次加载）。
            const archived = archiveExhaustedBatches(led, Date.now());
            // 旧账本按来源拆开的同队列成品合并为一条综合批次。
            const mergedOutputs = mergeQueueOutputBatches(led);
            if (migrated || archived || mergedOutputs || compatible !== saved) {
                // 首次读取时的本地维护写回：静默，不单独触发云同步。
                try { storage.setItem(inventoryKey(uid), JSON.stringify(led), true); } catch { /* 忽略写入失败 */ }
            }
            inventoryCache.set(String(uid), normalizeInventoryLedger(led));
        }
        return inventoryCache.get(String(uid));
    }
    // low=true：生产队列完成/取消、标记核对等自动补记，不按普通用户修改触发即时上传。
    function saveInventoryLedger(uid, ledger, low, affected = null, quiet = false) {
        if (!uid) return false;
        try {
            storage.setItem(inventoryKey(uid), JSON.stringify(ledger), !!low);
            inventoryCache.set(String(uid), normalizeInventoryLedger(ledger));
            if (!quiet) {
                refreshStockAlerts(uid, affected);
                dispatchInventoryUpdate(uid);
            }
            if (low) env.cloudMarkLow?.();
            return true;
        } catch { return false; }
    }
    // 从账本读取某物品的有效均价：优先账本汇总，缺失回退旧库存成本。
    function inventoryUnitPrice(uid, id) {
        const row = inventoryLedger(uid).items[String(id)];
        const summary = row ? inventorySummary(row) : null;
        return summary?.unitPrice != null ? summary.unitPrice : (warehouseCosts(uid)[String(id)] ?? null);
    }
    // 记录库存变化并写滚动流水；生产消耗自动按 FIFO 拆分。
    // from：生产消耗来源批次 id（可选）；extraRef：批次归属后缀（可选，用于区分终止原因）。
    function recordInventory(uid, { id, at, reason, qty, unitPrice, ref, from, order }) {
        const led = inventoryLedger(uid);
        // 只记账本已登记（用户通过「选择物品」加入）的物品，新进仓库不自动纳入核算。
        if (!led.items[String(id)]) return false;
        if (reason === '市场卖出' && qty < 0) {
            const used = consumeInventoryFifo(led, id, -qty, at, ref, false, reason);
            const untracked = -qty - used.reduce((total, part) => total + part.qty, 0);
            if (untracked > 0) addInventoryBatch(led, { id, at, reason, qty: -untracked, unitPrice: null, ref });
        } else if (!addInventoryBatch(led, { id, at, reason, qty, unitPrice, ref, from })) return false;
        if (reason === '市场买入' && Number.isSafeInteger(order) && order > 0) {
            led.orders[order] = { quantity: (led.orders[order]?.quantity || 0) + qty };
        }
        pushInventoryTrade(led, { at, id, reason, qty, unitPrice, ref });
        return saveInventoryLedger(uid, led, false, new Set([id]));
    }
    // 仓库数量快照：按物品 id 累加（同一物品不同强化等级合并，与账本口径一致）。
    // 优先遍历 inventory 堆叠；无 stacking 数组时按候选 id 读 getItemQuantity（兼容精简环境）。
    function warehouseSnapshot(candidateIds) {
        const g = env.game() || {};
        const snap = {};
        const candidates = new Set(candidateIds || []);
        if (!candidates.size) return snap;
        if (Array.isArray(g.inventory)) {
            g.inventory.forEach(s => {
                const id = Number(s.item ?? s.id);
                if (candidates.has(id)) snap[id] = (snap[id] || 0) + (Number(s.quantity) || 0);
            });
        } else {
            (candidateIds || []).forEach(id => {
                if (id > 1) snap[id] = Number(typeof g.getItemQuantity === 'function' ? g.getItemQuantity(id, 0, true) : 0) || 0;
            });
        }
        return snap;
    }
    // 把一个队列的消耗/产出差额写入账本（一个队列 = 一个 ref）。
    // deltas 来自账本理论库存 vs 实际仓库的对账差额：负=实际消耗，正=实际产出。
    // 材料按 FIFO 逐段记录来源与单价；同队列所有材料成本合计 ÷ 总产出 = 综合单价，
    // 每种产出自成一个批次（同队列多次完成合并），不再按来源材料拆成多个成品批次。
    function recordQueueDelta(uid, { deltas, at, ref }) {
        if (!deltas || !deltas.length) return false;
        const led = inventoryLedger(uid);
        const nameOf = id => {
            try { return env.game()?.getItem?.(id)?.name || env.data()?.items?.[String(id)]?.name || ('#' + id); }
            catch { return '#' + id; }
        };
        deltas.filter(d => d.delta < 0 && led.items[String(d.id)]).forEach(d => {
            // merge=true：同一队列多次完成累加到同 ref+from 批次，不拆成多批。
            const used = consumeInventoryFifo(led, d.id, -d.delta, at, ref, true);
            used.forEach(u => {
                pushInventoryTrade(led, { at, id: d.id, reason: '生产消耗', qty: -u.qty, unitPrice: u.unitPrice, ref });
            });
        });
        // 只写入已登记物品；未加入核算的新物品不因生产而自动建账。
        const outs = deltas.filter(d => d.delta > 0 && led.items[String(d.id)]);
        outs.forEach(d => {
            addInventoryBatch(led, { id: d.id, at, reason: '生产成品', qty: d.delta, unitPrice: null, ref, merge: true });
        });
        // 按队列统一核算：材料跨批次、跨种类只累加金额，最后 ÷ 总产出得到一个综合单价。
        const cost = productionQueueCost(led, ref, nameOf);
        if (cost.sources.length && cost.outs.length) {
            const totalOut = cost.outs.reduce((s, o) => s + (Number(o.b.qty) || 0), 0);
            cost.outs.forEach(({ b }) => {
                if (b.manualPrice === true) return;
                const amount = cost.amount == null ? null : round2(cost.amount * (Number(b.qty) || 0) / totalOut);
                b.unitPrice = cost.price;
                b.amount = amount;
                b.missing = cost.missing.length ? cost.missing : undefined;
            });
        }
        outs.forEach(d => {
            pushInventoryTrade(led, { at, id: d.id, reason: '生产成品', qty: d.delta, unitPrice: cost.price, ref });
        });
        // 生产完成/取消是自动补记：合并到较低频的上传窗口，避免连续生产时每次完成都触发云同步。
        return saveInventoryLedger(uid, led, true, null, true);
    }
    // 生产回包解析：action_complete 的 add 是产出、remove 是消耗；产出单价按消耗总额/产出量折算。
    function captureInventoryProduction(content) {
        if (!content || !Array.isArray(content.add) || !content.add.length) return null;
        const data = env.data();
        if (!data) return null;
        const action = content.type === 'action' ? data.actions?.[content.id] : null;
        const recipe = content.type === 'cooking' ? data.cookingRecipes?.[content.id] : action?.action === 6 ? action : null;
        if (!recipe) return null;
        const rewardIds = new Set((recipe.rewards || []).map(r => Number(r.itemId)));
        const outputs = [];
        content.add.forEach(row => {
            const id = Number(row.item), qty = Number(row.quantity);
            if (rewardIds.has(id) && qty > 0 && Number(row.enhancement || 0) === 0) outputs.push({ id, qty });
        });
        if (!outputs.length) return null;
        const uid = core.view().account;
        const costs = uid ? inventoryLedger(uid) : null;
        const used = [];
        productionRemovedItems(content, env.game()).forEach((qty, id) => {
            const rowCost = costs?.items[String(id)];
            const price = rowCost ? inventorySummary(rowCost).unitPrice : inventoryUnitPrice(uid, id);
            used.push({ id, qty, unitPrice: price != null ? price : null });
        });
        // 产出单价 = 消耗总额 / 产出总量；无消耗或消耗无价时留空。
        const costTotal = used.reduce((sum, u) => sum + (u.unitPrice != null ? u.qty * u.unitPrice : 0), 0);
        const outQty = outputs.reduce((sum, o) => sum + o.qty, 0);
        const allPriced = used.length > 0 && used.every(u => u.unitPrice != null);
        const outPrice = allPriced && outQty > 0 ? round2(costTotal / outQty) : null;
        outputs.forEach(o => { o.unitPrice = outPrice; });
        return { used, outputs, key: String(content.id || '0') + ':' + String(content.type || '') + ':' + Date.now() };
    }
    // 标记式校验：账本批次与历史记录按「物品 + 时间窗口」匹配即标已核对（内容对上即可）。
    // 数量不作为硬条件——批次开始于脚本启动前时，历史记录理论量与仓库实际差额可能不同。
    // 并记录操作时间（开始时分秒）。历史记录时间为秒级，账本为毫秒级，统一按分钟容差比对。
    function verifyInventoryRecords(content) {
        const uid = core.view().account;
        if (!uid || !content) return;
        const led = inventoryLedger(uid);
        const records = [...(content.records || []), ...(content.current ? [content.current] : [])];
        if (!records.length) return;
        const keys = [];
        records.forEach(r => {
            const startSec = Number(r.start_time) || 0;
            const endSec = Number(r.end_time) || startSec;
            const item = r.item;
            if (!startSec || !item) return;
            const ids = Array.isArray(item) ? item.map(x => Number(x.item || x.id)) : [Number(item.item || item)];
            const qtys = Array.isArray(item) ? item.map(x => Number(x.quantity)) : [Number(item.quantity)];
            // 保留结束时刻（对账用）与开始时刻（展示用），均为毫秒。
            ids.forEach((id, i) => {
                if (id > 1 && qtys[i] > 0) keys.push({ id, qty: qtys[i], endMs: endSec * 1000, startMs: startSec * 1000 });
            });
        });
        let changed = false;
        // 记账时刻 Date.now() 与历史记录 end_time 可能有数秒偏差，按 id + 10 分钟窗口取最近记录；
        // 数量不再要求相等（实际差额可能与历史记载不同），只要求内容（物品）对得上。
        const WINDOW = 600000;
        Object.entries(led.items).forEach(([id, row]) => row.batches.forEach(b => {
            if (b.verified) return;
            if (!['生产消耗', '生产成品'].includes(b.reason)) return;
            let best = null, bestGap = WINDOW;
            keys.forEach(k => {
                if (k.id !== Number(id)) return;
                const gap = Math.abs(k.endMs - b.at);
                if (gap < bestGap) { bestGap = gap; best = k; }
            });
            if (best) {
                b.verified = true; b.checkAt = best.startMs; changed = true;
            }
        }));
        // 核对标记属于本地校验结果，低优先级同步。
        if (changed) saveInventoryLedger(uid, led, true);
    }
    // 标记式校验：市场买卖批次与 game.orderHistory（30 条）按订单/成交数量+时间匹配。
    function verifyInventoryTrades() {
        const uid = core.view().account;
        if (!uid) return;
        const led = inventoryLedger(uid);
        const orders = env.game()?.orderHistory || [];
        let changed = false;
        Object.entries(led.items).forEach(([id, row]) => row.batches.forEach(b => {
            if (b.verified || !['市场买入', '市场卖出'].includes(b.reason)) return;
            const side = b.reason === '市场买入' ? 2 : 1;
            const matched = orders.find(o => Number(o.side) === side && Number(o.item) === Number(id) &&
                Number(o.traded) >= Math.abs(b.qty) && Math.abs(Number(o.close_time || 0) * 1000 - b.at) < 86400000);
            if (matched) {
                b.verified = true;
                b.checkAt = Number(matched.close_time || 0) * 1000 || b.at;
                changed = true;
            }
        }));
        if (changed) saveInventoryLedger(uid, led, true);
    }
    let historyRequest;
    function requestInventoryHistory(uid, manual = false) {
        const msg = env.msg(), at = Date.now();
        if (!uid || !costEnabled() || msg?.ws?.readyState !== 1 || typeof msg.handlers?.market_history !== 'function') return false;
        if (!Object.keys(inventoryLedger(uid).items).length && !manual) return false;
        if (historyRequest?.uid === uid && historyRequest.socket === msg.ws &&
            (!manual || at - historyRequest.at < 3000)) return false;
        if (msg.send('market_history', {}) !== true) return false;
        historyRequest = { uid, socket: msg.ws, at };
        return true;
    }
    function decorateMarketHistoryCosts() {
        const ui = env.ui(), game = env.game(), list = ui?.marketMy?.historyList;
        const uid = core.view().account;
        if (!uid || !list?.isConnected || ui.marketplaceOrderTab !== 'history') return;
        const rows = list.querySelectorAll('.marketplace-orderBook-info');
        const orders = (game.orderHistory || []).filter(order => game.getItem(order.item));
        if (rows.length !== orders.length || !costEnabled()) {
            list.querySelectorAll('.nek-history-cost').forEach(button => button.remove());
            return;
        }
        rows.forEach((row, i) => {
            const order = orders[i], id = Number(order.item), price = Number(order.price);
            const existing = row.querySelector('.nek-history-cost');
            const entry = inventoryLedger(uid).items[id];
            if (id <= 1 || Number(order.enhancement || 0) !== 0 || !(price > 0) || !Number.isFinite(price) ||
                inventoryUnitPrice(uid, id) != null || (entry && !entry.batches.some(b => b.reason === '初始库存'))) {
                existing?.remove();
                return;
            }
            if (existing?.dataset.order === String(order.id)) return;
            existing?.remove();
            const button = doc.createElement('button');
            button.type = 'button'; button.className = 'btn nek-history-cost';
            button.dataset.order = String(order.id);
            button.textContent = '录入期初成本';
            button.addEventListener('click', () => {
                if (core.view().account === uid && costEnabled()) openWarehouseCostModal(game.getItem(id), 0, price);
            });
            row.querySelector('.price')?.appendChild(button);
        });
    }
    // 通知主脚本刷新悬停行情里的「库存成本」行（成本页自身在 render 时直接读取）。
    function publishStockCost(id) {
        try { doc.dispatchEvent(new CustomEvent('nek-stock-cost-updated', { detail: { id: Number(id) || 0 } })); }
        catch { /* 不支持 CustomEvent 时不影响保存 */ }
    }
    // 左一价 = 市场快照 levels[enh].sell_price（与物品说明中的「左一价」同口径）。
    // 统一复用主脚本 __NEK_MARKET__.quote（含 v1.44.4 单物品强刷与 60s 缓存），
    // 不再各自直读 marketCacheData 造轮子；API 缺失时回退直读缓存，保证增强脚本独立可跑。
    function leftPrice(id, enh) {
        try {
            const api = window.__NEK_MARKET__;
            if (api && typeof api.quote === 'function') {
                const lv = api.quote(Number(id), Number(enh) || 0);
                return Number(lv?.sell_price) || 0;
            }
        } catch { /* API 异常则回退直读缓存 */ }
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
            page.innerHTML = '<div class="page-body neon">' +
                '<div class="page-tab nek-cost-tabs"><div class="page-tab-item active" data-tab="inventory">库存核算</div><div class="page-tab-item" data-tab="market">市场成本</div></div>' +
                '<div class="page-main nek-market-main" hidden><div class="nek-cost-tools"><button type="button" class="btn nek-cost-pick">选择物品</button><button type="button" class="btn">刷新行情</button></div><p role="status"></p><div class="nek-cost-results"></div></div>' +
                '<div class="page-main nek-inventory-main"><div class="nek-inventory-total"></div><div class="nek-cost-tools"><button type="button" class="btn nek-inventory-pick-btn">选择物品</button><button type="button" class="btn nek-inventory-clear-btn">清空数据</button><button type="button" class="btn nek-inventory-plan-btn">查看补货计划</button></div><div class="nek-inventory-plan" hidden></div><p role="status"></p><div class="nek-inventory-list"></div></div>' +
                '</div>';
            // 标签切换：仅显示对应 page-main，库存核算首次进入时渲染。
            const marketMain = page.querySelector('.nek-market-main');
            const invMain = page.querySelector('.nek-inventory-main');
            page.querySelectorAll('.nek-cost-tabs .page-tab-item').forEach(tab => {
                tab.addEventListener('click', e => {
                    e.stopPropagation();
                    page.querySelectorAll('.nek-cost-tabs .page-tab-item').forEach(t => t.classList.toggle('active', t === tab));
                    const inventory = tab.dataset.tab === 'inventory';
                    marketMain.hidden = inventory;
                    invMain.hidden = !inventory;
                    if (inventory && typeof mountInventoryPanel === 'function') mountInventoryPanel();
                });
            });
            const refresh = marketMain.querySelector('.nek-cost-tools button:not(.nek-cost-pick)');
            const pickBtn = page.querySelector('.nek-cost-pick');
            const status = page.querySelector('[role="status"]');
            const results = page.querySelector('.nek-cost-results');
            const uid = core.view().account;
            const data = env.data();
            const game = env.game(), ui = env.ui();
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
            // ===== 库存核算页：市场分类选择浮窗 + 批次账本列表 =====
            const CANNED_IDS = new Set([2, 4, 201, 207, 208]);
            const TYPE_ORDER = [1, 2, 3, 4, 5];  // 全部/物资/消耗品/装备/材料（排除货币罐头、时装）
            function inventoryChoices() {
                return Object.values(data.items).filter(item => item.trade && !CANNED_IDS.has(Number(item.id)))
                    .sort((a, b) => a.id - b.id);
            }
            function typeOf(item) { return TYPE_ORDER.includes(Number(item.type)) ? Number(item.type) : 0; }
            // 二级分类严格对齐市场页：装备按 slot 归并为固定 5 组（武器/防具/首饰/工具/生活），
            // 其余类型沿用 sub_type；避免 ring/amulet/earring/bracelet/tool1… 各自单独分页。
            const EQUIP_SUBS = [
                { key: 'weapon', name: '武器' }, { key: 'armor', name: '防具' },
                { key: 'accessory', name: '首饰' }, { key: 'tool', name: '工具' }, { key: 'life', name: '生活' }
            ];
            const EQUIP_NAMES = Object.fromEntries(EQUIP_SUBS.map(s => [s.key, s.name]));
            function subKeyOf(item) {
                if (Number(item.type) === 4) {
                    const slot = String(item.slot || item.sub_type || '');
                    if (slot === 'weapon') return 'weapon';
                    if (['ring', 'amulet', 'earring', 'bracelet'].includes(slot)) return 'accessory';
                    if (/^tool\d+$/.test(slot)) return 'tool';
                    if (slot === 'life_chip' || /^life_[abc]$/.test(slot)) return 'life';
                    return 'armor';   // 其余（含空 slot）归防具，与市场页默认一致。
                }
                return String(item.slot || item.sub_type || '0');
            }
            function subName(key) {
                if (EQUIP_NAMES[key]) return EQUIP_NAMES[key];
                try { return data.subType?.[key]?.name || key; }
                catch { return key; }
            }
            // 二级 tab 顺序：装备按固定 5 组顺序（只显示有物品的组），其余按物品 id 升序首次出现顺序。
            // all 由调用方（openInventoryPicker）传入：此函数定义在浮窗之外，不能直接引用浮窗内的局部变量。
            function subKeys(all, type) {
                const owned = new Set(all.filter(i => typeOf(i) === type).map(subKeyOf));
                if (type === 4) return EQUIP_SUBS.map(s => s.key).filter(k => owned.has(k));
                return [...owned];
            }
            function inventorySelected(uid) {
                const led = inventoryLedger(uid);
                return Object.keys(led.items).map(Number).filter(id => id > 1);
            }
            let invPicker = null;
            function closeInventoryPicker() {
                if (invPicker) { invPicker.remove(); invPicker = null; }
            }
            function openInventoryPicker(anchor) {
                closeInventoryPicker();
                const uid = core.view().account;
                if (!uid) return;
                invPicker = append(doc.body, 'div', 'selector neon nek-cost-picker nek-inventory-pick');
                append(invPicker, 'div', 'neon-title', '选择物品（库存核算）');
                const content = append(invPicker, 'div', 'selector-content');
                const searchInput = append(content, 'input', 'nek-inventory-search');
                searchInput.type = 'text'; searchInput.placeholder = '搜索物品名称…';
                const tabs = append(content, 'div', 'selector-tabs ui-tab');
                const subs = append(content, 'div', 'nek-cost-subtabs ui-tab');
                const grid = append(content, 'div', 'selector-grid');
                let type = 1, sub = null, keyword = '';
                const all = inventoryChoices();
                function drawTabs() {
                    tabs.replaceChildren();
                    TYPE_ORDER.forEach(t => {
                        const name = t === 1 ? '全部' : (data.itemTypes?.[t]?.name || ({ 2: '物资', 3: '消耗品', 4: '装备', 5: '材料' })[t] || String(t));
                        const el = append(tabs, 'div', 'selector-tab-btn ui-tab-item' + (t === type ? ' active' : ''), name);
                        el.addEventListener('click', e => { e.stopPropagation(); type = t; sub = null; drawTabs(); drawSubs(); drawGrid(); });
                    });
                }
                function drawSubs() {
                    subs.replaceChildren();
                    if (type === 1) { subs.hidden = true; return; }
                    subs.hidden = false;
                    const keys = subKeys(all, type);
                    if (!keys.includes(sub)) sub = keys[0];
                    keys.forEach(key => {
                        const el = append(subs, 'div', 'ui-tab-item' + (key === sub ? ' active' : ''), subName(key));
                        el.addEventListener('click', e => { e.stopPropagation(); sub = key; drawSubs(); drawGrid(); });
                    });
                }
                function drawGrid() {
                    grid.replaceChildren();
                    let items = all.filter(i => type === 1 || typeOf(i) === type);
                    if (type !== 1 && sub) items = items.filter(i => subKeyOf(i) === sub);
                    if (keyword) {
                        try { const ids = new Set(game.searchItems(keyword)); items = items.filter(i => ids.has(Number(i.id))); }
                        catch { items = items.filter(i => (i.name || '').toLowerCase().includes(keyword.toLowerCase())); }
                    }
                    if (!items.length) { append(grid, 'span', 'empty-tip', '没有可以选择的物品'); return; }
                    const chosen = inventorySelected(uid);
                    items.forEach(item => {
                        const def = game.getItem(item.id) || item;
                        const el = ui.createItemElement(def, { quantity: game.getItemQuantity(item.id), extraClasses: 'selector-item' + (chosen.includes(Number(item.id)) ? ' selected-outline' : '') });
                        el.title = (chosen.includes(Number(item.id)) ? '✓ ' : '') + (item.name || '#' + item.id);
                        el.addEventListener('click', e => {
                            e.stopPropagation();
                            const led = inventoryLedger(uid), key = String(item.id);
                            if (led.items[key]) {
                                delete led.items[key];
                                delete led.thresholds[key];
                                saveInventoryLedger(uid, led);
                                el.classList.remove('selected-outline');
                            } else {
                                // 期初库存：按优先级确定单价（旧库存成本/历史采购/左一价），云账本已存在则保留。
                                const oldCost = warehouseCosts(uid)[key];
                                const price = Number(oldCost) > 0 ? round2(oldCost) : (leftPrice(item.id, 0) > 0 ? round2(leftPrice(item.id, 0)) : null);
                                const qty = Number(game.getItemQuantity(item.id)) || 0;
                                addInventoryBatch(led, { id: item.id, at: Date.now(), reason: '初始库存', qty: qty || 0, unitPrice: price });
                                saveInventoryLedger(uid, led);
                                el.classList.add('selected-outline');
                            }
                            el.title = (el.classList.contains('selected-outline') ? '✓ ' : '') + (item.name || '#' + item.id);
                            renderInventory();
                        });
                        grid.appendChild(el);
                    });
                }
                searchInput.addEventListener('input', e => { e.stopPropagation(); keyword = e.target.value.trim(); drawGrid(); });
                searchInput.addEventListener('click', e => e.stopPropagation());
                const r = anchor.getBoundingClientRect();
                invPicker.style.visibility = 'hidden';
                const w = invPicker.offsetWidth, h = invPicker.offsetHeight;
                invPicker.style.left = Math.max(4, Math.min(r.left, window.innerWidth - w - 4)) + 'px';
                invPicker.style.top = (r.bottom + h + 4 > window.innerHeight && r.top - h - 4 > 0 ? r.top - h - 4 : r.bottom + 4) + 'px';
                invPicker.style.visibility = 'visible';
                drawTabs(); drawSubs(); drawGrid();
                const outside = e => { if (!invPicker.contains(e.target) && e.target !== anchor) { closeInventoryPicker(); doc.removeEventListener('click', outside); } };
                setTimeout(() => doc.addEventListener('click', outside), 0);
            }
            const openBatches = new Set();
            // 核对列：初始库存=历史记录（后续实现，本次仅展示）；核对到=操作时间(HH:mm:ss)；其余未核对=待核对。
            function checkLabel(b) {
                if (b.reason === '初始库存') return { text: '历史记录', cls: 'nek-inventory-history', title: '查看昨天的变化详情（功能开发中）' };
                if (b.verified && b.checkAt > 0) {
                    const d = new Date(b.checkAt);
                    const text = typeof d.toLocaleTimeString === 'function'
                        ? d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '';
                    return { text: text || '已核对', cls: 'nek-inventory-verified', title: '已核对 · 操作时间' };
                }
                if (b.verified) return { text: '已核对', cls: 'nek-inventory-verified', title: '已核对' };
                return { text: '待核对', cls: 'nek-inventory-unverified', title: '尚未在历史记录或市场订单中核对到' };
            }
            // 借贷记账方向：初始库存/买入/产出=借（入库），卖出/消耗=贷（出库）。
            function directionOf(reason) {
                return ['市场卖出', '生产消耗'].includes(reason) ? '贷' : '借';
            }
            // 成品批次关联的来源材料还没单价时，界面显示「XX物品缺报价」。
            const itemName = id => {
                try { return game.getItem(id)?.name || data.items[String(id)]?.name || ('#' + id); }
                catch { return '#' + id; }
            };
            function quoteLackText(row, led) {
                const names = [];
                const collect = m => {
                    const name = m?.name || itemName(m?.id);
                    if (name && !names.includes(name)) names.push(name);
                };
                (row?.batches || []).forEach(b => {
                    (b.missing || []).forEach(collect);
                    // 旧批次没有 missing/source 字段：按同队列消耗批次反推来源，缺价同样显示提示。
                    if (b.reason === '生产成品') productionCostOf(led, b, itemName).missing.forEach(collect);
                });
                return names.length ? names.join('、') + '缺报价' : '';
            }
            // 逐层补货计划：按本地双阈值汇总预警物品，递归展开配方，合并采购/生产/需自行获取量。
            function renderPlan(uid) {
                const box = invMain.querySelector('.nek-inventory-plan');
                if (!box || box.hidden) return;
                box.replaceChildren();
                const refreshPlan = append(box, 'button', 'btn', '刷新');
                refreshPlan.type = 'button';
                refreshPlan.addEventListener('click', () => {
                    refreshStockAlerts(uid);
                    renderInventory();
                });
                const state = inventoryAlertState(uid);
                const plans = [...(state?.plans || [])].sort(([a], [b]) => a - b);
                if (!plans.length) { append(box, 'div', '', '当前没有库存预警。'); return; }
                const list = append(box, 'ul', '');
                plans.forEach(([id, plan]) => {
                    append(list, 'li', '', itemName(id) + ' · 库存 ' + plan.actual + ' · 目标 ' + plan.target +
                        ' · 缺 ' + plan.deficit + (plan.complete ? '' : ' · 配方无法展开'));
                });
                const shortages = plans.filter(([, plan]) => plan.complete).map(([id, plan]) => [id, plan.deficit]);
                const combined = state.combined ??= planStockReplenishment(data, shortages, id => state.quantities.get(id) ?? 0);
                if (!combined.complete) { append(box, 'div', '', '无法核算所有物品的合计用量，请查看各物品的预警。'); return; }
                [['建议采购', combined.purchases], ['计划生产', combined.production], ['需自行获取', combined.unavailable]].forEach(([title, entries]) => {
                    if (!entries.length) return;
                    append(box, 'h4', '', title);
                    append(box, 'div', '', stockItemNames(data, entries));
                });
            }
            function renderInventory() {
                if (!invMain.isConnected) return;
                const uid = core.view().account;
                const led = inventoryLedger(uid);
                const warnings = inventoryAlertState(uid);
                const totalEl = invMain.querySelector('.nek-inventory-total');
                const list = invMain.querySelector('.nek-inventory-list');
                const statusEl = invMain.querySelector('[role="status"]');
                list.replaceChildren();
                const headRow = append(list, 'div', 'nek-inventory-head');
                ['物品', '可用', '综合单价', '库存价值', '预警', ''].forEach(t => append(headRow, 'span', '', t));
                const ids = Object.keys(led.items).map(Number).sort((a, b) => a - b);
                const valuation = inventoryValuation(led, data, warehouseCosts(uid));
                ids.forEach(id => {
                    const row = led.items[String(id)];
                    const s = inventorySummary(row);
                    const lack = quoteLackText(row, led);
                    const def = game.getItem(id) || data.items[String(id)] || { name: '#' + id };
                    const block = append(list, 'div', 'nek-inventory-row' + (openBatches.has(id) ? ' open' : ''));
                    block.dataset.id = String(id);
                    const head = append(block, 'div', 'nek-inventory-summary');
                    const nameEl = append(head, 'span', 'nek-inventory-name');
                    append(nameEl, 'span', 'nek-inventory-caret', '▶');
                    const nameText = append(nameEl, 'span', '', def.name || '#' + id);
                    nameText.title = '点击展开/收起批次明细';
                    const available = warnings?.quantities.get(id) ?? row.quantity;
                    append(head, 'span', '', available.toLocaleString('zh-CN'));
                    const priceText = lack || (s.unitPrice != null ? s.unitPrice.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '待录入');
                    const priceSummary = append(head, 'span', lack ? 'nek-price-missing' : '', priceText);
                    const outputBatches = (row.batches || []).filter(b => b.reason === '生产成品');
                    const formulaTip = outputBatches.length
                        ? '成品综合单价计算公式：\n' + outputBatches.map(b => productionFormula(led, b, itemName)).join('\n')
                        : '';
                    priceSummary.title = (lack ? '来源材料批次未录入单价，补录后自动重算成品单价' : '有价批次按数量加权') +
                        (formulaTip ? '\n' + formulaTip : '');
                    append(head, 'span', '', s.total != null ? s.total.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—');
                    const check = warnings?.checks.get(id) || { qtyLimit: 0, pctLimit: 0, short: false };
                    const bits = [];
                    if (check.qtyLimit > 0) bits.push('数量 ' + check.qtyLimit.toLocaleString('zh-CN'));
                    if (check.pctLimit > 0) bits.push('峰值 ' + check.pct + '%/' + check.pctLimit + '%');
                    const thresholdCell = append(head, 'span', 'nek-inventory-threshold' + (check.short ? ' nek-threshold-short' : ''),
                        bits.length ? bits.join(' · ') : '未设置');
                    thresholdCell.title = !bits.length
                        ? '未设置预警，点击设置数值或百分比'
                        : '可用 ' + check.have + ' · 当日峰值 ' + check.peak +
                          (check.qtyLimit > 0 ? ' · 数值阈值 ' + check.qtyLimit : '') +
                          (check.pctLimit > 0 ? ' · 峰值百分比阈值 ' + check.pctLimit + '%' : '') +
                          (warnings?.plans.has(id) ? ' · 补货目标 ' + warnings.plans.get(id).target : '') + '；点击修改';
                    thresholdCell.addEventListener('click', e => {
                        e.stopPropagation();
                        openThresholdEditor(uid, id);
                    });
                    // 预警列后方：移除该物品（同时清掉该物品阈值与展开状态）。
                    const del = append(head, 'button', 'nek-inventory-delete', '×');
                    del.type = 'button';
                    del.title = '从库存核算移除该物品';
                    del.addEventListener('click', e => {
                        e.stopPropagation();
                        const current = inventoryLedger(uid);
                        delete current.items[String(id)];
                        delete current.thresholds[String(id)];
                        openBatches.delete(id);
                        saveInventoryLedger(uid, current);
                        renderInventory();
                    });
                    // 整行（含左侧三角形）点击都展开/收起批次；录入浮窗改由批次单价单元格触发。
                    head.addEventListener('click', e => {
                        e.stopPropagation();
                        if (openBatches.has(id)) openBatches.delete(id); else openBatches.add(id);
                        renderInventory();
                    });
                    // FIFO 三色条：折叠仅显示三色；展开时两行（第二行消耗）且增加/消耗按批次斑马纹。
                    const seg = inventoryDaySegments(row, Date.now());
                    const fifo = append(block, 'div', 'nek-inventory-fifo');
                    fifo.title = 'FIFO 队列：基准 ' + seg.base + ' · 当日增加 ' + seg.inc + ' · 当日消耗 ' + seg.dec + ' · 峰值 ' + seg.peak;
                    // 展开段的悬浮提示：逐段显示「原因+数量（时分秒）」。
                    const batchTip = b => {
                        const t = new Date(Number(b.at) || 0);
                        const time = Number.isFinite(t.getTime())
                            ? t.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '';
                        return String(b.reason || '') + (Number(b.qty) > 0 ? '+' : '') + Number(b.qty || 0).toLocaleString('zh-CN') + (time ? '（' + time + '）' : '');
                    };
                    if (openBatches.has(id)) {
                        // 展开行1恒为满值（峰值100%）：基准段(完整) + 当日增加段（按批次交替深浅）。
                        const line1 = append(fifo, 'div', 'nek-inventory-fifo-line');
                        if (seg.baseFullPct > 0) {
                            const s = append(line1, 'div', 'nek-fifo-base nek-inventory-fifo-seg');
                            s.style.width = seg.baseFullPct + '%';
                            s.title = '换日基准 +' + seg.base.toLocaleString('zh-CN') + '（当日 00:00 前的批次净和）';
                        }
                        seg.incBatches.forEach((b, i) => {
                            const w = seg.peak > 0 ? Math.max(0, b.qty / seg.peak * 100) : 0;
                            if (w <= 0) return;
                            const s = append(line1, 'div', 'nek-fifo-inc nek-inventory-fifo-seg' + (i % 2 ? ' alt' : ''));
                            s.style.width = w + '%';
                            s.title = batchTip(b);
                        });
                        // 展开行2：当日消耗段（按批次交替深浅，从左起）。
                        const line2 = append(fifo, 'div', 'nek-inventory-fifo-line');
                        seg.decBatches.forEach((b, i) => {
                            const w = seg.peak > 0 ? Math.abs(b.qty) / seg.peak * 100 : 0;
                            if (w <= 0) return;
                            const s = append(line2, 'div', 'nek-fifo-dec nek-inventory-fifo-seg' + (i % 2 ? ' alt' : ''));
                            s.style.width = w + '%';
                            s.title = batchTip(b);
                        });
                        const hint = append(fifo, 'div', 'nek-inventory-fifo-hint',
                            '换日基准 ' + seg.base + ' · 增 ' + seg.inc + ' · 耗 ' + seg.dec + '（峰值 ' + seg.peak + '）');
                        hint.title = '行1=峰值满值（基准+当日增加）；行2=当日消耗';
                    } else {
                        // 折叠：纯三色，从左至右 = 消耗覆盖 / 基准剩余 / 增加剩余。
                        const line = append(fifo, 'div', 'nek-inventory-fifo-line');
                        if (seg.decPct > 0) { const s = append(line, 'div', 'nek-fifo-dec nek-inventory-fifo-seg'); s.style.width = seg.decPct + '%'; }
                        if (seg.basePct > 0) { const s = append(line, 'div', 'nek-fifo-base nek-inventory-fifo-seg'); s.style.width = seg.basePct + '%'; }
                        if (seg.incPct > 0) { const s = append(line, 'div', 'nek-fifo-inc nek-inventory-fifo-seg'); s.style.width = seg.incPct + '%'; }
                    }
                    if (openBatches.has(id)) {
                        const box = append(block, 'div', 'nek-inventory-batches');
                        // 严格按时间正序：先入库/消耗在上，后入库/消耗在下。
                        const sorted = row.batches.slice().sort((a, b) => a.at - b.at || String(a.id || '').localeCompare(String(b.id || '')));
                        sorted.forEach(b => {
                            const line = append(box, 'div', 'nek-inventory-batch-row');
                            const cell1 = append(line, 'span', 'nek-inventory-batch-cell1');
                            append(cell1, 'span', 'nek-inventory-batch-time', new Date(b.at).toLocaleString('zh-CN', { hour12: false }));
                            const dir = directionOf(b.reason);
                            // 名称前不显示「借/贷」文字，仅用颜色区分方向，悬停仍可见借贷语义。
                            const reasonEl = append(cell1, 'span', dir === '贷' ? 'nek-inventory-credit' : 'nek-inventory-debit', b.reason);
                            reasonEl.title = (dir === '贷' ? '贷方（出库）' : '借方（入库）') + '：' + b.reason;
                            append(line, 'span', (b.qty > 0 ? 'nek-inventory-delta-pos' : 'nek-inventory-delta-neg'), (b.qty > 0 ? '+' : '') + b.qty.toLocaleString('zh-CN'));
                            const bLack = quoteLackText({ batches: [b] }, led);
                            const priceCell = append(line, 'span', 'nek-inventory-batch-price' + (bLack ? ' nek-price-missing' : ''),
                                bLack || (b.unitPrice != null ? b.unitPrice.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—'));
                            const formula = b.reason === '生产成品' ? productionFormula(led, b, itemName) : '';
                            priceCell.title = (formula ? '综合单价计算公式：' + formula + '\n' : '') +
                                (bLack
                                    ? '该成品的 FIFO 来源材料尚未录入单价；补录来源批次单价后立即重算。'
                                    : '') + '点击录入/修改该批次单价';
                            priceCell.addEventListener('click', e => {
                                e.stopPropagation();
                                openInventoryEditor(uid, id, b);
                            });
                            append(line, 'span', b.amount > 0 ? 'nek-inventory-delta-pos' : b.amount < 0 ? 'nek-inventory-delta-neg' : '', b.amount != null ? (b.amount > 0 ? '+' : '') + b.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—');
                            const check = checkLabel(b);
                            const checkCell = append(line, 'span', check.cls, check.text);
                            checkCell.title = check.title;
                            append(line, 'span', '');   // 与汇总行的删除按钮列对齐
                        });
                        // 已归档历史：FIFO 耗尽批次，保留 5 天。
                        const history = Array.isArray(row.history) ? row.history : [];
                        if (history.length) {
                            const hTitle = append(box, 'div', 'nek-inventory-fifo-hint',
                                '历史记录（' + history.length + ' 条 · 保留 5 天）');
                            hTitle.title = 'FIFO 来源已耗尽的批次，次日 00:00 或首次加载后归档；按批次时间正序';
                            history.slice().sort((a, b) => a.at - b.at || String(a.id || '').localeCompare(String(b.id || ''))).forEach(h => {
                                const line = append(box, 'div', 'nek-inventory-batch-row nek-inventory-history');
                                const cell1 = append(line, 'span', 'nek-inventory-batch-cell1');
                                append(cell1, 'span', 'nek-inventory-batch-time', new Date(h.at).toLocaleString('zh-CN', { hour12: false }));
                                append(cell1, 'span', '', h.reason + '（已归档）');
                                append(line, 'span', 'nek-inventory-delta-neg', (h.qty > 0 ? '+' : '') + h.qty.toLocaleString('zh-CN'));
                                append(line, 'span', '', h.unitPrice != null ? h.unitPrice.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—');
                                append(line, 'span', '', h.amount != null ? h.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—');
                                append(line, 'span', '', '已归档');
                                append(line, 'span', '');   // 与汇总行的删除按钮列对齐
                            });
                        }
                    }
                });
                const formatMoney = amount => amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
                totalEl.textContent = '库存总价值 ' + formatMoney(valuation.total) + ' 喵点' +
                    (valuation.estimated > 0 ? '（含配方估值 ' + formatMoney(valuation.estimated) + '）' : '') +
                    (valuation.unpriced ? ' · ' + valuation.unpriced + ' 项有库存未计价' : '');
                renderPlan(uid);
                if (!ids.length && statusEl) statusEl.textContent = '点击「选择物品」添加要核算库存的物品。';
                else if (statusEl) statusEl.textContent = '';
            }
            // 单价来源标记：auto=自动填市场左一价（尚未录入）、saved=读取到本地已有数据、blank=无报价。
            function openInventoryEditor(uid, id, batch) {
                const led = inventoryLedger(uid);
                const row = led.items[String(id)];
                if (!row) return;
                // 从批次单价单元格进入时只改该批次；旧调用未传 batch 时退回期初批次。
                const target = batch || row.batches.find(b => b.reason === '初始库存');
                const modal = append(doc.body, 'div', 'selector neon nek-warehouse-cost-modal');
                append(modal, 'div', 'whc-name', '库存核算 · ' + (game.getItem(id)?.name || data.items[String(id)]?.name || '#' + id));
                append(modal, 'div', 'whc-hint', target
                    ? '录入「' + target.reason + '」批次单价；单价留空表示不参与核算。' +
                        (target.reason === '生产成品'
                            ? (target.manualPrice ? '该成品已手动录入综合单价，不再随材料价格重算。' : '成品录入后锁定，不再随材料价格重算。')
                            : '生产消耗批次录入后会随上游材料价格变化自动重算。')
                    : '录入期初单价；单价留空表示不参与核算。');
                const priceInput = append(modal, 'input', 'whc-input');
                priceInput.type = 'text'; priceInput.inputMode = 'decimal';
                const source = append(modal, 'div', 'whc-source');
                const markSource = kind => {
                    source.className = 'whc-source ' + (kind === 'auto' ? 'whc-source-auto' : kind === 'saved' ? 'whc-source-saved' : 'whc-source-blank');
                    source.textContent = kind === 'auto' ? '已自动填入市场左一价（尚未录入）'
                        : kind === 'saved' ? '已读取本地已有的单价数据'
                        : '未取得市场左一价，请手动录入';
                };
                let quote = 0;
                if (target && target.unitPrice != null) {
                    priceInput.value = String(target.unitPrice);
                    markSource('saved');
                } else {
                    quote = Number(leftPrice(id, 0)) || 0;
                    if (quote > 0) { priceInput.value = String(round2(quote)); markSource('auto'); }
                    else { priceInput.value = ''; markSource('blank'); }
                }
                const actions = append(modal, 'div', 'whc-actions');
                const confirm = append(actions, 'button', 'btn', '确定');
                const clear = append(actions, 'button', 'btn', '移除');
                const cancel = append(actions, 'button', 'btn', '取消');
                const close = () => { modal.remove(); };
                confirm.addEventListener('click', e => {
                    e.stopPropagation();
                    const price = priceInput.value.trim() === '' ? null : parseStockCost(priceInput.value);
                    if (priceInput.value.trim() !== '' && price == null) { ui.notifier?.show?.('单价最多两位小数', 'error'); return; }
                    if (target) {
                        target.unitPrice = price;
                        target.amount = price == null ? null : round2(target.qty * price);
                        // 只有生产成品的手动综合单价锁定；消耗批次仍参与上游价重算。
                        target.manualPrice = target.reason === '生产成品' && price != null;
                        if (target.manualPrice) target.missing = undefined;
                    }
                    // 材料批次补录单价后，立即重算对应生产消耗与下游成品单价。
                    if (target) recomputeProductionCost(led, [target.id], itemName);
                    // 录入后若用的是自动填的左一价，补记一次来源标记，避免下次仍显示「尚未录入」。
                    if (price != null && source.classList.contains('whc-source-auto')) markSource('saved');
                    saveInventoryLedger(uid, led);
                    close(); renderInventory();
                });
                clear.addEventListener('click', e => {
                    e.stopPropagation();
                    delete led.items[String(id)]; delete led.thresholds[String(id)];
                    saveInventoryLedger(uid, led); close(); renderInventory();
                });
                cancel.addEventListener('click', e => { e.stopPropagation(); close(); });
                const outside = e => { if (!modal.contains(e.target)) { close(); doc.removeEventListener('click', outside); } };
                setTimeout(() => doc.addEventListener('click', outside), 0);
            }
            // 物品汇总行上的独立预警入口：数值阈值 + 当日峰值百分比阈值，均为 0 关闭。
            function openThresholdEditor(uid, id) {
                const led = inventoryLedger(uid);
                if (!led.items[String(id)]) return;
                const th = normalizeThreshold(led.thresholds[String(id)]) || {};
                const modal = append(doc.body, 'div', 'selector neon nek-warehouse-cost-modal');
                append(modal, 'div', 'whc-name', '库存预警 · ' + (game.getItem(id)?.name || data.items[String(id)]?.name || '#' + id));
                append(modal, 'div', 'whc-hint', '当日峰值比例填 0 即关闭该条件，补货目标按固定数量加充裕比例计算。两项均为 0 则关闭预警。');
                append(modal, 'div', 'whc-field-label', '低于该数值预警（数量）');
                const qtyInput = append(modal, 'input', 'whc-input');
                qtyInput.type = 'number'; qtyInput.min = '0'; qtyInput.step = '1';
                qtyInput.value = th.qty ? String(th.qty) : '0';
                append(modal, 'div', 'whc-field-label', '当日峰值比例（%，0 为关闭）');
                const pctInput = append(modal, 'input', 'whc-input');
                pctInput.type = 'number'; pctInput.min = '0'; pctInput.max = '100'; pctInput.step = '0.1';
                pctInput.value = th.pct ? String(th.pct) : '0';
                const actions = append(modal, 'div', 'whc-actions');
                const confirm = append(actions, 'button', 'btn', '确定');
                const cancel = append(actions, 'button', 'btn', '取消');
                const close = () => { modal.remove(); };
                confirm.addEventListener('click', e => {
                    e.stopPropagation();
                    const next = normalizeThreshold({ qty: Number(qtyInput.value) || 0, pct: Number(pctInput.value) || 0 });
                    if (next) led.thresholds[String(id)] = next; else delete led.thresholds[String(id)];
                    saveInventoryLedger(uid, led); close(); renderInventory();
                });
                cancel.addEventListener('click', e => { e.stopPropagation(); close(); });
                const outside = e => { if (!modal.contains(e.target)) { close(); doc.removeEventListener('click', outside); } };
                setTimeout(() => doc.addEventListener('click', outside), 0);
            }
            function mountInventoryPanel() {
                const uid = core.view().account;
                if (!uid) return;
                if (!invMain.querySelector('.nek-inventory-pick-btn')._bound) {
                    const btn = invMain.querySelector('.nek-inventory-pick-btn');
                    btn._bound = true;
                    btn.addEventListener('click', e => { e.stopPropagation(); openInventoryPicker(btn); });
                    doc.addEventListener('nek-inventory-updated', e => {
                        if (!page.isConnected || invMain.hidden) return;
                        // 物品菜单跳转：展开目标物品的批次并滚动定位。
                        const focus = Number(e.detail?.focus);
                        if (focus > 1) openBatches.add(focus);
                        renderInventory();
                        if (focus > 1) {
                            const row = invMain.querySelector('.nek-inventory-row[data-id="' + focus + '"]');
                            row?.scrollIntoView({ block: 'nearest' });
                        }
                    });
                }
                const historyBtn = invMain.querySelector('.nek-inventory-history-btn');
                if (historyBtn && !historyBtn._bound) {
                    historyBtn._bound = true;
                    historyBtn.addEventListener('click', () => {
                        if (requestInventoryHistory(core.view().account, true)) {
                            ui.notifier?.show?.('已请求采购历史', 'tip');
                        }
                    });
                }
                const planBtn = invMain.querySelector('.nek-inventory-plan-btn');
                if (planBtn && !planBtn._bound) {
                    planBtn._bound = true;
                    planBtn.addEventListener('click', e => {
                        e.stopPropagation();
                        const box = invMain.querySelector('.nek-inventory-plan');
                        box.hidden = !box.hidden;
                        planBtn.textContent = box.hidden ? '查看补货计划' : '收起补货计划';
                        planBtn.setAttribute('aria-expanded', String(!box.hidden));
                        if (!box.hidden) renderInventory();
                    });
                }
                const clearBtn = invMain.querySelector('.nek-inventory-clear-btn');
                if (clearBtn && !clearBtn._bound) {
                    clearBtn._bound = true;
                    clearBtn.addEventListener('click', e => {
                        e.stopPropagation();
                        if (!env.window.confirm('清空库存核算的全部数据？所有批次、预警和流水将被清除，且不可撤销。')) return;
                        const uid = core.view().account;
                        if (!uid) return;
                        inventoryCache.delete(String(uid));
                        openBatches.clear();
                        saveInventoryLedger(uid, { items: {}, thresholds: {}, trades: [] });
                        renderInventory();
                        ui.notifier?.show?.('库存核算数据已清空', 'success', 2500);
                    });
                }
                renderInventory();
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
            // 库存核算现在是默认标签：首次打开成本页时就挂载账本列表。
            if (typeof mountInventoryPanel === 'function') mountInventoryPanel();
        });
    }
    function decorate() {
        const v = core.view();
        if (!v.account) return;
        style(); decorateResearch(v); decorateSettings(v); decorateHoldings(v); decorateCostEntry(); decorateMarketCost();
        decorateMarketHistoryCosts();
        doc.querySelectorAll('[data-nek-option]').forEach(input => {
            const checked = v.settings[input.dataset.nekOption]; if (input.checked !== checked) input.checked = checked;
        });
    }
    function pulse() {
        try {
            install();
            if (installed) {
                core.tick();
                const uid = core.view().account, head = env.game()?.queue?.[0];
                if (uid && costEnabled() && stockAlerts?.uid !== uid) {
                    refreshStockAlerts(uid);
                    nextProductionAlert = Date.now() + 120000;
                }
                if (uid && (historyRequest?.uid !== uid || historyRequest.socket !== env.msg()?.ws)) requestInventoryHistory(uid);
                if (uid && Date.now() >= nextProductionAlert && (head || productionAlertIds.size)) flushProductionAlerts(uid, head);
                decorate();
            }
        }
        catch (e) { console.warn('[小助手] 研究/任务/库存辅助异常:', e); }
    }
    function init() {
        if (timer) return;
        doc.addEventListener('nek-inventory-cloud-applied', e => {
            const uid = e.detail?.uid;
            if (!uid || uid !== core.view().account) return;
            inventoryCache.delete(String(uid));
            refreshStockAlerts(uid);
            dispatchInventoryUpdate(uid);
            requestInventoryHistory(uid, true);
        });
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
    return { init, decorate, core, snapshotActions, stockShortages };
}

// CommonJS test exports (not embedded into the userscript).
if (typeof module !== 'undefined') module.exports = { createNekController, createNekEnhancements, recipeCost, substituteOptions, mergeWarehouseCost, claimCosts, stockTotalOf, directStockTotal, parseStockCost, round2, craftableProduct, normalizeInventoryLedger, normalizeThreshold, thresholdCheck, migrateEmptyBatchItems, inventorySummary, inventoryDaySegments, archiveExhaustedBatches, dayStartOf, addInventoryBatch, consumeInventoryFifo, pushInventoryTrade, inventoryDelta, inventoryReconcile, fifoPrice,
    findInventoryBatch, productionQueueCost, productionFormula, mergeQueueOutputBatches, productionSourcesOf, productionCostOf, recomputeProductionCost,
    stockHeld, stockRecipe, planStockReplenishment, stockReplenishment, stockItemNames, productionRemovedItems,
    normalizeStockBuffer, importFifoPurchases, inventoryValuation, migrateAverageInventory };
