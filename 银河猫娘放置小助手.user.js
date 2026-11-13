// ==UserScript==
// @name         银河猫娘放置小助手
// @namespace    https://nekoidle.com/
// @version      1.27.1
// @description  主要功能：一、左侧熟练度悬浮提示（总经验/当前经验/距升级还需）；二、行动窗口与炼金界面（原子/神秘/量子炼金执行区）经验效率、目标等级与升下一级次数计算（含越级耗时与期望经验修正，越级时显示「原效率×获取期望比例=预期效率」并按越级档位着色；炼金期望按成功率折算）并快捷填入升级所需执行次数，炼金执行区另有「背包可执行次数」按钮（按当前点金/分解/研究/提纯/还原/转换/量子配方逐项折算材料持有量）；三、物品说明中显示市场行情（官方市场缓存接口：首次全量拉取+过期全量重拉+单物品按需强刷，三行显示左一/右一/刚交价/今日成/下次刷新倒计时）；四、烹饪页、生产页与采集页优化改造（自绘详情含「低于推荐等级X级」越级提示；生产详情内置「加工倍数」选择，倍数同步放大材料消耗与产物显示，可执行次数按倍数折算）；五、列出当前采集/生产/烹饪列表经验效率最高的两种操作（按越级机制修正：耗时倍率、成功率与烹饪失败10%经验）；六、部分防呆设置；七、点金辅助：原子炼金术选择物品时可按点金收益/点金经验/单位时间研究经验排序（均按含加成与成功率的期望值），研究产出另起一行拆分为梳毛/采集/种植/钓鱼/生产/烹饪六类，点击仅显示能产出该类别研究材料的物品并按期望份数排序；八、农业辅助（原「自动收菜」升级合并）：①自动收菜——进入游戏后直接拉取种植数据，不切页不打断操作；每30秒自动收获成熟地块，补种由游戏原生「自动播种」完成（种植页点亮地块右上角圆点），收获成果合并为一条通知，种植页可按农场设置跳过地块；②好友农场成熟预览——好友农场列表弹窗内逐个后台探测好友农场数据，直接显示各好友「可偷 N」与最近成熟倒计时，无需逐个进入农场。设置开关位置：游戏设置-「其他」标签页「农业辅助」（同时控制上述两个功能）；自动收菜在当前行动「取消」左侧保留快捷开关（仅控制自动收获）。
// @author       一心不乱
// @match        https://nekoidle.com/*
// @match        https://nekoidle.net/*
// @updateURL    https://raw.githubusercontent.com/djj200504001/Nekoidle_Helper/main/%E9%93%B6%E6%B2%B3%E7%8C%AB%E5%A8%98%E6%94%BE%E7%BD%AE%E5%B0%8F%E5%8A%A9%E6%89%8B.user.js
// @downloadURL  https://raw.githubusercontent.com/djj200504001/Nekoidle_Helper/main/%E9%93%B6%E6%B2%B3%E7%8C%AB%E5%A8%98%E6%94%BE%E7%BD%AE%E5%B0%8F%E5%8A%A9%E6%89%8B.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /**
     * 核心逻辑必须跑在页面上下文里：
     * game / Data / UI / MSG 是页面脚本用 const/let 声明的顶层绑定，
     * 挂在全局词法环境而非 window 上，油猴沙箱直接拿不到，
     * 所以把整段核心以 <script> 标签注入页面。
     */
    const BOOT = function () {
        if (window.__NEK_ASSISTANT__) return;
        window.__NEK_ASSISTANT__ = true;

        // Data.type 万一改版时的兜底映射
        const SKILL_FALLBACK = { '梳毛': 1, '采集': 2, '种植': 3, '钓鱼': 4, '寻宝': 5, '生产': 6, '烹饪': 7, '炼金': 8 };

        // ---------------- 功能开关状态 ----------------
        const LS_KEY = 'nek_assistant_enabled';           // 总开关
        const LS_CALC_KEY = 'nek_assistant_calc_enabled'; // 推算升级次数开关
        const LS_MARKET_KEY = 'nek_assistant_market_enabled'; // 市场行情开关
        const LS_COOK_KEY = 'nek_assistant_cook_enabled'; // 烹饪列表优化开关
        const LS_PROD_KEY = 'nek_assistant_prod_enabled'; // 生产列表优化开关
        const LS_PICK_KEY = 'nek_assistant_pick_enabled'; // 采集列表优化开关
        const LS_EFFMARK_KEY = 'nek_assistant_effmark_enabled'; // 突出最高效率操作开关
        const LS_FOOLPROOF_KEY = 'nek_assistant_foolproof_enabled'; // 防呆设置开关
        const LS_ALCSORT_KEY = 'nek_assistant_alcsort_enabled'; // 点金辅助开关
        const LS_CJ_KEY = 'nek_assistant_cookjump_enabled'; // 烹饪食材跳转开关
        const isEnabled = () => {
            try { return localStorage.getItem(LS_KEY) !== '0'; } catch (e) { return true; }
        };
        const setEnabled = v => {
            try { localStorage.setItem(LS_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isCalcEnabled = () => {
            try { return localStorage.getItem(LS_CALC_KEY) !== '0'; } catch (e) { return true; }
        };
        const setCalcEnabled = v => {
            try { localStorage.setItem(LS_CALC_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isMarketEnabled = () => {
            try { return localStorage.getItem(LS_MARKET_KEY) !== '0'; } catch (e) { return true; }
        };
        const setMarketEnabled = v => {
            try { localStorage.setItem(LS_MARKET_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isCookEnabled = () => {
            try { return localStorage.getItem(LS_COOK_KEY) !== '0'; } catch (e) { return true; }
        };
        const setCookEnabled = v => {
            try { localStorage.setItem(LS_COOK_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isProdEnabled = () => {
            try { return localStorage.getItem(LS_PROD_KEY) !== '0'; } catch (e) { return true; }
        };
        const setProdEnabled = v => {
            try { localStorage.setItem(LS_PROD_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isPickEnabled = () => {
            try { return localStorage.getItem(LS_PICK_KEY) !== '0'; } catch (e) { return true; }
        };
        const setPickEnabled = v => {
            try { localStorage.setItem(LS_PICK_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isEffMarkEnabled = () => {
            try { return localStorage.getItem(LS_EFFMARK_KEY) !== '0'; } catch (e) { return true; }
        };
        const setEffMarkEnabled = v => {
            try { localStorage.setItem(LS_EFFMARK_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isFoolproofEnabled = () => {
            try { return localStorage.getItem(LS_FOOLPROOF_KEY) !== '0'; } catch (e) { return true; }
        };
        const setFoolproofEnabled = v => {
            try { localStorage.setItem(LS_FOOLPROOF_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isAlcSortEnabled = () => {
            try { return localStorage.getItem(LS_ALCSORT_KEY) !== '0'; } catch (e) { return true; }
        };
        const setAlcSortEnabled = v => {
            try { localStorage.setItem(LS_ALCSORT_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isCookJumpEnabled = () => {
            try { return localStorage.getItem(LS_CJ_KEY) !== '0'; } catch (e) { return true; }
        };
        const setCookJumpEnabled = v => {
            try { localStorage.setItem(LS_CJ_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        // 烹饪列表优化通过 body 类作用域控制 CSS 生效（总开关关闭时同样视为关闭）
        const applyCookClass = () => {
            const on = isEnabled() && isCookEnabled();
            document.body.classList.toggle('nek-cook-on', on);
            try { ensureCookNav(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
            try { ensureEffMarks(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }   // 开关切换不产生 childList 变更，需显式刷新箭头
        };
        // 生产列表优化同样通过 body 类作用域控制 CSS 生效（隐藏原生列表、显示双栏面板）
        const applyProdClass = () => {
            const on = isEnabled() && isProdEnabled();
            document.body.classList.toggle('nek-prod-on', on);
            try { ensureProdPanel(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
            try { ensureEffMarks(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
        };
        // 采集列表优化：同生产（隐藏原生星球面板、显示双栏面板）
        const applyPickClass = () => {
            const on = isEnabled() && isPickEnabled();
            document.body.classList.toggle('nek-pick-on', on);
            try { ensurePickPanel(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
            try { ensureEffMarks(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
        };
        // 效率 Top2 标识：开关切换或总开关变化时立即刷新箭头
        const applyEffMarkState = () => {
            try { ensureEffMarks(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
        };
        // 防呆设置：开关切换或总开关变化时立即刷新按钮禁用态
        const applyFoolproofState = () => {
            try { ensureFoolproof(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
        };
        // 点金辅助：开关切换或总开关变化时立即刷新选择器排序条
        const applyAlcSortState = () => {
            try { ensureAlcSort(); } catch (e) { /* 脚本初始化早期可能未就绪，忽略 */ }
        };
        // 烹饪食材跳转：开关切换或总开关变化时清理已打开菜单中的跳转按钮
        const applyCookJumpState = () => {
            document.querySelectorAll('.nek-cookjump-btn').forEach(function (el) { el.remove(); });
        };

        // ---------------- 样式 ----------------
        const css = [
            '#nek-tip { position: fixed; z-index: 99999; display: none; pointer-events: none;',
            '  background: rgba(8, 22, 42, .96); border: 1px solid #37e2d4; border-radius: 6px;',
            '  color: #d8fff9; font-size: 12px; line-height: 1.8; padding: 8px 12px;',
            '  box-shadow: 0 0 14px rgba(55, 226, 212, .4); max-width: 300px; white-space: nowrap; }',
            '#nek-tip .nek-tip-title { color: #ffd76e; font-weight: 700; margin-bottom: 2px; }',
            '#nek-tip .nek-tip-hl { color: #37e2d4; font-weight: 700; font-size: 13px; }',
            '#nek-tip .nek-tip-dim { color: #7ba7b5; }',
            '.btn.quick-set.nek-lvl-btn { background: #ffd76e; color: #12233f; font-weight: 700;',
            '  border-color: #ffd76e; box-shadow: 0 0 8px rgba(255, 215, 110, .55); }',
            // 背包可执行次数按钮：青柠绿色系（用户比色选定），与原生青绿、金黄升级按钮区分
            '.btn.quick-set.nek-inv-btn { background: #a5e04e; color: #12233f; font-weight: 700;',
            '  border-color: #a5e04e; box-shadow: 0 0 8px rgba(165, 224, 78, .5); }',
            // 小助手提示显示期间，隐藏原网页自带的 .tip-tool 悬浮提示（如侧边栏的「梳毛 Lv.18」）。
            // 游戏用内联样式 display:block 显示它，必须用 !important 才能盖过；
            // 通过 body 类作用域限定：仅在小助手提示可见时生效，隐藏后游戏行为不受影响
            'body.nek-tip-active .tip-tool { display: none !important; }',
            // 烹饪页：打通食物/饮料/材料/鱼饵四个列表，整列滚动（无需点击标签切换）。
            // 原生结构：非激活组内容 display:none，激活组内容 flex:1 固定高度自滚动；
            // 统一改为全部展开、高度自适应，由外层 .bipanel-sidebar 统一滚动。
            // 通过 body.nek-cook-on 作用域限定，由设置页「烹饪列表优化」开关控制
            'body.nek-cook-on .cooking-page .cooking-accordion-group { flex: 0 0 auto !important; height: auto !important; }',
            'body.nek-cook-on .cooking-page .cooking-accordion-content { display: flex !important; flex-direction: column !important;',
            '  flex: 0 0 auto !important; height: auto !important; max-height: none !important; overflow: visible !important; }',
            // 分组吸顶折叠列表：展开组标题滚动吸顶（下一组标题推挤），折叠组整体吸顶堆叠保留；
            // 标题/折叠组加不透明底色，防止内容从吸顶层下方透出
            'body.nek-cook-on .cooking-page .cooking-accordion-header { position: sticky; z-index: 6;',
            '  background-color: #0a1a30; background-image: linear-gradient(rgba(75, 225, 216, .2), rgba(75, 225, 216, .2)); }',
            'body.nek-cook-on .cooking-page .cooking-accordion-group.nek-folded { position: sticky; z-index: 6;',
            '  background-color: #0a1a30; background-image: linear-gradient(rgba(75, 225, 216, .2), rgba(75, 225, 216, .2)); }',
            // 折叠收纳：隐藏组内容（特异性高于上方强制展开规则），视图从下一组开始
            'body.nek-cook-on .cooking-page .cooking-accordion-group.nek-folded .cooking-accordion-content { display: none !important; }',
            // 生产页：改造成烹饪式双栏——隐藏原生互斥手风琴列表，改用自建 bipanel
            // （左：单列吸顶分组列表，仅展示生产项名称；右：需求与执行详情，复用烹饪详情类名获得一致样式）。
            // 原生列表保留在 DOM 中作为数据源（分组结构与动作卡片由它镜像），由开关控制显隐
            'body.nek-prod-on .actions .accordion-list { display: none !important; }',
            // 采集页：隐藏原生星球双栏面板（pickPage），自建面板替代；由开关控制显隐
            'body.nek-pick-on .actions .pick-page { display: none !important; }',
            // 双栏容器复用游戏 .bipanel 系列样式（sidebar 200px 自滚动 / main 独立滚动 / ☰ 移动端开关），
            // 这里只补自建侧栏的分组与条目样式（对齐烹饪侧栏视觉）。
            // 生产面板（.nek-prod-page）与采集面板（.nek-pick-page）根节点都带 .nek-bipanel-side，样式共用
            '.nek-bipanel-side .nek-prod-group { display: flex; flex-direction: column; flex-shrink: 0;',
            '  border-bottom: 1px solid rgba(var(--r), var(--g), var(--b), .3); }',
            '.nek-bipanel-side .nek-prod-group-head { display: flex; justify-content: space-between; align-items: center;',
            '  padding: 8px 10px; cursor: pointer; user-select: none; flex-shrink: 0; transition: .2s;',
            '  font-weight: 500; color: var(--c-main-bright); }',
            '.nek-bipanel-side .nek-prod-group-count { font-size: 11px; opacity: .55; font-weight: 400; }',
            // 分组吸顶折叠：展开组标题吸顶（下一组标题推挤），折叠组整体吸顶堆叠保留；
            // 不透明底色防止内容从吸顶层下方透出（面板仅在开关开启时存在，无需按 body 类作用域）
            '.nek-bipanel-side .nek-prod-group-head { position: sticky; z-index: 6;',
            '  background-color: #0a1a30; background-image: linear-gradient(rgba(75, 225, 216, .2), rgba(75, 225, 216, .2)); }',
            '.nek-bipanel-side .nek-prod-group.nek-folded { position: sticky; z-index: 6;',
            '  background-color: #0a1a30; background-image: linear-gradient(rgba(75, 225, 216, .2), rgba(75, 225, 216, .2)); }',
            // 折叠收纳：隐藏组内容（特异性高于展开规则），视图从下一组开始
            '.nek-bipanel-side .nek-prod-group.nek-folded .nek-prod-group-items { display: none !important; }',
            // 侧栏条目：图标+名称+制造等级，行结构与 .cooking-recipe-item 一致（行高与烹饪对齐）
            '.nek-bipanel-side .nek-prod-item { display: flex; align-items: center; gap: 8px; cursor: pointer;',
            '  border-bottom: 1px solid rgba(var(--r), var(--g), var(--b), .2); transition: .2s; }',
            '.nek-bipanel-side .nek-prod-item:hover { background-color: rgba(var(--r), var(--g), var(--b), .1); }',
            '.nek-bipanel-side .nek-prod-item.active { background-color: rgba(var(--r), var(--g), var(--b), .2); }',
            // 等级不足态对齐烹饪 level-locked：整行 70% 不透明，等级文字红色
            '.nek-bipanel-side .nek-prod-item.level-locked { opacity: .7; }',
            '.nek-bipanel-side .nek-prod-item.level-locked .nek-prod-item-level { color: rgb(255, 48, 33); }',
            '.nek-bipanel-side .nek-prod-item-icon { width: 56px; height: 56px; flex-shrink: 0;',
            '  display: flex; align-items: center; justify-content: center; }',
            '.nek-bipanel-side .nek-prod-item-info { flex: 1 1 0%; min-width: 0; }',
            '.nek-bipanel-side .nek-prod-item-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
            '.nek-bipanel-side .nek-prod-item-level { font-size: 11px; margin-top: 2px; }',
            // 效率 Top2 标识：金/银上升箭头右侧对齐、垂直居中（absolute 不占布局，pointer-events:none 不挡点击）
            '.nek-bipanel-side .nek-prod-item, .cooking-page .cooking-recipe-item { position: relative; }',
            '.nek-eff-arrow { position: absolute; top: 50%; transform: translateY(-50%); right: 5px;',
            '  font-size: 13px; line-height: 1; pointer-events: none; z-index: 2; }',
            '.nek-eff-arrow.nek-eff-gold { color: #ffd76e; text-shadow: 0 0 6px rgba(255, 215, 110, .9); }',
            '.nek-eff-arrow.nek-eff-silver { color: #cfd9e4; text-shadow: 0 0 6px rgba(207, 217, 228, .7); }',
            // 防呆禁用态：分解用鱼选中点金时原子炼金执行按钮置灰（点击由卡片捕获监听拦截并弹提示）
            '.nek-fool-disabled { opacity: .45; filter: grayscale(1); cursor: not-allowed; }',
            // 被标记的条目/标题预留右侧空间，防止大箭头压住文字（标题右侧还有数量角标，多留一些）
            '.nek-prod-item.nek-eff-marked, .cooking-recipe-item.nek-eff-marked { padding-right: 20px; }',
            '.nek-bipanel-side .nek-prod-group-head.nek-eff-marked,',
            '.cooking-page .cooking-accordion-header.nek-eff-marked { padding-right: 26px; }',
            // 「执行」区上方的小助手计算块：经验效率 + 目标等级计算
            '.nek-eff-block { display: flex; flex-direction: column; gap: 4px; padding: 4px 0 6px;',
            '  font-size: 12px; color: #7ba7b5; }',
            '.nek-eff-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
            // 目标等级行：输入框与计算按钮强制同一行，结果文字独占下一行
            '.nek-target-row { flex-wrap: nowrap; }',
            '.nek-eff-val { color: #37e2d4; font-weight: 700; }',
            // 越级时效率值与越级提示同色（取色与游戏 .action-level-note 一致）
            '.nek-eff-val.recommend-yellow { color: #ffd93b; }',
            '.nek-eff-val.recommend-orange { color: #ff9f43; }',
            // 生产/采集侧栏条目的等级文字越级着色（游戏选择器不覆盖自绘条目）
            '.nek-prod-item-level.recommend-yellow { color: #ffd93b; }',
            '.nek-prod-item-level.recommend-orange { color: #ff9f43; }',
            '.nek-prod-item-level.recommend-red { color: #ff5f5f; }',
            // 自绘详情面板的越级提示行（复用游戏 .action-level-note 样式，此处保证块级显示）
            '.cooking-detail-header .action-level-note { display: block; width: 100%; }',
            '.nek-target-input { width: 64px; background: rgba(8, 22, 42, .6); border: 1px solid rgba(55, 226, 212, .5);',
            '  color: #d8fff9; border-radius: 4px; padding: 2px 8px; font-size: 12px; outline: none; }',
            '.nek-target-input:focus { border-color: #37e2d4; }',
            '.nek-target-dash { color: #7ba7b5; }',
            '.nek-target-btn { padding: 2px 12px; font-size: 12px; }',
            '.nek-target-result { color: #ffd76e; }',
            // 原生 .setting-name 是 104px 固定列（超出省略号截断），长名称显示不全；
            // 小助手区块改用自适应列：名称完整显示，中间弹性占位，开关仍靠右
            '.nek-assist-section .setting-item { grid-template-columns: auto 1fr auto; }',
            // 物品说明里的市场价格行（插在「Ctrl+左键点击 - 发至聊天」上方，三行布局）
            '.nek-market { padding: 4px 12px 8px; margin-top: 4px; font-size: 12px; line-height: 1.6;',
            '  color: #37e2d4; border-top: 1px solid rgba(55, 226, 212, .22); white-space: nowrap; }',
            '.nek-market-row { display: grid; grid-template-columns: max-content 1fr max-content 1fr; column-gap: 4px; justify-content: start; }',
            '.nek-market .nek-mk-next { color: #7fa8a3; grid-column: 1 / -1; }',
            '.nek-market[data-state="ok"] { color: #ffd76e; }',
            '.nek-market[data-state="fail"] { color: #ff8a8a; }',
            // 手机窄屏（<480px）：价格行允许换行，避免溢出说明面板
            '@media (max-width: 480px) { .nek-market { white-space: normal; } }',
            // 「跳转烹饪」按钮自绘图标（28×28 像素画：平底锅煎蛋）。
            // 复用 .menu-icon 的尺寸/缩放/像素化渲染，仅覆盖雪碧图为 data URI
            '.nek-icon-cook { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAA9klEQVR42mNgGAVDDfDwCPyHYbpY5uEVBcc0sxTmI5hFK1bto52F6L4qKesg34eENCBbBrKIJMuQIxuGQQZgE6eKZTBNxGCyLUP2CbpGbBhdHbpFBC0jZJGcnBpRFpMUhMhJGYaxAZDl6A5ADmKiLUS36N2HL3D865oPXouJshCb70AGIFsGsujPm2lgDGKjW4zsU4KWolsIczGpFhLtS5iFyL6DWQizFGYJCN9booHXQpilZPkQHWCLQ7J9iM+X+AA235GccGCG4LMYXQ3Z2QI9oxPCZOVDapY0JFVBlJSlFDUjyKktqNr4IaY+pFlbZbQdSggAAEtvOeHNBzFVAAAAAElFTkSuQmCC");',
            '  background-position: 0 0; }'
        ].join('\n');
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        // ---------------- 工具 ----------------
        const fmt = n => Number(n).toLocaleString('zh-CN');

        // 秒数 → 「X 天 X 小时 / X 小时 X 分 / X 分 X 秒 / X 秒」
        function fmtDuration(sec) {
            sec = Math.round(sec);
            if (sec < 60) return sec + ' 秒';
            const m = Math.floor(sec / 60);
            if (m < 60) return m + ' 分' + (sec % 60 ? ' ' + (sec % 60) + ' 秒' : '');
            const h = Math.floor(m / 60);
            if (h < 24) return h + ' 小时' + (m % 60 ? ' ' + (m % 60) + ' 分' : '');
            return Math.floor(h / 24) + ' 天' + (h % 24 ? ' ' + (h % 24) + ' 小时' : '');
        }

        // ---------------- 经验效率缓存（分类页预计算 + 弹窗验算回写） ----------------
        const EFF_TTL = 3 * 60 * 1000;   // 缓存有效期 3 分钟
        const effCache = new Map();      // actionId -> { perMin, at }

        // 单个动作的经验效率：经验取游戏同款加成公式，耗时 = time/1000/效率。
        // 越级机制（游戏改版新增，适用梳毛1/采集2/生产6/烹饪7）：推荐等级高于当前等级
        // diff 级时耗时 ×(1 + 0.1×min(diff,14))；diff≥15 无法执行（返回 null，不参与排名）；
        // 成功率 = diff≤5 ? 100% : (15-diff)×10%。
        // 梳毛/采集/生产：失败仅无物品产出，经验照发 → 期望经验不折减，只算耗时惩罚；
        // 烹饪：成功全额经验、失败 10% → 期望经验 = xp × (0.1 + 0.9×成功率)。
        function computeActionEff(a) {
            try {
                if (!a || a.xp == null || !(a.time > 0)) return null;
                // v1112a 起 calcExpWithBonus/getEfficiency 均支持第二参「行动所属研究设施」：
                // 梳毛1/采集按星球2~5/生产11；烹饪原生固定传 12（烹饪研究所）
                let fid = 0;
                try {
                    if (typeof game.getResearchFacilityIdForAction === 'function') {
                        fid = game.getResearchFacilityIdForAction(a) || 0;
                    }
                } catch (e1) { /* 忽略 */ }
                if (!fid && +a.action === 7) fid = 12;
                const exp = (typeof game !== 'undefined' && game.calcExpWithBonus)
                    ? game.calcExpWithBonus(a.xp, fid) : a.xp;
                let eff = 1;
                try {
                    if (typeof game !== 'undefined' && game.getEfficiency) eff = game.getEfficiency(a.type, fid) || 1;
                } catch (e2) { /* 忽略 */ }
                // 越级修正：耗时倍率 + 成功率期望（仅适用于支持越级的分类）
                let timeRate = 1, successRate = 1, over = 0;
                const skill = a.action != null ? +a.action : null;
                if (skill != null && [1, 2, 6, 7].indexOf(skill) >= 0 &&
                    typeof game !== 'undefined' && game.getLevelInfo) {
                    try {
                        const info = game.getLevelInfo(skill);
                        const diff = Math.max(0, (+a.level || 1) - ((info && info.level) || 1));
                        if (diff >= 15) return null;   // 等级差距过大，无法执行
                        if (diff > 0) {
                            over = diff;
                            timeRate = 1 + 0.1 * Math.min(diff, 14);
                            successRate = diff <= 5 ? 1 : (15 - diff) / 10;
                        }
                    } catch (e3) { /* 忽略 */ }
                }
                const sec = a.time / 1000 / eff * timeRate;
                if (!(sec > 0)) return null;
                const expXp = (skill === 7 && over > 0) ? exp * (0.1 + 0.9 * successRate) : exp;
                return { perExp: exp, perSec: sec, perMin: Math.round(expXp / sec * 60), over, successRate, timeRate };
            } catch (e) { return null; }
        }

        // 越级状态（对齐游戏 UI.getActionLevelState / getCookingLevelState 的动作分支）：
        // 返回 diff（等级差）、timeRate（耗时倍率）、successRate（百分比）、status（yellow/orange/red）
        function getOverLevelState(action) {
            try {
                const applicable = [1, 2, 6, 7].indexOf(+action.action) >= 0;
                const info = game.getLevelInfo(action.action);
                const cur = (info && info.level) || 1;
                const diff = Math.max(0, (+action.level || 1) - cur);
                const timeRate = applicable ? 1 + 0.1 * Math.min(diff, 14) : 1;
                const successRate = applicable ? (diff <= 5 ? 100 : (diff < 15 ? (15 - diff) * 10 : 0)) : 100;
                const status = !applicable ? (diff > 0 ? 'red' : 'normal')
                    : diff >= 15 ? 'red' : diff >= 6 ? 'orange' : diff >= 1 ? 'yellow' : 'normal';
                return { applicable, diff, timeRate, successRate, status };
            } catch (e) {
                return { applicable: false, diff: 0, timeRate: 1, successRate: 100, status: 'normal' };
            }
        }

        // 烹饪伪动作：食谱 → 动作形态对象（type=9 烹饪耗时效率索引、action=7 参与越级修正；
        // 新版食谱不在 Data.actions，id 用 'cook-<rid>' 前缀避免与真实动作 id 冲突）
        function synthesizeCookAction(r) {
            if (!r || r.xp == null || !(r.time > 0) || r.id == null) return null;
            return { id: 'cook-' + r.id, name: r.name, action: 7, type: 9,
                level: +r.level || 1, time: r.time, xp: r.xp };
        }

        // 按名称(+等级)在 Data.actions 中定位动作；等级缺失且重名时返回 null（避免误配）。
        // Data.actions 未命中时回退查 Data.cookingRecipes（新版烹饪食谱独立成表），
        // 以合成伪动作返回，使预计算缓存与弹窗装饰共用同一缓存键
        function findActionByName(name, level) {
            try {
                if (typeof Data === 'undefined' || !Data.actions) return null;
                let hit = null;
                let ambiguous = false;
                Object.values(Data.actions).forEach(a => {
                    if (!a || a.name !== name) return;
                    if (level != null) {
                        if (a.level === level) hit = a;
                    } else {
                        if (hit) ambiguous = true; else hit = a;
                    }
                });
                if (!hit && !ambiguous && Data.cookingRecipes) {
                    const r = Object.values(Data.cookingRecipes).find(x => x && x.name === name &&
                        (level == null || +x.level === +level));
                    if (r) hit = synthesizeCookAction(r);
                }
                return ambiguous ? null : hit;
            } catch (e) { return null; }
        }

        // 从弹窗/详情面板容器解析动作（标题如「收获 : 铁皮树」，等级取容器内 Lv.N）
        function identifyAction(container) {
            try {
                if (!container || !container.closest) return null;
                const scope = container.closest('.modal-box')
                    || container.closest('.cooking-detail')
                    || container;
                const tEl = scope.querySelector('.modal-title, .modal-box-title, .cooking-detail-title, [class*="title"]');
                if (!tEl) return null;
                const t = (tEl.textContent || '').trim();
                const name = t.includes('：') ? t.split('：').pop().trim()
                    : t.includes(':') ? t.split(':').pop().trim() : t;
                if (!name) return null;
                const lvM = (scope.textContent || '').match(/Lv\.?\s*(\d+)/);
                return findActionByName(name, lvM ? +lvM[1] : null);
            } catch (e) { return null; }
        }

        // 分类页（侧边栏 action-N）加载后异步预计算该分类全部操作的经验效率
        function precomputeCategory(n) {
            if (!isEnabled() || !isCalcEnabled()) return;
            let actions = [];
            try {
                if (typeof Data !== 'undefined' && Data.actions) {
                    // 数据驱动：梳毛(1)/采集(2)/生产(6) 等以 Data.actions 组织的分类全覆盖
                    Object.values(Data.actions).forEach(a => { if (a && a.action === n) actions.push(a); });
                    // DOM 兜底：卡片型选项（title 格式「名称 等级」）
                    document.querySelectorAll('.select-action-card .action-card-title').forEach(t => {
                        const m = (t.textContent || '').trim().match(/^(.+?)\s+(\d+)$/);
                        const a = m && findActionByName(m[1], +m[2]);
                        if (a) actions.push(a);
                    });
                    // 烹饪页：新版食谱不在 Data.actions（来源带 cooking:true 标记），
                    // 直接遍历 Data.cookingRecipes 合成伪动作参与预计算（含越级修正）
                    if (n === 7 && Data.cookingRecipes) {
                        Object.values(Data.cookingRecipes).forEach(r => {
                            const s = synthesizeCookAction(r);
                            if (s) actions.push(s);
                        });
                    }
                }
            } catch (e) { return; }
            const now = Date.now();
            const seen = new Set();
            actions = actions.filter(a => a && a.xp != null && a.time > 0 &&
                a.id != null && !seen.has(a.id) && seen.add(a.id));
            let i = 0;   // 分块异步计算，避免长列表阻塞渲染
            (function step() {
                const t0 = Date.now();
                while (i < actions.length && Date.now() - t0 < 8) {
                    const e = computeActionEff(actions[i++]);
                    if (e) effCache.set(actions[i - 1].id, { perMin: e.perMin, at: now });
                }
                if (i < actions.length) setTimeout(step, 40);
            })();
        }

        // 检测当前激活的分类页，变化时触发预计算（由 scheduleDecorate 防抖调用）
        let lastPreCat = null;
        function precomputeActiveCategory() {
            try {
                const act = document.querySelector('.sidebar-item[class*="action-"].active');
                const n = act ? (act.className.match(/action-(\d+)/) || [])[1] : null;
                if (!n || +n === lastPreCat) return;
                lastPreCat = +n;
                setTimeout(() => precomputeCategory(+n), 200);   // 等页面选项渲染完
            } catch (e) { /* 忽略 */ }
        }

        // ---------------- 效率 Top2 标识（金/银上升箭头） ----------------
        // 读取动作经验效率：优先取预计算缓存（TTL 内），未命中时现算并回写缓存
        function getActionEffPerMin(a) {
            if (!a || a.id == null) return null;
            const now = Date.now();
            const c = effCache.get(a.id);
            if (c && now - c.at < EFF_TTL) return c.perMin;
            const e = computeActionEff(a);
            if (e) {
                effCache.set(a.id, { perMin: e.perMin, at: now });
                return e.perMin;
            }
            return null;
        }

        // 在元素上应用/清除效率箭头（幂等）：want 为 'gold' / 'silver' / ''。
        // 被标记元素同时加 nek-eff-marked 类以预留右侧空间，防止箭头压住文字
        function applyEffArrow(el, want) {
            const cur = el.querySelector(':scope > .nek-eff-arrow');
            if (!want) {
                if (cur) cur.remove();
                el.classList.remove('nek-eff-marked');
                return;
            }
            if (cur && cur.dataset.nekEff === want) return;   // 已是目标状态
            if (cur) cur.remove();
            const arrow = document.createElement('div');
            arrow.className = 'nek-eff-arrow ' + (want === 'gold' ? 'nek-eff-gold' : 'nek-eff-silver');
            arrow.dataset.nekEff = want;
            arrow.textContent = '▲';
            el.appendChild(arrow);
            el.classList.add('nek-eff-marked');
        }

        // 清除容器内全部效率标记（箭头 + 预留空间类）
        function clearEffMarks(container) {
            if (!container) return;
            container.querySelectorAll('.nek-eff-arrow').forEach(a => a.remove());
            container.querySelectorAll('.nek-eff-marked').forEach(el => el.classList.remove('nek-eff-marked'));
        }

        // 在容器内条目及其分组标题上标出经验效率最高的两种操作：
        // 金色箭头 = 第 1 名，银色箭头 = 第 2 名；仅统计未锁定的条目。
        // 条目与所在分组的标题同步标记；top1/top2 同组时标题只显示金色。
        // getInfo(el) 返回 { eff, locked } 或 null。DOM 变更保持幂等——
        // 状态未变的条目不触碰，避免自身改动触发 MutationObserver 死循环
        function markTopEffIn(container, itemSel, getInfo, groupSel, headSel) {
            if (!container) return;
            const items = [...container.querySelectorAll(itemSel)];
            const ranked = items
                .map(el => {
                    const info = getInfo(el);
                    return info && !info.locked && info.eff != null ? { el, eff: info.eff } : null;
                })
                .filter(Boolean)
                .sort((a, b) => b.eff - a.eff);
            const goldEl = ranked.length > 0 ? ranked[0].el : null;
            const silverEl = ranked.length > 1 ? ranked[1].el : null;
            // 条目标记
            items.forEach(el => {
                applyEffArrow(el, el === goldEl ? 'gold' : el === silverEl ? 'silver' : '');
            });
            if (!groupSel || !headSel) return;
            // 分组标题同步标记：top1 所在组金色；top2 所在组银色（与 top1 同组时不重复标）
            const goldG = goldEl ? goldEl.closest(groupSel) : null;
            const silverG = silverEl ? silverEl.closest(groupSel) : null;
            container.querySelectorAll(groupSel).forEach(g => {
                const head = g.querySelector(headSel);
                if (!head) return;
                const want = g === goldG ? 'gold' : (g === silverG && silverG !== goldG) ? 'silver' : '';
                applyEffArrow(head, want);
            });
        }

        // 三处吸顶列表的 Top2 标记入口（scheduleDecorate 防抖调用 + 开关切换时调用）：
        // 采集/生产条目经 dataset.nekActionId 关联动作，烹饪条目用游戏挂载的 _recipe 引用。
        // 依赖门控：各列表仅在总开关 + 效率标识开关 + 对应列表优化开关都开启时才标记；
        // 任一未开启则清除该列表的标记（箭头随列表自身存在，此处兜底清理残留）
        function ensureEffMarks() {
            const base = isEnabled() && isEffMarkEnabled();
            const actionInfo = el => {
                const a = (typeof Data !== 'undefined' && Data.actions) ? Data.actions[el.dataset.nekActionId] : null;
                return a ? { eff: getActionEffPerMin(a), locked: el.classList.contains('level-locked') } : null;
            };
            const SIDE_ARGS = ['.nek-prod-group', '.nek-prod-group-head'];
            const pickSb = document.querySelector('.nek-pick-page .nek-prod-sidebar');
            if (pickSb) {
                if (base && isPickEnabled()) markTopEffIn(pickSb, '.nek-prod-item', actionInfo, ...SIDE_ARGS);
                else clearEffMarks(pickSb);
            }
            const prodSb = document.querySelector('.nek-prod-page .nek-prod-sidebar');
            if (prodSb) {
                if (base && isProdEnabled()) markTopEffIn(prodSb, '.nek-prod-item', actionInfo, ...SIDE_ARGS);
                else clearEffMarks(prodSb);
            }
            // 烹饪：游戏原生条目（锁定=未知食谱，等级不足=level-locked，均不参与排名）
            const cookSb = document.querySelector('.cooking-page .bipanel-sidebar');
            if (cookSb) {
                if (base && isCookEnabled()) {
                    markTopEffIn(cookSb, '.cooking-recipe-item', el => {
                        let r = el._recipe;
                        if (!r && typeof Data !== 'undefined' && Data.cookingRecipes) {
                            const nm = ((el.querySelector('.cooking-recipe-name') || {}).textContent || '').trim();
                            r = Object.values(Data.cookingRecipes).find(x => x && x.name === nm);
                        }
                        if (!r) return null;
                        // 合成伪动作走缓存优先（预计算已按 type=9/action=7/食谱等级预热），未命中时现算
                        const eff = getActionEffPerMin(synthesizeCookAction(r));
                        // locked = 未解锁食谱（新版游戏不再给等级不足的烹饪条目加 level-locked）
                        return eff != null ? { eff, locked: el.classList.contains('locked') } : null;
                    }, '.cooking-accordion-group', '.cooking-accordion-header');
                } else clearEffMarks(cookSb);
            }
        }

        // ---------------- 防呆设置：原子炼金术分解用鱼禁用点金 ----------------
        // 与游戏 _alchemyUpdateRight 同款判定：物品是否可分解
        // （disjoint 数组非空，或来源动作为烹饪(type 7)且带材料；disable 含 alchemy 则整体排除）
        function isDecomposableItem(def) {
            try {
                if (!def || (def.disable && def.disable.includes('alchemy'))) return false;
                if (def.disjoint && Array.isArray(def.disjoint) && def.disjoint.length > 0) return true;
                if (def.sources && def.sources.actions && def.sources.actions.length > 0) {
                    const a = game.getAction(def.sources.actions[0].id);
                    return !!(a && a.type == 7 && a.requirements);
                }
                return false;
            } catch (e) { return false; }
        }

        // 钓鱼用拟饵：名称含「拟饵」的物品（铁片拟饵/铜管蠕虫拟饵/云纱拟饵/赤铁拟饵/青铜齿轮拟饵，
        // 均带 fishPower/retentionRate 钓鱼属性）；另有显式名单——时轮沙漏饵（9012，名称不含「拟饵」）
        const FP_LURE_EXTRA_IDS = [9012];
        function isLureItem(def) {
            if (!def) return false;
            if (def.name && def.name.indexOf('拟饵') >= 0) return true;
            return FP_LURE_EXTRA_IDS.indexOf(+def.id) >= 0;
        }

        // 原子炼金卡片上的捕获监听：防呆生效时拦截执行按钮点击并弹提示（每卡只绑一次，
        // 按钮重渲染不影响——监听挂在卡片上按当前状态动态判断；dataset.nekFp='fish'/'lure' 区分文案）
        function bindFoolproofGuard(card) {
            if (card.dataset.nekFpBound) return;
            card.dataset.nekFpBound = '1';
            card.addEventListener('click', e => {
                const mode = card.dataset.nekFp;
                if (mode !== 'fish' && mode !== 'lure') return;
                if (!e.target.closest('.btn.start-action, .btn.queue-action')) return;
                e.stopPropagation();
                e.preventDefault();
                const msg = mode === 'lure'
                    ? '拟饵是分解用的，别点金，快说谢谢一心喵'
                    : '这条鱼是用来分解的，别手贱，快说谢谢一心喵';
                try { UI.notifier.show(msg, 'tip'); } catch (e2) { /* 忽略 */ }
            }, true);
        }

        // 扫描原子炼金卡片：当前标签为点金时，若选中物品是钓鱼用拟饵（名称含「拟饵」）
        // 或可用于分解的鱼（Data.fishingFish 命中 + 可分解），禁用立即开始/插入队列首/
        // 加入队列尾按钮，并按原因（lure/fish）区分拦截提示。幂等：卡片级状态比对
        // （dataset.nekFp），切换标签/换物品会重渲染按钮，由 scheduleDecorate 防抖重刷
        function ensureFoolproof() {
            const on = isEnabled() && isFoolproofEnabled();
            document.querySelectorAll('.alchemy-card').forEach(card => {
                const title = card.querySelector('.alchemy-title');
                if (!title || title.textContent.indexOf('原子炼金术') === -1) return;
                const right = card.querySelector('.alchemy-right');
                if (!right) return;
                const buttons = [...right.querySelectorAll('.btn.start-action, .btn.queue-action')];
                if (!buttons.length) { card.dataset.nekFp = '0'; return; }
                bindFoolproofGuard(card);
                let block = false;
                let reason = '0';
                if (on) {
                    try {
                        const tab = right.querySelector('.section-tab-item.active');
                        const info = (typeof UI !== 'undefined' && UI.alchemyInfo) ? UI.alchemyInfo['0'] : null;
                        if (tab && tab.textContent.trim() === '点金' && info && info.item != null) {
                            const def = game.getItem(info.item);
                            // 拟饵（钓鱼用）：名称含「拟饵」即拦
                            if (isLureItem(def)) {
                                block = true;
                                reason = 'lure';
                            } else if (Data.fishingFish && Data.fishingFish[info.item] &&
                                isDecomposableItem(def)) {
                                block = true;
                                reason = 'fish';
                            }
                        }
                    } catch (e) { block = false; reason = '0'; }
                }
                const want = block ? reason : '0';
                card.dataset.nekFp = want;
                // 幂等以 DOM 实际类为准：切标签/换物品会重渲染重建按钮（类被抹掉），
                // 若比对期望状态会在重建后误判「未变」而漏标；class 变更不触发本观察器（仅监听 childList）
                if (buttons.every(b => b.classList.contains('nek-fool-disabled') === block)) return;
                buttons.forEach(b => b.classList.toggle('nek-fool-disabled', block));
            });
        }

        // ---------------- 点金辅助：原子炼金选择器按点金收益/点金经验/研究经验排序，研究产出拆分为六类 ----------------
        // ''=默认 'meow'=点金收益 'exp'=点金经验 'resexp'=研究经验 'r_*'=研究类别（仅显示并按期望产出排序）
        const ALC_SORT_MODE_KEY = 'nek_assistant_alcsort_mode';
        const ALC_SORT_MODES = ['meow', 'exp', 'resexp'];
        // 研究类别 → 研究材料：按设施名前缀归类（水质研究所=钓鱼、生态研究所=采集等），
        // 一个类别可对应多种研究材料（如采集 4 个星球、钓鱼 5 个水域），运行时从设施数据生成
        // 炼金不设类别按钮：炼金研究资料（9617）无任何物品研究主产出（唯一来源是研究动作额外掉落），列表恒为空
        const ALC_RESEARCH_CATS = [
            { mode: 'r_groom', label: '梳毛', prefix: '梳毛研究所' },
            { mode: 'r_gather', label: '采集', prefix: '生态研究所' },
            { mode: 'r_farm', label: '种植', prefix: '农业研究所' },
            { mode: 'r_fish', label: '钓鱼', prefix: '水质研究所' },
            { mode: 'r_prod', label: '生产', prefix: '工艺研究所' },
            { mode: 'r_cook', label: '烹饪', prefix: '烹饪研究所' }
        ];
        const isAlcCatMode = m => typeof m === 'string' && m.indexOf('r_') === 0;
        let alcCatMats = null;
        // 每类返回 { ids: 材料id数组（高档在前）, rank: Map(材料id→档位序号，0=最高档) }
        function alcResearchMats() {
            if (alcCatMats) return alcCatMats;
            const mats = {};
            try {
                // 设施数据按 id 升序（低档→高档），先排序再归类，保证档位序与设施 id 一致
                const fs = (Data.research.facilities || []).slice().sort((a, b) => ((a && a.id) || 0) - ((b && b.id) || 0));
                fs.forEach(f => {
                    if (!f || !f.name || !f.reportItem) return;
                    ALC_RESEARCH_CATS.forEach(c => {
                        if (f.name.indexOf(c.prefix) === 0) {
                            const m = mats[c.mode] = mats[c.mode] || { ids: [], rank: new Map() };
                            const mid = parseInt(f.reportItem, 10);
                            if (!m.rank.has(mid)) { m.rank.set(mid, m.ids.length); m.ids.push(mid); }
                        }
                    });
                });
                // 翻转：高档材料排前（rank 0 = 最高档，如钓鱼的时之沙原）
                Object.values(mats).forEach(m => {
                    m.ids.reverse();
                    m.ids.forEach((id, i) => m.rank.set(id, i));
                });
            } catch (e) { /* 忽略 */ }
            alcCatMats = mats;
            return mats;
        }
        const getAlcSortMode = () => {
            try { return localStorage.getItem(ALC_SORT_MODE_KEY) || ''; } catch (e) { return ''; }
        };
        const setAlcSortMode = v => {
            try { localStorage.setItem(ALC_SORT_MODE_KEY, v); } catch (e) { /* 忽略 */ }
        };

        // 包装 UI.showItemSelector 给原子炼金选择器打标（action='alchemy' && type=1），
        // 其余选择器不受影响；只 hook 一次
        let alcSortHooked = false;
        function hookAlcSort() {
            if (alcSortHooked) return;
            try {
                if (typeof UI === 'undefined' || !UI || !UI.showItemSelector) return;
                const orig = UI.showItemSelector;
                UI.showItemSelector = function (selector, option, callback) {
                    const r = orig.call(this, selector, option, callback);
                    try {
                        if (this.itemSelector && option && option.action === 'alchemy' && option.type === 1) {
                            this.itemSelector.dataset.nekAlc = '1';
                        }
                    } catch (e) { /* 忽略 */ }
                    return r;
                };
                alcSortHooked = true;
            } catch (e) { /* 忽略 */ }
        }

        // 图标 id → 物品 id 反查表：游戏 getItemIconId 基本一一对应，
        // 特例（绑定罐头 4→2、3500~3599→3500）用背包数量匹配消歧
        let alcIconMap = null;
        function alcIconToIds() {
            if (alcIconMap) return alcIconMap;
            const map = new Map();
            try {
                Object.keys(Data.items).forEach(id => {
                    let ic;
                    try { ic = String(getItemIconId(id)); } catch (e) { return; }
                    if (!map.has(ic)) map.set(ic, []);
                    map.get(ic).push(id);
                });
            } catch (e) { /* 忽略 */ }
            alcIconMap = map;
            return map;
        }

        // 从选择器条目反解物品 id：图标类名 → 候选 id，多候选时按显示数量匹配背包
        function alcItemIdsOf(el) {
            const ic = el.querySelector('[class*="itemicon"]');
            const m = ic ? ic.className.match(/itemicon-(\d+)/) : null;
            if (!m) return [];
            const cands = alcIconToIds().get(m[1]) || [];
            if (cands.length <= 1) return cands;
            const qEl = el.querySelector('.item-quantity');
            const q = qEl ? parseInt(qEl.textContent, 10) : NaN;
            const matched = cands.filter(id => { try { return game.getItemQuantity(id) === q; } catch (e) { return false; } });
            return matched.length ? matched : [cands[0]];
        }

        // 单件期望产出（均与游戏自身口径一致，全部乘成功率），返回 {s: 分数, g: 材料档位}：
        // 点金收益 = value×3（金融所加成）×成功率；
        // 点金经验 = getAlchemyExpForLevel(grade,1,rarity)（含统一经验加成）×成功率；
                // 研究经验/时间 = 单次研究期望经验 ÷ 单次研究耗时。耗时 = 8秒基础 ÷ 全局效率
                //   ÷ getAlchemyOverLevelMultiplier(grade)（炼金等级高于物品 grade 时每高 1 级
                //   耗时效率 +1% 乘算，即低于自身等级的材料研究更快）；全局效率与 8 秒基础耗时
                //   对所有物品相同、不影响排序，故分数 = 经验 × 成功率 × 阶差耗时乘数；
        // 研究类别 r_* = research.quantity×成功率（期望份数），仅限产出该类别研究材料的物品，
        //   g = 材料档位序号（0=最高档，如钓鱼的时之沙原），多材料类别按 g 升序分组显示。
        // 成功率与游戏 alchemyGetSuccessRate(grade) 一致（炼金等级不足时 50%~100%）。
        // 注意：线上 getAlchemyExpForLevel 的 type 从 1 开始（1=点金 … 7=研究），以运行时为准；
        // v1110 新公式 = 347×(1+2%×(grade-1))×(1+5%×rarity)×类型系数×越级衰减，脚本动态调用自动适配。
        function alcScore(id, mode) {
            const NG = { s: -1, g: 0 };
            try {
                const def = Data.items[id];
                if (!def) return NG;
                let rate = 1;
                try { rate = parseFloat(game.alchemyGetSuccessRate(def.grade)) / 100; } catch (e) { rate = 1; }
                if (isAlcCatMode(mode)) {
                    const mats = alcResearchMats()[mode];
                    if (!mats || !def.research || !def.research.itemId) return NG;   // 不可研究/不产该类材料，沉底
                    const mid = parseInt(def.research.itemId, 10);
                    if (!mats.rank.has(mid)) return NG;
                    return { s: Math.max(1, parseInt(def.research.quantity, 10) || 1) * rate, g: mats.rank.get(mid) };
                }
                if (mode === 'meow') {
                    if (!def.value) return NG;   // 无价值物品无法点金，沉底
                    let q = def.value * 3;
                    try {
                        const b = game.getSquadronFacilityEffect(5);   // 金融所点金产出加成
                        if (b > 0) q = Math.floor(q * (100 + b) / 100);
                    } catch (e2) { /* 忽略 */ }
                    return { s: q * rate, g: 0 };
                }
                let exp;
                let over = 1;
                let rar = 0;
                try { rar = Math.max(0, parseInt(def.rarity, 10) || 0); } catch (e4) { /* 忽略 */ }
                if (mode === 'resexp') {
                    if (!def.research || !def.research.itemId) return NG;   // 不可研究，沉底
                    // v1110 起研究经验减半（与游戏原子炼金面板一致：floor(baseExp/2) 后再算统一加成）
                    try { exp = game.calcExpWithBonus(Math.floor(game.getAlchemyExpForLevel(def.grade, 7, rar) / 2)); } catch (e3) { return NG; }
                    // 单位时间口径：额外乘反应阶差耗时乘数（炼金等级 > 物品 grade 时耗时更短）
                    try { over = game.getAlchemyOverLevelMultiplier ? game.getAlchemyOverLevelMultiplier(def.grade) : 1; } catch (e5) { over = 1; }
                    if (!isFinite(over) || over <= 0) over = 1;
                } else {
                    // 稀有度必须传入：游戏详情页经验为 getAlchemyExpForLevel(grade,type,rarity)，
                    // 漏传会把不同稀有度的同等级物品算成同分（如星屑螺钉 509 vs 客家酿豆腐 764）
                    try { exp = game.calcExpWithBonus(game.getAlchemyExpForLevel(def.grade, 1, rar)); } catch (e3) { return NG; }
                }
                if (!isFinite(exp)) return NG;
                return { s: exp * rate * over, g: 0 };
            } catch (e) { return NG; }
        }

        // 恢复选择器默认排序（按记录的原始顺序重排），并清理类别模式的隐藏痕迹
        function alcRestoreDefault(grid) {
            grid.querySelectorAll(':scope > .selector-item').forEach(el => {
                if (el.style.display) el.style.display = '';
            });
            const orig = grid.__nekOrig;
            if (!orig || !orig.length) return;
            const cur = [...grid.children];
            if (cur.length === orig.length && cur.every((el, i) => el === orig[i])) return;   // 已是默认顺序
            orig.forEach(el => { if (el.parentNode === grid) grid.appendChild(el); });
        }

        // 应用排序：默认 → 还原；点金收益/点金经验/研究经验/研究产出 → 按期望产出倒序（同分保持原始顺序）。
        // 默认序只在「游戏刚重渲染」时刷新：DOM 序 ≠ 上次目标序说明游戏重建过列表
        //（数量变化不改 DOM 顺序，避免把已排序的顺序误记为默认序）；否则保持原记录。
        // 目标顺序与当前一致时跳过写入（appendChild 会触发 childList 观察器，防循环）
        function alcApplySort(grid, mode) {
            // 类别模式但映射缺失（如已删除的炼金类别残留旧存档）→ 回落默认，防止全部被隐藏
            if (isAlcCatMode(mode) && !(alcResearchMats()[mode])) mode = '';
            const items = [...grid.querySelectorAll(':scope > .selector-item')];
            if (!items.length) return;
            const sig = items.map(el => {
                const ic = el.querySelector('[class*="itemicon"]');
                const m = ic ? ic.className.match(/itemicon-(\d+)/) : null;
                const qEl = el.querySelector('.item-quantity');
                return (m ? m[1] : '?') + ':' + (qEl ? qEl.textContent.trim() : '');
            }).join('|');
            if (grid.__nekSig !== sig) {
                grid.__nekSig = sig;
                const last = grid.__nekLastTarget;
                const sameAsLast = last && last.length === items.length && items.every((el, i) => el === last[i]);
                if (!sameAsLast) grid.__nekOrig = items;
            }
            let target;
            if (ALC_SORT_MODES.indexOf(mode) < 0 && !isAlcCatMode(mode)) {
                items.forEach(el => { if (el.style.display) el.style.display = ''; });   // 清理类别隐藏
                target = grid.__nekOrig && grid.__nekOrig.length ? grid.__nekOrig : items;
            } else {
                const scored = items.map((el, i) => {
                    const ids = alcItemIdsOf(el);
                    // 多候选取分数最高者；同分取档位更高者（多材料类别的分组归属）
                    let best = { s: -1, g: 0 };
                    for (const id of ids) {
                        const r = alcScore(id, mode);
                        if (r.s > best.s || (r.s === best.s && r.g > best.g)) best = r;
                    }
                    return { el, i, s: best.s, g: best.g };
                });
                // 平局按「记录的默认序」打破，而不是当前 DOM 序——当前 DOM 可能是上一次
                // 排序的结果，会导致从不同模式切过来时同分物品的相对顺序不一致
                const orig = grid.__nekOrig && grid.__nekOrig.length ? grid.__nekOrig : items;
                const origIdx = new Map();
                orig.forEach((el, i) => { if (!origIdx.has(el)) origIdx.set(el, i); });
                const byOrig = (a, b) => (origIdx.has(a.el) ? origIdx.get(a.el) : a.i) - (origIdx.has(b.el) ? origIdx.get(b.el) : b.i);
                if (isAlcCatMode(mode)) {
                    // 类别模式：仅显示可产出该类别研究材料的物品；多材料类别按材料档位
                    // 从高到低分组（如钓鱼：沙原→荒原→浅滩→赤湖→人工湖），组内按期望份数倒序
                    const member = scored.filter(x => x.s >= 0).sort((a, b) => a.g - b.g || b.s - a.s || byOrig(a, b));
                    const rest = scored.filter(x => x.s < 0).sort(byOrig);
                    target = member.concat(rest).map(x => x.el);
                    scored.forEach(x => {
                        const want = x.s >= 0 ? '' : 'none';
                        if (x.el.style.display !== want) x.el.style.display = want;
                    });
                } else {
                    items.forEach(el => { if (el.style.display) el.style.display = ''; });
                    scored.sort((a, b) => b.s - a.s || byOrig(a, b));
                    target = scored.map(x => x.el);
                }
            }
            grid.__nekLastTarget = target;
            const cur = [...grid.children];
            if (cur.length === target.length && cur.every((el, i) => el === target[i])) return;
            target.forEach(el => { if (el.parentNode === grid) grid.appendChild(el); });
        }

        // 统一选择器筛选条观感：原版筛选条（全部/装备/物资…）与插件排序条同宽、按钮等宽拉伸填满。
        // 全部用相对布局（display:flex 自动填满父宽 + flex:1 1 0 等分），不写死像素宽度，
        // 游戏更新导致列表宽度变化时自动跟随
        let alcTabStyleInjected = false;
        function injectAlcTabStyle() {
            if (alcTabStyleInjected || document.getElementById('nek-alctab-style')) {
                alcTabStyleInjected = true;
                return;
            }
            const st = document.createElement('style');
            st.id = 'nek-alctab-style';
            st.textContent = [
                // 原版筛选条：inline-flex 收缩到内容宽 → 块级 flex 自动填满父宽（减自身 margin）；
                // 覆盖 .ui-tab 自带 align-self:flex-start（父容器为 flex column 时会收缩宽度）
                '.selector-tabs.ui-tab { display: flex; align-self: stretch; }',
                // 原版筛选按钮：行内等宽拉伸；内边距收窄，让三字按钮（如「消耗品」）也能
                // 越过 min-width:auto 的最小内容宽度参与等分
                '.selector-tabs.ui-tab .selector-tab-btn { flex: 1 1 0; text-align: center; padding-left: 4px; padding-right: 4px; }',
                // 插件排序条两行：按钮同样等宽拉伸
                '.nek-alcsort-row { gap: 4px; }',
                '.nek-alcsort-row .selector-tab-btn { flex: 1 1 0; text-align: center; }'
            ].join('\n');
            (document.head || document.documentElement).appendChild(st);
            alcTabStyleInjected = true;
        }

        // 扫描打开中的原子炼金选择器：注入两行排序条（通用排序 + 六个研究类别）并按当前模式排序。
        // 由 scheduleDecorate 防抖调用 + 模式切换/开关切换时直接调用
        function ensureAlcSort() {
            hookAlcSort();   // 必须在选择器打开前装好包装（打标靠它），每次运行兜底补装
            injectAlcTabStyle();
            const sel = document.querySelector('.selector.neon[data-nek-alc]');
            const content = sel ? sel.querySelector('.selector-content') : null;
            const grid = content ? content.querySelector('.selector-grid') : null;
            if (!content || !grid) return;
            let bar = content.querySelector('.nek-alcsort-bar');
            if (!isEnabled() || !isAlcSortEnabled()) {
                if (bar) { alcRestoreDefault(grid); bar.remove(); }
                return;
            }
            if (!bar) {
                bar = document.createElement('div');
                // 不能带 ui-tab 类：游戏会将其子节点重组进 ui-tab-content（水平 flex），
                // 两行会被迫并排；按钮样式来自独立的 .ui-tab-item，不依赖 ui-tab 祖先
                bar.className = 'selector-tabs nek-alcsort-bar';
                bar.style.display = 'flex';
                bar.style.flexDirection = 'column';
                bar.style.gap = '3px';
                // 补回 ui-tab 类自带的容器外观（深色底/描边/圆角/文字色），
                // 直接内联以避开 ui-tab 的子节点重组逻辑；变量随游戏主题变化
                bar.style.backgroundColor = 'var(--c-mask, rgba(0,0,0,.5))';
                bar.style.border = '1px solid rgba(var(--r), var(--g), var(--b), .3)';
                bar.style.borderRadius = '8px';
                bar.style.color = 'var(--c-text, #fff)';
                bar.style.boxSizing = 'border-box';
                bar.style.padding = '2px 0';
                // 类别按钮提示：动态列出该类别对应的研究材料名称（多材料时高档在前）
                const catTip = c => {
                    const mats = alcResearchMats()[c.mode];
                    const names = mats ? mats.ids.map(id => {
                        try { return (game.getItem(id) || {}).name || ('#' + id); } catch (e) { return '#' + id; }
                    }).join('、') : '（未找到对应研究材料）';
                    const multi = mats && mats.ids.length > 1 ? '按材料档位从高到低分组、组内' : '';
                    return '仅显示研究产出【' + names + '】的物品，' + multi + '按单次期望产出份数倒序（含研究成功率）';
                };
                const rows = [
                    [
                        ['default', '默认', '游戏原始排序'],
                        ['meow', '点金收益', '按单件点金期望喵点产出倒序（含金融所加成与点金成功率）'],
                        ['exp', '点金经验', '按单件点金期望经验倒序（含稀有度、统一经验加成与点金成功率）'],
                        ['resexp', '经验/时间', '按单位时间研究期望经验倒序：单次期望经验÷单次研究耗时（含稀有度、统一经验加成、研究成功率与反应阶差耗时加成——炼金等级高于物品等级时每高1级耗时效率+1%乘算；基础8秒与全局效率对所有物品相同，不影响排序）']
                    ],
                    ALC_RESEARCH_CATS.map(c => [c.mode, c.label, catTip(c)])
                ];
                rows.forEach(defs => {
                    const row = document.createElement('div');
                    row.className = 'nek-alcsort-row';
                    row.style.display = 'flex';
                    row.style.flexWrap = 'wrap';
                    defs.forEach(([mode, label, tip]) => {
                        const btn = document.createElement('div');
                        btn.className = 'selector-tab-btn ui-tab-item';
                        btn.dataset.nekAlcMode = mode;
                        btn.textContent = label;
                        btn.title = tip;
                        btn.addEventListener('click', () => {
                            setAlcSortMode(mode);
                            alcApplySort(grid, mode);
                            syncAlcSortBar(bar, mode);
                        });
                        row.appendChild(btn);
                    });
                    bar.appendChild(row);
                });
                content.insertBefore(bar, content.querySelector('.selector-list'));
            }
            const mode = getAlcSortMode();
            syncAlcSortBar(bar, mode);
            alcApplySort(grid, mode);
        }

        // 排序条按钮高亮态同步（幂等）
        function syncAlcSortBar(bar, mode) {
            bar.querySelectorAll('.selector-tab-btn').forEach(b => {
                const want = (b.dataset.nekAlcMode || '') === (mode || '');
                if (b.classList.contains('active') !== want) b.classList.toggle('active', want);
            });
        }

        // ---------------- 烹饪页：分组吸顶折叠列表 ----------------
        const COOK_HEAD_SEL = '.cooking-accordion-header';

        // 折叠状态按组标题记忆：游戏重渲染会重建分组元素抹掉类名，同步时按此恢复
        const cookFoldSet = new Set();

        // 同步吸顶偏移：折叠组整个吸顶堆叠保留（第 N 个折叠组钉在 N*标题高），
        // 展开组仅标题吸顶，偏移 = 上方折叠组数 × 标题高（经典推挤效果由 sticky 自然产生）
        function cookSyncSticky(sb) {
            const groups = [...sb.querySelectorAll(':scope > .cooking-accordion-group')];
            const head0 = groups[0] && groups[0].querySelector(COOK_HEAD_SEL);
            const H = head0 ? head0.offsetHeight : 35;
            let offset = 0;
            groups.forEach(g => {
                const head = g.querySelector(COOK_HEAD_SEL);
                if (!head) return;
                const name = head.textContent.trim();
                // 恢复被游戏重渲染抹掉的折叠状态（双向对齐内存记忆）
                if (cookFoldSet.has(name)) g.classList.add('nek-folded');
                else g.classList.remove('nek-folded');
                if (g.classList.contains('nek-folded')) {
                    g.style.top = offset + 'px';   // 折叠组整体吸顶
                    head.style.top = '0px';
                    offset += H;
                } else {
                    g.style.top = '';
                    head.style.top = offset + 'px';
                }
            });
        }

        // 清理吸顶/折叠痕迹（开关关闭时调用）
        function cookClearSticky(sb) {
            cookFoldSet.clear();
            sb.querySelectorAll(':scope .cooking-accordion-group').forEach(g => {
                g.classList.remove('nek-folded');
                g.style.top = '';
                const head = g.querySelector(COOK_HEAD_SEL);
                if (head) head.style.top = '';
            });
        }

        // 烹饪页分组吸顶折叠：组标题滚动吸顶（下一组标题自然推挤）；点击标题按状态响应——
        // 已折叠 → 展开并前往；吸顶中（组顶已滚过容器顶）→ 快速前往该组起点；
        // 原位 → 折叠收纳（视图从下一未折叠组开始）。由 scheduleDecorate / applyCookClass 调用
        function ensureCookNav() {
            const sb = document.querySelector('.cooking-page .bipanel-sidebar');
            if (!isEnabled() || !isCookEnabled() || !sb) {
                document.querySelectorAll('.cooking-page .bipanel-sidebar').forEach(cookClearSticky);
                return;
            }
            const groups = [...sb.querySelectorAll(':scope > .cooking-accordion-group')];
            if (!groups.length) return;
            if (!sb.dataset.nekCookSticky) {
                sb.dataset.nekCookSticky = '1';   // 委托监听只绑一次（随 sb 重建自动重挂）
                sb.addEventListener('click', e => {
                    const head = e.target.closest(COOK_HEAD_SEL);
                    if (!head) return;
                    const g = head.closest('.cooking-accordion-group');
                    if (!g) return;
                    const sbRect = sb.getBoundingClientRect();
                    const gTop = g.getBoundingClientRect().top;
                    // sticky 基准是滚动容器 padding 盒顶（比 border 盒低一个 padding-top），
                    // 滚动对齐需补偿；组自身 border-top 只影响标题自然位（钉住位不含它），一并补偿
                    const padTop = parseFloat(getComputedStyle(sb).paddingTop) || 0;
                    const gBorder = parseFloat(getComputedStyle(g).borderTopWidth) || 0;
                    const off = parseFloat(head.style.top) || 0;
                    if (g.classList.contains('nek-folded')) {
                        // 已折叠：展开并前往该组
                        g.classList.remove('nek-folded');
                        cookFoldSet.delete(head.textContent.trim());
                        cookSyncSticky(sb);
                        // 用 setTimeout 而非 rAF：后台标签页 rAF 冻结会导致对齐失效
                        setTimeout(() => {
                            sb.scrollTop += g.getBoundingClientRect().top - sbRect.top - off - padTop + gBorder;
                            cookSyncSticky(sb);
                        }, 0);
                    } else if (gTop < sbRect.top - 1) {
                        // 吸顶中的展开组：快速前往该组起点
                        sb.scrollTo({ top: sb.scrollTop + gTop - sbRect.top - off - padTop + gBorder, behavior: 'smooth' });
                    } else {
                        // 原位：折叠收纳
                        g.classList.add('nek-folded');
                        cookFoldSet.add(head.textContent.trim());
                        cookSyncSticky(sb);
                        setTimeout(() => {
                            if (gTop - sbRect.top < sb.clientHeight / 2) {
                                const next = [...sb.querySelectorAll(':scope > .cooking-accordion-group')]
                                    .find(x => !x.classList.contains('nek-folded') &&
                                        x.getBoundingClientRect().top >= g.getBoundingClientRect().top);
                                if (next) {
                                    const nOff = parseFloat(next.querySelector(COOK_HEAD_SEL)?.style.top) || 0;
                                    const nBorder = parseFloat(getComputedStyle(next).borderTopWidth) || 0;
                                    sb.scrollTop += next.getBoundingClientRect().top - sbRect.top - nOff - padTop + nBorder;
                                }
                            }
                            cookSyncSticky(sb);
                        }, 0);
                    }
                });
            }
            cookSyncSticky(sb);
        }

        // ---------------- 生产页：双栏面板（左单列吸顶列表 + 右详情，复刻烹饪页） ----------------
        const PROD_LIST_SEL = '.actions .accordion-list';

        // 折叠状态按组标题记忆：切标签/重渲染会重建分组元素抹掉类名，同步时按此恢复
        const prodFoldSet = new Set();

        // 详情面板登记到 UI.actionItemMap 的「持有量联动」键；切换选择前需清理，
        // 否则游戏更新背包数量时会写进已销毁的 DOM
        let prodRegKeys = [];
        function prodClearReg() {
            try {
                prodRegKeys.forEach(k => UI.actionItemMap && UI.actionItemMap.delete(k));
                if (UI.proficiencyCache && UI.proficiencyCache.action) UI.proficiencyCache.action = {};
            } catch (e) { /* 忽略 */ }
            prodRegKeys = [];
        }

        // 同步吸顶偏移（生产/采集侧栏共用）：折叠组整体吸顶堆叠（偏移累加实际盒高），
        // 展开组仅标题吸顶，偏移 = 上方折叠组高度之和（推挤效果由 sticky 自然产生）
        function sideSyncSticky(sb, foldSet) {
            const groups = [...sb.querySelectorAll(':scope > .nek-prod-group')];
            let offset = 0;
            groups.forEach(g => {
                const head = g.querySelector('.nek-prod-group-head');
                if (!head) return;
                // 恢复被重渲染抹掉的折叠状态（双向对齐内存记忆）
                if (foldSet.has(g.dataset.nekGroup || '')) g.classList.add('nek-folded');
                else g.classList.remove('nek-folded');
                if (g.classList.contains('nek-folded')) {
                    g.style.top = offset + 'px';   // 折叠组整体吸顶
                    head.style.top = '0px';
                    offset += g.offsetHeight;      // 折叠后盒高 = 标题高
                } else {
                    g.style.top = '';
                    head.style.top = offset + 'px';
                }
            });
        }
        const prodSyncSticky = sb => sideSyncSticky(sb, prodFoldSet);

        // 分组标题点击状态机（生产/采集侧栏共用）：已折叠 → 展开并前往该组；
        // 吸顶中（组顶已滚过容器顶）→ 快速前往该组起点；原位 → 折叠收纳（视图从下一未折叠组开始）
        function bindSideGroupToggle(sb, foldSet) {
            if (sb.dataset.nekSideClick) return;   // 委托监听只绑一次
            sb.dataset.nekSideClick = '1';
            sb.addEventListener('click', e => {
                const head = e.target.closest('.nek-prod-group-head');
                if (!head) return;
                const g = head.closest('.nek-prod-group');
                if (!g) return;
                const sbRect = sb.getBoundingClientRect();
                const gTop = g.getBoundingClientRect().top;
                // sticky 基准是容器 padding 盒顶，滚动对齐需补偿 padding-top 与组 border-top
                const padTop = parseFloat(getComputedStyle(sb).paddingTop) || 0;
                const gBorder = parseFloat(getComputedStyle(g).borderTopWidth) || 0;
                const off = parseFloat(head.style.top) || 0;
                if (g.classList.contains('nek-folded')) {
                    // 已折叠：展开并前往该组
                    g.classList.remove('nek-folded');
                    foldSet.delete(g.dataset.nekGroup || '');
                    sideSyncSticky(sb, foldSet);
                    // 用 setTimeout 而非 rAF：后台标签页 rAF 冻结会导致对齐失效
                    setTimeout(() => {
                        sb.scrollTop += g.getBoundingClientRect().top - sbRect.top - off - padTop + gBorder;
                        sideSyncSticky(sb, foldSet);
                    }, 0);
                } else if (gTop < sbRect.top - 1) {
                    // 吸顶中的展开组：快速前往该组起点
                    sb.scrollTo({ top: sb.scrollTop + gTop - sbRect.top - off - padTop + gBorder, behavior: 'smooth' });
                } else {
                    // 原位：折叠收纳
                    g.classList.add('nek-folded');
                    foldSet.add(g.dataset.nekGroup || '');
                    sideSyncSticky(sb, foldSet);
                    setTimeout(() => {
                        if (gTop - sbRect.top < sb.clientHeight / 2) {
                            const next = [...sb.querySelectorAll(':scope > .nek-prod-group')]
                                .find(x => !x.classList.contains('nek-folded') &&
                                    x.getBoundingClientRect().top >= g.getBoundingClientRect().top);
                            if (next) {
                                const nOff = parseFloat(next.querySelector('.nek-prod-group-head')?.style.top) || 0;
                                const nBorder = parseFloat(getComputedStyle(next).borderTopWidth) || 0;
                                sb.scrollTop += next.getBoundingClientRect().top - sbRect.top - nOff - padTop + nBorder;
                            }
                        }
                        sideSyncSticky(sb, foldSet);
                    }, 0);
                }
            });
        }

        // 侧栏条目内容（生产/采集共用）：图标+名称+制造等级，结构与烹饪 .cooking-recipe-item 一致；
        // 图标取第一个产出的物品图标（游戏全局 getItemIconId），无产出时回退默认图标
        function sideItemInner(action) {
            const reward = action.rewards && action.rewards[0];
            let iconId = 0;
            try { iconId = reward ? getItemIconId(reward.itemId) : 0; } catch (e) { iconId = 0; }
            // 等级文字按越级档位着色（与游戏列表同色系：黄=1~5 级，橙=6~14 级，红=不可执行）
            const olLv = getOverLevelState(action);
            const lvCls = olLv.status === 'yellow' ? ' recommend-yellow'
                : olLv.status === 'orange' ? ' recommend-orange'
                : olLv.status === 'red' ? ' recommend-red' : '';
            return '<div class="nek-prod-item-icon"><div class="itemicon itemicon-' + iconId + '"></div></div>' +
                '<div class="nek-prod-item-info">' +
                '<div class="nek-prod-item-name"></div>' +
                '<div class="nek-prod-item-level' + lvCls + '">Lv.' + action.level + '</div>' +
                '</div>';
        }

        // 渲染右侧详情面板：基本信息 / 消耗 / 获得（含经验行）/ 执行（次数输入 + 三按钮），
        // 结构与类名复刻原生 showActionModal，使其获得与烹饪详情一致的样式，
        // 并让 decorateModal 自动追加经验效率块 / 目标等级计算 / 升级次数快捷按钮
        function renderProdDetail(detailEl, action) {
            prodClearReg();
            const expinfo = game.getLevelInfo(action.action);
            const skillName = game.getActionTypeName(action.type);
            const skillAction = game.getActionGroupName(action.action);
            // 越级修正：耗时按倍率显示，并复刻游戏同款黄/橙提示行（红=不可执行）
            const ol = getOverLevelState(action);
            // 数量格式：与原生 formatQuantityNumber 同款（最多两位小数去尾零）
            const fmtQ = n => {
                const r = Math.round(n * 100) / 100;
                return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '');
            };
            // 研究中心加成（v1112a 原生同口径）：行动所属设施（梳毛1/采集按星球2~5/生产11），
            // 经验、效率、产出、幸运分别生效；阶差转化为独立产物乘区（仅主奖励）
            let researchFacilityId = 0;
            try { researchFacilityId = game.getResearchFacilityIdForAction(action) || 0; } catch (eF) { /* 忽略 */ }
            const resPct = kind => {
                try { return game.getResearchEffectPct(researchFacilityId, kind) || 0; } catch (eP) { return 0; }
            };
            const researchProduct = resPct('product');
            const researchLucky = resPct('lucky');
            let overLevelMultiplier = 1;
            try { overLevelMultiplier = game.getOverLevelProductMultiplier(action) || 1; } catch (eO) { /* 忽略 */ }
            // 收集祝福（活动7 + 月卡5%）：仅作用于梳毛与采集行动，与原生一致
            const collectBonus = ([1, 2].indexOf(+action.action) >= 0 && typeof UI.getRewardBonusEffect === 'function')
                ? (UI.getRewardBonusEffect('collect') || 0) : 0;
            const overNote = (ol.diff > 0 && ol.status !== 'red')
                ? `<div class="action-level-note ${ol.status === 'orange' ? 'recommend-orange' : 'recommend-yellow'}">低于推荐等级 ${ol.diff} 级：耗时增加 ${Math.round((ol.timeRate - 1) * 100)}%${ol.status === 'orange' ? `，成功率 ${ol.successRate}%，失败无产出${+action.action === 6 ? '，不消耗材料' : ''}` : ''}</div>`
                : '';
            detailEl.innerHTML = `
                <div class="cooking-detail-header">
                    <div class="cooking-detail-name nek-prod-title">${skillName} : ${action.name}</div>
                    <div class="action-item-container-list">
                        <div class="action-item-container">
                            <div class="action-item-container-name"><span class="action-icon action-icon-${action.action}"></span>${skillAction}</div>
                            <div class="action-item-container-value"><span class="${ol.status !== 'normal' ? 'action-level-value ' + (ol.status === 'orange' ? 'recommend-orange' : ol.status === 'yellow' ? 'recommend-yellow' : 'recommend-red') : ''}">Lv.${action.level}</span></div>
                        </div>
                        <div class="action-item-container">
                            <div class="action-item-container-name"><span class="action-icon action-icon-time"></span>时间</div>
                            <div class="action-item-container-value"><span>${(action.time / 1000 * ol.timeRate / game.getEfficiency(action.type, researchFacilityId)).toFixed(2)} 秒</span></div>
                        </div>
                    </div>
                    ${overNote}
                </div>
                ${action.flavour ? `<div class="cooking-detail-flavour">${action.flavour}</div>` : ''}
                ${action.requirements ? '<div class="cooking-detail-section"><div class="modal-container-title">消耗</div></div>' : ''}
                <div class="cooking-detail-section"><div class="modal-container-title">获得</div></div>
                ${action.extraRewards ? '<div class="cooking-detail-section"><div class="modal-container-title">额外奖励</div></div>' : ''}
                <div class="cooking-detail-section nek-craft-mult" style="display:none"></div>
                <div class="cooking-detail-footer">
                    <div class="modal-container-title">执行</div>
                    <div class="modal-action-repeat"></div>
                    <div class="modal-action-button"></div>
                </div>
            `;
            const sections = [...detailEl.querySelectorAll('.cooking-detail-section')];
            const sectionByTitle = t => sections.find(s => (s.querySelector('.modal-container-title') || {}).textContent === t);

            // 消耗：材料需求 + 持有量（登记 actionItemMap 供游戏实时联动）
            if (action.requirements && sectionByTitle('消耗')) {
                const list = document.createElement('div');
                list.className = 'action-item-container-list';
                action.requirements.forEach(item => {
                    const itemDef = game.getItem(item.itemId);
                    const quantity = game.getItemQuantity(item.itemId);
                    const req = document.createElement('div');
                    req.className = 'action-item-container';
                    req.innerHTML = `
                        <div class="action-item-container-icon"></div>
                        <div class="action-item-container-info">
                            <div class="action-item-container-text"><span>${itemDef.name}</span></div>
                            <div class="action-item-container-text"><span>需要</span><span class="nek-need-val" data-nek-base="${item.quantity}">${item.quantity}</span></div>
                            <div class="action-item-container-text quantity-display${quantity < item.quantity ? ' disabled' : ''}">
                                <span>持有</span><span class="quantity-value">${Utils.formatNumberWithCommas(quantity)}</span>
                            </div>
                        </div>
                    `;
                    const icon = req.querySelector('.action-item-container-icon');
                    const loot = document.createElement('div');
                    UI.showItem(loot, itemDef, { quantity: item.quantity });
                    icon.appendChild(loot);
                    loot.addEventListener('click', () => UI.showItemMenu(loot, { itemDef: itemDef }));
                    UI.bindItemTooltip(loot, itemDef, { item: { quantity: item.quantity, id: itemDef.id, enhancement: 0 } });
                    list.appendChild(req);
                    const key = `${item.itemId}-0`;
                    UI.actionItemMap.set(key, {
                        element: req,
                        needQuantity: item.quantity,
                        quantityElement: req.querySelector('.quantity-display'),
                        quantityValue: req.querySelector('.quantity-value')
                    });
                    prodRegKeys.push(key);
                });
                sectionByTitle('消耗').appendChild(list);
            }

            // 获得 / 额外奖励：产出区间 + 熟练度门槛 + 几率（熟练度门槛登记 proficiencyCache 供游戏联动）
            // 数量口径 v1112a 原生同款：收集祝福(仅梳毛/采集)+产出研究按百分点加算（noBonus 不吃），
            // 主奖励再乘阶差转化独立乘区；额外奖励几率乘幸运研究（宝箱已提前算入不重复）
            const renderReward = (item, container, isExtra) => {
                const itemDef = game.getItem(item.itemId);
                const productBonus = item.noBonus ? 0 : (researchProduct > 0 ? researchProduct : 0);
                const rewardBonus = item.noBonus ? 0 : (collectBonus + productBonus);
                const bonusPct = rewardBonus > 0 ? (100 + rewardBonus) / 100 : 1;
                const extraMult = isExtra ? 1 : overLevelMultiplier;
                // 基准值（已含研究/祝福/阶差加成）写入 data-nek-min/max：加工倍数切换时按倍数重显示
                const baseMin = Math.round(item.min * bonusPct * extraMult * 100) / 100;
                const baseMax = Math.round(item.max * bonusPct * extraMult * 100) / 100;
                const value = baseMin === baseMax
                    ? `<span class="nek-reward-val" data-nek-min="${baseMin}" data-nek-max="${baseMax}">${fmtQ(baseMax)}</span>`
                    : `<span class="nek-reward-val" data-nek-min="${baseMin}" data-nek-max="${baseMax}">${fmtQ(baseMin)}&nbsp;~&nbsp;${fmtQ(baseMax)}</span>`;
                const curProf = game.proficiency?.action?.[action.id] || 0;
                // 阶差转化标注：主奖励且乘区 >1 时，在数量与几率之间显示（与原生 action-overlevel-rate 一致）
                const overRateHtml = (!isExtra && overLevelMultiplier > 1)
                    ? `<div class="action-item-container-text action-overlevel-rate"><span class="stat-sub">(×${fmtQ(overLevelMultiplier * 100)}%)</span></div>` : '';
                let chance = Number(item.chance) || 0;
                if (isExtra && !item.luckyApplied && researchLucky > 0 && chance > 0 && chance < 100) {
                    chance = Math.min(100, chance * (1 + researchLucky * 0.3));
                }
                const chanceHtml = chance < 100
                    ? `<span class="chance-uncertain">${fmtQ(chance)}% 几率</span>`
                    : '<span class="chance-certain">一定获得</span>';
                const row = document.createElement('div');
                row.className = 'action-item-container';
                row.innerHTML = `
                    <div class="action-item-container-icon"></div>
                    <div class="action-item-container-info">
                        <div class="action-item-container-text"><span>${itemDef.name}</span></div>
                        <div class="action-item-container-text"><span>${value}</span><span>个</span></div>
                        ${overRateHtml}
                        ${item.proficiency ? `<div class="action-item-container-text action-proficiency-requirement${curProf < item.proficiency ? ' disabled' : ''}"><span>熟练度${item.proficiency}</span></div>` : ''}
                        <div class="action-item-container-text">${chanceHtml}</div>
                    </div>
                `;
                if (item.proficiency) {
                    if (!UI.proficiencyCache.action[action.id]) UI.proficiencyCache.action[action.id] = [];
                    UI.proficiencyCache.action[action.id].push({ element: row, requiredProficiency: item.proficiency });
                }
                const icon = row.querySelector('.action-item-container-icon');
                const loot = document.createElement('div');
                UI.showItem(loot, itemDef, { quantity: value });
                UI.bindItemTooltip(loot, itemDef, { item: { type: 'inventoryItem', enhancement: 0 } });
                loot.addEventListener('click', () => UI.showItemMenu(loot, { itemDef: itemDef }));
                icon.appendChild(loot);
                container.appendChild(row);
            };
            const gainList = document.createElement('div');
            gainList.className = 'action-item-container-list';
            action.rewards.forEach(item => renderReward(item, gainList));

            // 经验行：与原生弹窗完全同口径——game.calcExpWithBonus 统一叠加
            // 活动加成 + 月卡 +5% + 舰队研究中心 + 行动所属设施的经验研究（v1112a 第二参）
            let exp;
            if (typeof game.calcExpWithBonus === 'function') {
                exp = game.calcExpWithBonus(action.xp, researchFacilityId);
            } else {
                exp = action.xp;
                if (game.event && game.event[3] && game.event[3].end_time > (Date.now() / 1000)) {
                    exp = parseInt(exp * (100 + game.getEvent(3).effectValue) / 100, 0);
                }
                const researchBonus = game.getSquadronFacilityEffect(6);   // type=6 研究中心
                if (researchBonus > 0) exp = Math.floor(exp * (100 + researchBonus) / 100);
            }
            const xpRow = document.createElement('div');
            xpRow.className = 'action-item-container';
            xpRow.innerHTML = `
                <div class="action-item-icon action-exp-icon action-exp"></div>
                <div class="action-item-container-info">
                    <div class="action-item-container-text"><span>${skillAction}经验值</span></div>
                    <div class="action-item-container-text"><span>${Utils.formatNumber(exp, Utils.getNumberUnit())}</span><span>点</span></div>
                    <div class="action-item-container-text"><span class="chance-certain">一定获得</span></div>
                </div>
            `;
            UI.bindItemTooltip(xpRow.querySelector('.action-item-icon'), {
                name: skillAction + '经验值',
                icon: 'action-item-icon action-exp-icon action-exp',
                quantity: exp,
                flavour: '提升行动等级的经验值。'
            }, { type: 'extra' });
            gainList.appendChild(xpRow);
            sectionByTitle('获得').appendChild(gainList);

            if (action.extraRewards && sectionByTitle('额外奖励')) {
                const extraList = document.createElement('div');
                extraList.className = 'action-item-container-list';
                action.extraRewards.forEach(item => renderReward(item, extraList, true));
                sectionByTitle('额外奖励').appendChild(extraList);
            }

            // 加工倍数（v1108+ 新增）：复刻原生弹窗的「加工倍数」单选。倍数同时放大
            // 材料消耗与产物获得，单次耗时与经验不变（与游戏弹窗口径一致）。
            // 上限与游戏同源：仅生产动作，1+min(批量工序研究等级, 熟练度档位)，封顶 5。
            // radio 与原生弹窗同名（craft-multiplier-{id}），craftMultiplierOf 与联动监听直接兼容
            const multSection = detailEl.querySelector('.nek-craft-mult');
            let craftMult = 1;
            let craftMax = 1;
            if (+action.action === 6) {
                try {
                    craftMax = Math.max(1, Math.min(5,
                        parseInt(UI.getCraftBatchMaxMultiplier(action, UI.getActionLevelState(action, expinfo)), 10) || 1));
                } catch (eM) { craftMax = 1; }
                if (multSection) {
                    multSection.style.display = '';
                    multSection.innerHTML = '<div class="modal-container-title">加工倍数</div><div class="radio-group nek-craft-radios"></div>';
                    const rg = multSection.querySelector('.nek-craft-radios');
                    // 解锁条件（与原生 tooltip 同口径）：推荐等级 / 批量工艺研究等级 / 熟练度门槛
                    let researchLevel = 0;
                    try { researchLevel = UI.getCraftBatchResearchLevel(); } catch (eR) { /* 忽略 */ }
                    const currentProf = (game.proficiency && game.proficiency.action && game.proficiency.action[action.id]) || 0;
                    const levelOk = (expinfo && expinfo.level >= action.level);
                    const profThresholds = [1000, 3000, 6000, 10000];
                    for (let i = 1; i <= 5; i++) {
                        const rid = 'nek-craft-mult-' + action.id + '-' + i;
                        const radio = document.createElement('input');
                        radio.type = 'radio';
                        radio.name = 'craft-multiplier-' + action.id;
                        radio.value = String(i);
                        radio.checked = i === 1;
                        radio.disabled = i > craftMax;
                        radio.id = rid;
                        radio.addEventListener('change', () => {
                            if (!radio.checked) return;
                            craftMult = i;
                            updateCraftMultDisplay();
                            scheduleDecorate();   // 同步「背包可执行次数」按钮（document 级监听兜底）
                        });
                        const label = document.createElement('label');
                        label.htmlFor = rid;
                        label.textContent = i + ' 倍';
                        rg.appendChild(radio);
                        rg.appendChild(label);
                        if (i > craftMax) {
                            // 未解锁档位置灰（同原生 #777）并悬停显示解锁条件
                            label.style.color = '#777';
                            const reqResearch = i - 1;
                            const reqProf = profThresholds[i - 2] != null ? profThresholds[i - 2] : 10000;
                            const researchOk = researchLevel >= reqResearch;
                            const profOk = currentProf >= reqProf;
                            const tipLines = [];
                            if (!levelOk) tipLines.push(`<div style="color:#ff4d4f">推荐等级:${expinfo ? expinfo.level : '?'}/${action.level}</div>`);
                            tipLines.push(`<div${researchOk ? '' : ' style="color:#ff4d4f"'}>批量工艺:${researchLevel}/${reqResearch}</div>`);
                            tipLines.push(`<div${profOk ? '' : ' style="color:#ff4d4f"'}>熟练度:${currentProf}/${reqProf}</div>`);
                            try {
                                UI.bindTooltip(label, { name: '解锁条件', text: tipLines.join(''), size: 'mini', pos: 'top' });
                            } catch (eT) { /* 忽略 */ }
                        }
                    }
                }
            }
            // 倍数切换：材料「需要」×m（持有不足联动置灰）、产物区间 ×m、
            // actionItemMap 的 needQuantity 同步（游戏实时刷新持有量时按新需求判断）
            function updateCraftMultDisplay() {
                detailEl.querySelectorAll('.nek-need-val').forEach(sp => {
                    const base = parseInt(sp.dataset.nekBase, 10) || 1;
                    sp.textContent = String(base * craftMult);
                    const row = sp.closest('.action-item-container');
                    const qd = row ? row.querySelector('.quantity-display') : null;
                    if (qd) {
                        const qv = parseInt((qd.querySelector('.quantity-value') || {}).textContent, 10);
                        if (isFinite(qv)) qd.classList.toggle('disabled', qv < base * craftMult);
                    }
                });
                detailEl.querySelectorAll('.nek-reward-val').forEach(sp => {
                    // 基准值可能含小数（研究/祝福/阶差加成后），parseFloat + 两位小数去尾零显示
                    const mn = parseFloat(sp.dataset.nekMin) || 0;
                    const mx = parseFloat(sp.dataset.nekMax) || 0;
                    sp.innerHTML = mn === mx
                        ? fmtQ(mx * craftMult)
                        : fmtQ(mn * craftMult) + '&nbsp;~&nbsp;' + fmtQ(mx * craftMult);
                });
                (prodRegKeys || []).forEach(key => {
                    const map = UI.actionItemMap.get(key);
                    if (map && map.element && map.element.querySelector('.nek-need-val')) {
                        const sp = map.element.querySelector('.nek-need-val');
                        map.needQuantity = (parseInt(sp.dataset.nekBase, 10) || 1) * craftMult;
                    }
                });
            }

            // 执行：次数输入 + 快捷档位 + 立即开始/插入队列首/加入队列尾（逻辑同原生弹窗）
            const repeatEl = detailEl.querySelector('.modal-action-repeat');
            const actionBtnEl = detailEl.querySelector('.modal-action-button');
            const input = document.createElement('input');
            input.className = 'repeat-input';
            input.type = 'text';
            input.value = '∞';
            input.addEventListener('focus', () => input.select());
            repeatEl.appendChild(input);
            [1, 10, 100, '∞'].forEach(function (btn) {
                const b = document.createElement('div');
                b.className = 'btn quick-set';
                b.textContent = btn;
                repeatEl.appendChild(b);
                b.addEventListener('click', () => { input.value = btn; });
            });
            const startBtn = document.createElement('div');
            startBtn.className = 'btn start-action';
            startBtn.innerHTML = '<span>立即开始</span><span class="tip">(保留队列)</span>';
            actionBtnEl.appendChild(startBtn);
            UI.registerActionButton(startBtn);
            startBtn.addEventListener('click', () => {
                if (UI.isActionButtonLocked()) return;
                // 越级改版：差 1~14 级官方允许越级执行（黄/橙提示已在详情头部展示），仅差 ≥15 级（红档）拦截
                if (ol.status === 'red') {
                    UI.notifier.show(`等级差距过大，无法执行，需要 Lv.${action.level}，当前 Lv.${expinfo.level}`, 'error');
                    return;
                }
                if (action.requirements) {
                    for (const req of action.requirements) {
                        if (game.getItemQuantity(req.itemId) < req.quantity * craftMult) {
                            const itemDef = game.getItem(req.itemId);
                            UI.notifier.show(`${itemDef.name} 不足，无法开始该行动`, 'error');
                            return;
                        }
                    }
                }
                startProdAction('start');
            });
            const queueWrap = document.createElement('div');
            queueWrap.className = 'modal-queue-button';
            actionBtnEl.appendChild(queueWrap);
            const beforeBtn = document.createElement('div');
            beforeBtn.className = 'btn queue-action';
            beforeBtn.textContent = '插入队列首';
            queueWrap.appendChild(beforeBtn);
            UI.registerActionButton(beforeBtn);
            beforeBtn.addEventListener('click', () => startProdAction('before'));
            const afterBtn = document.createElement('div');
            afterBtn.className = 'btn queue-action';
            afterBtn.textContent = '加入队列尾';
            queueWrap.appendChild(afterBtn);
            UI.registerActionButton(afterBtn);
            afterBtn.addEventListener('click', () => startProdAction('after'));
            function startProdAction(mold) {
                if (UI.isActionButtonLocked()) return;
                const count = input.value === '∞' ? -1 : parseInt(input.value) || 1;
                UI.lockActionButtons();
                // 生产动作把加工倍数随 item 传出（game.startAction 会提升为顶层 multiplier 字段）；
                // 非生产动作 craftMult 恒为 1，行为与旧版一致
                game.startAction('action', action.id, count, { multiplier: craftMult }, mold);
            }
        }

        // 构建左侧单列吸顶列表：镜像原生手风琴列表的分组结构与动作卡片（仅取名称），
        // 原生列表此时已被 CSS 隐藏，仅作数据源；点击条目在右侧渲染详情
        function buildProdSidebar(panel, nativeList) {
            const sb = panel.querySelector('.nek-prod-sidebar');
            const detail = panel.querySelector('.nek-prod-detail');
            sb.innerHTML = '';
            detail.innerHTML = '<div class="cooking-detail-empty">选择一个生产项</div>';
            prodClearReg();
            bindSideGroupToggle(sb, prodFoldSet);
            const expinfo = game.getLevelInfo(6);   // 生产技能等级，用于标记等级不足项
            let firstItem = null;
            let firstUsable = null;
            [...nativeList.querySelectorAll(':scope > .accordion-group')].forEach(g => {
                const headName = ((g.querySelector('.accordion-header') || {}).textContent || '').trim();
                const cards = [...g.querySelectorAll(':scope .select-action-card')];
                const group = document.createElement('div');
                group.className = 'nek-prod-group';
                group.dataset.nekGroup = headName;
                const head = document.createElement('div');
                head.className = 'nek-prod-group-head';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = headName;
                const countSpan = document.createElement('span');
                countSpan.className = 'nek-prod-group-count';
                countSpan.textContent = cards.length;
                head.appendChild(nameSpan);
                head.appendChild(countSpan);
                group.appendChild(head);
                const items = document.createElement('div');
                items.className = 'nek-prod-group-items';
                cards.forEach(card => {
                    const name = ((card.querySelector('.action-card-name') || {}).textContent || '').trim();
                    const lvText = (card.querySelector('.action-card-level') || {}).textContent || '';
                    const level = parseInt(lvText, 10);
                    const action = findActionByName(name, isNaN(level) ? null : level);
                    if (!action) return;   // 数据定位失败时跳过（不应发生）
                    const item = document.createElement('div');
                    item.className = 'nek-prod-item';
                    item.dataset.nekActionId = action.id;   // 效率 Top2 标识按 id 关联动作
                    item.innerHTML = sideItemInner(action);
                    item.querySelector('.nek-prod-item-name').textContent = name;
                    // 越级改版：梳毛/采集/生产差 1~14 级可越级执行（黄/橙），仅差 ≥15 级不可执行才视为锁定
                    const overOk = [1, 2, 6].indexOf(+action.action) >= 0;
                    const locked = expinfo && (overOk
                        ? action.level - expinfo.level >= 15
                        : expinfo.level < action.level);
                    if (locked) item.classList.add('level-locked');
                    item.addEventListener('click', () => {
                        sb.querySelectorAll('.nek-prod-item.active').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                        panel.classList.remove('bipanel-open');   // 手机端点选后收起侧栏
                        renderProdDetail(detail, action);
                    });
                    if (!firstItem) firstItem = item;
                    if (!firstUsable && !locked) firstUsable = item;
                    items.appendChild(item);
                });
                group.appendChild(items);
                sb.appendChild(group);
            });
            prodSyncSticky(sb);
            // 自动选中第一个可用项（全部锁定时退回第一项），与烹饪页行为一致
            const target = firstUsable || firstItem;
            if (target) target.click();
        }

        // 生产页双栏面板入口：原生列表存在（生产页已渲染）时创建/更新面板；
        // 以「组名:项数」签名检测切标签/重渲染，未变化时仅刷新吸顶偏移
        function ensureProdPanel() {
            const nativeList = document.querySelector(PROD_LIST_SEL);
            const body = document.querySelector('.actions .page-body');
            if (!isEnabled() || !isProdEnabled() || !nativeList || !body) {
                document.querySelectorAll('.nek-prod-page').forEach(p => p.remove());
                prodClearReg();
                return;
            }
            let panel = body.querySelector(':scope > .nek-prod-page');
            if (!panel) {
                panel = document.createElement('div');
                panel.className = 'nek-prod-page nek-bipanel-side bipanel';
                panel.innerHTML = `
                    <div class="nek-prod-titlebar neon-title bipanel-title-bar">
                        <div class="bipanel-sidebar-toggle">☰</div>
                        <span>生产</span>
                    </div>
                    <div class="bipanel-body">
                        <div class="bipanel-sidebar nek-prod-sidebar"></div>
                        <div class="bipanel-main">
                            <div class="cooking-detail nek-prod-detail">
                                <div class="cooking-detail-empty">选择一个生产项</div>
                            </div>
                        </div>
                    </div>
                `;
                body.appendChild(panel);
                // ☰ 移动端侧栏开关 + 点击侧栏外部收起（与烹饪页一致）
                panel.querySelector('.bipanel-sidebar-toggle').addEventListener('click', function (e) {
                    e.stopPropagation();
                    panel.classList.toggle('bipanel-open');
                });
                panel.addEventListener('click', function (e) {
                    if (panel.classList.contains('bipanel-open') &&
                        !e.target.closest('.bipanel-sidebar') &&
                        !e.target.closest('.bipanel-sidebar-toggle')) {
                        panel.classList.remove('bipanel-open');
                    }
                });
            }
            const sig = [...nativeList.querySelectorAll(':scope > .accordion-group')].map(g =>
                ((g.querySelector('.accordion-header') || {}).textContent || '').trim() + ':' +
                g.querySelectorAll('.select-action-card').length).join('|');
            if (panel.dataset.nekSig === sig) {
                prodSyncSticky(panel.querySelector('.nek-prod-sidebar'));
                return;
            }
            panel.dataset.nekSig = sig;
            buildProdSidebar(panel, nativeList);
        }

        // ---------------- 采集页：烹饪式双栏面板（与生产页共用侧栏样式与详情渲染） ----------------
        // 原生采集页 pickPage 本身是星球双栏，但右侧仍是手风琴卡片+弹窗；
        // 改造为：左栏星球作吸顶分组（仅条目名），右栏直接渲染详情与执行。
        // 采集动作数据直接取 game.getActionsByType(2)，无需镜像原生 DOM
        const pickFoldSet = new Set();   // 折叠状态按星球名记忆（跨重建恢复）
        const pickSyncSticky = sb => sideSyncSticky(sb, pickFoldSet);

        // 构建采集侧栏：星球为吸顶分组，组内条目按子分组/等级排序，仅展示名称；
        // 右侧详情复用 renderProdDetail（完全由 action 数据驱动，标题自动变为「采集 : xxx」，
        // 且 decorateModal 会自动追加经验效率/目标等级/升级次数按钮）
        function buildPickSidebar(panel) {
            const sb = panel.querySelector('.nek-prod-sidebar');
            const detail = panel.querySelector('.nek-prod-detail');
            sb.innerHTML = '';
            detail.innerHTML = '<div class="cooking-detail-empty">选择一个采集项</div>';
            prodClearReg();
            bindSideGroupToggle(sb, pickFoldSet);
            let actions = [];
            try { actions = Object.values(game.getActionsByType(2) || {}); } catch (e) { actions = []; }
            const expinfo = game.getLevelInfo(2);   // 采集技能等级，用于标记等级不足项
            let firstItem = null;
            let firstUsable = null;
            // 星球升序分组（与原生 pickPage 一致）
            const planets = [...new Set(actions.map(a => a.planet))].sort((a, b) => a - b);
            planets.forEach(pid => {
                const planetData = (typeof Data !== 'undefined' && Data.planet && Data.planet[pid]) || {};
                const planetName = planetData.name || ('星球 ' + pid);
                const group = document.createElement('div');
                group.className = 'nek-prod-group';
                group.dataset.nekGroup = planetName;
                const head = document.createElement('div');
                head.className = 'nek-prod-group-head';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = planetName;
                const countSpan = document.createElement('span');
                countSpan.className = 'nek-prod-group-count';
                head.appendChild(nameSpan);
                head.appendChild(countSpan);
                group.appendChild(head);
                const items = document.createElement('div');
                items.className = 'nek-prod-group-items';
                // 组内按子分组/等级排序，接近原生 showActionsUi 顺序
                const pActions = actions.filter(a => a.planet === pid)
                    .sort((a, b) => (a.group - b.group) || (a.level - b.level));
                countSpan.textContent = pActions.length;
                pActions.forEach(action => {
                    const item = document.createElement('div');
                    item.className = 'nek-prod-item';
                    item.dataset.nekActionId = action.id;   // 效率 Top2 标识按 id 关联动作
                    item.innerHTML = sideItemInner(action);
                    item.querySelector('.nek-prod-item-name').textContent = action.name;
                    // 越级改版：梳毛/采集/生产差 1~14 级可越级执行（黄/橙），仅差 ≥15 级不可执行才视为锁定
                    const overOk = [1, 2, 6].indexOf(+action.action) >= 0;
                    const locked = expinfo && (overOk
                        ? action.level - expinfo.level >= 15
                        : expinfo.level < action.level);
                    if (locked) item.classList.add('level-locked');
                    item.addEventListener('click', () => {
                        sb.querySelectorAll('.nek-prod-item.active').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                        panel.classList.remove('bipanel-open');   // 手机端点选后收起侧栏
                        renderProdDetail(detail, action);
                    });
                    if (!firstItem) firstItem = item;
                    if (!firstUsable && !locked) firstUsable = item;
                    items.appendChild(item);
                });
                group.appendChild(items);
                sb.appendChild(group);
            });
            pickSyncSticky(sb);
            // 自动选中第一个可用项（全部锁定时退回第一项），与生产/烹饪页行为一致
            const target = firstUsable || firstItem;
            if (target) target.click();
        }

        // 采集页双栏面板入口：原生 pickPage 存在（采集页已渲染）时创建/更新面板；
        // 以「星球ID:项数」签名检测重渲染，未变化时仅刷新吸顶偏移
        function ensurePickPanel() {
            const nativePick = document.querySelector('.actions .pick-page');
            const body = document.querySelector('.actions .page-body');
            if (!isEnabled() || !isPickEnabled() || !nativePick || !body) {
                document.querySelectorAll('.nek-pick-page').forEach(p => p.remove());
                prodClearReg();
                return;
            }
            let panel = body.querySelector(':scope > .nek-pick-page');
            if (!panel) {
                panel = document.createElement('div');
                panel.className = 'nek-pick-page nek-bipanel-side bipanel';
                panel.innerHTML = `
                    <div class="nek-pick-titlebar neon-title bipanel-title-bar">
                        <div class="bipanel-sidebar-toggle">☰</div>
                        <span>采集</span>
                    </div>
                    <div class="bipanel-body">
                        <div class="bipanel-sidebar nek-prod-sidebar"></div>
                        <div class="bipanel-main">
                            <div class="cooking-detail nek-prod-detail">
                                <div class="cooking-detail-empty">选择一个采集项</div>
                            </div>
                        </div>
                    </div>
                `;
                body.appendChild(panel);
                // ☰ 移动端侧栏开关 + 点击侧栏外部收起（与烹饪/生产页一致）
                panel.querySelector('.bipanel-sidebar-toggle').addEventListener('click', function (e) {
                    e.stopPropagation();
                    panel.classList.toggle('bipanel-open');
                });
                panel.addEventListener('click', function (e) {
                    if (panel.classList.contains('bipanel-open') &&
                        !e.target.closest('.bipanel-sidebar') &&
                        !e.target.closest('.bipanel-sidebar-toggle')) {
                        panel.classList.remove('bipanel-open');
                    }
                });
            }
            let actions = [];
            try { actions = Object.values(game.getActionsByType(2) || {}); } catch (e) { actions = []; }
            const sig = [...new Set(actions.map(a => a.planet))].sort((a, b) => a - b)
                .map(pid => pid + ':' + actions.filter(a => a.planet === pid).length).join('|');
            if (panel.dataset.nekSig === sig) {
                pickSyncSticky(panel.querySelector('.nek-prod-sidebar'));
                return;
            }
            panel.dataset.nekSig = sig;
            buildPickSidebar(panel);
        }

        function typeByName(name) {
            try {
                // 注意：Data 与 game 一样是页面顶层 const，不在 window 上，必须用 typeof 探测
                if (typeof Data !== 'undefined' && Data.type) {
                    for (const k of Object.keys(Data.type)) {
                        if (Data.type[k] && Data.type[k].name === name) return +k;
                    }
                }
            } catch (e) { /* fallthrough */ }
            return SKILL_FALLBACK[name] || null;
        }

        function levelInfo(type) {
            try { return game.getLevelInfo(type); } catch (e) { return null; }
        }

        // ---------------- 左侧熟练度悬浮提示 ----------------
        const tip = document.createElement('div');
        tip.id = 'nek-tip';
        document.body.appendChild(tip);

        let tipType = null;          // 当前提示对应的技能类型
        let tipPos = { x: 0, y: 0 }; // 最近一次鼠标位置

        function renderTip() {
            if (tipType === null) return;
            if (!isEnabled()) { hideTip(); return; }
            const info = levelInfo(tipType);
            const def = (typeof Data !== 'undefined' && Data.type) ? Data.type[tipType] : null;
            if (!info || !def) { hideTip(); return; }

            const pct = info.nextLevelRequiredExp > 0
                ? (info.currentExp / info.nextLevelRequiredExp * 100).toFixed(2) + '%'
                : '100%';

            let html = '<div class="nek-tip-title">' + def.name + ' Lv.' + info.level + '</div>';
            html += '<div>当前经验：<span class="nek-tip-hl">' + fmt(info.currentExp) +
                '</span> / ' + fmt(info.nextLevelRequiredExp) + '（' + pct + '）</div>';
            html += '<div>总经验：<span class="nek-tip-hl">' + fmt(info.xp) + '</span></div>';
            if (info.nextLevelRemainExp > 0) {
                html += '<div>距升级还需：<span class="nek-tip-hl">' + fmt(info.nextLevelRemainExp) +
                    '</span> 点</div>';
            } else {
                html += '<div class="nek-tip-dim">已达满级</div>';
            }
            html += '<div class="nek-tip-dim">银河猫娘放置小助手</div>';
            tip.innerHTML = html;
        }

        function positionTip() {
            const pad = 16;
            let x = tipPos.x + pad, y = tipPos.y + pad;
            const r = tip.getBoundingClientRect();
            if (x + r.width > window.innerWidth - 8) x = tipPos.x - r.width - pad;
            if (y + r.height > window.innerHeight - 8) y = tipPos.y - r.height - pad;
            tip.style.left = Math.max(4, x) + 'px';
            tip.style.top = Math.max(4, y) + 'px';
        }

        function hideTip() {
            tipType = null;
            tip.style.display = 'none';
            document.body.classList.remove('nek-tip-active');
        }

        function matchSkillItem(el) {
            const item = el && el.closest ? el.closest('.sidebar-menu .sidebar-item') : null;
            if (!item) return null;
            const m = item.className.match(/action-(\d+)/);
            if (!m) return null;
            const type = +m[1];
            return (typeof Data !== 'undefined' && Data.type && Data.type[type]) ? type : null;
        }

        document.addEventListener('mouseover', function (e) {
            const type = matchSkillItem(e.target);
            if (type !== null && isEnabled()) {
                tipType = type;
                tipPos = { x: e.clientX, y: e.clientY };
                renderTip();
                tip.style.display = 'block';
                document.body.classList.add('nek-tip-active');  // 压制原网页 .tip-tool 提示
                positionTip();
            } else if (tipType !== null) {
                hideTip();
            }
        }, true);

        document.addEventListener('mousemove', function (e) {
            if (tipType === null) return;
            if (matchSkillItem(e.target) === null || !isEnabled()) {
                hideTip();
                return;
            }
            tipPos = { x: e.clientX, y: e.clientY };
            positionTip();
        }, true);

        // 经验在实时增长，提示可见期间每秒刷新一次数值
        setInterval(function () { if (tipType !== null) renderTip(); }, 1000);

        // ---------------- 行动弹窗「升级次数」按钮 ----------------
        let decorateScheduled = false;

        // 生产加工倍数（v1108+ 新增）：读取行动弹窗内「加工倍数」单选的当前值（1~5，缺省 1）。
        // 倍数同时放大材料消耗与产物获得，单次耗时不变；未解锁的倍数刻度由游戏置灰。
        // 上限规则（游戏 getCraftBatchMaxMultiplier）：仅生产类动作，1+min(工艺研究所倍数研究等级, 熟练度档位)，封顶 5
        function craftMultiplierOf(actionId) {
            try {
                const r = document.querySelector('input[name="craft-multiplier-' + actionId + '"]:checked');
                return r ? Math.max(1, parseInt(r.value, 10) || 1) : 1;
            } catch (e) { return 1; }
        }

        // 加工倍数单选切换时同步「背包可执行次数」按钮与悬停说明
        document.addEventListener('change', function (e) {
            const t = e.target;
            if (t && t.type === 'radio' && t.name && t.name.indexOf('craft-multiplier-') === 0) {
                scheduleDecorate();
            }
        }, true);

        function decorateModal() {
            decorateScheduled = false;

            // 总开关或「推算升级次数」任一关闭：移除已插入的按钮，不再新增
            if (!isEnabled() || !isCalcEnabled()) {
                document.querySelectorAll('.nek-lvl-btn').forEach(b => b.remove());
                return;
            }

                const reps = document.querySelectorAll('.modal-action-repeat');
                reps.forEach(function (rep) {
                    const input = rep.querySelector('input.repeat-input');
                    const sets = Array.prototype.slice.call(rep.querySelectorAll('.btn.quick-set'));
                    // 锚点用 ∞ 档（小助手面板行已去掉 1000）；原生行存在 1000 档则隐藏
                    const bInf = sets.find(b => b.textContent.trim() === '∞');
                    if (!input || !bInf) return;
                    const b1000 = sets.find(b => b.textContent.trim() === '1000');
                    if (b1000) b1000.style.display = 'none';

                // 定位「xx经验值 N 点」文本：弹窗场景在其 .modal-box 容器内；
                // 烹饪页是内联面板（bipanel）没有 .modal-box，且 document.textContent
                // 为 null（旧版回退到 document 导致按钮失效）。
                // 统一改为沿祖先链向上找第一个包含该文本的节点，两种场景通用且更精确
                let node = rep;
                let xm = null;
                while (node && node !== document.documentElement) {
                    xm = (node.textContent || '').match(/([\u4e00-\u9fa5]{1,4})经验值\s*([\d,，]+)\s*点/);
                    if (xm) break;
                    node = node.parentElement;
                }
                if (!xm) return;
                const per = parseInt(xm[2].replace(/[,，]/g, ''), 10);
                const type = typeByName(xm[1]);
                if (!per || per <= 0 || !type) return;

                // 单次耗时（秒）：容器文本「时间 X 秒」（游戏/面板均已按越级倍率折算的实际耗时）
                const tm = (node.textContent || '').match(/时间\s*([\d.]+)\s*秒/);
                const perSec = tm ? parseFloat(tm[1]) : null;

                // 缓存联动：识别当前动作 → 验算回写缓存；文本缺时间时用缓存兜底
                const action = identifyAction(node);

                // 越级信息：动作类（梳毛/采集/生产）经 identifyAction 取等级差；
                // 烹饪按当前激活食谱的等级差计算期望经验折减（成功全额、失败 10%，黄段不折减）
                let olDiff = 0, olStatus = 'normal', olTimeRate = 1, xpFactor = 1;
                if (action) {
                    const st = getOverLevelState(action);
                    olDiff = st.diff;
                    olStatus = st.status;
                    olTimeRate = st.timeRate;
                }
                if (type === 7) {
                    try {
                        const r = (document.querySelector('.cooking-page') || {})._activeRecipe;
                        const info7 = levelInfo(7);
                        const diff = r && info7 ? Math.max(0, (+r.level || 1) - info7.level) : 0;
                        olDiff = diff;
                        olStatus = diff >= 15 ? 'red' : diff >= 6 ? 'orange' : diff >= 1 ? 'yellow' : 'normal';
                        olTimeRate = diff > 0 ? 1 + 0.1 * Math.min(diff, 14) : 1;
                        if (diff > 5 && diff < 15) xpFactor = 0.1 + 0.9 * (15 - diff) / 10;
                    } catch (e0) { /* 忽略 */ }
                }
                const perEff = per * xpFactor;
                let cachedPerMin = null;
                if (action && effCache.has(action.id)) {
                    const c = effCache.get(action.id);
                    if (Date.now() - c.at < EFF_TTL) cachedPerMin = c.perMin;
                    else effCache.delete(action.id);
                }
                let effPerMin = null;
                let baseEffMin = null;   // 原效率：满额经验 / 不含越级耗时的正常耗时
                if (perSec > 0) {
                    const normalSec = olTimeRate > 1 ? perSec / olTimeRate : perSec;
                    baseEffMin = Math.round(per / normalSec * 60);
                    effPerMin = Math.round(perEff / perSec * 60);   // 验算（实时文本最准，含越级期望经验）
                    if (action) effCache.set(action.id, { perMin: effPerMin, at: Date.now() });
                } else {
                    effPerMin = cachedPerMin;   // 无时间文本：使用 3 分钟内预计算缓存
                }

                const info = levelInfo(type);
                if (!info) return;
                if (!(info.nextLevelRemainExp > 0)) {
                    // 满级：清掉残留的按钮与计算块（烹饪页内联面板复用 DOM）
                    const staleBtn = rep.querySelector('.nek-lvl-btn');
                    if (staleBtn) staleBtn.remove();
                    const staleInv0 = rep.querySelector('.nek-inv-btn');
                    if (staleInv0) staleInv0.remove();
                    const prevEff = rep.previousElementSibling;
                    if (prevEff && prevEff.classList.contains('nek-eff-block')) prevEff.remove();
                    return;
                }

                const times = Math.ceil(info.nextLevelRemainExp / perEff);
                const timeStr = perSec ? fmtDuration(times * perSec) : null;
                // 越级执行时在时长后注明惩罚（耗时倍率与成功率折减已计入计算）
                const overTag = (olStatus === 'yellow' || olStatus === 'orange') ? '（含越级惩罚）' : '';
                const title = timeStr
                    ? '【小助手】执行 ' + times + ' 次预计需要 ' + timeStr + overTag + '，点击填入执行次数。'
                    : '【小助手】' + xm[1] + '距升级还需 ' + fmt(info.nextLevelRemainExp) +
                      ' 点经验，共需 ' + times + ' 次' + overTag + '。点击填入执行次数。';

                const existing = rep.querySelector('.nek-lvl-btn');
                if (existing) {
                    // 烹饪页内联面板复用同一 DOM：切换食谱后单次经验/所需次数可能变化，需同步。
                    // 点击时动态读 dataset，避免闭包捕获旧值
                    if (existing.dataset.nekTimes !== String(times)) {
                        existing.textContent = String(times);
                        existing.title = title;
                        existing.dataset.nekTimes = String(times);
                    }
                } else {
                    const btn = document.createElement('div');
                    btn.className = 'btn quick-set nek-lvl-btn';
                    btn.textContent = String(times);
                    btn.title = title;
                    btn.dataset.nekTimes = String(times);
                    btn.addEventListener('click', function () {
                        input.value = btn.dataset.nekTimes;   // 与原生 quick-set 行为一致：直接赋值
                    });
                    bInf.before(btn);   // 紧跟在档位区末尾（∞ 之前）
                }

                // 「背包可执行次数」按钮：升下一级次数按钮后方——按材料需求逐项
                // floor(持有/需要) 取最小值；烹饪用当前激活食谱的材料（伪动作不带 requirements）
                let invTimes = null;
                let invSrc = null;
                if (action && action.requirements && action.requirements.length) {
                    invSrc = action.requirements;
                } else if (type === 7) {
                    try {
                        const r = (document.querySelector('.cooking-page') || {})._activeRecipe;
                        if (r && r.ingredients && r.ingredients.length) invSrc = r.ingredients;
                    } catch (e4) { /* 忽略 */ }
                }
                if (invSrc) {
                    invTimes = Infinity;
                    invSrc.forEach(function (req) {
                        const have = game.getItemQuantity(req.itemId) || 0;
                        invTimes = Math.min(invTimes, Math.floor(have / (req.quantity || 1)));
                    });
                }
                // 生产加工倍数：每次执行消耗 N 份材料（产出同乘 N，单次耗时不变），
                // 可执行次数按倍数折算（与游戏队列显示 floor(可执行/倍数) 同口径）
                let craftMult = 1;
                if (action && +action.action === 6) craftMult = craftMultiplierOf(action.id);
                if (craftMult > 1 && invTimes != null && isFinite(invTimes)) {
                    invTimes = Math.floor(invTimes / craftMult);
                }
                if (invTimes != null && isFinite(invTimes)) {
                    const lvlBtnEl = rep.querySelector('.nek-lvl-btn');
                    if (lvlBtnEl) {
                        // 悬停提示：具体可执行次数 + 预计需要时间（invTimes × 单次耗时，越级惩罚已计入 perSec）
                        const invTimeStr = perSec ? fmtDuration(invTimes * perSec) : null;
                        const invTitle = '【小助手】当前背包材料最多可执行 ' + fmt(invTimes) + ' 次' +
                            (invTimeStr ? '，预计需要 ' + invTimeStr : '') +
                            (craftMult > 1 ? '（加工倍数 x' + craftMult + '：每次消耗 ' + craftMult + ' 份材料、获得 ' + craftMult + ' 份产物，单次耗时不变）' : '') +
                            (action && +action.action === 6 && olDiff > 0
                                ? '（越级失败不消耗材料，实际可执行次数可能更多）' : '') +
                            '，点击填入执行次数。';
                        const invKey = invTimes + ':' + (invTimeStr || '');
                        let invBtn = rep.querySelector('.nek-inv-btn');
                        if (!invBtn) {
                            invBtn = document.createElement('div');
                            invBtn.className = 'btn quick-set nek-inv-btn';
                            invBtn.addEventListener('click', function () {
                                input.value = invBtn.dataset.nekTimes;   // 直接填入可执行次数
                            });
                            lvlBtnEl.after(invBtn);   // 升级次数按钮后方（∞ 之前）
                        }
                        // 比较「次数+时间」复合键：材料或单次耗时变化都同步
                        if (invBtn.dataset.nekKey !== invKey) {
                            invBtn.textContent = String(invTimes);
                            invBtn.title = invTitle;
                            invBtn.dataset.nekTimes = String(invTimes);
                            invBtn.dataset.nekKey = invKey;
                        }
                    }
                } else {
                    // 无材料需求或材料已列清：清掉残留的背包次数按钮
                    const staleInv = rep.querySelector('.nek-inv-btn');
                    if (staleInv) staleInv.remove();
                }

                // 「执行」区上方插入：经验效率 + 目标等级计算（面板重建后由本函数重新插入）
                const effKey = perEff + ':' + (perSec || '') + ':' + (effPerMin != null ? effPerMin : '');
                // 越级时期望折减显示「原效率 × 获取期望比例 = 预期效率」，并按越级档位着色
                // （黄=1~5 级，橙=6~14 级）；比例综合经验折减（烹饪失败 10%）与耗时倍率
                const effColorCls = olStatus === 'orange' ? 'recommend-orange' : olStatus === 'yellow' ? 'recommend-yellow' : '';
                const overActive = olStatus === 'yellow' || olStatus === 'orange';
                let effDisp;
                if (effPerMin == null) {
                    effDisp = '耗时未知';
                } else if (overActive && baseEffMin != null && baseEffMin > 0) {
                    const ratio = effPerMin / baseEffMin;
                    effDisp = '约 ' + fmt(baseEffMin) + ' × ' + Math.round(ratio * 100) + '% = ' + fmt(effPerMin) + ' 点/分钟';
                } else {
                    effDisp = '约 ' + fmt(effPerMin) + ' 点/分钟';
                }
                let eff = rep.previousElementSibling;
                if (!eff || !eff.classList.contains('nek-eff-block')) {
                    eff = document.createElement('div');
                    eff.className = 'nek-eff-block';
                    // 效率值在创建时就写入真实值（旧版留「—」占位但同步分支永不触发，导致恒显示横杠）
                    eff.innerHTML =
                        '<div class="nek-eff-row">经验效率：<span class="nek-eff-val' + (effColorCls ? ' ' + effColorCls : '') + '">' + effDisp + '</span></div>' +
                        '<div class="nek-eff-row nek-target-row">' +
                            '<input class="nek-target-input nek-target-from" type="number" min="1" placeholder="现有等级">' +
                            '<span class="nek-target-dash">—</span>' +
                            '<input class="nek-target-input" type="number" min="1" placeholder="目标等级">' +
                            '<div class="btn quick-set nek-target-btn">计算</div>' +
                        '</div>' +
                        '<div class="nek-target-result"></div>';
                    const effVal = eff.querySelector('.nek-eff-val');
                    effVal.dataset.nekKey = effKey;
                    const tFrom = eff.querySelector('.nek-target-from');
                    const tInput = eff.querySelector('.nek-target-input:not(.nek-target-from)');
                    const tBtn = eff.querySelector('.nek-target-btn');
                    const tRes = eff.querySelector('.nek-target-result');
                    tBtn.addEventListener('click', function () {
                        const L2 = parseInt(tInput.value, 10);
                        if (!L2 || L2 < 1) { tRes.textContent = '请输入目标等级'; return; }
                        try {
                            const cur = levelInfo(type);
                            if (!cur) { tRes.textContent = '数据获取失败'; return; }
                            if (typeof Data === 'undefined' || !Array.isArray(Data.expTable)) {
                                tRes.textContent = '经验表不可用'; return;
                            }
                            const maxLv = (typeof game !== 'undefined' && game.character &&
                                game.character.max_level) || Data.expTable.length;
                            const target = Math.min(L2, maxLv);
                            // 起始点：第一个选框填了 → 该等级的 0% 经验（刚升到该级）；
                            // 留空（默认）→ 现有等级的现有经验（原有行为）
                            const fromVal = parseInt(tFrom.value, 10);
                            let startXp;
                            let fromTxt;
                            if (fromVal >= 1) {
                                const L1 = Math.min(fromVal, maxLv);
                                if (target <= L1) {
                                    tRes.textContent = '目标等级需大于起始等级 Lv.' + L1;
                                    return;
                                }
                                startXp = Data.expTable[L1 - 1];
                                fromTxt = '从 Lv.' + L1 + '（0% 经验）';
                            } else {
                                if (L2 <= cur.level) { tRes.textContent = '当前已是 Lv.' + cur.level; return; }
                                startXp = cur.xp;
                                fromTxt = '从现有等级经验';
                            }
                            const need = Data.expTable[target - 1] - startXp;
                            if (need <= 0) { tRes.textContent = '当前已是 Lv.' + target; return; }
                            const n = Math.ceil(need / perEff);
                            // 越级档位点击时动态判定（面板复用 DOM 时动作可能已切换）
                            let overPenalty = false;
                            try {
                                if (action) {
                                    const st = getOverLevelState(action);
                                    overPenalty = st.status === 'yellow' || st.status === 'orange';
                                } else if (type === 7) {
                                    const r = (document.querySelector('.cooking-page') || {})._activeRecipe;
                                    const info7 = levelInfo(7);
                                    const diff = r && info7 ? Math.max(0, (+r.level || 1) - info7.level) : 0;
                                    overPenalty = diff >= 1 && diff < 15;
                                }
                            } catch (e2) { /* 忽略 */ }
                            tRes.textContent = fromTxt + '到 Lv.' + target +
                                ' 需执行 ' + fmt(n) + ' 次' +
                                (perSec ? '，预计需要 ' + fmtDuration(n * perSec) +
                                    (overPenalty ? '（含越级惩罚）' : '') : '');
                        } catch (e) { tRes.textContent = '计算失败'; }
                    });
                    tInput.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter') tBtn.click();
                    });
                    tFrom.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter') tBtn.click();
                    });
                    rep.parentNode.insertBefore(eff, rep);
                }
                // 食谱/加成/缓存/越级档位变化时同步效率值与颜色
                const effVal = eff.querySelector('.nek-eff-val');
                if (effVal.dataset.nekKey !== effKey || effVal.textContent !== effDisp) {
                    effVal.dataset.nekKey = effKey;
                    effVal.textContent = effDisp;
                }
                effVal.classList.remove('recommend-yellow', 'recommend-orange');
                if (effColorCls) effVal.classList.add(effColorCls);
                // 起始等级选框：固定占位提示（留空=从现有等级的现有经验起算）
                const tFromSync = eff.querySelector('.nek-target-from');
                if (tFromSync && tFromSync.placeholder !== '现有等级') {
                    tFromSync.placeholder = '现有等级';
                }
            });
        }

        // ---------------- 炼金界面：经验效率 + 升级次数计算 + 快捷填入 ----------------
        // 炼金页（action-8）三张有经验的卡片（原子/神秘/量子）右侧执行区与行动弹窗同构：
        // .alchemy-action-repeat 内 input.repeat-input + .btn.quick-set（1/10/100/1000/∞）。
        // 与行动弹窗的差异：
        // ①单次经验显示在右侧「经验」行，已含类型系数/稀有度/炼金经验研究/研究减半与
        //   越级衰减（越级时游戏在值后附 (越级-X%) 红字标注，衰减已烘焙进显示值）；
        // ②单次耗时显示在左侧「炼金信息·时间」行，已含炼金效率研究与「阶差转化」降耗
        //   （炼金的阶差研究是缩短耗时而非惩罚，原子卡切换标签时游戏会重写该行）；
        // ③越级时成功率 <100%（量子用配方自身 rate），经验行在「成功时获得」之下，
        //   期望经验按成功率折算；④经验归属炼金技能（expType=8）。
        // 全部数据从面板 DOM 读取（与显示严格同源），容器由游戏随物品/标签切换整体重建，
        // MutationObserver → scheduleDecorate 会重新装饰，此处只做存在性复用与数值同步。
        function decorateAlchemy() {
            // 总开关或「推算升级次数」任一关闭：清理炼金卡片内已插入的块与按钮
            if (!isEnabled() || !isCalcEnabled()) {
                document.querySelectorAll('.nek-alclvl-btn').forEach(b => b.remove());
                document.querySelectorAll('.alchemy-container .nek-eff-block').forEach(b => b.remove());
                document.querySelectorAll('.alchemy-container .nek-inv-btn').forEach(b => b.remove());
                return;
            }
            document.querySelectorAll('.alchemy-card').forEach(function (card, i) {
                try { decorateAlchemyCard(card, i); } catch (e) { /* 单卡失败不影响其它卡 */ }
            });
        }

        function decorateAlchemyCard(card, cardIndex) {
            const rep = card.querySelector('.alchemy-action-repeat');
            const input = rep && rep.querySelector('input.repeat-input');
            if (!rep || !input) return;   // 未选物品 / 禁忌炼金术（无经验与执行次数）
            const container = rep.closest('.alchemy-container');
            if (!container) return;

            // 单次经验：执行区内 name=经验 的行（值已含全部加成与越级衰减）
            let perExp = 0, decayPct = 0;
            container.querySelectorAll('.alchemy-detail-item').forEach(function (row) {
                const nameEl = row.querySelector('.alchemy-detail-container-name');
                if (!nameEl || nameEl.textContent.trim() !== '经验') return;
                const valEl = row.querySelector('.alchemy-detail-container-value');
                if (!valEl) return;
                perExp = parseInt((valEl.textContent || '').replace(/[,，]/g, ''), 10) || 0;
                const pen = valEl.querySelector('.alchemy-exp-penalty');
                const pm = pen && (pen.textContent || '').match(/越级-(\d+)%/);
                decayPct = pm ? parseInt(pm[1], 10) : 0;
            });
            if (!(perExp > 0)) return;

            // 左侧「炼金信息」：时间（已含效率与降耗）/ 成功率（量子为配方 rate）
            let perSec = null, rate = 1;
            card.querySelectorAll('.alchemy-info-item').forEach(function (row) {
                const nameEl = row.querySelector('.alchemy-info-item-name');
                const valEl = row.querySelector('.alchemy-info-item-value');
                if (!nameEl || !valEl) return;
                const nm = nameEl.textContent.trim();
                if (nm === '时间') {
                    const tm = (valEl.textContent || '').match(/([\d.]+)\s*秒/);
                    if (tm) perSec = parseFloat(tm[1]);
                } else if (nm === '成功率') {
                    const rm = (valEl.textContent || '').match(/([\d.]+)\s*%/);
                    if (rm) rate = Math.max(0, Math.min(1, parseFloat(rm[1]) / 100));
                }
            });

            const info8 = levelInfo(8);
            if (!info8) return;
            if (!(info8.nextLevelRemainExp > 0)) {
                // 满级：清掉残留的按钮与计算块
                const staleBtn = rep.querySelector('.nek-alclvl-btn');
                if (staleBtn) staleBtn.remove();
                const staleInv9 = rep.querySelector('.nek-inv-btn');
                if (staleInv9) staleInv9.remove();
                const staleEff = container.querySelector('.nek-eff-block');
                if (staleEff) staleEff.remove();
                return;
            }

            // 期望经验 = 显示经验 × 成功率；效率 = 期望经验 / 单次耗时
            const perEff = perExp * rate;
            const baseEffMin = perSec ? Math.round(perExp / perSec * 60) : null;   // 成功口径（不含成功率）
            const effPerMin = perSec ? Math.round(perEff / perSec * 60) : null;    // 期望口径
            const times = Math.ceil(info8.nextLevelRemainExp / perEff);
            const timeStr = perSec ? fmtDuration(times * perSec) : null;

            // 越级档位：经验行衰减标注反推级差（衰减 = 1 - 1/(1+5%×级差)），着色与行动弹窗一致
            const coeff = decayPct > 0 ? 1 - decayPct / 100 : 1;
            const diff = coeff < 1 ? Math.round((1 / coeff - 1) / 0.05) : 0;
            const olStatus = diff >= 6 ? 'orange' : diff >= 1 ? 'yellow' : 'normal';
            const effColorCls = olStatus === 'orange' ? 'recommend-orange' : olStatus === 'yellow' ? 'recommend-yellow' : '';
            const overActive = olStatus !== 'normal' || rate < 1;

            // 「升下一级」快捷按钮：∞ 档之前，点击填入所需次数（复用 .nek-lvl-btn 样式
            // 与 decorateModal 的全局清理，nek-alclvl-btn 仅作炼金侧定位标记）
            const sets = Array.prototype.slice.call(rep.querySelectorAll('.btn.quick-set'));
            const bInf = sets.find(b => b.textContent.trim() === '∞');
            if (!bInf) return;
            const overTag = overActive
                ? '（含越级衰减 ' + decayPct + '%' + (rate < 1 ? ' 与成功率 ' + Math.round(rate * 100) + '%' : '') + '）'
                : '';
            const lvlTitle = timeStr
                ? '【小助手】执行 ' + times + ' 次预计需要 ' + timeStr + overTag + '，点击填入执行次数。'
                : '【小助手】炼金距升级还需 ' + fmt(info8.nextLevelRemainExp) +
                  ' 点经验，共需 ' + times + ' 次' + overTag + '。点击填入执行次数。';
            let lvlBtn = rep.querySelector('.nek-alclvl-btn');
            if (!lvlBtn) {
                lvlBtn = document.createElement('div');
                lvlBtn.className = 'btn quick-set nek-lvl-btn nek-alclvl-btn';
                lvlBtn.addEventListener('click', function () {
                    input.value = lvlBtn.dataset.nekTimes;   // 与原生 quick-set 行为一致：直接赋值
                });
                bInf.before(lvlBtn);
            }
            if (lvlBtn.dataset.nekTimes !== String(times)) lvlBtn.textContent = String(times);
            lvlBtn.title = lvlTitle;
            lvlBtn.dataset.nekTimes = String(times);

            // 「背包可执行次数」按钮（青柠绿，升级次数按钮后方）：按当前炼金类型逐项
            // floor(持有/每次消耗) 取最小值。消耗口径与游戏服务端一致：
            // 原子卡——点金 itemDef.auri||1 个、分解/研究 1 个（aInfo.type 1=点金 2=分解 6=研究）；
            // 神秘卡——主物品 occultismData[提纯/还原/转换].quantity||1 个（type 3/4/5）；
            // 量子卡——主物品 1 个 + 次要物品 recipe.quantity 个（升级配方）。
            // 首次选中物品时 aInfo.type 未设置，游戏默认激活 点金/提纯 标签，按此兜底
            let invTimes = null, invIsTransmute = false;
            try {
                const aInfo = (typeof UI !== 'undefined' && UI.alchemyInfo) ? UI.alchemyInfo[cardIndex] : null;
                let invSrc = null;
                if (aInfo && aInfo.item != null) {
                    const selDef = game.getItem(aInfo.item);
                    if (cardIndex === 0 && selDef) {
                        invIsTransmute = aInfo.type === undefined || aInfo.type === 1;
                        invSrc = [{ itemId: aInfo.item, quantity: invIsTransmute ? (selDef.auri || 1) : 1 }];
                    } else if (cardIndex === 1 && selDef) {
                        const occ = (typeof Data !== 'undefined' && Data.alchemyOccultism) ? Data.alchemyOccultism[aInfo.item] : null;
                        const at = aInfo.type === 4 ? 'down' : aInfo.type === 5 ? 'change' : 'up';   // 3=提纯(默认兜底)
                        const ad = occ ? occ[at] : null;
                        if (ad) invSrc = [{ itemId: aInfo.item, quantity: ad.quantity || 1 }];
                    } else if (cardIndex === 3 && selDef && typeof Data !== 'undefined' && Data.alchemyQuantum) {
                        const recipes = Data.alchemyQuantum[aInfo.item];
                        const rec = (aInfo.secondaryItem != null && recipes)
                            ? recipes.find(r => r.secondary == aInfo.secondaryItem) : null;
                        if (rec) invSrc = [
                            { itemId: aInfo.item, quantity: 1 },
                            { itemId: rec.secondary, quantity: rec.quantity || 1 }
                        ];
                    }
                }
                if (invSrc) {
                    invTimes = Infinity;
                    invSrc.forEach(function (req) {
                        const have = game.getItemQuantity(req.itemId) || 0;
                        invTimes = Math.min(invTimes, Math.floor(have / (req.quantity || 1)));
                    });
                }
            } catch (e2) { /* 数据不可用时隐藏按钮 */ }
            if (invTimes != null && isFinite(invTimes) && invTimes >= 0) {
                // 悬停提示：可执行次数 + 预计需要时间 + 各材料明细
                const invTimeStr = perSec ? fmtDuration(invTimes * perSec) : null;
                let invDetail = '';
                try {
                    const aInfo2 = UI.alchemyInfo[cardIndex];
                    const parts = [];
                    if (cardIndex === 3 && aInfo2.secondaryItem != null) {
                        const recipes = Data.alchemyQuantum[aInfo2.item];
                        const rec = recipes.find(r => r.secondary == aInfo2.secondaryItem);
                        if (rec) {
                            parts.push(game.getItem(aInfo2.item).name + ' ×1');
                            parts.push(game.getItem(rec.secondary).name + ' ×' + (rec.quantity || 1));
                        }
                    } else if (aInfo2.item != null) {
                        const def = game.getItem(aInfo2.item);
                        const q = cardIndex === 0
                            ? (invIsTransmute ? (def.auri || 1) : 1)
                            : (cardIndex === 1
                                ? (((Data.alchemyOccultism || {})[aInfo2.item] || {})[aInfo2.type === 4 ? 'down' : aInfo2.type === 5 ? 'change' : 'up'] || {}).quantity || 1
                                : 1);
                        parts.push(def.name + ' ×' + q + (cardIndex === 0 && invIsTransmute && (def.auri || 1) > 1 ? '（点金单次消耗）' : ''));
                    }
                    if (parts.length) invDetail = '（' + parts.join(' + ') + '）';
                } catch (e3) { /* 明细失败不影响按钮 */ }
                const invTitle = '【小助手】当前背包材料最多可执行 ' + fmt(invTimes) + ' 次' +
                    (invTimeStr ? '，预计需要 ' + invTimeStr : '') +
                    (invDetail ? invDetail : '') + '，点击填入执行次数。';
                const invKey = invTimes + ':' + (invTimeStr || '') + ':' + invDetail;
                let invBtn = rep.querySelector('.nek-inv-btn');
                if (!invBtn) {
                    invBtn = document.createElement('div');
                    invBtn.className = 'btn quick-set nek-inv-btn';
                    invBtn.addEventListener('click', function () {
                        input.value = invBtn.dataset.nekTimes;   // 直接填入可执行次数
                    });
                    lvlBtn.after(invBtn);   // 升级次数按钮后方（∞ 之前）
                }
                if (invBtn.dataset.nekKey !== invKey) {
                    invBtn.textContent = String(invTimes);
                    invBtn.title = invTitle;
                    invBtn.dataset.nekTimes = String(invTimes);
                    invBtn.dataset.nekKey = invKey;
                }
            } else {
                // 数据不可用/数量为 0：清掉残留按钮
                const staleInv = rep.querySelector('.nek-inv-btn');
                if (staleInv) staleInv.remove();
            }

            // 「执行」标题前插入：经验效率 + 目标等级计算（复用行动弹窗的块结构与样式）
            const effKey = perExp + ':' + (perSec || '') + ':' + rate + ':' + (effPerMin != null ? effPerMin : '');
            let eff = container.querySelector('.nek-eff-block');
            if (!eff) {
                eff = document.createElement('div');
                eff.className = 'nek-eff-block';
                eff.innerHTML =
                    '<div class="nek-eff-row">经验效率：<span class="nek-eff-val' + (effColorCls ? ' ' + effColorCls : '') + '"></span></div>' +
                    '<div class="nek-eff-row nek-target-row">' +
                        '<input class="nek-target-input nek-target-from" type="number" min="1" placeholder="现有等级">' +
                        '<span class="nek-target-dash">—</span>' +
                        '<input class="nek-target-input" type="number" min="1" placeholder="目标等级">' +
                        '<div class="btn quick-set nek-target-btn">计算</div>' +
                    '</div>' +
                    '<div class="nek-target-result"></div>';
                const tFrom = eff.querySelector('.nek-target-from');
                const tInput = eff.querySelector('.nek-target-input:not(.nek-target-from)');
                const tBtn = eff.querySelector('.nek-target-btn');
                const tRes = eff.querySelector('.nek-target-result');
                tBtn.addEventListener('click', function () {
                    const L2 = parseInt(tInput.value, 10);
                    if (!L2 || L2 < 1) { tRes.textContent = '请输入目标等级'; return; }
                    try {
                        const cur = levelInfo(8);
                        if (!cur) { tRes.textContent = '数据获取失败'; return; }
                        if (typeof Data === 'undefined' || !Array.isArray(Data.expTable)) {
                            tRes.textContent = '经验表不可用'; return;
                        }
                        const maxLv = (typeof game !== 'undefined' && game.character &&
                            game.character.max_level) || Data.expTable.length;
                        const target = Math.min(L2, maxLv);
                        // 起始点：第一个选框填了 → 该等级的 0% 经验；留空 → 现有等级的现有经验
                        const fromVal = parseInt(tFrom.value, 10);
                        let startXp, fromTxt;
                        if (fromVal >= 1) {
                            const L1 = Math.min(fromVal, maxLv);
                            if (target <= L1) {
                                tRes.textContent = '目标等级需大于起始等级 Lv.' + L1;
                                return;
                            }
                            startXp = Data.expTable[L1 - 1];
                            fromTxt = '从 Lv.' + L1 + '（0% 经验）';
                        } else {
                            if (L2 <= cur.level) { tRes.textContent = '当前已是 Lv.' + cur.level; return; }
                            startXp = cur.xp;
                            fromTxt = '从现有等级经验';
                        }
                        const need = Data.expTable[target - 1] - startXp;
                        if (need <= 0) { tRes.textContent = '当前已是 Lv.' + target; return; }
                        // 点击时读取块上的实时口径（标签切换会改变耗时与经验）
                        const n = Math.ceil(need / (parseFloat(eff.dataset.nekPerEff) || perEff));
                        const sec = parseFloat(eff.dataset.nekPerSec) || perSec;
                        tRes.textContent = fromTxt + '到 Lv.' + target +
                            ' 需执行 ' + fmt(n) + ' 次' +
                            (sec ? '，预计需要 ' + fmtDuration(n * sec) +
                                (eff.dataset.nekOver === '1' ? '（含越级衰减与成功率）' : '') : '');
                    } catch (e) { tRes.textContent = '计算失败'; }
                });
                tInput.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') tBtn.click();
                });
                tFrom.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') tBtn.click();
                });
                // 插在「执行」标题前（经验行与执行区之间）
                const repItem = rep.closest('.alchemy-detail-item') || rep.parentElement;
                const anchor = repItem.previousElementSibling;
                if (anchor && anchor.classList.contains('modal-container-title')) {
                    anchor.parentNode.insertBefore(eff, anchor);
                } else {
                    repItem.parentNode.insertBefore(eff, repItem);
                }
            }
            // 同步效率显示与点击计算所需的实时口径
            eff.dataset.nekPerEff = perEff;
            eff.dataset.nekPerSec = perSec || '';
            eff.dataset.nekOver = overActive ? '1' : '0';
            const effVal = eff.querySelector('.nek-eff-val');
            let effDisp;
            if (effPerMin == null) {
                effDisp = '耗时未知';
            } else if (overActive && baseEffMin > 0) {
                const ratio = Math.round(effPerMin / baseEffMin * 100);
                effDisp = '约 ' + fmt(baseEffMin) + ' × ' + ratio + '% = ' + fmt(effPerMin) + ' 点/分钟';
            } else {
                effDisp = '约 ' + fmt(effPerMin) + ' 点/分钟';
            }
            if (effVal.dataset.nekKey !== effKey || effVal.textContent !== effDisp) {
                effVal.dataset.nekKey = effKey;
                effVal.textContent = effDisp;
            }
            effVal.classList.remove('recommend-yellow', 'recommend-orange');
            if (effColorCls) effVal.classList.add(effColorCls);
        }

        // ---------------- 物品说明市场价格显示 ----------------
        // 说明面板（悬浮提示 / 「查看信息」弹窗）由 UI.buildItemInfo 生成，
        // 包装它在「Ctrl+左键点击 - 发至聊天」(.item-info-tip) 上方插入价格行；
        // 数据源为官方市场缓存接口：game.loadMarketCache() 一次拉取全部物品快照
        // （game.marketCacheData: Map<id, {item, updated_at, levels[enh]{sell_price,sell_qty,
        //  demand_price,demand_qty,last_price,median_price,volume}}>），过期全量重拉，
        // 单物品过期时经 game.getMarketCache(id) 按需强制刷新（clearMarketCache + getMarketCache）。
        const MK_DWELL = 500;        // 悬停/打开超过 0.5s 才取数
        const MK_CACHE_TTL = 60000;  // 行情缓存 60s（沿用原设定）：过期后全量重拉 / 单物品强制刷新
        const mkCache = new Map();        // key("id:enh") -> { lv, at }  lv=快照 levels[enh]，at=数据应用时间
        const mkItemInFlight = new Map(); // key -> Promise，单物品强制刷新去重
        const mkItemLastTry = new Map();  // key -> 上次强制刷新发起时间（失败重试节流 5s）
        const mkNextTimers = new Map();   // key -> interval，「下次刷新」每秒倒计时
        let mkBulkAt = 0;                 // 上次全量获取成功时间
        let mkBulkInFlight = null;

        const MK_WAITING = '获取市场数据中……';
        const MK_FAILED = '市场数据获取失败';

        // 全量获取：页面首次加载 & 缓存过期时触发（一次请求覆盖全部可交易物品）
        function mkEnsureBulk() {
            if (!isEnabled() || !isMarketEnabled()) return;
            if (typeof game === 'undefined' || typeof game.loadMarketCache !== 'function') return;
            if (mkBulkAt && Date.now() - mkBulkAt < MK_CACHE_TTL) return;
            if (mkBulkInFlight) return;
            mkBulkInFlight = Promise.resolve(game.loadMarketCache(!!mkBulkAt)).then(function (m) {
                mkBulkInFlight = null;
                if (!m || !m.size) return;   // 服务端未返回数据：不记时间，下次取数时重试
                mkBulkAt = Date.now();
                document.querySelectorAll('.nek-market[data-nek-key]').forEach(function (el) {
                    mkRefreshEl(el);
                });
            }).catch(function () { mkBulkInFlight = null; });
        }

        // 读取全量缓存中某物品某强化等级的条目
        function mkLevelOf(id, enh) {
            try {
                const s = game.marketCacheData.get(Number(id));
                if (!s || !Array.isArray(s.levels) || !s.levels[enh]) return null;
                return s.levels[enh];
            } catch (e) { return null; }
        }

        // 单物品强制刷新：清官方缓存后走 getMarketCache，服务端返回该物品最新快照
        function mkForceItem(id, enh, key) {
            if (mkItemInFlight.has(key)) return;
            if (Date.now() - (mkItemLastTry.get(key) || 0) < 5000) return;
            mkItemLastTry.set(key, Date.now());
            try { game.clearMarketCache(Number(id)); } catch (e0) { /* 忽略 */ }
            const p = game.getMarketCache(Number(id)).then(function (s) {
                mkItemInFlight.delete(key);
                if (!s || !Array.isArray(s.levels) || !s.levels[enh]) return;
                mkCache.set(key, { lv: s.levels[enh], at: Date.now() });
                mkRenderKey(key);
            }).catch(function () { mkItemInFlight.delete(key); });
            mkItemInFlight.set(key, p);
        }

        // 三行行情：行1 左一/右一，行2 刚交价/今日成，行3 下次刷新（倒计时单独维护）。
        // 标签与数值分列渲染，配合 CSS 网格让「右一价」「今日成」标签起始位置对齐
        function mkLineHtml(lv) {
            const sell = lv && lv.sell_price != null ? fmt(lv.sell_price) : '暂无';
            const buy = lv && lv.demand_price != null ? fmt(lv.demand_price) : '暂无';
            const last = lv && lv.last_price != null ? fmt(lv.last_price) : '暂无';
            const vol = lv && lv.volume != null ? fmt(lv.volume) : '-';
            return '<div class="nek-market-row">' +
                '<span class="nek-mk-lbl">左一价：</span><span class="nek-mk-val">' + sell + '</span>' +
                '<span class="nek-mk-lbl">右一价：</span><span class="nek-mk-val">' + buy + '</span></div>' +
                '<div class="nek-market-row">' +
                '<span class="nek-mk-lbl">刚交价：</span><span class="nek-mk-val">' + last + '</span>' +
                '<span class="nek-mk-lbl">今日成：</span><span class="nek-mk-val">' + vol + '</span></div>' +
                '<div class="nek-market-row nek-mk-next">下次刷新：--秒</div>';
        }

        // 渲染某 key 的全部挂载标记，并启动该 key 的倒计时
        function mkRenderKey(key) {
            const c = mkCache.get(key);
            document.querySelectorAll('.nek-market[data-nek-key="' + key + '"]').forEach(function (el) {
                if (!c) { el.textContent = MK_FAILED; el.dataset.state = 'fail'; return; }
                el.dataset.state = 'ok';
                el.innerHTML = mkLineHtml(c.lv);
            });
            if (c) mkStartCountdown(key);
        }

        // 「下次刷新」每秒倒计时（启动时先立即写入一次，不等首个 tick）；归零触发单物品强制刷新；
        // 标记全部离开 DOM 后自动停止
        function mkStartCountdown(key) {
            if (mkNextTimers.has(key)) return;
            const tick = function () {
                const els = document.querySelectorAll('.nek-market[data-nek-key="' + key + '"] .nek-mk-next');
                if (!els.length) { clearInterval(t); mkNextTimers.delete(key); return; }
                const c = mkCache.get(key);
                if (!c) return;
                const left = Math.max(0, Math.ceil((c.at + MK_CACHE_TTL - Date.now()) / 1000));
                els.forEach(function (el) { el.textContent = '下次刷新：' + left + '秒'; });
                if (left <= 0) {
                    const parts = key.split(':');
                    mkForceItem(parts[0], Number(parts[1]) || 0, key);
                }
            };
            const t = setInterval(tick, 1000);
            mkNextTimers.set(key, t);
            tick();
        }

        // 单个标记取数：命中未过期缓存直接渲染；有过期底数先渲染再单物品强刷；无底数先拉全量
        function mkRefreshEl(el) {
            const key = el.dataset.nekKey;
            if (!key) return;
            const parts = key.split(':');
            const id = parts[0];
            const enh = Number(parts[1]) || 0;
            const c = mkCache.get(key);
            if (c && Date.now() - c.at < MK_CACHE_TTL) { mkRenderKey(key); return; }
            const snap = mkLevelOf(id, enh);
            if (!snap) {
                mkEnsureBulk();   // 首次或全量过期 → 全量获取（到达后重算全部已挂载标记）
                return;           // 保持「获取市场数据中……」占位
            }
            mkEnsureBulk();   // 底数已过期时同步触发全量重拉（内部有 60s 节流）
            mkCache.set(key, { lv: snap, at: mkBulkAt || Date.now() });
            mkRenderKey(key);
            if (Date.now() - (mkBulkAt || 0) >= MK_CACHE_TTL) mkForceItem(id, enh, key);
        }

        function decorateMarketMarkers() {
            document.querySelectorAll('.nek-market:not([data-nek-done])').forEach(function (el) {
                el.dataset.nekDone = '1';
                if (!isEnabled() || !isMarketEnabled()) { el.remove(); return; }
                const id = el.dataset.nekId;
                if (!id) return;
                const enh = Number(el.dataset.nekEnh) || 0;
                const key = id + ':' + enh;
                el.dataset.nekKey = key;
                el.textContent = MK_WAITING;   // 原位置占位
                setTimeout(function () {
                    if (!el.isConnected) return;   // 悬停不足 0.5s / 弹窗已关闭
                    mkRefreshEl(el);
                }, MK_DWELL);
            });
        }

        // 页面加载后先拉一次全量行情打底（开关关闭时 mkRefreshEl 入口不会触发，此处同样检查）
        setTimeout(mkEnsureBulk, 800);

        // 面板包装：为可交易物品在 .item-info-tip 前插入价格行标记
        function hookBuildItemInfo() {
            if (typeof UI === 'undefined' || typeof UI.buildItemInfo !== 'function') {
                setTimeout(hookBuildItemInfo, 300);
                return;
            }
            if (UI.buildItemInfo.__nek) return;
            const orig = UI.buildItemInfo;
            const wrapped = function (itemDef, param) {
                let html = orig.apply(this, arguments);
                try {
                    if (itemDef && itemDef.trade && isEnabled() && isMarketEnabled()) {
                        const item = (param && param.item) || null;
                        const enh = (item && item.enhancement != null) ? (Number(item.enhancement) || 0) : 0;
                        const marker = '<div class="nek-market" data-nek-id="' + itemDef.id +
                            '" data-nek-enh="' + enh + '">' + MK_WAITING + '</div>';
                        const tipTag = '<div class="item-info-tip">';
                        const i = html.indexOf(tipTag);
                        if (i !== -1) {
                            html = html.slice(0, i) + marker + html.slice(i);
                        } else {
                            // 无底部提示时插到面板末尾（最后一个 </div> 之前）
                            const last = html.lastIndexOf('</div>');
                            html = last === -1 ? html + marker : html.slice(0, last) + marker + html.slice(last);
                        }
                    }
                } catch (e) { /* 不影响原面板 */ }
                return html;
            };
            wrapped.__nek = true;
            UI.buildItemInfo = wrapped;
        }

        // ---------------- 烹饪食材跳转 ----------------
        // 点击烹饪产物（食物/饮料/材料/鱼饵，含市场详情页图标）弹出的物品菜单中，在「查看信息」后插入
        // 「跳转烹饪」按钮：切换到烹饪页并自动展开对应分组、选中该配方显示详情。
        // 菜单由 UI.showItemMenu 同步构建，包装它在菜单尾部追加按钮；
        // 跳转复用游戏原生路径 changeContent('actions') + updateActionsList(7,{recipeId})，
        // cookingPage(option) 内建按 recipeId 激活分组并点击对应条目的逻辑。
        // 食物/饮料/材料/鱼饵物品（配方 type 1~4，见 cookingPage 的 typeNames）不带 recipe 字段，
        // 经配方产出 rewards 反查（rewards 是数组，次要产出也登记）；
        // 食谱物品（id 3500+）自带 recipe 字段，直接使用。
        let cookRecipeByItem = null;   // 产出物品 id -> { recipeId, recipeName }
        const isCookRecipeType = t => t >= 1 && t <= 4;
        function cookRecipeForItem(itemDef) {
            if (!itemDef) return null;
            if (itemDef.recipe && Data.cookingRecipes[itemDef.recipe]) {
                const r = Data.cookingRecipes[itemDef.recipe];
                if (isCookRecipeType(r.type)) return { recipeId: r.id, recipeName: r.name };
                return null;
            }
            if (!cookRecipeByItem) {
                cookRecipeByItem = new Map();
                Object.values(Data.cookingRecipes).forEach(function (r) {
                    if (!isCookRecipeType(r.type)) return;
                    (r.rewards || []).forEach(function (rw) {
                        // 同一物品被多个配方产出时保留先登记的（主产出优先）
                        if (rw && rw.itemId && !cookRecipeByItem.has(rw.itemId)) {
                            cookRecipeByItem.set(rw.itemId, { recipeId: r.id, recipeName: r.name });
                        }
                    });
                });
            }
            return cookRecipeByItem.get(itemDef.id) || null;
        }

        function jumpToCooking(recipeId) {
            try {
                const btn = document.querySelector('.sidebar-item.action-7');
                if (btn && !btn.classList.contains('active')) {
                    UI.changeContent('actions', { id: 7 });   // 高亮侧栏并渲染烹饪页
                }
            } catch (e) { /* 忽略 */ }
            // 游戏首渲染的「自动选中第一个配方」是异步的，会与配方选中相互覆盖；
            // 这里自选：等目标条目渲染出后激活其分组并点击，连续两轮轮询均命中才收手
            let n = 0;
            let stable = 0;
            const timer = setInterval(function () {
                n++;
                let ok = false;
                try {
                    const page = document.querySelector('.cooking-page');
                    const items = page ? page.querySelectorAll('.cooking-recipe-item') : null;
                    const target = items ? Array.prototype.find.call(items,
                        el => el._recipe && Number(el._recipe.id) === Number(recipeId)) : null;
                    if (target) {
                        if (target.classList.contains('active')) {
                            ok = true;
                        } else {
                            const group = target.closest('.cooking-accordion-group');
                            if (group && !group.classList.contains('active')) {
                                page.querySelectorAll('.cooking-accordion-group').forEach(function (g) {
                                    g.classList.remove('active');
                                });
                                group.classList.add('active');
                            }
                            target.click();
                            ok = target.classList.contains('active');
                        }
                    }
                } catch (e2) { /* 忽略 */ }
                stable = ok ? stable + 1 : 0;
                if (stable >= 2 || n > 20) clearInterval(timer);   // 稳定 300ms 或超时 3s 停止
            }, 150);
        }

        function hookShowItemMenu() {
            if (typeof UI === 'undefined' || typeof UI.showItemMenu !== 'function' ||
                typeof Data === 'undefined' || !Data.cookingRecipes) {
                setTimeout(hookShowItemMenu, 300);
                return;
            }
            if (UI.showItemMenu.__nek) return;
            const orig = UI.showItemMenu;
            const wrapped = function (slotElement, param) {
                const r = orig.apply(this, arguments);
                try {
                    if (!isEnabled() || !isCookJumpEnabled()) return r;
                    const recipe = cookRecipeForItem(param && param.itemDef);
                    if (!recipe) return r;   // 仅烹饪产物（食物/饮料/材料/鱼饵，含食谱物品）
                    const menu = this.itemMenu;
                    const list = menu && menu.querySelector('.item-menu-button-list');
                    if (!list) return r;
                    const btn = document.createElement('div');
                    btn.className = 'item-menu-button nek-cookjump-btn';
                    btn.innerHTML =
                        '<div class="item-menu-icon">' +
                            '<div class="menu-icon nek-icon-cook"></div>' +
                        '</div>' +
                        '<div class="item-menu-button-name">跳转烹饪</div>';
                    btn.addEventListener('click', function () {
                        // 复刻 destroyMenu（外部点击回调留在原地无害：menu 已脱离文档时为幂等空操作）
                        if (slotElement) slotElement.classList.remove('menu-active');
                        menu.remove();
                        UI.itemMenu = null;
                        jumpToCooking(recipe.recipeId);
                    });
                    // 插在「查看信息」之后（无则插到最前）
                    const first = list.children[0];
                    if (first && first.nextSibling) list.insertBefore(btn, first.nextSibling);
                    else list.insertBefore(btn, list.firstChild);
                } catch (e) { /* 不影响原菜单 */ }
                return r;
            };
            wrapped.__nek = true;
            UI.showItemMenu = wrapped;
        }

        // ---------------- 设置页开关（游戏设置 → 其他） ----------------
        function applyEnabledState() {
            if (!isEnabled() || !isCalcEnabled()) {
                document.querySelectorAll('.nek-lvl-btn').forEach(b => b.remove());
            }
            if (!isEnabled() || !isMarketEnabled()) {
                hideTip();
                document.querySelectorAll('.nek-market').forEach(b => b.remove());
            }
            applyCookClass();
            applyProdClass();
            applyPickClass();
            applyEffMarkState();
        }

        // ---------------- 自动收菜（原独立脚本「猫娘自动收菜 v2.3.0」并入，全后台化） ----------------
        // 每 30 秒检查一次：通过 UI.plantState 读取各地块状态（state=ready，或 growing 且
        // mature_at 已过——快照可能滞后于实际成熟，与游戏自身判定同口径），对可收获且未被
        // 跳过的地块直接发送收获消息。初始化与收发全程后台进行：不切页、不抢焦点、不遮挡操作。
        // 补种交给游戏原生的「自动播种」：地块右上圆点（A 按钮）点亮后 auto_enabled 存储在
        // 服务端，收获时服务端自动消耗背包种子补种，收获响应的 plots 即补种后的最新状态，
        // 客户端无需再发 plant_seed（原生帮助：「收获后自动消耗背包种子补种」）。
        // 开关体系：设置页「农业辅助」为总开关（nek_farm_assist_enabled，同时控制自动收菜
        // 与好友农场成熟预览）；队列位置（当前行动「取消」左侧）的「自动收菜」快捷开关
        // （nek_harvest_enabled，沿用独立版键名）仅控制自动收获本身。
        // 标记位供独立版收菜脚本检测，避免双开重复发送收获消息
        window.__NEK_HARVEST_IN_ASSISTANT__ = true;
        const HARVEST_TAG = '【自动收菜】';
        const HARVEST_TICK_MS = 30000;           // 主循环：每 30 秒一次
        const HARVEST_SKIP_KEY = 'nek_harvest_skip';      // 跳过配置：{ farmId: [plotIndex,...] }
        const LS_HARVEST_KEY = 'nek_harvest_enabled';     // 队列快捷开关（仅自动收菜），沿用独立版键名
        const LS_FARM_KEY = 'nek_farm_assist_enabled';    // 农业辅助总开关：自动收菜 + 好友农场成熟预览
        const isHarvestEnabled = () => {
            try { return localStorage.getItem(LS_HARVEST_KEY) !== '0'; } catch (e) { return true; }
        };
        const setHarvestEnabled = v => {
            try { localStorage.setItem(LS_HARVEST_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const isFarmAssistEnabled = () => {
            try { return localStorage.getItem(LS_FARM_KEY) !== '0'; } catch (e) { return true; }
        };
        const setFarmAssistEnabled = v => {
            try { localStorage.setItem(LS_FARM_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        // 开关切换后统一刷新队列位置按钮的文案与样式
        const applyHarvestState = () => {
            document.querySelectorAll('.nek-harvest-toggle').forEach(btn => paintToggleButton(btn));
        };
        function loadHarvestSkip() {
            try { return JSON.parse(localStorage.getItem(HARVEST_SKIP_KEY) || '{}') || {}; }
            catch (e) { return {}; }
        }
        function saveHarvestSkip(map) {
            try { localStorage.setItem(HARVEST_SKIP_KEY, JSON.stringify(map)); } catch (e) { /* 忽略 */ }
        }
        function hlog() {
            const args = [].slice.call(arguments);
            args.unshift(HARVEST_TAG);
            console.log.apply(console, args);
        }

        // ---- 核心：按地块直接收发消息（不依赖页面 DOM） ----

        // 遍历所有农场：fn(farm, skipped数组, planet)
        function eachFarm(fn) {
            const ps = UI.plantState;
            if (!ps || !ps.planets) return;
            const skipMap = loadHarvestSkip();
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

        // 种植数据后台初始化：plant_get_data 响应处理（plant_getData）只要求 UI.plantState
        // 已存在即可落盘（UI.plantRefresh 在种植页未构建时为 undefined，可选调用自动跳过），
        // 收获/播种响应也只调用 plantState.updateFarmPlots。因此直接挂一个最小状态骨架并发送
        // 数据请求即可完成初始化，全程不切换页面、不触碰行动区 DOM。
        // 用户之后首次打开种植页时，游戏会重建真实 state 并重新拉数据，无缝接管。
        let harvestDataTries = 0;

        function ensurePlantState() {
            if (UI.plantState && (UI.plantState.planets || []).length) return true;
            // 最多连发 3 次请求（每 2 秒一次），失败则等下一轮 30 秒主循环再试
            if (harvestDataTries < 3) {
                harvestDataTries++;
                if (!UI.plantState) {
                    // 最小骨架：满足 plant_getData 落盘与收获/播种响应的 updateFarmPlots 调用
                    UI.plantState = {
                        planets: [], price_config: {}, plot_prices: {}, player_level: 1,
                        updateFarmPlots: function (farmId, plotsArr) {
                            const farms = [];
                            (this.planets || []).forEach(p => (p.farms || []).forEach(f => farms.push(f)));
                            const farm = farms.find(f => f.id === farmId);
                            if (!farm) return;
                            if (!farm.plots) farm.plots = [];
                            for (let i = 0; i < 12; i++) {
                                const pd = plotsArr && (plotsArr[i] || plotsArr[String(i)]);
                                farm.plots[i] = pd || { state: 'empty' };
                            }
                        }
                    };
                }
                MSG.send('plant_get_data');
                // 数据响应通常 1 秒内返回：短暂等待后立即判定，不等下一轮 30 秒
                setTimeout(tickPlanting, 2000);
            }
            return false;
        }

        // ---- 在途请求记录：防止对同一地块重复发送收获消息 ----
        // 收获消息发出后，响应落盘前地块状态仍是旧值；若不记录在途，同一地块可能被
        // 重复发送（服务端会拒绝并弹「该地块未种植」错误提示）。
        // 记录带 15 秒过期：响应迟迟不来时允许超时重发，状态更新后立即清除。
        const PENDING_MAX_AGE = 15000;
        const pendingHarvest = {};   // { farmId: { plotIdx: 发送时间戳 } }
        function pendingFresh(map, farmId, i) {
            const e = map[farmId] && map[farmId][i];
            if (!e) return false;
            if (Date.now() - e > PENDING_MAX_AGE) { delete map[farmId][i]; return false; }
            return true;
        }
        function markPending(map, farmId, i) { (map[farmId] = map[farmId] || {})[i] = Date.now(); }
        function clearPending(map, farmId, i) { if (map[farmId]) delete map[farmId][i]; }

        // 可收获且未被跳过的地块 → 逐块发送收获消息；补种由服务端原生「自动播种」完成
        function tickPlanting() {
            try {
                if (typeof UI === 'undefined' || typeof MSG === 'undefined') return;
                if (!UI.plantState || !(UI.plantState.planets || []).length) {
                    ensurePlantState();   // 后台拉取种植数据，不打断当前页面
                    return;
                }
                harvestDataTries = 0;   // 数据已就位，重置失败计数（否则 3 次失败后永不重试）
                let sent = 0;
                let noAuto = 0;
                eachFarm(function (farm, skipped) {
                    (farm.plots || []).forEach(function (pd, i) {
                        if (!isHarvestable(pd)) {
                            if (pd && pd.state !== 'ready') clearPending(pendingHarvest, farm.id, i);
                            return;
                        }
                        if (skipped.indexOf(i) >= 0) return;
                        if (pendingFresh(pendingHarvest, farm.id, i)) return;   // 在途，等响应
                        markPending(pendingHarvest, farm.id, i);
                        MSG.send('plant_harvest', { farm_id: farm.id, plot_index: i });
                        sent++;
                        if (!(pd.auto_enabled)) noAuto++;   // 提示未开启原生自动播种的地块
                    });
                });
                if (sent) {
                    hlog('已发送 ' + sent + ' 个地块的收获请求' +
                        (noAuto ? '（注意：其中 ' + noAuto + ' 个地块未开启原生「自动播种」，' +
                        '收获后不会自动补种，可在种植页点亮地块右上角圆点）' : ''));
                    scheduleBadgeSync(2000);   // 收获响应（含服务端补种后的地块状态）落定后重建角标
                }
            } catch (e) {
                hlog('种植调度异常：', e && e.message);
            }
        }

        // ---- 侧边栏「种植」黄色角标同步 ----

        // 角标由 UI.plantWatch（ready 计数 + 成熟时间表）驱动，但游戏只在种植页 UI 更新路径
        // 中调用 syncPlantReadyWatch 重建它——免切页收获/播种时，响应虽然会更新
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

        // ---- 收获成果：不弹窗（遮罩会黑屏），顶部 notifier 通知 ----

        // 同一批批量收获会连续返回多条「收获成果」：先聚合（物品按 id 累加、经验累加），
        // 2 秒内无新结果时合并为一条通知发出，避免一批收获刷出多条通知。
        // 功能关闭时不拦截，恢复游戏原生「收获成果」弹窗。
        const HARVEST_AGG_WINDOW_MS = 2000;
        let harvestAgg = null;      // { items: {id: qty}, exp: n, count: n }
        let harvestAggTimer = null;

        function flushAgg() {
            if (!harvestAgg) return;
            try {
                const ids = Object.keys(harvestAgg.items).map(Number).sort(function (a, b) { return a - b; });
                const parts = ids.map(function (id) {
                    const item = typeof game !== 'undefined' && game.getItem(id);
                    return (item && item.name ? item.name : '#' + id) + '×' + harvestAgg.items[id];
                });
                let msg = parts.length ? '收获：' + parts.join('、') : '收获完成，没有获得物品';
                if (harvestAgg.count > 1) msg = '收获 ' + harvestAgg.count + ' 块：' + msg.slice(3);
                if (harvestAgg.exp > 0) msg += '（经验 +' + harvestAgg.exp + '）';
                if (UI.notifier && UI.notifier.show) {
                    UI.notifier.show(msg, 'success', 6000);
                }
                hlog(msg);
            } catch (e0) { /* 通知失败不影响收获流程 */ }
            harvestAgg = null;
            if (harvestAggTimer) { clearTimeout(harvestAggTimer); harvestAggTimer = null; }
        }

        function patchResultModal() {
            if (typeof UI.showResultModal !== 'function' || UI.__nekHarvestPatched) return;
            const orig = UI.showResultModal.bind(UI);
            UI.showResultModal = function (data) {
                if (data && data.title === '收获成果') {
                    if (!isEnabled() || !isFarmAssistEnabled() || !isHarvestEnabled()) return orig(data);   // 功能关闭：原生弹窗
                    // 只拦截收获成果弹窗：物品与经验进聚合器，静默期后合并为一条通知
                    try {
                        if (!harvestAgg) harvestAgg = { items: {}, exp: 0, count: 0 };
                        (data.items || []).forEach(function (it) {
                            harvestAgg.items[it.id] = (harvestAgg.items[it.id] || 0) + (it.quantity || 0);
                        });
                        if (data.actionExp && data.actionExp.delta > 0) {
                            harvestAgg.exp += data.actionExp.delta;
                        }
                        harvestAgg.count++;
                        if (harvestAggTimer) clearTimeout(harvestAggTimer);
                        harvestAggTimer = setTimeout(flushAgg, HARVEST_AGG_WINDOW_MS);
                    } catch (e1) { /* 聚合失败不影响收获流程 */ }
                    return null;   // 不渲染弹窗
                }
                return orig(data);
            };
            UI.__nekHarvestPatched = true;
            hlog('收获成果已改为聚合通知（' + HARVEST_AGG_WINDOW_MS / 1000 + ' 秒静默合并，一批只发一条）');
        }

        // ---- 种植页「设置」按钮 + 跳过地块选择面板 ----

        const HARVEST_STATE_TXT = { locked: '未解锁', empty: '空地', growing: '生长中', ready: '可收获' };

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
                    const skipped = loadHarvestSkip()[+btn.dataset.farmId] || [];
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
            const skipped = loadHarvestSkip()[farmId] || [];
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
                    '</span><span class="nek-sp-state">' + (HARVEST_STATE_TXT[pd.state] || pd.state) +
                    (crop ? ' · ' + crop.name : '') + '</span></label>';
            }
            html += '<div class="nek-sp-tip">勾选后自动收获将跳过该地块（手动批量按钮不受影响）</div>';
            panel.innerHTML = html;
            document.body.appendChild(panel);
            const r = anchor.getBoundingClientRect();
            panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 250)) + 'px';
            panel.style.top = Math.min(r.bottom + 6, window.innerHeight - 200) + 'px';
            panel.addEventListener('change', function (e) {
                const cb = e.target;
                if (!cb.dataset || cb.dataset.plot == null) return;
                const idx = parseInt(cb.dataset.plot, 10);
                const map = loadHarvestSkip();
                const arr = map[farmId] || [];
                const pos = arr.indexOf(idx);
                if (cb.checked && pos < 0) arr.push(idx);
                if (!cb.checked && pos >= 0) arr.splice(pos, 1);
                if (arr.length) map[farmId] = arr; else delete map[farmId];
                saveHarvestSkip(map);
                hlog('农场 ' + farmId + ' 跳过地块：' +
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
            const cssHp = [
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
            s.textContent = cssHp;
            document.head.appendChild(s);
        }

        // ---- 队列位置快捷开关（当前行动「取消」按钮左侧，保留独立版原位置） ----

        function injectAutoStyle() {
            if (document.getElementById('nek-harvest-style')) return;
            const cssAuto = [
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
            s.textContent = cssAuto;
            document.head.appendChild(s);
        }

        function paintToggleButton(btn) {
            const on = isHarvestEnabled();
            btn.textContent = '自动收菜：' + (on ? 'ON' : 'OFF');
            btn.classList.toggle('off', !on);
            btn.title = on ? '点击关闭自动收获（仅控制自动收菜；好友农场成熟预览由设置页「农业辅助」开关控制）'
                           : '点击开启自动收获（种植后台自动收获，补种由游戏原生「自动播种」完成）';
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
                        setHarvestEnabled(!isHarvestEnabled());
                        applyHarvestState();   // 同步刷新设置页开关（若打开）
                        hlog('自动收菜已' + (isHarvestEnabled() ? '开启' : '关闭'));
                    });
                }
                paintToggleButton(btn);
            } catch (e) { /* 忽略 */ }
        }

        // ---- 自动收菜主循环 ----

        function harvestTick() {
            if (!isEnabled() || !isFarmAssistEnabled() || !isHarvestEnabled()) return;
            harvestDataTries = 0;   // 每轮主循环重置后台拉数据重试计数
            tickPlanting();
        }

        let harvestStarted = false;

        function initHarvest() {
            if (harvestStarted) return;
            if (typeof game === 'undefined' || typeof UI === 'undefined' ||
                typeof MSG === 'undefined' || typeof Data === 'undefined' || !game.character) {
                setTimeout(initHarvest, 1500);
                return;
            }
            harvestStarted = true;
            hlog('已并入小助手：每 ' + HARVEST_TICK_MS / 1000 + ' 秒后台检查一次（按地块收获，' +
                '初始化直接拉取数据不切页），当前状态：' + (isHarvestEnabled() ? 'ON' : 'OFF') +
                '；农业辅助总开关：' + (isFarmAssistEnabled() ? 'ON' : 'OFF') +
                '（含好友农场成熟预览）');
            patchResultModal();
            patchFriendList();
            injectSkipStyle();
            ensureToggleButton();
            ensureSkipButtons();
            setInterval(ensureToggleButton, 2000);   // 游戏重绘行动区后自动补挂开关按钮
            setInterval(ensureSkipButtons, 1500);    // 种植页重绘后自动补挂设置按钮
            setInterval(harvestTick, HARVEST_TICK_MS);
            setTimeout(harvestTick, 5000);
        }

        // ---------------- 好友农场成熟预览（农业辅助功能之二） ----------------
        // 好友农场列表弹窗的服务器响应（plant_friendList）不含农场数据；进入农场用的
        // plant_friend_data 响应才有完整 planets/farms/plots（state/mature_at/steal_count/
        // stolen_today）。这里包装 UI.showPlantFriendList：弹窗渲染后对每个好友逐个串行
        // 发送探测请求，临时包装 MSG.handlers.plant_friendData 截获响应——uid 匹配的响应
        // 被吞掉（不调原函数，避免 plant_friendData 处理器把界面切到好友农场视图），uid
        // 不匹配的（用户点了「进入农场」触发的真实请求）恢复后原样透传，不影响进入农场。
        // 探测结果渲染为列表行内的「可偷 N · 最近 xx 后成熟」徽标；弹窗关闭即中止剩余探测。
        const FRIEND_PROBE_GAP_MS = 300;      // 相邻两个好友探测之间的间隔
        const FRIEND_PROBE_TIMEOUT_MS = 6000; // 单个好友探测超时（超时按失败跳过）

        function friendPreviewActive() {
            return isEnabled() && isFarmAssistEnabled();
        }

        function patchFriendList() {
            if (typeof UI.showPlantFriendList !== 'function' || UI.__nekFriendPreviewPatched) return;
            const orig = UI.showPlantFriendList.bind(UI);
            UI.showPlantFriendList = function (data) {
                orig(data);
                try {
                    if (friendPreviewActive() && data && (data.friends || []).length) {
                        startFriendPreview(data.friends);
                    }
                } catch (e) { /* 预览失败不影响原弹窗 */ }
            };
            UI.__nekFriendPreviewPatched = true;
        }

        // 剩余时间简写（与游戏原生好友视图倒计时格式一致）
        function formatRemainBrief(sec) {
            if (sec <= 0) return '即将成熟';
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            if (h > 0) return h + 'h' + m + 'm';
            if (m <= 0) return '<1分钟';
            return m + '分钟';
        }

        // 汇总好友全部星球农田：已成熟数/可偷数/最近成熟时间戳。
        // 成熟口径与游戏一致：state=ready，或 growing 且 mature_at 已过（好友视图的
        // startFriendGrowthTimer 同样把过期的 growing 本地转为 ready 并允许偷取）；
        // 可偷口径与原页「可偷 N」角标一致：今日剩余次数>0 且今日未偷过且减产未达上限
        function summarizeFriendPlots(d) {
            const cap = (typeof Data !== 'undefined' && Data.plantStealMaxPercent) ? Data.plantStealMaxPercent : 10;
            const remaining = d.steal_remaining || 0;
            const now = Math.floor(Date.now() / 1000);
            let ready = 0, stealable = 0, nearest = 0;
            (d.planets || []).forEach(function (p) {
                (p.farms || []).forEach(function (f) {
                    (f.plots || []).forEach(function (pl) {
                        if (!pl || pl.state === 'locked') return;
                        const matured = pl.state === 'ready' ||
                            (pl.state === 'growing' && pl.mature_at > 0 && pl.mature_at <= now);
                        if (matured) {
                            ready++;
                            if (remaining > 0 && !pl.stolen_today && (pl.steal_count || 0) < cap) stealable++;
                        } else if (pl.state === 'growing' && pl.mature_at > 0) {
                            nearest = nearest === 0 ? pl.mature_at : Math.min(nearest, pl.mature_at);
                        }
                    });
                });
            });
            return { remaining: remaining, ready: ready, stealable: stealable, nearest: nearest };
        }

        // 单个好友探测：临时包装响应处理器，uid 匹配则截获，超时/不匹配时恢复并兜底
        function probeFriendFarm(uid, onDone) {
            const orig = MSG.handlers.plant_friendData;
            if (typeof orig !== 'function') { onDone(null); return; }
            let settled = false;
            let timer = null;
            const finish = function (d) {
                if (settled) return;
                settled = true;
                if (timer) { clearTimeout(timer); timer = null; }
                MSG.handlers.plant_friendData = orig;
                onDone(d);
            };
            MSG.handlers.plant_friendData = function (data) {
                const d = (data && data.content) || {};
                if (d.friend && Number(d.friend.uid) === Number(uid)) {
                    finish(d.success ? d : null);   // 探测目标的响应：截获吞掉
                } else {
                    // 不是探测目标：是用户点了「进入农场」触发的真实请求，恢复后透传
                    finish(null);
                    orig.call(MSG, data);
                }
            };
            if (!MSG.send('plant_friend_data', { friend_uid: uid })) finish(null);
            timer = setTimeout(function () { finish(null); }, FRIEND_PROBE_TIMEOUT_MS);
        }

        function injectFriendPreviewStyle() {
            if (document.getElementById('nek-friend-preview-style')) return;
            const s = document.createElement('style');
            s.id = 'nek-friend-preview-style';
            s.textContent = [
                '.nek-friend-meta { font-size: 11px; line-height: 1.3; margin-top: 2px; color: #8fa3b0; }',
                '.nek-friend-meta.nek-fp-hot { color: #ffd76e; font-weight: 700; }'
            ].join('\n');
            document.head.appendChild(s);
        }

        // 把汇总结果渲染进好友列表行（追加在在线状态文字下方）
        function paintFriendRow(row, s) {
            let el = row.querySelector('.nek-friend-meta');
            if (!el) {
                el = document.createElement('div');
                el.className = 'nek-friend-meta';
                (row.querySelector('.user-info') || row).appendChild(el);
            }
            let txt = '', hot = false;
            if (s.stealable > 0) {
                txt = '可偷 ' + s.stealable;
                if (s.nearest) txt += ' · 最近 ' + formatRemainBrief(s.nearest - Math.floor(Date.now() / 1000)) + ' 后再熟';
                hot = true;
            } else if (s.ready > 0) {
                txt = s.remaining <= 0 ? '成熟 ' + s.ready + ' · 今日次数已用完' : '成熟 ' + s.ready + ' · 暂不可偷';
            } else if (s.nearest) {
                txt = '最近 ' + formatRemainBrief(s.nearest - Math.floor(Date.now() / 1000)) + ' 后成熟';
            } else {
                txt = '没有种植作物';
            }
            el.textContent = txt;
            el.classList.toggle('nek-fp-hot', hot);
        }

        // 全局串行探测队列：任意时刻只有一个在途探测（wrapper 单槽），快速关/开弹窗时
        // 两个循环的探测不会并发包装同一处理器；row/list 已脱离 DOM 的任务直接跳过
        const friendProbeQueue = [];
        let friendProbeBusy = false;

        function queueFriendProbe(task) {
            friendProbeQueue.push(task);
            pumpFriendProbes();
        }

        function pumpFriendProbes() {
            if (friendProbeBusy) return;
            const t = friendProbeQueue.shift();
            if (!t) return;
            if (!t.list.isConnected || !t.row.isConnected) { pumpFriendProbes(); return; }
            friendProbeBusy = true;
            probeFriendFarm(t.uid, function (d) {
                friendProbeBusy = false;
                if (d && document.body.contains(t.row)) {
                    try { paintFriendRow(t.row, summarizeFriendPlots(d)); } catch (e) { /* 忽略 */ }
                }
                setTimeout(pumpFriendProbes, FRIEND_PROBE_GAP_MS);
            });
        }

        // 逐个串行探测列表中的好友：等上一个响应回来（或超时）再发下一个，避免瞬时
        // 连发大量 plant_friend_data；列表 DOM 被移除（弹窗关闭/点了进入农场）即中止
        function startFriendPreview(friends) {
            const list = document.querySelector('.plant-friend-list');
            if (!list || list.dataset.nekProbed) return;
            const rows = list.querySelectorAll('.plant-friend-item');
            injectFriendPreviewStyle();
            list.dataset.nekProbed = '1';
            let queued = false;
            friends.forEach(function (f, i) {
                if (f && f.uid != null && rows[i]) {
                    queueFriendProbe({ uid: f.uid, row: rows[i], list: list });
                    queued = true;
                }
            });
            if (queued) hlog('好友农场成熟预览：开始探测 ' + queued + ' 位好友的农场');
        }

        // 结构复刻原生「动画效果」区块：
        // .setting-list 包裹各项，setting-name 与 label.slider-container 为平级兄弟，
        // 中间的空 .setting-input 占位把开关推到最右侧（与原生视觉一致）
        function ensureSettingItem() {
            const page = document.querySelector('.page.setting.setting-page');
            if (!page) return;
            const activeTab = page.querySelector('.page-tab-item.active span');
            if (!activeTab || activeTab.textContent.trim() !== '其他') return;
            const content = page.querySelector('.page-main .setting-content');
            if (!content || !content.querySelector('.redeem-code')) return;  // 「其他」页内容未渲染
            if (content.querySelector('.nek-assist-section')) {              // 已插入：仅同步开关状态
                syncToggles(content.querySelector('.nek-assist-section'));
                return;
            }

            const section = document.createElement('div');
            section.className = 'neon-section nek-assist-section';
            section.innerHTML =
                '<div class="section-title">小助手</div>' +
                '<div class="setting-list">' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="启用小助手">启用小助手</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="推算升级所需行动次数">推算升级所需行动次数</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-calc-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="自动获取展示市场行情">自动获取展示市场行情</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-market-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="烹饪页食物/饮料/材料/鱼饵四个列表打通，滚轮可直接滚到任意条目">烹饪列表优化</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-cook-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="生产页改造成烹饪式双栏：左侧单列吸顶分组列表（仅展示名称），右侧为需求与执行详情面板">生产列表优化</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-prod-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="采集页改造成烹饪式双栏：左侧星球吸顶分组列表（仅展示名称），右侧为需求与执行详情面板">采集列表优化</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-pick-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="在采集/生产/烹饪页左侧列表上，对经验效率最高的两种操作标出上升箭头（金色第1名，银色第2名），仅统计当前等级可执行的操作">突出最高效率</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-effmark-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="原子炼金术中选中可用于分解的鱼或钓鱼用拟饵时，若当前选择点金则禁用立即开始/插入队列首/加入队列尾按钮">防呆设置</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-foolproof-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="原子炼金术选择物品界面中增加排序按钮：点金收益/点金经验/研究经验按单次期望产出（含加成与成功率）倒序排列；研究产出拆分为梳毛/采集/钓鱼/生产/烹饪/炼金六类，点击仅显示可产出该类别研究材料的物品并按期望份数倒序排列">点金辅助</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-alcsort-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="点击食物/饮料（背包、市场详情页等）弹出的物品菜单中增加「跳转烹饪」按钮，自动切换到烹饪页并选中对应配方">烹饪食材跳转</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-cookjump-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="农业辅助总开关，同时控制两个功能：①自动收菜——初始化与收获全程后台进行（直接拉取种植数据，不切页不打断操作），每30秒自动收获成熟地块；补种由游戏原生「自动播种」完成（种植页点亮地块右上角圆点后，服务端收获时自动消耗背包种子补种）；收获成果合并为一条顶部通知；种植页每个农场可设置跳过地块。②好友农场成熟预览——好友农场列表弹窗内逐个后台探测好友农场数据，直接显示各好友「可偷 N」与最近成熟倒计时，无需逐个进入农场。当前行动「取消」左侧的「自动收菜」快捷开关仅控制自动收获">农业辅助</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-harvest-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                '</div>';
            content.appendChild(section);

            const master = section.querySelector('.nek-assist-toggle');
            const calc = section.querySelector('.nek-assist-calc-toggle');
            const market = section.querySelector('.nek-assist-market-toggle');
            const cook = section.querySelector('.nek-assist-cook-toggle');
            const prod = section.querySelector('.nek-assist-prod-toggle');
            const pick = section.querySelector('.nek-assist-pick-toggle');
            const effmark = section.querySelector('.nek-assist-effmark-toggle');
            const foolproof = section.querySelector('.nek-assist-foolproof-toggle');
            const alcsort = section.querySelector('.nek-assist-alcsort-toggle');
            const cookjump = section.querySelector('.nek-assist-cookjump-toggle');
            const harvest = section.querySelector('.nek-assist-harvest-toggle');
            master.checked = isEnabled();
            calc.checked = isCalcEnabled();
            market.checked = isMarketEnabled();
            if (cook) cook.checked = isCookEnabled();
            if (prod) prod.checked = isProdEnabled();
            if (pick) pick.checked = isPickEnabled();
            if (effmark) effmark.checked = isEffMarkEnabled();
            if (foolproof) foolproof.checked = isFoolproofEnabled();
            if (alcsort) alcsort.checked = isAlcSortEnabled();
            if (cookjump) cookjump.checked = isCookJumpEnabled();
            if (harvest) harvest.checked = isFarmAssistEnabled();
            master.addEventListener('change', function () {
                setEnabled(master.checked);
                applyEnabledState();
            });
            calc.addEventListener('change', function () {
                setCalcEnabled(calc.checked);
                applyEnabledState();
            });
            market.addEventListener('change', function () {
                setMarketEnabled(market.checked);
                applyEnabledState();
            });
            if (cook) cook.addEventListener('change', function () {
                setCookEnabled(cook.checked);
                applyCookClass();
            });
            if (prod) prod.addEventListener('change', function () {
                setProdEnabled(prod.checked);
                applyProdClass();
            });
            if (pick) pick.addEventListener('change', function () {
                setPickEnabled(pick.checked);
                applyPickClass();
            });
            if (effmark) effmark.addEventListener('change', function () {
                setEffMarkEnabled(effmark.checked);
                applyEffMarkState();
            });
            if (foolproof) foolproof.addEventListener('change', function () {
                setFoolproofEnabled(foolproof.checked);
                applyFoolproofState();
            });
            if (alcsort) alcsort.addEventListener('change', function () {
                setAlcSortEnabled(alcsort.checked);
                applyAlcSortState();
            });
            if (cookjump) cookjump.addEventListener('change', function () {
                setCookJumpEnabled(cookjump.checked);
                applyCookJumpState();
            });
            if (harvest) harvest.addEventListener('change', function () {
                setFarmAssistEnabled(harvest.checked);   // 农业辅助总开关：自动收菜 + 好友成熟预览
                applyHarvestState();   // 同步刷新队列位置快捷开关（其提示文案说明两级开关关系）
            });
        }

        // 页面重渲染导致区块被重建时，把开关勾选态对齐到存储值
        function syncToggles(section) {
            const master = section.querySelector('.nek-assist-toggle');
            const calc = section.querySelector('.nek-assist-calc-toggle');
            const market = section.querySelector('.nek-assist-market-toggle');
            const cook = section.querySelector('.nek-assist-cook-toggle');
            const prod = section.querySelector('.nek-assist-prod-toggle');
            const pick = section.querySelector('.nek-assist-pick-toggle');
            const effmark = section.querySelector('.nek-assist-effmark-toggle');
            const foolproof = section.querySelector('.nek-assist-foolproof-toggle');
            const alcsort = section.querySelector('.nek-assist-alcsort-toggle');
            const cookjump = section.querySelector('.nek-assist-cookjump-toggle');
            const harvest = section.querySelector('.nek-assist-harvest-toggle');
            if (!master || !calc || !market) return;
            if (master.checked !== isEnabled()) master.checked = isEnabled();
            if (calc.checked !== isCalcEnabled()) calc.checked = isCalcEnabled();
            if (market.checked !== isMarketEnabled()) market.checked = isMarketEnabled();
            if (cook && cook.checked !== isCookEnabled()) cook.checked = isCookEnabled();
            if (prod && prod.checked !== isProdEnabled()) prod.checked = isProdEnabled();
            if (pick && pick.checked !== isPickEnabled()) pick.checked = isPickEnabled();
            if (effmark && effmark.checked !== isEffMarkEnabled()) effmark.checked = isEffMarkEnabled();
            if (foolproof && foolproof.checked !== isFoolproofEnabled()) foolproof.checked = isFoolproofEnabled();
            if (alcsort && alcsort.checked !== isAlcSortEnabled()) alcsort.checked = isAlcSortEnabled();
            if (cookjump && cookjump.checked !== isCookJumpEnabled()) cookjump.checked = isCookJumpEnabled();
            if (harvest && harvest.checked !== isFarmAssistEnabled()) harvest.checked = isFarmAssistEnabled();
        }

        function scheduleDecorate() {
            if (decorateScheduled) return;
            decorateScheduled = true;
            setTimeout(function () {
                precomputeActiveCategory();   // 分类页切换后预计算该页全部操作的经验效率
                ensureCookNav();              // 烹饪页分组吸顶折叠（创建/同步/移除）
                ensureProdPanel();            // 生产页双栏面板（创建/同步/移除）
                ensurePickPanel();            // 采集页双栏面板（创建/同步/移除）
                ensureEffMarks();             // 效率 Top2 标识（采集/生产/烹饪列表金银行箭头）
                ensureFoolproof();            // 防呆设置（原子炼金分解用鱼禁用点金按钮）
                ensureAlcSort();              // 点金辅助（原子炼金选择器排序条）
                decorateModal();
                decorateAlchemy();            // 炼金界面：经验效率 + 升级次数计算 + 快捷填入
                ensureSettingItem();
                decorateMarketMarkers();
            }, 120);   // 防抖：弹窗/设置页/说明面板 DOM 稳定后再处理
        }

        new MutationObserver(scheduleDecorate)
            .observe(document.body, { childList: true, subtree: true });
        scheduleDecorate();
        hookBuildItemInfo();
        hookShowItemMenu();   // 烹饪食材跳转（物品菜单注入「跳转烹饪」按钮）
        applyCookClass();   // 启动时按开关状态应用烹饪列表优化
        applyProdClass();   // 启动时按开关状态应用生产列表优化
        applyPickClass();   // 启动时按开关状态应用采集列表优化
        applyEffMarkState();   // 启动时按开关状态应用效率 Top2 标识
        applyFoolproofState();   // 启动时按开关状态应用防呆设置
        applyAlcSortState();   // 启动时按开关状态应用点金辅助
        applyCookJumpState();   // 启动时清理残留的跳转按钮（正常为空操作）
        initHarvest();   // 启动自动收菜（等待游戏就绪后挂载主循环与队列位置开关）
    };

    // 注入页面上下文执行
    function inject() {
        if (!document.head) { setTimeout(inject, 50); return; }
        const s = document.createElement('script');
        s.textContent = '(' + BOOT.toString() + ')();';
        document.head.appendChild(s);
        s.remove();
    }
    inject();
})();
