// ==UserScript==
// @name         猫娘自动收菜
// @namespace    https://nekoidle.com/
// @version      2.3.1
// @description  每 30 秒检查一次：通过 UI.plantState 读取各地块状态（state=ready，或 growing 且 mature_at 已过——快照可能滞后于实际成熟，与游戏自身判定同口径），对可收获且未被跳过的地块直接发送收获消息（无需切换页面），1 秒后按地块原作物自动补种（背包有种子才播；收获响应会把地块状态刷新为 empty）。种植数据未初始化时自动切一次种植页，数据加载完成后立即判定收获（不等下一轮）。收获不再弹出「收获成果」弹窗（避免弹窗遮罩黑屏），同一批收获的物品跨地块汇总统计总数，2 秒静默后只发一次顶部 UI.notifier 通知（含经验合计）。收种动作完成后防抖调用游戏 syncPlantReadyWatch 重建左侧「种植」黄色角标（免切页收获时游戏不会自行刷新，否则角标残留；全部收种完成后角标消失，新作物成熟时间进表）。种植页每个农场「全部播种」左侧有「设置」按钮，可勾选跳过某些地块的收获与播种（按农场持久化）。当前行动「取消」按钮左侧有同风格「自动收菜：ON/OFF」开关按钮（状态持久化，缺省开启）。
// @author       一心不乱
// @match        https://nekoidle.com/*
// @match        https://nekoidle.net/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const TAG = '【自动收菜】';
    const TICK_MS = 30000;          // 主循环：每 30 秒一次
    const PLANT_SEED_DELAY = 1000;  // 收获消息发出后 1 秒再播种
    const SKIP_LS_KEY = 'nek_harvest_skip';      // 跳过配置：{ farmId: [plotIndex,...] }
    const AUTO_LS_KEY = 'nek_harvest_enabled';   // 开关状态持久化（缺省开启）

    function autoEnabled() {
        try { return localStorage.getItem(AUTO_LS_KEY) !== '0'; } catch (e) { return true; }
    }

    function loadSkip() {
        try { return JSON.parse(localStorage.getItem(SKIP_LS_KEY) || '{}') || {}; }
        catch (e) { return {}; }
    }

    function saveSkip(map) {
        try { localStorage.setItem(SKIP_LS_KEY, JSON.stringify(map)); } catch (e) { /* 忽略 */ }
    }

    function log() {
        const args = [].slice.call(arguments);
        args.unshift(TAG);
        console.log.apply(console, args);
    }

    // ---------------- 核心：按地块直接收发消息（不依赖页面 DOM） ----------------

    // 遍历所有农场：fn(farm, skipped数组, planet)
    function eachFarm(fn) {
        const ps = UI.plantState;
        if (!ps || !ps.planets) return;
        const skipMap = loadSkip();
        ps.planets.forEach(function (p) {
            (p.farms || []).forEach(function (farm) {
                fn(farm, skipMap[farm.id] || [], p);
            });
        });
    }

    // 地块是否可收获：state=ready，或 growing 且 mature_at 已过。
    // plantState 是打开种植页那一刻的快照（plant_get_data 仅在种植页初始化时请求一次），
    // 作物成熟后快照里的 state 仍是 growing——游戏自身的 syncPlantReadyWatch 也是按
    // 「growing 且 mature_at <= 当前时间」计入可收获的，此处保持同口径
    function isHarvestable(pd) {
        if (!pd) return false;
        if (pd.state === 'ready') return true;
        return pd.state === 'growing' && pd.mature_at > 0 &&
            pd.mature_at <= Math.floor(Date.now() / 1000);
    }

    // 种植数据初始化等待（防重入）：切到种植页后轮询 plant_get_data 响应，
    // 数据一到立即判定一次收获，不等下一轮循环
    let initPending = false;

    function waitInitThenTick() {
        if (initPending) return;
        initPending = true;
        let tries = 0;
        const t = setInterval(function () {
            tries++;
            const ok = UI.plantState && (UI.plantState.planets || []).length > 0;
            if (ok || tries > 24) {          // 最多等 12 秒
                clearInterval(t);
                initPending = false;
                if (ok) tickPlanting();
                else log('种植数据初始化超时，将在下一轮重试');
            }
        }, 500);
    }

    // 可收获且未被跳过的地块 → 逐块发送收获消息
    function tickPlanting() {
        try {
            if (typeof UI === 'undefined' || typeof MSG === 'undefined') return;
            if (!UI.plantState || !(UI.plantState.planets || []).length) {
                // plantState 在首次打开种植页时初始化：有可收获数据但缺状态时切一次页，
                // 数据加载完成后立即判定（读取本地跳过配置 → 判定收获），不等下一轮
                if (UI.plantWatch && UI.plantWatch.ready > 0 &&
                    !document.querySelector('.sidebar-item.action-3.active')) {
                    UI.changeContent('actions', { id: 3 });
                    log('种植数据未初始化，已切到种植页，数据加载后立即判定收获');
                    waitInitThenTick();
                } else if (UI.plantState &&
                    document.querySelector('.sidebar-item.action-3.active')) {
                    // 已在种植页但数据未到（plant_get_data 响应在途）：同样等待后立即判定
                    waitInitThenTick();
                }
                return;
            }
            let sent = 0;
            eachFarm(function (farm, skipped) {
                (farm.plots || []).forEach(function (pd, i) {
                    if (!isHarvestable(pd)) return;
                    if (skipped.indexOf(i) >= 0) return;
                    MSG.send('plant_harvest', { farm_id: farm.id, plot_index: i });
                    sent++;
                });
            });
            if (sent) {
                log('已发送 ' + sent + ' 个地块的收获请求，' +
                    PLANT_SEED_DELAY / 1000 + ' 秒后自动播种');
                setTimeout(seedEmptyPlots, PLANT_SEED_DELAY);
                // 收获响应会把 plantState 刷新为最新，待播种响应也落定后重建角标状态
                scheduleBadgeSync(PLANT_SEED_DELAY + 1500);
            }
        } catch (e) {
            log('种植调度异常：', e && e.message);
        }
    }

    // 空地且未被跳过的地块 → 按地块原作物（crop_id）补种，背包没种子则跳过
    function seedEmptyPlots() {
        try {
            if (!UI.plantState) return;
            let sent = 0;
            eachFarm(function (farm, skipped) {
                (farm.plots || []).forEach(function (pd, i) {
                    if (!pd || pd.state !== 'empty' || !(pd.crop_id > 0)) return;
                    if (skipped.indexOf(i) >= 0) return;
                    if (!(game.getItemQuantity(pd.crop_id) > 0)) return;
                    MSG.send('plant_seed', { farm_id: farm.id, plot_index: i, seed_id: pd.crop_id });
                    sent++;
                });
            });
            if (sent) {
                log('已发送 ' + sent + ' 个地块的播种请求（按原作物补种）');
                scheduleBadgeSync(1500);   // 播种响应落定后重建角标（新作物成熟时间进表）
            }
        } catch (e) {
            log('播种异常：', e && e.message);
        }
    }

    // ---------------- 侧边栏「种植」黄色角标同步 ----------------

    // 角标由 UI.plantWatch（ready 计数 + 成熟时间表）驱动，但游戏只在种植页 UI 更新路径
    // 中调用 syncPlantReadyWatch 重建它——脚本免切页收获/播种时，响应虽然会更新
    // plantState 数据，角标却停留在收获前的旧值。这里在每轮收种动作完成后防抖调用
    // 游戏自带的 syncPlantReadyWatch：全部收种完成后可收获数归零、角标消失；
    // 新作物的成熟时间进表，之后由游戏自身的 5 秒定时器在成熟时重新点亮。
    let badgeTimer = null;
    function scheduleBadgeSync(delay) {
        if (badgeTimer) clearTimeout(badgeTimer);
        badgeTimer = setTimeout(function () {
            badgeTimer = null;
            try {
                if (typeof UI !== 'undefined' && typeof UI.syncPlantReadyWatch === 'function' &&
                    UI.plantState && (UI.plantState.planets || []).length) {
                    UI.syncPlantReadyWatch(UI.plantState.planets);
                }
            } catch (e) { /* 忽略 */ }
        }, delay || 1500);
    }

    // ---------------- 收获成果：不弹窗（遮罩会黑屏），顶部 notifier 通知 ----------------

    // 同一批批量收获会连续返回多条「收获成果」：先聚合（物品按 id 累加、经验累加），
    // 2 秒内无新结果时合并为一条通知发出，避免一批收获刷出多条通知
    const AGG_WINDOW_MS = 2000;
    let agg = null;             // { items: {id: qty}, exp: n, count: n }
    let aggTimer = null;

    function flushAgg() {
        if (!agg) return;
        try {
            const ids = Object.keys(agg.items).map(Number).sort(function (a, b) { return a - b; });
            const parts = ids.map(function (id) {
                const item = typeof game !== 'undefined' && game.getItem(id);
                return (item && item.name ? item.name : '#' + id) + '×' + agg.items[id];
            });
            let msg = parts.length ? '收获：' + parts.join('、') : '收获完成，没有获得物品';
            if (agg.count > 1) msg = '收获 ' + agg.count + ' 块：' + msg.slice(3);
            if (agg.exp > 0) msg += '（经验 +' + agg.exp + '）';
            if (UI.notifier && UI.notifier.show) {
                UI.notifier.show(msg, 'success', 6000);
            }
            log(msg);
        } catch (e0) { /* 通知失败不影响收获流程 */ }
        agg = null;
        if (aggTimer) { clearTimeout(aggTimer); aggTimer = null; }
    }

    function patchResultModal() {
        if (typeof UI.showResultModal !== 'function' || UI.__nekHarvestPatched) return;
        const orig = UI.showResultModal.bind(UI);
        UI.showResultModal = function (data) {
            if (data && data.title === '收获成果') {
                // 只拦截收获成果弹窗：物品与经验进聚合器，静默期后合并为一条通知
                try {
                    if (!agg) agg = { items: {}, exp: 0, count: 0 };
                    (data.items || []).forEach(function (it) {
                        agg.items[it.id] = (agg.items[it.id] || 0) + (it.quantity || 0);
                    });
                    if (data.actionExp && data.actionExp.delta > 0) {
                        agg.exp += data.actionExp.delta;
                    }
                    agg.count++;
                    if (aggTimer) clearTimeout(aggTimer);
                    aggTimer = setTimeout(flushAgg, AGG_WINDOW_MS);
                } catch (e1) { /* 聚合失败不影响收获流程 */ }
                return null;   // 不渲染弹窗
            }
            return orig(data);
        };
        UI.__nekHarvestPatched = true;
        log('收获成果已改为聚合通知（' + AGG_WINDOW_MS / 1000 + ' 秒静默合并，一批只发一条）');
    }

    // ---------------- 种植页「设置」按钮 + 跳过地块选择面板 ----------------

    const STATE_TXT = { locked: '未解锁', empty: '空地', growing: '生长中', ready: '可收获' };

    // 周期注入：每个农场按钮组「全部播种」左侧加「设置」按钮，并刷新跳过数量角标
    function ensureSkipButtons() {
        try {
            if (!document.querySelector('.sidebar-item.action-3.active')) return;
            document.querySelectorAll('.plant-farm .farm-btn-group').forEach(function (g) {
                let btn = g.querySelector('.nek-skip-btn');
                if (!btn) {
                    // 借游戏挂载的 _plotMap（plotEl → {farmId, plotIndex}）解析所属农场 id
                    let farmId = null;
                    const farmEl = g.closest('.plant-farm');
                    const plotEl = farmEl && farmEl.querySelector('.plant-plot');
                    if (plotEl && UI.plantState && UI.plantState._plotMap) {
                        const info = UI.plantState._plotMap.get(plotEl);
                        if (info) farmId = info.farmId;
                    }
                    if (farmId == null) return;
                    btn = document.createElement('div');
                    btn.className = 'plant-mini-btn nek-skip-btn';
                    btn.dataset.farmId = farmId;
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleSkipPicker(+btn.dataset.farmId, btn);
                    });
                    g.insertBefore(btn, g.firstChild);   // 全部播种左边
                }
                const skipped = loadSkip()[+btn.dataset.farmId] || [];
                const label = skipped.length ? '设置·' + skipped.length : '设置';
                if (btn.textContent !== label) btn.textContent = label;
                btn.title = skipped.length
                    ? '当前自动收菜跳过 ' + skipped.length + ' 个地块，点击修改'
                    : '设置自动收菜跳过哪些地块';
            });
        } catch (e) { /* 忽略 */ }
    }

    function toggleSkipPicker(farmId, anchor) {
        const existing = document.getElementById('nek-skip-picker');
        if (existing) { existing.remove(); return; }
        if (farmId == null || !UI.plantState) return;
        let farm = null;
        let planet = null;
        eachFarm(function (f, skip, p) { if (f.id === farmId) { farm = f; planet = p; } });
        if (!farm) return;
        const skipped = loadSkip()[farmId] || [];
        const panel = document.createElement('div');
        panel.id = 'nek-skip-picker';
        panel.className = 'nek-skip-picker';
        let html = '<div class="nek-sp-title">跳过地块设置' +
            (planet && planet.name ? ' · ' + planet.name : '') + '</div>';
        for (let i = 0; i < 12; i++) {
            const pd = (farm.plots || [])[i] || (farm.plots || {})[String(i)];
            if (!pd || pd.state === 'locked') continue;
            const crop = pd.crop_id > 0 && game.getItem(pd.crop_id);
            html += '<label class="nek-sp-row"><input type="checkbox" data-plot="' + i + '"' +
                (skipped.indexOf(i) >= 0 ? ' checked' : '') + '><span>地块 ' + (i + 1) +
                '</span><span class="nek-sp-state">' + (STATE_TXT[pd.state] || pd.state) +
                (crop ? ' · ' + crop.name : '') + '</span></label>';
        }
        html += '<div class="nek-sp-tip">勾选后自动收获/播种将跳过该地块（手动批量按钮不受影响）</div>';
        panel.innerHTML = html;
        document.body.appendChild(panel);
        const r = anchor.getBoundingClientRect();
        panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 250)) + 'px';
        panel.style.top = Math.min(r.bottom + 6, window.innerHeight - 200) + 'px';
        panel.addEventListener('change', function (e) {
            const cb = e.target;
            if (!cb.dataset || cb.dataset.plot == null) return;
            const idx = parseInt(cb.dataset.plot, 10);
            const map = loadSkip();
            const arr = map[farmId] || [];
            const pos = arr.indexOf(idx);
            if (cb.checked && pos < 0) arr.push(idx);
            if (!cb.checked && pos >= 0) arr.splice(pos, 1);
            if (arr.length) map[farmId] = arr; else delete map[farmId];
            saveSkip(map);
            log('农场 ' + farmId + ' 跳过地块：' +
                (arr.length ? arr.map(function (x) { return x + 1; }).join('、') : '无'));
        });
        // 点击面板外自动关闭
        setTimeout(function () {
            const closer = function (ev) {
                if (!panel.contains(ev.target) && !anchor.contains(ev.target)) {
                    panel.remove();
                    document.removeEventListener('mousedown', closer);
                }
            };
            document.addEventListener('mousedown', closer);
        }, 0);
    }

    function injectSkipStyle() {
        if (document.getElementById('nek-skip-style')) return;
        const css = [
            '.nek-skip-picker { position: fixed; z-index: 9999; min-width: 230px; padding: 10px 14px;',
            '  background: rgba(10, 25, 45, .96); border: 1px solid rgba(55, 226, 212, .45);',
            '  border-radius: 8px; color: #d8fff9; font-size: 12px; box-shadow: 0 4px 18px rgba(0,0,0,.45); }',
            '.nek-sp-title { font-weight: 700; color: #37e2d4; margin-bottom: 6px; }',
            '.nek-sp-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; cursor: pointer; }',
            '.nek-sp-row input { cursor: pointer; }',
            '.nek-sp-state { color: #7fa8a3; margin-left: auto; }',
            '.nek-sp-tip { margin-top: 6px; color: #ffd76e; }'
        ].join('\n');
        const s = document.createElement('style');
        s.id = 'nek-skip-style';
        s.textContent = css;
        document.head.appendChild(s);
    }

    // ---------------- 「自动收菜：ON/OFF」开关按钮（当前行动取消按钮左侧） ----------------

    function injectAutoStyle() {
        if (document.getElementById('nek-harvest-style')) return;
        const css = [
            '.nek-harvest-toggle { position: relative; padding: 0 8px; border-radius: 4px; color: #333;',
            '  background: var(--c-warning, #ffd93b); text-align: center; cursor: pointer;',
            '  transition: all .2s ease; font-weight: 700; font-family: system-ui; font-size: 12px;',
            '  height: 20px; line-height: 20px; letter-spacing: 1px;',
            '  border: 2px solid var(--c-black, #000); white-space: nowrap; }',
            '.nek-harvest-toggle:hover { filter: brightness(1.15); -webkit-filter: brightness(1.15); }',
            '.nek-harvest-toggle.off { background: #f3f3ca; color: #939393; }'
        ].join('\n');
        const s = document.createElement('style');
        s.id = 'nek-harvest-style';
        s.textContent = css;
        document.head.appendChild(s);
    }

    function paintToggleButton(btn) {
        const on = autoEnabled();
        btn.textContent = '自动收菜：' + (on ? 'ON' : 'OFF');
        btn.classList.toggle('off', !on);
        btn.title = on ? '点击关闭自动收菜（种植自动收获+播种）'
                       : '点击开启自动收菜（种植自动收获+播种）';
    }

    function ensureToggleButton() {
        try {
            injectAutoStyle();
            const container = document.querySelector('.active-container');
            if (!container) return;
            const cancel = container.querySelector('.action-cancel-btn');
            if (!cancel || !cancel.parentNode) return;
            let btn = cancel.parentNode.querySelector('.nek-harvest-toggle');
            if (!btn) {
                btn = document.createElement('div');
                btn.className = 'nek-harvest-toggle';
                cancel.parentNode.insertBefore(btn, cancel);
                btn.addEventListener('click', function () {
                    const next = autoEnabled() ? '0' : '1';
                    try { localStorage.setItem(AUTO_LS_KEY, next); } catch (e0) { /* 忽略 */ }
                    paintToggleButton(btn);
                    log('自动收菜已' + (next === '0' ? '关闭' : '开启'));
                });
            }
            paintToggleButton(btn);
        } catch (e) { /* 忽略 */ }
    }

    // ---------------- 主循环 ----------------

    let started = false;

    function tick() {
        // 兜底：极端时序下独立版已启动而小助手随后注入，此时立即停止收发消息
        if (window.__NEK_HARVEST_IN_ASSISTANT__ || !autoEnabled()) return;
        tickPlanting();
    }

    function boot() {
        // 功能已并入「银河猫娘放置小助手 v1.25.0+」（其会设置此标记）：
        // 检测到标记时本独立脚本直接退出，避免双开重复发送收获/播种消息
        if (window.__NEK_HARVEST_IN_ASSISTANT__) {
            log('检测到小助手已内置自动收菜，独立脚本停止运行（可停用本脚本）');
            return;
        }
        if (started) return;
        if (typeof game === 'undefined' || typeof UI === 'undefined' ||
            typeof MSG === 'undefined' || typeof Data === 'undefined' || !game.character) {
            // 重试前再查一次并入标记：小助手可能在本脚本等待期间完成注入
            if (!window.__NEK_HARVEST_IN_ASSISTANT__) setTimeout(boot, 1500);
            else log('检测到小助手已内置自动收菜，独立脚本停止运行（可停用本脚本）');
            return;
        }
        started = true;
        log('已启动：每 ' + TICK_MS / 1000 + ' 秒检查一次（按地块收获+1秒后补种），' +
            '当前状态：' + (autoEnabled() ? 'ON' : 'OFF'));
        patchResultModal();
        injectSkipStyle();
        ensureToggleButton();
        ensureSkipButtons();
        setInterval(ensureToggleButton, 2000);   // 游戏重绘行动区后自动补挂开关按钮
        setInterval(ensureSkipButtons, 1500);    // 种植页重绘后自动补挂设置按钮
        setInterval(tick, TICK_MS);
        setTimeout(tick, 5000);
    }

    boot();
})();
