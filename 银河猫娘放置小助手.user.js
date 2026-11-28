// ==UserScript==
// @name         银河猫娘放置小助手
// @namespace    https://nekoidle.com/
// @version      1.58.7
// @description  v1.58.7：生产回包 remove 按背包堆叠 ID 反查真实用料——替换食材/多倍行动不再误用配方原物品或把堆叠 ID 当物品 ID；记账时机与差额口径不变。v1.58.6——移植远端逐层补货计划——库存核算页新增「查看补货计划」，按双阈值汇总预警物品，递归展开配方并合并建议采购/计划生产/需自行获取数量。v1.58.5——修正手动价语义——仅生产成品手动录入的综合单价锁定，生产消耗批次的手动价参与上游价重算。v1.58.4——成品综合单价悬浮显示完整价格计算公式；预警浮窗拆为数值与当日峰值百分比双条件，均为 0 关闭。v1.58.3——生产成品改为一个队列一条批次，材料跨种类/跨批次成本合计后除以总产出得综合单价；旧拆分批次自动合并；缺报价与补录重算按队列生效。v1.58.2——库存核算新增清空数据按钮、移除物品无需二次确认；缺报价与补录重算支持历史批次（按同队列消耗反推来源）。v1.58.1——库存核算不再自动纳入新进仓库物品；生产成品按 FIFO 来源批次拆分单价，缺价显示「XX物品缺报价」并在补录后自动重算，手动录入价优先。v1.58.0——修复生产账本补记反复触发云同步（低优先级合并 + 相同内容不重复上传）；库存核算标签前置并修复物品详情跳转；展开斑马纹悬浮查看批次细节；物品列收窄一半、预警列后加删除按钮；队列按钮行新增库存提醒按钮。v1.57.0——新增库存核算页（成本核算页第二标签）——按「初始库存（仓库无货填0）+ 借贷流水」记账，批次明细逐列对齐、初始库存置顶、借/贷方向标注、预警列显示实时比例，市场分类筛选+搜索选物品，市场交易与历史记录标记式校验，流水保留最近200条并纳入云同步；物品菜单「库存成本」改为「库存核算」跳转。v1.56.0——修复部分成交收购单的库存成本——结算项自带 side/price，改为直接按结算项的求购单价核算（side=2 入库、item=1 金币找零排除），分批成交分别点领取各自按该批成交价入库加权，不再依赖订单列表。v1.55.0——挂单收购物品后库存成本不更新修复：挂单成交先进结算池、领取才入库，领取时按结算 order_id 从订单取真实成交价，入库回包按该价加权（本地有库存但未录成本时直接采用成交价）；移除挂单回包误清空暂存单价与 120 秒过期限制。v1.54.0——成本核算材料树复用游戏原生交互——悬浮材料名显示物品文字说明、点击弹出原生物品菜单（含查看辞典/兑换/库存成本）；成本核算清单与库存成本数据的写入纳入云同步标记（增改条目、录入/清空库存成本、市场买入加权后立即触发上传），不再依赖其他操作顺带上传。v1.53.0——成本核算卡片展开标题左侧加三角指示（展开后旋转）；市场详情只对生产/烹饪成品显示「精算」按钮；成本核算（侧栏入口+精算）改为独立设置开关并纳入云同步；烹饪/生产/采集列表优化、点金辅助、农业辅助五项合并为设置页「生产采集界面优化」一个开关。v1.52.0——库存成本输入限两位小数；小计括号差额为 +0 时不显示；成本核算清单与库存成本纳入云同步（整份覆盖、归一化比对）；云同步改为连续 3 条修改或停止修改 5 秒后上传，云端旧脚本无法本地覆盖的字段暂存并在上传时原样带回。v1.51.0——成本核算卡片改为「直接买入材料」「从基础原料制作」两个可展开块——前者仅列一层直接材料、含库存成本列与按出售/收购小计的括号差额（正数绿字、负数红字），后者列完整逐层树、无库存成本列与括号；展开状态跨重绘保留。v1.50.0——修复小计括号差额：中间产物自身录有库存成本时按它核算，不再误展开子节点显示 +0；成本核算页改为复用主脚本行情 API（含 v1.44.4 单物品强刷修复），缺报价材料恢复行情后自动重绘，不再另拉全量快照自造取数。v1.49.0——修复替换食材按钮尺寸（不再覆盖原生 .btn 字号/内边距）；「仓库成本」改名「库存成本」，录入浮窗改确定/清空/取消三按钮；悬停物品行情新增库存成本行；成本表用量并入材料列（x数字）、第二列改库存成本，最终小计括号显示市场小计−库存合计差额。v1.48.0——物品菜单新增彩色像素图标「仓库成本」（背包无该物品时隐藏，录入浮窗默认填左一价，确定保存、点外部关闭），市场买入后按库存与成交价加权更新本地成本；替换食材按钮与删除按钮等高；面包等战斗掉落物改标「战斗掉落」。v1.47.1——修复成本核算侧栏图标显示样式差异、精算按钮样式，选择浮层筛选点击消失与图标重叠（全部档不显示第二层），采集/掉落类食材误标「配方不可用」，替换食材改用游戏原生选择界面。v1.47.0——成本核算界面改炼金式两层筛选图标网格（全部/生产/烹饪各四分支）；侧栏入口换趋势图表图标；市场详情收藏旁新增「精算」按钮一键加入/剔除清单；成本核算支持烹饪配方与「食材重构」替代食材（研究 126 解锁后显示替换按钮）。v1.46.2——修复全量市场快照漏物品（如无卖单的松露意面）时误判「暂无市场行情」——缺底数先走单物品强刷确认，失败延时重试，快照到达后恢复同物品其他等级。v1.46.1——统一成本核算入口的侧栏文字样式，并换用表格图标。v1.46.0——成本核算支持自选清单与宽屏双列。v1.45.2——收紧成本表，材料用量与双侧报价分列对齐。v1.45.1——修复成本核算页展开长配方后无法滚动的问题。v1.45.0——新增奇点科技生产成本核算，可逐层展开至采集和梳毛原料。v1.44.3——修复云同步开关与预约恢复、研究账号切换、定时钓鱼队列恢复及构建校验。v1.44.2——修复研究队列云同步「已完成研究复活」竞态——云端旧队列覆盖本地时，按游戏实时等级过滤掉目标已达成的条目（与 plan()/settleSubmitted 同口径，含正在研究任务 +1），比对时同口径过滤避免每次刷新误报覆盖。v1.44.1——toolbar「手动云同步」按钮改为与签到按钮同款青色发光样式（文字由「同步」改「手动云同步」）。v1.44.0——云同步新增市场「我的收藏」同步（localStorage.favorite 的 itemId 数组，归一化去重排序后入 payload；挂钩 Utils.setData 自动上传；云端覆盖前弹窗对比两端收藏数量由用户决定整份覆盖）+ toolbar 签到按钮旁新增「同步」按钮（仅上传本地到云端，不拉取）。v1.43.7——修复刷新时误报「云端已覆盖本地」——开关按脚本真实语义归一化比对（null 或 1 都=开、0=关），null 与 1 不再判为不同；研究按钮缺料红框内发光改呼吸动画。v1.43.6——研究队列按钮缺料提示——队首材料确实不足（复用研究队列已有的 researchStatus 判定）时，快捷按钮红边框 + 红色内发光、字保持黑色，title 补注「队首材料不足，等待补充」。v1.43.5——pull 绑定到游戏主界面顶栏 toolbar-container——进入游戏（含刷新、回退登录页后重新进入）时各发一次 GET，同一节点只拉一次、回退清空以允许再拉；服务端 GET/GET 与 PUT/PUT 各自 2 秒限流、两者互不干扰。v1.43.4——修复刷新不发 pull：从 document-idle 延后到主界面就绪后再拉。v1.43.3——云同步 uid 安全加固——覆盖/上传前实时校验当前游戏玩家 uid（pull 请求前后双闸、push 上传前后双闸、flush 检测账号切换丢弃旧状态），防止 A 回退登录页后 B 登录被 A 的云端配置串号覆盖。v1.43.2——云同步与脚本加载并行——4 个 init 立即执行不等网络，服务端不可达/挂起都不影响加载（单次请求 3 秒超时）；启动只 pull 不 push，拉取后与本地比对，一致不覆盖不通知，仅云端覆盖本地 / push 成功 / push 失败三类用通知栏反馈；回退登录页不 push、不 pull；未登录不同步、不等待 uid；设置页云同步开关，本地设置/研究队列/钓鱼预约变化时 2 秒节流自动上传；首次开启云端有数据则二选一，无数据静默启用；钓鱼预约新增 day 日期字段跨日不同步；队列条目去 submitted、本地租约不进 payload；明文 JSON + XOR/Base64 混淆传输。自动收菜按钮 60 秒往返进度 CSS keyframes 动画；研究队列（预留材料与自动结算）、自动接受任务/领奖、市场行情、采集/生产/烹饪详情优化、防呆设置、点金辅助、农业辅助（自动收菜+好友农场预览）、检查更新、定时钓鱼、炼金经验效率与越级计算等，详见脚本正文。
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
        const LS_COST_KEY = 'nek_assistant_cost_enabled'; // 成本核算（侧栏入口 + 市场精算按钮）总开关
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
        
            cloudMark();};
        const isCalcEnabled = () => {
            try { return localStorage.getItem(LS_CALC_KEY) !== '0'; } catch (e) { return true; }
        };
        const setCalcEnabled = v => {
            try { localStorage.setItem(LS_CALC_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isMarketEnabled = () => {
            try { return localStorage.getItem(LS_MARKET_KEY) !== '0'; } catch (e) { return true; }
        };
        const setMarketEnabled = v => {
            try { localStorage.setItem(LS_MARKET_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isCostEnabled = () => {
            try { return localStorage.getItem(LS_COST_KEY) !== '0'; } catch (e) { return true; }
        };
        const setCostEnabled = v => {
            try { localStorage.setItem(LS_COST_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
            cloudMark();};
        const isCookEnabled = () => {
            try { return localStorage.getItem(LS_COOK_KEY) !== '0'; } catch (e) { return true; }
        };
        const setCookEnabled = v => {
            try { localStorage.setItem(LS_COOK_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isProdEnabled = () => {
            try { return localStorage.getItem(LS_PROD_KEY) !== '0'; } catch (e) { return true; }
        };
        const setProdEnabled = v => {
            try { localStorage.setItem(LS_PROD_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isPickEnabled = () => {
            try { return localStorage.getItem(LS_PICK_KEY) !== '0'; } catch (e) { return true; }
        };
        const setPickEnabled = v => {
            try { localStorage.setItem(LS_PICK_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isEffMarkEnabled = () => {
            try { return localStorage.getItem(LS_EFFMARK_KEY) !== '0'; } catch (e) { return true; }
        };
        const setEffMarkEnabled = v => {
            try { localStorage.setItem(LS_EFFMARK_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isFoolproofEnabled = () => {
            try { return localStorage.getItem(LS_FOOLPROOF_KEY) !== '0'; } catch (e) { return true; }
        };
        const setFoolproofEnabled = v => {
            try { localStorage.setItem(LS_FOOLPROOF_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isAlcSortEnabled = () => {
            try { return localStorage.getItem(LS_ALCSORT_KEY) !== '0'; } catch (e) { return true; }
        };
        const setAlcSortEnabled = v => {
            try { localStorage.setItem(LS_ALCSORT_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isCookJumpEnabled = () => {
            try { return localStorage.getItem(LS_CJ_KEY) !== '0'; } catch (e) { return true; }
        };
        const setCookJumpEnabled = v => {
            try { localStorage.setItem(LS_CJ_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
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
            // 手机窄屏（≤768px，与游戏移动端断点一致）：安卓网页端适配。
            // 游戏为响应式单构建（同一 DOM，media query 切换布局），脚本插入的元素同样生效，
            // 但原生 .modal-action-repeat 为 flex 无 wrap：行宽 = 次数输入框 + 1/10/100 + 脚本的
            // 升级次数/可执行次数按钮 + ∞ ≈ 420px，小屏详情区仅 ~340px，尾部（可执行次数、∞）
            // 被裁剪出可视区——表现为「只见升级按钮不见可执行按钮」。允许换行并收窄控件：
            '@media (max-width: 768px) {',
            '  .modal-action-repeat { flex-wrap: wrap; row-gap: 4px; }',
            '  .modal-action-repeat .repeat-input { width: 34px; padding: 2px 4px; }',
            '  .modal-action-repeat .btn.quick-set { min-width: 34px; padding: 0 5px; }',
            '  .nek-target-row { flex-wrap: wrap; }',
            '  .nek-target-input { width: 52px; padding: 2px 5px; }',
            '}',
            // 「跳转烹饪」按钮自绘图标（28×28 像素画：平底锅煎蛋）。
            // 复用 .menu-icon 的尺寸/缩放/像素化渲染，仅覆盖雪碧图为 data URI
            '.nek-icon-cook { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAA9klEQVR42mNgGAVDDfDwCPyHYbpY5uEVBcc0sxTmI5hFK1bto52F6L4qKesg34eENCBbBrKIJMuQIxuGQQZgE6eKZTBNxGCyLUP2CbpGbBhdHbpFBC0jZJGcnBpRFpMUhMhJGYaxAZDl6A5ADmKiLUS36N2HL3D865oPXouJshCb70AGIFsGsujPm2lgDGKjW4zsU4KWolsIczGpFhLtS5iFyL6DWQizFGYJCN9booHXQpilZPkQHWCLQ7J9iM+X+AA235GccGCG4LMYXQ3Z2QI9oxPCZOVDapY0JFVBlJSlFDUjyKktqNr4IaY+pFlbZbQdSggAAEtvOeHNBzFVAAAAAElFTkSuQmCC");',
            '  background-position: 0 0; }',
            // 「仓库成本」按钮自绘图标（28×28 像素画：账本与笔），与 nek-icon-cook 同款渲染。
            '.nek-icon-warehouse-cost { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAABSUlEQVR4AeyWoU4DQRCGB2wlsrVVJJSAQvAGIEkFwfAaPAUWgUE1WDBIDApCNbaVCAS6zddkkr3t7s3sbVPVJn9md2fm/zbTXnr7suXPDrjxgTdG2u+PFrWybtgAUjx77snn2XAl1iWi39Ia0GqozdvA40cRj5w3sYFOI6vs6PJugbYG1Au5gaPxk+SkZqmov3rNuYHTyY3kpGZxBMbZ7PVa3s8n8vv1Im4gjSVSGD1/bw+EldzAknGGMCiH9z1BrN1A7zhjGBDVfD7dcwO1qWsERq8bmBsp5xgNrv4JSSmMpBuYGynng+EYr6RCGAVuIMUplcDorwKWwqqAXWCdgV1hPuD3rUigNhiGlqq+w9CcN4Nwn1uvAXmeTj9+BLGOlTI6OLkQ6lK5+KwB5JmxFBuw519A+9i3qQFsK9ScGsdR81YsBlqGVn4JAAD//8mI1+cAAAAGSURBVAMATcbmOR0f3R4AAAAASUVORK5CYII=");',
            '  background-position: 0 0; }'
        ].join('\n');
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        // ---------------- 工具 ----------------
        const fmt = n => Number(n).toLocaleString('zh-CN');

        // 数量格式：与原生 formatQuantityNumber 同款（最多两位小数去尾零）
        // v1.33.2 提升为模块级：此前定义在生产详情函数内，炼金卡片装饰（v1.32 起巨匠
        // 双倍几率提示）与行动弹窗巨匠省料提示越界引用，巨匠率 > 0 时抛 ReferenceError
        // 被单卡 catch 静默吞掉——升级按钮已插入、可执行按钮与经验效率块丢失
        function fmtQ(n) {
            const r = Math.round(n * 100) / 100;
            return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '');
        }

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
        
            cloudMark();};

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
            // 数量格式 fmtQ 已提升为模块级（工具区）
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
            // v1116 生活装备（机器人·巨匠）：仅生产行动(6)省料——材料需求 ×(1-省料率)，可为 0；
            // 腰带·幸运：额外奖励几率与原生同乘区（研究幸运/10 + 装备幸运/100）
            let masterRate = 0;
            if (+action.action === 6) {
                try {
                    masterRate = Math.max(0, Number(game.getLifeMasterRate(game.getLifeBonusActionType(action.action)) || 0));
                } catch (eMR) { masterRate = 0; }
            }
            let lifeLucky = 0;
            try {
                lifeLucky = Math.max(0, Number(game.lifeBonus?.[game.getLifeBonusActionType(action.action)]?.luck || 0));
            } catch (eLL) { lifeLucky = 0; }
            // v1116 宝箱预览：复用原生 UI.getActionChestPreview（梳毛9812/采集9813+9814/生产9815），
            // 几率 = 执行时长/除数(25920/17280) × 幸运倍率，函数内部已读生活装备幸运；
            // 返回项 luckyApplied=true（几率已含幸运）、noBonus=true（数量不受加成与倍数影响）
            let chestRewards = [];
            try {
                if (typeof UI.getActionChestPreview === 'function') {
                    chestRewards = UI.getActionChestPreview(action, researchLucky) || [];
                }
            } catch (eC) { chestRewards = []; }
            // 越级提示：黄/橙/红三档与原生 showActionModal 文案一致（红档=无法执行）；
            // 非适用行动（无越级机制的技能）红档显示「等级不足」
            const timePct = Math.round((ol.timeRate - 1) * 100);
            const overNote = ol.status === 'yellow'
                ? `<div class="action-level-note recommend-yellow">低于推荐等级 ${ol.diff} 级：耗时增加 ${timePct}%</div>`
                : ol.status === 'orange'
                    ? `<div class="action-level-note recommend-orange">低于推荐等级 ${ol.diff} 级：耗时增加 ${timePct}%，成功率 ${ol.successRate}%，失败无产出${+action.action === 6 ? '，不消耗材料' : ''}</div>`
                    : ol.status === 'red'
                        ? (ol.applicable
                            ? `<div class="action-level-note recommend-red">低于推荐等级 ${ol.diff} 级：无法执行</div>`
                            : `<div class="action-level-note recommend-red">等级不足：需要 Lv.${action.level}，当前 Lv.${(game.getLevelInfo(action.action) || {}).level || 1}</div>`)
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
                ${(action.extraRewards || chestRewards.length) ? '<div class="cooking-detail-section"><div class="modal-container-title">额外奖励</div></div>' : ''}
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
                    // v1116 巨匠省料：生产行动需求 ×(1-省料率)，可出现小数（原生同口径两位小数展示），
                    // 执行校验/持有置灰按 Math.ceil(need-1e-9)（与游戏 canPerformAction 一致）
                    const needBase = item.quantity * (1 - masterRate);
                    const startNeed = Math.ceil(needBase - 1e-9);
                    const req = document.createElement('div');
                    req.className = 'action-item-container';
                    req.innerHTML = `
                        <div class="action-item-container-icon"></div>
                        <div class="action-item-container-info">
                            <div class="action-item-container-text"><span>${itemDef.name}</span></div>
                            <div class="action-item-container-text"><span>需要</span><span class="nek-need-val" data-nek-base="${needBase}">${fmtQ(needBase)}</span></div>
                            <div class="action-item-container-text quantity-display${quantity < startNeed ? ' disabled' : ''}">
                                <span>持有</span><span class="quantity-value">${Utils.formatNumberWithCommas(quantity)}</span>
                            </div>
                        </div>
                    `;
                    const icon = req.querySelector('.action-item-container-icon');
                    const loot = document.createElement('div');
                    UI.showItem(loot, itemDef, { quantity: Math.round(needBase * 100) / 100 });
                    icon.appendChild(loot);
                    loot.addEventListener('click', () => UI.showItemMenu(loot, { itemDef: itemDef }));
                    UI.bindItemTooltip(loot, itemDef, { item: { quantity: Math.round(needBase * 100) / 100, id: itemDef.id, enhancement: 0 } });
                    list.appendChild(req);
                    const key = `${item.itemId}-0`;
                    UI.actionItemMap.set(key, {
                        element: req,
                        needQuantity: startNeed,
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
                    ? `<span class="nek-reward-val${item.noBonus ? ' nek-reward-fixed' : ''}" data-nek-min="${baseMin}" data-nek-max="${baseMax}">${fmtQ(baseMax)}</span>`
                    : `<span class="nek-reward-val${item.noBonus ? ' nek-reward-fixed' : ''}" data-nek-min="${baseMin}" data-nek-max="${baseMax}">${fmtQ(baseMin)}&nbsp;~&nbsp;${fmtQ(baseMax)}</span>`;
                const curProf = game.proficiency?.action?.[action.id] || 0;
                // 阶差转化标注：主奖励且乘区 >1 时，在数量与几率之间显示（与原生 action-overlevel-rate 一致）
                const overRateHtml = (!isExtra && overLevelMultiplier > 1)
                    ? `<div class="action-item-container-text action-overlevel-rate"><span class="stat-sub">(×${fmtQ(overLevelMultiplier * 100)}%)</span></div>` : '';
                let chance = Number(item.chance) || 0;
                // v1116：额外奖励几率乘「研究幸运/10 + 生活装备幸运/100」（原生同乘区；宝箱已提前算入不重复）
                if (isExtra && !item.luckyApplied && chance > 0 && chance < 100 && (researchLucky > 0 || lifeLucky > 0)) {
                    chance = Math.min(100, chance * (1 + Math.max(0, researchLucky) / 10 + lifeLucky / 100));
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

            if ((action.extraRewards || chestRewards.length) && sectionByTitle('额外奖励')) {
                const extraList = document.createElement('div');
                extraList.className = 'action-item-container-list';
                (action.extraRewards || []).forEach(item => renderReward(item, extraList, true));
                // v1116 宝箱：几率已含幸运加成（luckyApplied），数量固定 1 不随加工倍数放大（noBonus）
                chestRewards.forEach(item => renderReward(item, extraList, true));
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
            // 倍数切换：材料「需要」×m（省料基准含小数，parseFloat；持有不足联动置灰）、产物区间 ×m、
            // actionItemMap 的 needQuantity 同步（游戏实时刷新持有量时按新需求判断）
            function updateCraftMultDisplay() {
                detailEl.querySelectorAll('.nek-need-val').forEach(sp => {
                    const base = parseFloat(sp.dataset.nekBase) || 0;
                    const need = base * craftMult;
                    sp.textContent = fmtQ(need);
                    const row = sp.closest('.action-item-container');
                    const qd = row ? row.querySelector('.quantity-display') : null;
                    if (qd) {
                        // 持有数文字带千分位逗号（Utils.formatNumberWithCommas），parseInt 在逗号处
                        // 截断（如 12,000 → 12），导致持有恒判不足、选倍率后一直显示红色；
                        // 先去掉非数字字符再解析（游戏实时刷新也会重写该文字，读最新值）
                        const qvRaw = ((qd.querySelector('.quantity-value') || {}).textContent || '').replace(/[^\d]/g, '');
                        const qv = parseInt(qvRaw, 10);
                        if (isFinite(qv) && qvRaw !== '') qd.classList.toggle('disabled', qv < Math.ceil(need - 1e-9));
                    }
                });
                detailEl.querySelectorAll('.nek-reward-val').forEach(sp => {
                    if (sp.classList.contains('nek-reward-fixed')) return;   // 宝箱等 noBonus 物品：数量固定不放大（与原生一致）
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
                        const need = (parseFloat(sp.dataset.nekBase) || 0) * craftMult;
                        map.needQuantity = Math.ceil(need - 1e-9);
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
                // 红（差 ≥15 级 / 非适用行动等级不足）：三个执行按钮统一拦截（与原生同口径）
                if (ol.status === 'red') {
                    UI.notifier.show(ol.applicable
                        ? `低于推荐等级 ${ol.diff} 级，无法执行，需要 Lv.${action.level}，当前 Lv.${expinfo.level}`
                        : `等级不足，无法执行，需要 Lv.${action.level}，当前 Lv.${expinfo.level}`, 'error');
                    return;
                }
                if (action.requirements) {
                    for (const req of action.requirements) {
                        // v1116：生产行动按巨匠省料后的需求校验（与游戏 canPerformAction 同口径）
                        const need = req.quantity * (1 - masterRate) * craftMult;
                        if (game.getItemQuantity(req.itemId) < Math.ceil(need - 1e-9)) {
                            const itemDef = game.getItem(req.itemId);
                            UI.notifier.show(`${itemDef.name} 不足，无法开始该行动`, 'error');
                            return;
                        }
                    }
                }
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

        // 解析 formatNumber 风格的数值文本（支持千分位逗号、小数与 万/亿/兆/京/K/M/B/T 单位）
        function mkParseNumUnit(numStr, unit) {
            try {
                let v = parseFloat(String(numStr).replace(/[,，]/g, ''));
                if (!isFinite(v)) return 0;
                const factors = { '万': 1e4, '亿': 1e8, '兆': 1e12, '京': 1e16, 'K': 1e3, 'M': 1e6, 'B': 1e9, 'T': 1e12 };
                if (unit && factors[unit]) v *= factors[unit];
                return v;
            } catch (e) { return 0; }
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
        let cookMultBound = false;   // 烹饪份数单选联动（委托监听只绑一次）

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
                // 统一改为沿祖先链向上找第一个包含该文本的节点，两种场景通用且更精确。
                // v1.37.5：经验行经 Utils.formatNumber 渲染，≥1 万时显示「1.2万」等缩写，
                // 正则需支持小数与 万/亿/兆/京/K/M/B/T 单位（否则高级装备/行动无按钮）
                let node = rep;
                let xm = null;
                while (node && node !== document.documentElement) {
                    xm = (node.textContent || '').match(/([\u4e00-\u9fa5]{1,4})经验值\s*([\d,，]+(?:\.[\d,，]+)?)(万|亿|兆|京|K|M|B|T)?\s*点/);
                    if (xm) break;
                    node = node.parentElement;
                }
                // 缓存联动：识别当前动作（提前到经验解析前，供类型兜底与精确经验计算）
                const action = identifyAction(node);
                if (!xm) return;
                let per = mkParseNumUnit(xm[2], xm[3]);
                let type = typeByName(xm[1]);
                if (!type && action) type = +action.action;   // 文本技能名解析失败时用识别结果兜底
                if (!per || per <= 0 || !type) return;
                // 精确口径：识别到动作时用游戏同款 calcExpWithBonus 覆盖文本解析值——
                // formatNumber 万进制缩写（1.2万）最多保留两位小数，直接用会有舍入误差。
                // 烹饪(type 7)经验行有自己的口径（份数/越级折减），保持文本解析不动
                if (action && type !== 7) {
                    try {
                        const exact = Math.round(game.calcExpWithBonus(action.xp,
                            game.getResearchFacilityIdForAction(action) || 0));
                        if (exact > 0) per = exact;
                    } catch (eX) { /* 忽略 */ }
                }

                // 单次耗时（秒）：容器文本「时间 X 秒」（游戏/面板均已按越级倍率折算的实际耗时）
                const tm = (node.textContent || '').match(/时间\s*([\d.]+)\s*秒/);
                const perSec = tm ? parseFloat(tm[1]) : null;

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
                // 满级（nextLevelRemainExp<=0）：升级次数按钮与目标等级计算无意义，清掉残留；
                // 但「经验效率」与「背包可执行次数」仍然有效——v1.36.0 起不再整体 return
                // （旧版在此直接 return，导致满级用户两个按钮和等级计算模块全部消失）
                const isMaxLevel = !(info.nextLevelRemainExp > 0);
                if (isMaxLevel) {
                    const staleBtn = rep.querySelector('.nek-lvl-btn');
                    if (staleBtn) staleBtn.remove();
                    const prevEff = rep.previousElementSibling;
                    if (prevEff && prevEff.classList.contains('nek-eff-block')) {
                        const staleRow = prevEff.querySelector('.nek-target-row');
                        if (staleRow) staleRow.remove();
                        const staleRes = prevEff.querySelector('.nek-target-result');
                        if (staleRes) staleRes.remove();
                    }
                }

                if (!isMaxLevel) {
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
                }   // end if (!isMaxLevel)：满级跳过升级次数按钮

                // 「背包可执行次数」按钮：升下一级次数按钮后方——按材料需求逐项
                // floor(持有/需要) 取最小值；烹饪用当前激活食谱的材料（伪动作不带 requirements）
                let invTimes = null;
                let invSrc = null;
                let invCookNative = false;   // 烹饪：已按原生口径（巨匠省料/份数/食材重构）折算
                if (action && action.requirements && action.requirements.length) {
                    invSrc = action.requirements;
                } else if (type === 7) {
                    try {
                        const r = (document.querySelector('.cooking-page') || {})._activeRecipe;
                        if (r && r.ingredients && r.ingredients.length) {
                            // v1.32 巨匠改版：烹饪优先用原生折算（机器人巨匠省料 + 批量份数 + 食材重构替代），
                            // 与游戏弹窗的可执行次数完全同口径；原生不可用时回退旧口径（原始食材原量）
                            if (typeof UI !== 'undefined' && typeof UI.getCookingMaterialMaxCount === 'function') {
                                let cookMult = 1;
                                try {
                                    const radio = document.querySelector('input[name="cooking-multiplier-' + r.id + '"]:checked');
                                    cookMult = radio ? Math.max(1, parseInt(radio.value, 10) || 1) : 1;
                                } catch (eCM) { /* 份数取不到按 1 份 */ }
                                const nativeCnt = UI.getCookingMaterialMaxCount(r, cookMult, {});
                                if (nativeCnt != null) {
                                    invTimes = nativeCnt;
                                    invCookNative = true;
                                } else {
                                    invSrc = r.ingredients;
                                }
                            } else {
                                invSrc = r.ingredients;
                            }
                            // 份数单选切换后重算（委托监听只绑一次）
                            if (!cookMultBound) {
                                cookMultBound = true;
                                document.addEventListener('change', function (eCB) {
                                    const t = eCB.target;
                                    if (t && t.type === 'radio' && /^cooking-multiplier-/.test(t.name || '')) scheduleDecorate();
                                });
                            }
                        }
                    } catch (e4) { /* 忽略 */ }
                }
                // v1116：生产行动(6)按巨匠省料后的需求折算（与游戏 getActionCanPerformCount 同口径）
                let invMasterRate = 0;
                if (action && +action.action === 6) {
                    try {
                        invMasterRate = Math.max(0, Number(game.getLifeMasterRate(game.getLifeBonusActionType(action.action)) || 0));
                    } catch (eMR2) { invMasterRate = 0; }
                }
                if (invSrc) {
                    invTimes = Infinity;
                    invSrc.forEach(function (req) {
                        const need = (req.quantity || 1) * (1 - invMasterRate);
                        if (need <= 0) return;   // 巨匠省料 100%：该材料消耗为 0，不构成约束（公告：材料消耗可为 0）
                        const have = game.getItemQuantity(req.itemId) || 0;
                        invTimes = Math.min(invTimes, Math.floor(have / need));
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
                    if (lvlBtnEl || bInf) {   // 满级无升级按钮时以 ∞ 档为锚点（v1.36.0）
                        // 悬停提示：具体可执行次数 + 预计需要时间（invTimes × 单次耗时，越级惩罚已计入 perSec）
                        const invTimeStr = perSec ? fmtDuration(invTimes * perSec) : null;
                        const invTitle = '【小助手】当前背包材料最多可执行 ' + fmt(invTimes) + ' 次' +
                            (invTimeStr ? '，预计需要 ' + invTimeStr : '') +
                            (invMasterRate > 0 ? '（巨匠省料 ' + fmtQ(invMasterRate * 100) + '%：按每份 ' + fmtQ(1 - invMasterRate) + ' 个材料折算）' : '') +
                            (invCookNative ? '（烹饪按机器人巨匠省料/批量份数/食材重构折算，与游戏同口径）' : '') +
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
                            if (lvlBtnEl) lvlBtnEl.after(invBtn);   // 升级次数按钮后方（∞ 之前）
                            else bInf.before(invBtn);               // 满级无升级按钮：插到 ∞ 之前
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
                    // 满级：经验效率仍有参考价值，但「现有等级—目标等级」计算无意义 → 不生成目标等级行
                    eff.innerHTML =
                        '<div class="nek-eff-row">经验效率：<span class="nek-eff-val' + (effColorCls ? ' ' + effColorCls : '') + '">' + effDisp + '</span></div>' +
                        (isMaxLevel ? '' :
                        '<div class="nek-eff-row nek-target-row">' +
                            '<input class="nek-target-input nek-target-from" type="number" min="1" placeholder="现有等级">' +
                            '<span class="nek-target-dash">—</span>' +
                            '<input class="nek-target-input" type="number" min="1" placeholder="目标等级">' +
                            '<div class="btn quick-set nek-target-btn">计算</div>' +
                        '</div>' +
                        '<div class="nek-target-result"></div>');
                    const effVal = eff.querySelector('.nek-eff-val');
                    effVal.dataset.nekKey = effKey;
                    const tFrom = eff.querySelector('.nek-target-from');
                    const tInput = eff.querySelector('.nek-target-input:not(.nek-target-from)');
                    const tBtn = eff.querySelector('.nek-target-btn');
                    const tRes = eff.querySelector('.nek-target-result');
                    if (tBtn) {
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
                    }   // end if (tBtn)：满级无目标等级行时跳过绑定
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
                try { decorateAlchemyCard(card, i); } catch (e) { console.warn('[小助手] 炼金卡片装饰失败(卡' + i + ')：', e); }
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
                // v1.32 巨匠改版：炼金机器人巨匠 = 双倍行动几率（lifeBonus[10].master，百分比），
                // 触发时该次结算消耗 2 份材料、获得 2 份结果 → 按单次消耗估算的可执行次数偏乐观
                let alchDbl = 0;
                try {
                    alchDbl = Math.max(0, Number((game.lifeBonus || {})[10] && game.lifeBonus[10].master || 0));
                } catch (eAD) { alchDbl = 0; }
                const invTitle = '【小助手】当前背包材料最多可执行 ' + fmt(invTimes) + ' 次' +
                    (invTimeStr ? '，预计需要 ' + invTimeStr : '') +
                    (invDetail ? invDetail : '') +
                    (alchDbl > 0 ? '（炼金巨匠双倍行动 ' + fmtQ(alchDbl) + '%：触发时该次结算消耗 2 份材料、获得 2 份结果，实际可执行次数可能更少）' : '') +
                    '，点击填入执行次数。';
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
        const mkRetryTimers = new Map();  // key -> timeout，缺快照时单物品强刷失败后的重试
        let mkBulkAt = 0;                 // 上次全量获取成功时间
        let mkBulkInFlight = null;

        const MK_WAITING = '获取市场数据中……';
        const MK_FAILED = '市场数据获取失败';
        const MK_NODATA = '暂无市场行情';   // 全量快照确认无该物品/强化等级数据时终止等待

        // 全量获取：页面首次加载 & 缓存过期时触发（一次请求覆盖全部可交易物品）
        function mkEnsureBulk() {
            if (!isEnabled() || !isMarketEnabled()) return Promise.resolve();
            if (typeof game === 'undefined' || typeof game.loadMarketCache !== 'function') return Promise.resolve();
            if (mkBulkAt && Date.now() - mkBulkAt < MK_CACHE_TTL) return Promise.resolve();
            if (mkBulkInFlight) return mkBulkInFlight;
            const pending = Promise.resolve(game.loadMarketCache(!!mkBulkAt)).then(function (m) {
                mkBulkInFlight = null;
                if (!m || !m.size) return;   // 服务端未返回数据：不记时间，下次取数时重试
                mkBulkAt = Date.now();
                document.querySelectorAll('.nek-market[data-nek-key]').forEach(function (el) {
                    mkRefreshEl(el);
                });
                document.dispatchEvent(new CustomEvent('nek-market-quote-updated'));
            }).catch(function () { mkBulkInFlight = null; });
            mkBulkInFlight = pending;
            return pending;
        }

        // 读取全量缓存中某物品某强化等级的条目
        function mkLevelOf(id, enh) {
            try {
                const s = game.marketCacheData.get(Number(id));
                if (!s || !Array.isArray(s.levels) || !s.levels[enh]) return null;
                return s.levels[enh];
            } catch (e) { return null; }
        }

        // 本地库存成本：与增强模块共用 nek_warehouse_cost_v1:<uid> 存储键，按物品 id 取单件成本。
        function mkStockCost(id) {
            try {
                const uid = game?.character?.uid;
                if (!uid || !(Number(id) > 0)) return null;
                const map = JSON.parse(localStorage.getItem('nek_warehouse_cost_v1:' + uid) || '{}');
                const saved = map && map[String(id)];
                if (saved == null || String(saved).trim() === '') return null;
                const value = Number(saved);
                return Number.isFinite(value) && value >= 0 ? value : null;
            } catch (e) { return null; }
        }

        // 全量快照中是否缺少该物品/强化等级。注意：全量接口会漏物品，
        // 命中此分支只代表「底数缺失」，不等于服务端确实无行情，须经单物品强刷确认。
        function mkNoData(id, enh) {
            try {
                const s = game.marketCacheData && game.marketCacheData.get(Number(id));
                if (!s) return true;
                return !(Array.isArray(s.levels) && s.levels[enh]);
            } catch (e) { return false; }
        }

        // 将某 key 的全部标记置为「暂无行情」。不写入 mkCache：后续全量重拉若数据出现，
        // mkEnsureBulk 到达后会重新走 mkRefreshEl 自动恢复
        function mkMarkNoData(key) {
            document.querySelectorAll('.nek-market[data-nek-key="' + key + '"]').forEach(function (el) {
                el.textContent = MK_NODATA;
                el.dataset.state = 'fail';
            });
        }

        // 单物品强制刷新：清官方缓存后走 getMarketCache，服务端返回该物品最新快照。
        // noDataFallback=true（全量快照缺底数）时，只有单物品接口也确认无该等级才标记无行情；
        // 超时/失败则保留占位并延时重试，避免永久停在「获取市场数据中……」。
        function mkForceItem(id, enh, key, noDataFallback) {
            if (mkItemInFlight.has(key)) return;
            if (Date.now() - (mkItemLastTry.get(key) || 0) < 5000) return;
            mkItemLastTry.set(key, Date.now());
            try { game.clearMarketCache(Number(id)); } catch (e0) { /* 忽略 */ }
            const p = game.getMarketCache(Number(id)).then(function (s) {
                mkItemInFlight.delete(key);
                if (!s) {   // 超时/无响应：保留原显示，延时重试
                    if (noDataFallback) mkScheduleRetry(id, enh, key);
                    return;
                }
                if (!Array.isArray(s.levels) || !s.levels[enh]) {
                    if (noDataFallback && mkBulkAt && Date.now() - mkBulkAt < MK_CACHE_TTL) mkMarkNoData(key);
                    return;
                }
                mkCache.set(key, { lv: s.levels[enh], at: Date.now() });
                mkRenderKey(key);
                mkRefreshId(id);   // 同物品其他等级若曾挂起/误判，随新快照一并恢复
                document.dispatchEvent(new CustomEvent('nek-market-quote-updated', { detail: { id: Number(id) } }));
            }).catch(function () {
                mkItemInFlight.delete(key);
                if (noDataFallback) mkScheduleRetry(id, enh, key);
            });
            mkItemInFlight.set(key, p);
        }

        // 缺底数强刷失败后的延时重试：标记已离开 DOM 或已有底数则放弃
        function mkScheduleRetry(id, enh, key) {
            if (mkRetryTimers.has(key)) return;
            const t = setTimeout(function () {
                mkRetryTimers.delete(key);
                if (mkCache.has(key) || !document.querySelector('.nek-market[data-nek-key="' + key + '"]')) return;
                mkForceItem(id, enh, key, true);
            }, 6000);
            mkRetryTimers.set(key, t);
        }

        // 单物品快照到达后，重算同物品尚未就绪的标记（不额外发请求）
        function mkRefreshId(id) {
            document.querySelectorAll('.nek-market[data-nek-id="' + id + '"]').forEach(function (el) {
                if (el.dataset.state !== 'ok') mkRefreshEl(el);
            });
        }

        // 四行行情：行1 左一/右一，行2 刚交价/今日成，行3 库存成本，行4 下次刷新（倒计时单独维护）。
        // 标签与数值分列渲染，配合 CSS 网格让「右一价」「今日成」标签起始位置对齐
        function mkLineHtml(lv, id) {
            const sell = lv && lv.sell_price != null ? fmt(lv.sell_price) : '暂无';
            const buy = lv && lv.demand_price != null ? fmt(lv.demand_price) : '暂无';
            const last = lv && lv.last_price != null ? fmt(lv.last_price) : '暂无';
            const vol = lv && lv.volume != null ? fmt(lv.volume) : '-';
            const stock = mkStockCost(id);
            return '<div class="nek-market-row">' +
                '<span class="nek-mk-lbl">左一价：</span><span class="nek-mk-val">' + sell + '</span>' +
                '<span class="nek-mk-lbl">右一价：</span><span class="nek-mk-val">' + buy + '</span></div>' +
                '<div class="nek-market-row">' +
                '<span class="nek-mk-lbl">刚交价：</span><span class="nek-mk-val">' + last + '</span>' +
                '<span class="nek-mk-lbl">今日成：</span><span class="nek-mk-val">' + vol + '</span></div>' +
                '<div class="nek-market-row nek-mk-stock">' +
                '<span class="nek-mk-lbl">库存成本：</span><span class="nek-mk-val">' + (stock == null ? '缺报价' : fmt(stock)) + '</span></div>' +
                '<div class="nek-market-row nek-mk-next">下次刷新：--秒</div>';
        }

        // 渲染某 key 的全部挂载标记，并启动该 key 的倒计时
        function mkRenderKey(key) {
            const c = mkCache.get(key);
            const retry = mkRetryTimers.get(key);
            if (retry) { clearTimeout(retry); mkRetryTimers.delete(key); }
            document.querySelectorAll('.nek-market[data-nek-key="' + key + '"]').forEach(function (el) {
                if (!c) { el.textContent = MK_FAILED; el.dataset.state = 'fail'; return; }
                el.dataset.state = 'ok';
                el.innerHTML = mkLineHtml(c.lv, el.dataset.nekId);
            });
            if (c) mkStartCountdown(key);
        }

        // 库存成本在浮窗保存/清空或市场买入后变化，立即刷新已展开的行情块。
        if (!window.__nekStockCostListener) {
            window.__nekStockCostListener = true;
            document.addEventListener('nek-stock-cost-updated', function () {
                document.querySelectorAll('.nek-market[data-nek-key][data-state="ok"]').forEach(function (el) {
                    mkRenderKey(el.dataset.nekKey);
                });
            });
        }

        // 行情取数统一出口：成本核算等增强模块复用这里的缓存、全量刷新与
        // v1.44.4 单物品强刷修复（全量快照缺物品时不再直接判无行情）。
        window.__NEK_MARKET__ = {
            ensureBulk: function () { return mkEnsureBulk(); },
            quote: function (id, enh) {
                const key = Number(id) + ':' + (Number(enh) || 0);
                const cached = mkCache.get(key);
                if (cached) {
                    if (Date.now() - cached.at >= MK_CACHE_TTL) mkForceItem(id, enh, key);
                    return cached.lv || null;
                }
                const lv = mkLevelOf(id, enh);
                if (!lv) mkForceItem(id, enh, key, true);
                return lv || null;
            }
        };

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
                // 全量快照缺底数不等于无行情（实测：松露意面 id 5003 有求购/成交，
                // 但全量 market_cache_all 漏了该物品）。先走单物品强刷确认；
                // 只有强刷也查不到该等级，才标记「暂无市场行情」。
                if (mkBulkAt && Date.now() - mkBulkAt < MK_CACHE_TTL && mkNoData(id, enh)) {
                    mkForceItem(id, enh, key, true);
                }
                return;
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

        // NEK_ENHANCEMENTS_START
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
        const nekEnhancements = createNekEnhancements({
            game: () => typeof game !== 'undefined' ? game : null,
            ui: () => typeof UI !== 'undefined' ? UI : null,
            msg: () => typeof MSG !== 'undefined' ? MSG : null,
            data: () => typeof Data !== 'undefined' ? Data : null,
            cookingChestDivisor: typeof CHEST_TIME_DIVISOR_COOKING !== 'undefined' ? CHEST_TIME_DIVISOR_COOKING : 21600,
            enabled: isEnabled, costEnabled: isCostEnabled, identifyAction, document, window,
            // low=账本自动补记：静默写入 + 合并到较长窗口后的一次上传，避免连续生产刷屏。
            cloudMarkLow: () => { try { cloud.markDirty(true); } catch (e) { /* 忽略 */ } },
            storage: { getItem: k => localStorage.getItem(k), setItem: (k, v, silent) => { localStorage.setItem(k, v); if (!silent && ((k.indexOf('nek_enhancements_v1:') === 0 && k.indexOf(':lease') === -1) || k.indexOf('nek_cost_items_v1:') === 0 || k.indexOf('nek_warehouse_cost_v1:') === 0 || k.indexOf('nek_inventory_ledger_v1:') === 0 || k === 'nek_stock_buffer_percentage')) cloudMark(); }, removeItem: k => localStorage.removeItem(k) }
        });
        // NEK_ENHANCEMENTS_END

        // ---------------- 设置页开关（游戏设置 → 其他） ----------------
        function applyEnabledState() {
            if (!isEnabled() || !isCalcEnabled()) {
                document.querySelectorAll('.nek-lvl-btn').forEach(b => b.remove());
            }
            if (!isEnabled() || !isMarketEnabled()) {
                hideTip();
                document.querySelectorAll('.nek-market').forEach(b => b.remove());
            }
            if (!isEnabled() || !isCostEnabled()) {
                document.querySelectorAll('.nek-cost-entry, .nek-market-cost, .page.nek-cost').forEach(b => b.remove());
            }
            applyCookClass();
            applyProdClass();
            applyPickClass();
            applyEffMarkState();
        }

        // ---------------- 自动收菜（原独立脚本「猫娘自动收菜 v2.3.0」并入，全后台化） ----------------
        // 每 30 秒检查一次：通过 UI.plantState 读取各地块状态（state=ready，或 growing 且
        // mature_at 已过——快照可能滞后于实际成熟，与游戏自身判定同口径），对可收获且未
        // 上原生地块锁的地块直接发送收获消息（锁定地块另由 MSG.send 中央拦截兜底）。
        // 初始化与收发全程后台进行：不切页、不抢焦点、不遮挡操作。
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
        // 进度条时钟锚点：60 秒动画循环 = 两个检测周期（前 30 秒绿色覆盖黄底，
        // 后 30 秒黄色覆盖绿色）。锚点在 harvestTick 里按「距上个锚点 ≥ 1.5 个周期
        // 才重置」推进（每两个检测点重置一次），与 setInterval 实际触发时刻严格同步，
        // 按钮中途创建时进度条直接显示当前真实进度（不另起独立计时）
        let harvestCycleStartAt = 0;
        const HARVEST_BAR_COVER = '#97c459';     // 进度条覆盖色（收获绿，v1.34.1 用户选定方案C）
        function markHarvestTick() {
            const now = Date.now();
            if (!harvestCycleStartAt || now - harvestCycleStartAt >= HARVEST_TICK_MS * 1.5) {
                harvestCycleStartAt = now;
                // 锚点重置即重启 CSS 动画并跳到当前相位（每 60 秒一次，替代旧的 rAF 逐帧写背景）
                document.querySelectorAll('.nek-harvest-toggle').forEach(function (btn) {
                    syncHarvestAnimation(btn, true);
                });
            }
        }
        const LS_HARVEST_KEY = 'nek_harvest_enabled';     // 队列快捷开关（仅自动收菜），沿用独立版键名
        const LS_FARM_KEY = 'nek_farm_assist_enabled';    // 农业辅助总开关：自动收菜 + 好友农场成熟预览
        const isHarvestEnabled = () => {
            try { return localStorage.getItem(LS_HARVEST_KEY) !== '0'; } catch (e) { return true; }
        };
        const setHarvestEnabled = v => {
            try { localStorage.setItem(LS_HARVEST_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        const isFarmAssistEnabled = () => {
            try { return localStorage.getItem(LS_FARM_KEY) !== '0'; } catch (e) { return true; }
        };
        const setFarmAssistEnabled = v => {
            try { localStorage.setItem(LS_FARM_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        // 设置页合并项：烹饪/生产/采集列表优化 + 点金辅助 + 农业辅助共用一个开关。
        // 底层保留各自的 localStorage 键，兼容旧版本脚本与云同步字段；任一项开启即视为合并项开启。
        const isUiOptEnabled = () => isCookEnabled() || isProdEnabled() || isPickEnabled() || isAlcSortEnabled() || isFarmAssistEnabled();
        const setUiOptEnabled = v => {
            setCookEnabled(v); setProdEnabled(v); setPickEnabled(v); setAlcSortEnabled(v); setFarmAssistEnabled(v);
        };
        const applyUiOptState = () => {
            applyCookClass(); applyProdClass(); applyPickClass(); applyAlcSortState(); applyHarvestState();
        };
        // 开关切换后统一刷新队列位置按钮的文案与样式
        const applyHarvestState = () => {
            document.querySelectorAll('.nek-harvest-toggle').forEach(btn => paintToggleButton(btn));
        };
        function hlog() {
            const args = [].slice.call(arguments);
            args.unshift(HARVEST_TAG);
            console.log.apply(console, args);
        }

        // ---- 核心：按地块直接收发消息（不依赖页面 DOM） ----

        // 遍历所有农场：fn(farm, planet)
        // （v1.34.0 起跳过机制改用游戏原生「地块锁」，脚本不再维护跳过配置）
        function eachFarm(fn) {
            const ps = UI.plantState;
            if (!ps || !ps.planets) return;
            ps.planets.forEach(function (p) {
                (p.farms || []).forEach(function (farm) {
                    fn(farm, p);
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
                        },
                        // v1118 播种开关/地块锁响应走 updatePlot：骨架补齐最小实现
                        updatePlot: function (farmId, plotIndex, plotData) {
                            const farms = [];
                            (this.planets || []).forEach(p => (p.farms || []).forEach(f => farms.push(f)));
                            const farm = farms.find(f => f.id === farmId);
                            if (!farm) return;
                            if (!farm.plots) farm.plots = [];
                            farm.plots[plotIndex] = plotData || { state: 'empty' };
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

        // ---- 补种观察：因种子不足导致自动播种未生效的提醒（v1.38.0） ----
        // 收获发送时记录开启了原生「自动播种」的地块及其作物（crop_id 即种子物品 id）；
        // 响应落定后（下一轮 30 秒判定）地块变回 empty 而背包已无该种子 → 种子不足未补种，
        // 按作物聚合提醒。铲除/上锁/手动改种不受影响：观察表只记录本次收获发送的地块，判定后即清除。
        const REPLANT_JUDGE_DELAY = 6000;            // 发送后至少等响应落定再判定
        const REPLANT_NOTIFY_GAP = 10 * 60 * 1000;   // 同一作物提醒节流（10 分钟）
        const replantWatch = {};     // { farmId: { plotIdx: { crop_id, at } } }
        const replantNotifyAt = {};  // { cropId: 上次提醒时间戳 }

        function judgeReplant() {
            try {
                const now = Date.now();
                const shortages = {};   // cropId -> 未补种地块数
                eachFarm(function (farm) {
                    const w = replantWatch[farm.id];
                    if (!w) return;
                    (farm.plots || []).forEach(function (pd, i) {
                        const e = w[i];
                        if (!e) return;
                        if (now - e.at < REPLANT_JUDGE_DELAY) return;   // 等响应落定
                        delete w[i];
                        if (!pd || !pd.state) return;          // 数据缺失不误报
                        if (pd.state !== 'empty') return;      // 已补种（growing/ready/locked）
                        let q = -1;
                        try { q = game.getItemQuantity(e.crop_id); } catch (err) { return; }
                        if (q > 0) return;   // 背包仍有种子：非种子不足（时序或其他原因），不报
                        shortages[e.crop_id] = (shortages[e.crop_id] || 0) + 1;
                    });
                });
                const ids = Object.keys(shortages).map(Number).filter(function (id) {
                    return !(replantNotifyAt[id] && now - replantNotifyAt[id] < REPLANT_NOTIFY_GAP);
                });
                if (!ids.length) return;
                const total = ids.reduce(function (s, id) { return s + shortages[id]; }, 0);
                const parts = ids.map(function (id) {
                    replantNotifyAt[id] = now;
                    const item = typeof game !== 'undefined' && game.getItem(id);
                    return (item && item.name ? item.name : '#' + id) + '×' + shortages[id];
                });
                const msg = '自动收菜：种子不足，' + total + ' 块地未补种——' + parts.join('、') +
                    '（请补充种子，或先关闭这些地块的自动播种）';
                if (UI.notifier && UI.notifier.show) UI.notifier.show(msg, 'error', 8000);
                hlog(msg);
            } catch (e) { /* 忽略 */ }
        }

        // 可收获且未上原生地块锁的地块 → 逐块发送收获消息；补种由服务端原生「自动播种」完成
        function tickPlanting() {
            try {
                if (typeof UI === 'undefined' || typeof MSG === 'undefined') return;
                if (!UI.plantState || !(UI.plantState.planets || []).length) {
                    ensurePlantState();   // 后台拉取种植数据，不打断当前页面
                    return;
                }
                harvestDataTries = 0;   // 数据已就位，重置失败计数（否则 3 次失败后永不重试）
                judgeReplant();         // 先判定上一轮收获的补种观察（响应此时已落定）
                let sent = 0;
                let noAuto = 0;
                eachFarm(function (farm) {
                    (farm.plots || []).forEach(function (pd, i) {
                        if (!isHarvestable(pd)) {
                            if (pd && pd.state !== 'ready') clearPending(pendingHarvest, farm.id, i);
                            return;
                        }
                        // v1118 原生地块锁（plot_lock）：服务端批量收获/自动播种跳过锁定地块，
                        // 但单块收获不校验（已实测可收走）——这里不发请求，配合下方 MSG.send
                        // 中央拦截双保险
                        if (pd.plot_lock) return;
                        if (pendingFresh(pendingHarvest, farm.id, i)) return;   // 在途，等响应
                        markPending(pendingHarvest, farm.id, i);
                        // 开启了原生自动播种的地块进入补种观察（种子不足未补种时提醒）
                        if (pd.auto_enabled && pd.crop_id) {
                            (replantWatch[farm.id] = replantWatch[farm.id] || {})[i] =
                                { crop_id: pd.crop_id, at: Date.now() };
                        }
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

        // ---- 原生地块锁保护（v1.34.0 起替代脚本自带的「跳过地块」配置） ----
        // 跳过需求统一交给游戏原生「地块锁」（plot_lock，地块右上角 🔒）：服务端批量收获
        // 与自动播种都会跳过锁定地块。但实测（2026-11-19）发现服务端对【单块收获】
        // plant_harvest {farm_id, plot_index} 并不校验 plot_lock，锁定地块会被正常收走。
        // 这里做两层客户端防护：
        //  ① 中央拦截：包装 MSG.send，凡是发往锁定地块的单块收获请求直接拦下并提示；
        //  ② 视觉防护：种植页周期扫描，给锁定地块的「收获」按钮置灰禁点，防止误点击。

        const LOCK_TIP = '该地块已上锁（原生地块锁），收获已被小助手拦截';

        function installHarvestGuard() {
            if (MSG.__nekLockGuard) return;
            MSG.__nekLockGuard = true;
            const origSend = MSG.send;
            MSG.send = function (type, data) {
                if (type === 'plant_harvest' && data && data.farm_id !== undefined &&
                    data.plot_index !== undefined && UI.plantState && UI.plantState.planets) {
                    for (let pi = 0; pi < UI.plantState.planets.length; pi++) {
                        const farms = UI.plantState.planets[pi].farms || [];
                        for (let fi = 0; fi < farms.length; fi++) {
                            if (farms[fi].id === data.farm_id) {
                                const pd = (farms[fi].plots || [])[data.plot_index];
                                if (pd && pd.plot_lock) {
                                    if (UI.notifier && UI.notifier.show) {
                                        UI.notifier.show('该地块已上锁（原生地块锁），收获已拦截', 'error', 3000);
                                    }
                                    hlog('已拦截锁定地块收获：农场 ' + data.farm_id +
                                        ' 地块 ' + (Number(data.plot_index) + 1));
                                    return;
                                }
                            }
                        }
                    }
                }
                return origSend.call(MSG, type, data);
            };
            hlog('锁定地块收获拦截已启用（服务端单块收获不校验原生地块锁，客户端兜底）');
        }

        function injectLockGuardStyle() {
            if (document.getElementById('nek-lockguard-style')) return;
            const cssLg = [
                '.plant-plot .plot-harvest-btn.nek-lock-disabled { pointer-events: none; opacity: .35;',
                '  filter: grayscale(1); -webkit-filter: grayscale(1); }'
            ].join('\n');
            const s = document.createElement('style');
            s.id = 'nek-lockguard-style';
            s.textContent = cssLg;
            document.head.appendChild(s);
        }

        // 周期扫描：种植页（自见视图）锁定地块的「收获」按钮置灰。游戏重绘地块后会重建 DOM，
        // 因此跟随注入循环周期刷新；好友农场视图（view !== 'self'）不动原生交互。
        function protectLockedHarvestBtns() {
            try {
                if (!document.querySelector('.sidebar-item.action-3.active')) return;
                if (!UI.plantState || UI.plantState.view !== 'self') return;
                document.querySelectorAll('.plant-farm .plant-plot').forEach(function (plotEl) {
                    const hBtn = plotEl.querySelector('.plot-harvest-btn');
                    if (!hBtn) return;
                    const locked = !!plotEl.querySelector('.plot-lock-btn.active');
                    hBtn.classList.toggle('nek-lock-disabled', locked);
                    if (locked && hBtn.title !== LOCK_TIP) hBtn.title = LOCK_TIP;
                });
            } catch (e) { /* 忽略 */ }
        }

        // ---- 队列进度条下方按钮行（自动收菜 / 定时钓鱼 / 研究队列快捷入口） ----
        // v1.42.0 起快捷按钮从当前行动「取消」左侧迁移到游戏队列进度条（.active-container）
        // 下方：header 是 flex column，在其末尾追加 .nek-queue-buttons 一行即可，
        // 游戏重绘行动区不影响本行；按钮沿用原类名与样式（绘制/点击逻辑不变）。

        function injectQueueRowStyle() {
            if (document.getElementById('nek-queue-row-style')) return;
            const s = document.createElement('style');
            s.id = 'nek-queue-row-style';
            s.textContent = [
                // header 原为固定高度 + overflow:hidden，按钮行存在时放开高度让它自然增高
                'header:has(> .nek-queue-buttons) { height: auto; min-height: 94px; }',
                // header::before 是全 header 的扫描线蒙版（absolute，z-index:2），
                // 按钮行需提升到蒙版之上，否则按钮上会蒙一层灰色横纹
                '.nek-queue-buttons { position: relative; z-index: 3; display: flex;',
                '  justify-content: flex-end; gap: 6px; align-items: center; height: 24px; }',
                // 研究队列按钮：样式与另外两个按钮一致（金色底 + 黑边 + 加粗），off 态同灰米色
                '.nek-research-queue-toggle { position: relative; padding: 0 8px; border-radius: 4px; color: #333;',
                '  background: var(--c-warning, #ffd93b); text-align: center; cursor: pointer;',
                '  transition: all .2s ease; font-weight: 700; font-family: system-ui; font-size: 12px;',
                '  height: 20px; line-height: 20px; letter-spacing: 1px;',
                '  border: 2px solid var(--c-black, #000); white-space: nowrap; }',
                '.nek-research-queue-toggle:hover { filter: brightness(1.15); -webkit-filter: brightness(1.15); }',
                '.nek-research-queue-toggle.off { background: #f3f3ca; color: #939393; }',
                // 材料确实不足（队列自动开研等待补充）时：红边框 + 红色内发光呼吸，字保持黑色 #333
                '@keyframes nek-research-lack-breathe {',
                '  0%, 100% { box-shadow: inset 0 0 3px 0 rgba(255,48,33,0.45); border-color: rgba(255,48,33,0.65); }',
                '  50% { box-shadow: inset 0 0 9px 2px rgba(255,48,33,0.95); border-color: rgb(255,48,33); }',
                '}',
                '.nek-research-queue-toggle.nek-research-lack { border-color: rgb(255,48,33);',
                '  animation: nek-research-lack-breathe 1.6s ease-in-out infinite; }',
                // 库存提醒按钮：与研究队列按钮同款；库存不足时复用同一红色内发光呼吸动画。
                '.nek-stock-alert-toggle { position: relative; padding: 0 8px; border-radius: 4px; color: #333;',
                '  background: var(--c-warning, #ffd93b); text-align: center; cursor: pointer;',
                '  transition: all .2s ease; font-weight: 700; font-family: system-ui; font-size: 12px;',
                '  height: 20px; line-height: 20px; letter-spacing: 1px;',
                '  border: 2px solid var(--c-black, #000); white-space: nowrap; }',
                '.nek-stock-alert-toggle:hover { filter: brightness(1.15); -webkit-filter: brightness(1.15); }',
                '.nek-stock-alert-toggle.nek-stock-short { border-color: rgb(255,48,33);',
                '  animation: nek-research-lack-breathe 1.6s ease-in-out infinite; }'
            ].join('\n');
            document.head.appendChild(s);
        }

        function ensureQueueButtonRow() {
            const header = document.querySelector('header');
            const active = document.querySelector('.active-container');
            if (!header || !active) return null;
            injectQueueRowStyle();
            let row = header.querySelector(':scope > .nek-queue-buttons');
            if (!row) {
                row = document.createElement('div');
                row.className = 'nek-queue-buttons';
                header.appendChild(row);   // 紧跟 .active-container（进度条）之后
            }
            return row;
        }

        function injectAutoStyle() {
            if (document.getElementById('nek-harvest-style')) return;
            const cssAuto = [
                '.nek-harvest-toggle { position: relative; overflow: hidden; padding: 0 8px; border-radius: 4px; color: #333;',
                '  background: var(--c-warning, #ffd93b); text-align: center; cursor: pointer;',
                '  transition: all .2s ease; font-weight: 700; font-family: system-ui; font-size: 12px;',
                '  height: 20px; line-height: 20px; letter-spacing: 1px;',
                '  border: 2px solid var(--c-black, #000); white-space: nowrap; }',
                '.nek-harvest-toggle:hover { filter: brightness(1.15); -webkit-filter: brightness(1.15); }',
                '.nek-harvest-toggle.off { background: #f3f3ca; color: #939393; }',
                // v1.42.6：进度条改 CSS keyframes，仿游戏原生队列进度条——JS 不再每帧写 background
                '.nek-harvest-fill { position: absolute; top: 0; left: 0; width: 0; height: 100%;',
                '  pointer-events: none; z-index: 1; border-radius: 2px; }',
                '.nek-harvest-fill.green { background: ' + HARVEST_BAR_COVER + ';',
                '  animation: nek-harvest-green ' + (HARVEST_TICK_MS * 2) + 'ms linear forwards; }',
                '.nek-harvest-fill.yellow { background: var(--c-warning, #ffd93b);',
                '  animation: nek-harvest-yellow ' + (HARVEST_TICK_MS * 2) + 'ms linear forwards; }',
                '.nek-harvest-label { position: relative; z-index: 2; }',
                '.nek-harvest-toggle.off .nek-harvest-fill { display: none; }',
                '@keyframes nek-harvest-green { 0% { width: 0; } 50%, 100% { width: 100%; } }',
                '@keyframes nek-harvest-yellow { 0%, 50% { width: 0; } 100% { width: 100%; } }'
            ].join('\n');
            const s = document.createElement('style');
            s.id = 'nek-harvest-style';
            s.textContent = cssAuto;
            document.head.appendChild(s);
        }

        // v1.42.6：CSS 动画相位对齐。JS 只在「锚点重置 / 按钮重建 / OFF→ON」时写一次
        // animation-delay，之后逐帧由浏览器合成器推进（与游戏原生队列进度条同思路）。
        // 负 delay 让动画立即跳到当前实际进度；先置 none + 强制重排以重置动画 startTime。
        function syncHarvestAnimation(btn, force) {
            const fills = btn.querySelectorAll('.nek-harvest-fill');
            if (!fills.length) return;
            if (!force && btn._nekAnchor === harvestCycleStartAt) return;
            btn._nekAnchor = harvestCycleStartAt;
            const elapsed = harvestCycleStartAt ? Math.max(0, Date.now() - harvestCycleStartAt) : 0;
            const delay = '-' + elapsed + 'ms';
            fills.forEach(function (el) { el.style.animation = 'none'; });
            void btn.offsetWidth;   // 强制重排，确保 none 生效并重置动画 startTime
            fills.forEach(function (el) {
                el.style.animation = '';
                el.style.animationDelay = delay;
            });
        }

        function paintToggleButton(btn) {
            const on = isHarvestEnabled();
            let label = btn.querySelector('.nek-harvest-label');
            if (!label) {
                // 首次挂载：底层黄 + 绿覆盖层 + 黄覆盖层 + 文字层（文字始终保持最上层）
                btn.textContent = '';
                const green = document.createElement('i');
                green.className = 'nek-harvest-fill green';
                const yellow = document.createElement('i');
                yellow.className = 'nek-harvest-fill yellow';
                label = document.createElement('span');
                label.className = 'nek-harvest-label';
                btn.appendChild(green);
                btn.appendChild(yellow);
                btn.appendChild(label);
                btn._nekAnchor = null;
            }
            const text = '自动收菜：' + (on ? 'ON' : 'OFF');
            if (label.textContent !== text) label.textContent = text;
            if (btn._nekOn !== on) {
                btn._nekOn = on;
                btn.classList.toggle('off', !on);
                if (on) syncHarvestAnimation(btn, true);   // OFF→ON：fill 从 display:none 恢复，重新对齐相位
            }
            const title = on ? '点击关闭自动收获（仅控制自动收菜；好友农场成熟预览由设置页「农业辅助」开关控制）'
                             : '点击开启自动收获（种植后台自动收获，补种由游戏原生「自动播种」完成）';
            if (btn.title !== title) btn.title = title;
            syncHarvestAnimation(btn);   // 锚点变化时对齐（2 秒轮询兜底，正常由 markHarvestTick 立即触发）
        }

        function ensureToggleButton() {
            try {
                injectAutoStyle();
                const row = ensureQueueButtonRow();
                if (!row) return;
                let btn = row.querySelector('.nek-harvest-toggle');
                if (!btn) {
                    btn = document.createElement('div');
                    btn.className = 'nek-harvest-toggle';
                    btn.addEventListener('click', function () {
                        setHarvestEnabled(!isHarvestEnabled());
                        applyHarvestState();   // 同步刷新设置页开关（若打开）
                        hlog('自动收菜已' + (isHarvestEnabled() ? '开启' : '关闭'));
                    });
                    row.appendChild(btn);
                }
                paintToggleButton(btn);
            } catch (e) { /* 忽略 */ }
        }

        // ---- 自动收菜主循环 ----

        function harvestTick() {
            markHarvestTick();   // 进度条时钟锚点：无论开关状态都推进（与检测时刻严格同步）
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
                '（含好友农场成熟预览）；跳过机制 = 游戏原生地块锁');
            patchResultModal();
            patchFriendList();
            installHarvestGuard();
            injectLockGuardStyle();
            ensureToggleButton();
            ensureResearchQueueButton();
            ensureStockAlertButton();
            ensureQuestFullBadge();
            setInterval(ensureToggleButton, 2000);      // 游戏重绘行动区后自动补挂开关按钮
            setInterval(ensureResearchQueueButton, 1000);   // 研究队列按钮：每秒刷新文字/进度并自动补挂
            setInterval(ensureStockAlertButton, 1000);    // 库存提醒：每秒刷新预警状态（无变化不写 DOM）
            setInterval(ensureQuestFullBadge, 30000);   // 任务侧栏「满」角标：每 30 秒核对合同数，满员显示、未满自动移除
            setInterval(protectLockedHarvestBtns, 1500); // 种植页重绘后重新置灰锁定地块的收获按钮
            setInterval(harvestTick, HARVEST_TICK_MS);
            setTimeout(harvestTick, 5000);
            // v1.42.6：进度条改由 CSS keyframes 驱动，不再 rAF 逐帧写 background。
            // 锚点由 harvestTick → markHarvestTick 每 60 秒重置并立即对齐动画相位；
            // ensureToggleButton 每 2 秒兜底补挂按钮、核对文字/开关状态（正常不写 DOM）。
        }

        // ---------------- 好友农场成熟预览（农业辅助功能之二） ----------------
        // 好友农场列表弹窗的服务器响应（plant_friendList）不含农场数据；进入农场用的
        // plant_friend_data 响应才有完整 planets/farms/plots（state/mature_at/steal_count/
        // stolen_today）。这里包装 UI.showPlantFriendList：弹窗渲染后对每个好友逐个串行
        // 发送探测请求，经由常驻中央拦截器截获探测响应（uid 白名单精确区分），渲染为
        // 列表行内的「可偷 N · 最近 xx 后成熟」徽标。
        //
        // 旧方案（v1.26~v1.32）在探测期间临时替换 MSG.handlers.plant_friendData，存在
        // 竞态 bug：用户点「进入农场」的响应先于探测响应到达时先透传（正常渲染目标
        // 农场），随后迟到的探测响应落回原处理器——把界面切到探测目标的农场，即
        // 「点 A 却进入另一个好友的农场」。新方案常驻包装 plant_friendData 与 send：
        //  - send 侧：非探测发出的 plant_friend_data 一律视为用户导航（记录 pendingUserUid
        //    并中止当前探测，其迟到响应加入吞掉名单）
        //  - 响应侧：pendingUserUid 匹配 → 透传渲染农场；探测目标匹配 → 截获；吞掉名单
        //    匹配 → 静默丢弃；其余 → 原样透传
        //
        // 探测结果按 uid 缓存 2 分钟：缓存命中直接绘制徽标（零请求、秒开），仅对
        // 无缓存/已过期的好友发起探测；用户进入某好友农场时其缓存视为最新并回填。
        const FRIEND_PROBE_GAP_MS = 300;      // 相邻两个好友探测之间的间隔
        const FRIEND_PROBE_TIMEOUT_MS = 6000; // 单个好友探测超时（超时按失败跳过）
        const FRIEND_CACHE_TTL_MS = 120000;   // 预览结果缓存时长（2 分钟）

        // uid → { at, s }：最近一次探测汇总（s 为 summarizeFriendPlots 结果，nearest 为
        // 绝对时间戳，倒计时在绘制时计算，缓存期内依旧准确）
        const friendPreviewCache = new Map();

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

        // 中央拦截器状态：探测请求绕过包装直接走 origSend，因此经包装 send 发出的
        // plant_friend_data 必然是用户主动导航（点「进入农场」）
        const friendProbeState = {
            installed: false,
            origHandler: null,
            origSend: null,
            probingUid: null,      // 当前在途探测目标（全局串行队列保证同一时刻至多一个）
            probingResolve: null,  // 探测完成回调
            pendingUserUid: null,  // 用户点「进入农场」刚发出的请求目标
            swallowUids: new Set() // 已中止/超时探测的 uid：其迟到响应一律吞掉
        };

        function ensureFriendInterceptor() {
            const st = friendProbeState;
            if (st.installed || typeof MSG === 'undefined') return;
            if (typeof MSG.handlers.plant_friendData !== 'function' || typeof MSG.send !== 'function') return;
            st.origHandler = MSG.handlers.plant_friendData;
            st.origSend = MSG.send;
            st.installed = true;

            MSG.send = function (type, data) {
                if (type === 'plant_friend_data' && friendPreviewActive()) {
                    const uid = (data && data.friend_uid) != null ? Number(data.friend_uid) : null;
                    if (uid != null) {
                        // 探测请求绕过本包装直接走 origSend，因此到达这里的必然是用户
                        // 点「进入农场」：记录目标并中止当前探测（其迟到响应进吞掉名单），
                        // 防止旧方案的「响应先后顺序竞态导致进错农场」
                        st.pendingUserUid = uid;
                        abortCurrentProbe();
                    }
                }
                return st.origSend.call(MSG, type, data);
            };

            MSG.handlers.plant_friendData = function (data) {
                const d = (data && data.content) || {};
                const uid = d.friend ? Number(d.friend.uid) : null;
                if (uid != null && friendPreviewActive()) {
                    if (st.pendingUserUid != null && uid === st.pendingUserUid) {
                        // 用户导航响应：透传渲染农场，并顺手回填该好友的预览缓存
                        st.pendingUserUid = null;
                        st.swallowUids.delete(uid);
                        cacheFriendSummary(uid, d.success ? d : null);
                        st.origHandler.call(MSG, data);
                        return;
                    }
                    if (st.probingUid != null && uid === Number(st.probingUid)) {
                        resolveProbe(d.success ? d : null);   // 探测响应：截获吞掉
                        return;
                    }
                    if (st.swallowUids.has(uid)) {
                        st.swallowUids.delete(uid);           // 已中止探测的迟到响应：静默丢弃
                        return;
                    }
                }
                st.origHandler.call(MSG, data);
            };
        }

        function resolveProbe(d) {
            const st = friendProbeState;
            const fn = st.probingResolve;
            st.probingUid = null;
            st.probingResolve = null;
            if (fn) fn(d);
        }

        function abortCurrentProbe() {
            const st = friendProbeState;
            if (st.probingUid == null) return;
            st.swallowUids.add(Number(st.probingUid));
            resolveProbe(null);
        }

        function cacheFriendSummary(uid, d) {
            if (!d) return;
            try {
                friendPreviewCache.set(Number(uid), { at: Date.now(), s: summarizeFriendPlots(d) });
            } catch (e) { /* 忽略 */ }
        }

        // 单个好友探测：响应由中央拦截器按 uid 白名单截获；用户中途点「进入农场」或
        // 超时都会被 abort（uid 进吞掉名单，迟到响应不再透传切视图）
        function probeFriendFarm(uid, onDone) {
            const st = friendProbeState;
            ensureFriendInterceptor();
            if (!st.installed) { onDone(null); return; }
            let settled = false;
            let timer = null;
            const finish = function (d) {
                if (settled) return;
                settled = true;
                if (timer) { clearTimeout(timer); timer = null; }
                if (Number(st.probingUid) === Number(uid)) {
                    st.probingUid = null;
                    st.probingResolve = null;
                }
                onDone(d);
            };
            st.probingUid = uid;
            st.probingResolve = finish;
            if (!st.origSend.call(MSG, 'plant_friend_data', { friend_uid: uid })) finish(null);
            timer = setTimeout(function () {
                st.swallowUids.add(Number(uid));   // 响应可能仍在路上，加入吞掉名单
                finish(null);
            }, FRIEND_PROBE_TIMEOUT_MS);
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
                if (d) {
                    cacheFriendSummary(t.uid, d);   // 行脱离 DOM 也照常缓存，下次弹窗秒显
                    if (document.body.contains(t.row)) {
                        try { paintFriendRow(t.row, friendPreviewCache.get(Number(t.uid)).s); } catch (e) { /* 忽略 */ }
                    }
                }
                setTimeout(pumpFriendProbes, FRIEND_PROBE_GAP_MS);
            });
        }

        // 逐个串行探测列表中的好友：等上一个响应回来（或超时）再发下一个，避免瞬时
        // 连发大量 plant_friend_data。缓存命中（2 分钟内）的好友直接绘制徽标、不发请求；
        // 列表 DOM 被移除（弹窗关闭/点了进入农场）即中止剩余探测
        function startFriendPreview(friends) {
            const list = document.querySelector('.plant-friend-list');
            if (!list || list.dataset.nekProbed) return;
            const rows = list.querySelectorAll('.plant-friend-item');
            injectFriendPreviewStyle();
            list.dataset.nekProbed = '1';
            const now = Date.now();
            let queued = 0, cached = 0;
            friends.forEach(function (f, i) {
                if (!f || f.uid == null || !rows[i]) return;
                const uid = Number(f.uid);
                const c = friendPreviewCache.get(uid);
                if (c && now - c.at <= FRIEND_CACHE_TTL_MS) {
                    try { paintFriendRow(rows[i], c.s); cached++; } catch (e) { /* 忽略 */ }
                    return;
                }
                queueFriendProbe({ uid: uid, row: rows[i], list: list });
                queued++;
            });
            if (queued || cached) {
                hlog('好友农场成熟预览：缓存命中 ' + cached + ' 位，探测 ' + queued + ' 位');
            }
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
                '<div class="section-title">小助手 <span class="nek-ver-tag" style="font-size:11px;font-weight:400;opacity:.55;margin-left:6px;vertical-align:middle" title="银河猫娘放置小助手当前版本">v' + CURRENT_VERSION + '</span></div>' +
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
                        '<div class="setting-name" title="成本核算侧栏入口与市场商品详情「精算」按钮的总开关；关闭后两处入口均隐藏">成本核算</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-cost-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="一个开关统一控制：烹饪/生产/采集列表优化、点金辅助、农业辅助（自动收菜与好友农场成熟预览）">生产采集界面优化</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-uiopt-toggle">' +
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
                        '<div class="setting-name" title="已订阅天气预报的钓场，钓鱼页「天气预报」时段条目可点击预约：预约时读取当前所选鱼饵（未选鱼饵需二次确认），到点自动以 ∞ 次开钓（mold start 替换当前行动），开钓时快照原队列；队列已满时拒绝预约（不会删除已有队列，请自行留出空位）。相邻时段预约自动衔接换钓，链条最后一个时段结束自动停止钓鱼并补回原队列。自动开钓后手动取消/更换钓鱼不作处理（本时段预约自然失效，未来时段保留）。点击已预约时段或状态条 ✕ 可取消">定时钓鱼</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-fishtimer-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="加载游戏时自动检测 GitHub 上的小助手最新版本（每 6 小时最多检测一次，静默进行），发现新版本时通过顶部通知提醒，请按提示在 Tampermonkey 面板中检查更新并安装。同一版本只提醒一次">检查更新</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-upd-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                    '<div class="setting-item">' +
                        '<div class="setting-name" title="云同步：页面刷新时从服务端拉取配置，本地设置/研究队列/钓鱼预约变化时自动上传（单账号 2 秒限流）。多设备同账号使用时，回退到登录页会自动停止同步以免冲突。首次开启时若云端已有数据，可选择用云端覆盖本地或用本地覆盖云端">云同步</div>' +
                        '<div class="setting-input"></div>' +
                        '<label class="slider-container">' +
                            '<div class="toggle-switch">' +
                                '<input type="checkbox" class="nek-assist-cloud-toggle">' +
                                '<span class="toggle-slider"></span>' +
                            '</div>' +
                        '</label>' +
                    '</div>' +
                '</div>';
            content.appendChild(section);

            const master = section.querySelector('.nek-assist-toggle');
            const calc = section.querySelector('.nek-assist-calc-toggle');
            const market = section.querySelector('.nek-assist-market-toggle');
            const cost = section.querySelector('.nek-assist-cost-toggle');
            const uiopt = section.querySelector('.nek-assist-uiopt-toggle');
            const effmark = section.querySelector('.nek-assist-effmark-toggle');
            const foolproof = section.querySelector('.nek-assist-foolproof-toggle');
            const cookjump = section.querySelector('.nek-assist-cookjump-toggle');
            const fishtimer = section.querySelector('.nek-assist-fishtimer-toggle');
            const upd = section.querySelector('.nek-assist-upd-toggle');
            const cloudToggle = section.querySelector('.nek-assist-cloud-toggle');
            calc.checked = isCalcEnabled();
            market.checked = isMarketEnabled();
            if (cost) cost.checked = isCostEnabled();
            if (uiopt) uiopt.checked = isUiOptEnabled();
            if (effmark) effmark.checked = isEffMarkEnabled();
            if (foolproof) foolproof.checked = isFoolproofEnabled();
            if (cookjump) cookjump.checked = isCookJumpEnabled();
            if (fishtimer) fishtimer.checked = isFishTimerEnabled();
            if (upd) upd.checked = isUpdateCheckEnabled();
            if (cloudToggle) cloudToggle.checked = isCloudEnabled();
            master.checked = isEnabled();
            master.addEventListener('change', function () {
                setEnabled(master.checked);
                applyEnabledState();
                try { nekEnhancements.decorate(); } catch (e) { /* 模块尚未就绪 */ }
            });
            calc.addEventListener('change', function () {
                setCalcEnabled(calc.checked);
                applyEnabledState();
            });
            market.addEventListener('change', function () {
                setMarketEnabled(market.checked);
                applyEnabledState();
            });
            if (cost) cost.addEventListener('change', function () {
                setCostEnabled(cost.checked);
                applyEnabledState();
                try { nekEnhancements.decorate(); } catch (e) { /* 模块尚未就绪 */ }
            });
            if (uiopt) uiopt.addEventListener('change', function () {
                setUiOptEnabled(uiopt.checked);
                applyUiOptState();
            });
            if (effmark) effmark.addEventListener('change', function () {
                setEffMarkEnabled(effmark.checked);
                applyEffMarkState();
            });
            if (foolproof) foolproof.addEventListener('change', function () {
                setFoolproofEnabled(foolproof.checked);
                applyFoolproofState();
            });
            if (cookjump) cookjump.addEventListener('change', function () {
                setCookJumpEnabled(cookjump.checked);
                applyCookJumpState();
            });
            if (fishtimer) fishtimer.addEventListener('change', function () {
                setFishTimerEnabled(fishtimer.checked);  // 定时钓鱼：时段预约自动开钓/停止
                hlog('定时钓鱼已' + (fishtimer.checked ? '开启' : '关闭'));
            });
            if (upd) upd.addEventListener('change', function () {
                setUpdateCheckEnabled(upd.checked);
            });
            if (cloudToggle) cloudToggle.addEventListener('change', function () {
                cloudOnToggle(cloudToggle.checked, cloudToggle);
            });
        }

        // 页面重渲染导致区块被重建时，把开关勾选态对齐到存储值
        function syncToggles(section) {
            const master = section.querySelector('.nek-assist-toggle');
            const calc = section.querySelector('.nek-assist-calc-toggle');
            const market = section.querySelector('.nek-assist-market-toggle');
            const cost = section.querySelector('.nek-assist-cost-toggle');
            const uiopt = section.querySelector('.nek-assist-uiopt-toggle');
            const effmark = section.querySelector('.nek-assist-effmark-toggle');
            const foolproof = section.querySelector('.nek-assist-foolproof-toggle');
            const cookjump = section.querySelector('.nek-assist-cookjump-toggle');
            if (!master || !calc || !market) return;
            if (master.checked !== isEnabled()) master.checked = isEnabled();
            if (calc.checked !== isCalcEnabled()) calc.checked = isCalcEnabled();
            if (market.checked !== isMarketEnabled()) market.checked = isMarketEnabled();
            if (cost && cost.checked !== isCostEnabled()) cost.checked = isCostEnabled();
            if (uiopt && uiopt.checked !== isUiOptEnabled()) uiopt.checked = isUiOptEnabled();
            if (effmark && effmark.checked !== isEffMarkEnabled()) effmark.checked = isEffMarkEnabled();
            if (foolproof && foolproof.checked !== isFoolproofEnabled()) foolproof.checked = isFoolproofEnabled();
            if (cookjump && cookjump.checked !== isCookJumpEnabled()) cookjump.checked = isCookJumpEnabled();
            const fishtimerSt = section.querySelector('.nek-assist-fishtimer-toggle');
            if (fishtimerSt && fishtimerSt.checked !== isFishTimerEnabled()) fishtimerSt.checked = isFishTimerEnabled();
            const upd = section.querySelector('.nek-assist-upd-toggle');
            if (upd && upd.checked !== isUpdateCheckEnabled()) upd.checked = isUpdateCheckEnabled();
            const cloudSt = section.querySelector('.nek-assist-cloud-toggle');
            if (cloudSt && cloudSt.checked !== isCloudEnabled()) cloudSt.checked = isCloudEnabled();
        }

        // ---------------- 自动检查更新（GitHub raw 头部 @version 对比） ----------------
        // 注意：发布新版本时需同步修改 CURRENT_VERSION（与头部 @version 保持一致）。
        // 页面上下文无 GM_info（@grant none 且经 <script> 注入），只能内置当前版本号。
        const CURRENT_VERSION = '1.58.7';
        const LS_UPD_KEY = 'nek_update_check_enabled';        // 检查更新开关，默认开
        const LS_UPD_REMIND = 'nek_update_remind_last';       // 上次提醒时间戳（提醒节流）
        const UPD_REMIND_INTERVAL = 60 * 60 * 1000;           // 提醒节流：距上次提醒超过 60 分钟才再次提醒
        const UPD_RAW_URL = 'https://raw.githubusercontent.com/djj200504001/Nekoidle_Helper/main/' +
            encodeURIComponent('银河猫娘放置小助手.user.js');
        const isUpdateCheckEnabled = () => {
            try { return localStorage.getItem(LS_UPD_KEY) !== '0'; } catch (e) { return true; }
        };
        const setUpdateCheckEnabled = v => {
            try { localStorage.setItem(LS_UPD_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        function cmpVersion(a, b) {
            const pa = String(a || '').split('.').map(n => parseInt(n, 10) || 0);
            const pb = String(b || '').split('.').map(n => parseInt(n, 10) || 0);
            const len = Math.max(pa.length, pb.length);
            for (let i = 0; i < len; i++) {
                const d = (pa[i] || 0) - (pb[i] || 0);
                if (d) return d;
            }
            return 0;
        }
        function checkUpdateOnce() {
            if (!isEnabled() || !isUpdateCheckEnabled()) return;   // 初始化后关闭开关也能实时拦截
            fetch(UPD_RAW_URL, { cache: 'no-store' }).then(r => r.ok ? r.text() : Promise.reject(r.status))
                .then(text => {
                    const m = text.match(/@version\s+(\S+)/);
                    if (!m) return;
                    const remote = m[1];
                    if (cmpVersion(remote, CURRENT_VERSION) <= 0) return;   // 已是最新
                    // 提醒节流：距上次提醒超过 60 分钟才再次提醒（同一新版本每次刷新都会重新提醒）
                    try {
                        const last = parseInt(localStorage.getItem(LS_UPD_REMIND) || '0', 10);
                        if (Date.now() - last < UPD_REMIND_INTERVAL) return;
                        localStorage.setItem(LS_UPD_REMIND, String(Date.now()));
                    } catch (e) { /* localStorage 不可用则每次都提醒 */ }
                    if (typeof UI !== 'undefined' && UI.notifier && UI.notifier.show) {
                        UI.notifier.show(
                            '小助手发现新版本 v' + remote + '（当前 v' + CURRENT_VERSION + '）：请打开 Tampermonkey 面板 → 该脚本 → 检查更新安装',
                            'tip', 12000);
                    }
                })
                .catch(() => { /* 网络失败静默跳过，下次再查 */ });
        }
        function initUpdateCheck() {
            if (!isEnabled() || !isUpdateCheckEnabled()) return;
            // 等 UI.notifier 就绪（游戏脚本加载完成）后再检测，最多等 3 分钟
            let tries = 0;
            const wait = setInterval(function () {
                tries++;
                if (typeof UI !== 'undefined' && UI.notifier && UI.notifier.show) {
                    clearInterval(wait);
                    setTimeout(checkUpdateOnce, 3000);   // 就绪后再缓冲 3 秒，避开登录/加载高峰
                } else if (tries >= 90) {
                    clearInterval(wait);
                }
            }, 2000);
        }

        function scheduleDecorate() {
            if (decorateScheduled) return;
            decorateScheduled = true;
            setTimeout(function () {
                // 逐步隔离：任何一步异常不得中断后续步骤（否则炼金/市场等后段装饰全部失效）
                var steps = [
                    function () { precomputeActiveCategory(); },   // 分类页切换后预计算该页全部操作的经验效率
                    function () { ensureCookNav(); },              // 烹饪页分组吸顶折叠（创建/同步/移除）
                    function () { ensureProdPanel(); },            // 生产页双栏面板（创建/同步/移除）
                    function () { ensurePickPanel(); },            // 采集页双栏面板（创建/同步/移除）
                    function () { ensureEffMarks(); },             // 效率 Top2 标识（采集/生产/烹饪列表金银行箭头）
                    function () { ensureFoolproof(); },            // 防呆设置（原子炼金分解用鱼禁用点金按钮）
                    function () { ensureAlcSort(); },              // 点金辅助（原子炼金选择器排序条）
                    function () { ensureFishTimerUI(); },          // 定时钓鱼：预报区提示条随 DOM 变化即时补挂（与天气预报渲染同步出现）
                    function () { decorateModal(); },
                    function () { decorateAlchemy(); },            // 炼金界面：经验效率 + 升级次数计算 + 快捷填入
                    function () { ensureSettingItem(); },
                    function () { decorateMarketMarkers(); },
                    function () { nekEnhancements.decorate(); }
                ];
                steps.forEach(function (fn) {
                    try { fn(); } catch (eStep) {
                        try { console.warn('[小助手] 装饰步骤异常（已隔离，不影响其他功能）:', eStep && eStep.message || eStep); } catch (eLog) { /* 忽略 */ }
                    }
                });
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

        // ---------------- 定时钓鱼（天气预报时段自动钓鱼） ----------------
        // v1.36.0 规则（按用户反馈完善）：
        // ① 预约时读取钓鱼页下方已选鱼饵（UI.fishingData.baitElement）作为开钓参数，
        //    未选择鱼饵时弹二次确认，确认后以无鱼饵开钓；到点均以 ∞ 次自动开钓。
        // ② 预约时若队列已满（game.queue.length >= game.character.queue）直接拒绝并提示
        //    留出队列空间——绝不删除已有队列；到点开钓时若仍满则持续等待并低频提醒。
        // ③ 自动开钓后用户主动取消/更换钓鱼行动 → 不作处理（不重启、不打断、不补队列），
        //    本时段预约自然失效；时段结束时队头不是预约钓场的钓鱼 → 不作处理，仅清理状态。
        // ④ 支持多个时段连续预约（可跨钓场）：相邻时段自动衔接换钓（mold 'start' 替换队头，
        //    不经过「停止→恢复」中间态），链条最后一个时段结束才停止钓鱼，并按首次开钓
        //    快照 diff 补回原队列。手动干预只会结束当前时段，未来时段预约仍然保留。

        const LS_FISHTIMER_KEY = 'nek_assistant_fishtimer_enabled';  // 设置页开关，默认开
        const LS_FISH_STATE_KEY = 'nek_fish_schedules_v2';           // {bookings:[...], chain} 预约列表 + 链条运行时状态
        const LS_FISH_LEGACY_KEY = 'nek_fish_schedule';              // v1.35 单预约旧键（读取后迁移删除）
        const FISHTIMER_TAG = '【定时钓鱼】';
        const FISH_TICK_MS = 5000;                                   // 调度检查周期：5 秒（时段开始后最多 5 秒内开钓）
        const FISH_PERIOD_SEC = 14400;                               // 天气时段长度：4 小时（与游戏哈希窗口一致）

        let fishRestoreSnapshot = null;   // 链条结束时待补回的原队列快照（首个 update_queue 到达时消费）
        let fishTimerStarted = false;
        let fishLastFullWarnAt = 0;       // 「队列已满」提醒节流（60 秒最多一次）

        const isFishTimerEnabled = () => {
            try { return localStorage.getItem(LS_FISHTIMER_KEY) !== '0'; } catch (e) { return true; }
        };
        const setFishTimerEnabled = v => {
            try { localStorage.setItem(LS_FISHTIMER_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        
            cloudMark();};
        function flog() {
            const args = [].slice.call(arguments);
            args.unshift(FISHTIMER_TAG);
            console.log.apply(console, args);
        }
        function loadFishState() {
            try {
                const raw = localStorage.getItem(LS_FISH_STATE_KEY);
                if (raw) {
                    const st = JSON.parse(raw);
                    return {
                        bookings: Array.isArray(st.bookings) ? st.bookings : [],
                        chain: st.chain || null
                    };
                }
                // v1.35 旧单预约迁移为 v2 列表（旧预约无鱼饵信息，按无鱼饵处理）
                const legacy = localStorage.getItem(LS_FISH_LEGACY_KEY);
                if (legacy) {
                    localStorage.removeItem(LS_FISH_LEGACY_KEY);
                    const old = JSON.parse(legacy);
                    if (old && old.pondId !== undefined && old.period !== undefined) {
                        return {
                            bookings: [{ pondId: String(old.pondId), period: old.period, weather: old.weather || '',
                                timeText: old.timeText || '', baitId: 0, baitName: '', createdAt: old.createdAt || Date.now(),
                                day: new Date(old.createdAt || Date.now()).toLocaleDateString('sv-SE') }],
                            chain: null
                        };
                    }
                }
            } catch (e) { /* 忽略 */ }
            return { bookings: [], chain: null };
        }
        function saveFishState(st) {
            try {
                if (st && ((st.bookings && st.bookings.length) || st.chain)) {
                    localStorage.setItem(LS_FISH_STATE_KEY, JSON.stringify(st));
                } else {
                    localStorage.removeItem(LS_FISH_STATE_KEY);
                }
                cloudMark();   // 云同步：钓鱼预约变化触发 push
            } catch (e) { /* 忽略 */ }
        }
        // 本地日历日 YYYY-MM-DD（钓鱼预约 day 字段，跨日同步过滤用）
        function fishLocalDay() {
            const d = new Date(), p = n => (n < 10 ? '0' : '') + n;
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
        }
        function fmtFishDur(sec) {
            sec = Math.max(0, Math.floor(sec));
            const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
            if (h > 0) return h + '小时' + m + '分';
            if (m > 0) return m + '分' + (s > 0 ? s + '秒' : '');
            return s + '秒';
        }
        function currentFishPeriod() {
            return Math.floor(Date.now() / 1000 / FISH_PERIOD_SEC);
        }
        // 队列头是否正在钓指定钓场（game.queue[0] = 当前执行中的行动）
        function isFishingAt(pondId) {
            const head = (game.queue || [])[0];
            return !!(head && head.type === 'fishing' && String(head.id) === String(pondId));
        }
        // 队列是否已满（原生 startAction 同口径：length >= 容量即拒绝，包括 mold 'start'）
        function fishQueueFull() {
            return (game.queue || []).length >= (game.character ? game.character.queue : 0);
        }
        function warnFishQueueFull() {
            if (Date.now() - fishLastFullWarnAt < 60000) return;
            fishLastFullWarnAt = Date.now();
            UI.notifier.show('定时钓鱼：队列已满，暂无法自动开钓，请留出队列空位（小助手不会删除已有队列）', 'error', 5000);
        }

        // 删除单条预约；若该时段正在钓鱼中，一并停钓并补回原队列
        function removeFishBooking(pondId, period) {
            const st = loadFishState();
            const idx = st.bookings.findIndex(function (b) {
                return String(b.pondId) === String(pondId) && b.period === period;
            });
            if (idx < 0) return;
            const b = st.bookings[idx];
            st.bookings.splice(idx, 1);
            if (st.chain && st.chain.currentPeriod === period) {
                stopChainAndRestore(st, '已取消正在进行的预约', b.pondId);
            } else {
                saveFishState(st);
                UI.notifier.show('定时钓鱼：已取消预约 ' + (b.timeText || '') + ' ' + (b.weather || ''), 'tip', 3000);
            }
            ensureFishToggleButton();   // 队列按钮即时刷新
            ensureFishTimerUI();        // 预报区提示条即时同步（预约后立即隐藏）
        }

        // ---- 队列进度条下方钓鱼状态按钮（与「自动收菜」开关同排） ----
        // 未预约：灰米色（同自动收菜 OFF 配色），文字「未预约钓鱼」，点击切换至钓鱼界面；
        // 已预约：文字「天气·钓场名·鱼饵」，背景自开钓前 4 小时起由米色渐变覆盖为湖水青，
        // 开钓时刻覆盖完成；时段钓鱼结束变回原色，无下一次预约自动回到未预约状态。
        // 进度锚定时段真实时间戳（period*4h），按钮中途出现也直接显示正确进度，无独立计时。
        const FISH_BAR_COVER = '#37e2d4';   // 进度条覆盖色（湖水青，与预报高亮同色系）
        const FISH_BAR_BASE = 'var(--c-warning, #ffd93b)';   // 底色（同自动收菜进度条金色，随游戏主题变量）

        function fishPondName(pondId) {
            try {
                const pond = Data.fishingPonds && Data.fishingPonds[pondId];
                return pond && pond.name ? pond.name : ('钓场' + pondId);
            } catch (e) { return '钓场' + pondId; }
        }

        // 当前应展示的预约：钓鱼中/开钓在途的时段优先，否则取最近的当前/未来预约
        function fishDisplayBooking(st, curPeriod) {
            if (st.chain) {
                const cur = st.bookings.find(function (x) { return x.period === st.chain.currentPeriod; });
                if (cur) return cur;
            }
            let best = null;
            st.bookings.forEach(function (b) {
                if (b.period >= curPeriod && (!best || b.period < best.period)) best = b;
            });
            return best;
        }

        function paintFishToggleButton(btn) {
            const st = loadFishState();
            const curPeriod = currentFishPeriod();
            const b = fishDisplayBooking(st, curPeriod);
            let bg = '', text, cls;
            if (!b) {
                text = '未预约钓鱼';
                cls = 'off';
                // v1.42.0 修复：原逻辑仅在已预约分支写 title，取消预约后残留上一条预约的悬停提示；
                // 未预约分支每秒重写，确保 tooltip 与按钮状态一致
                btn.title = '未预约钓鱼，点击进入钓鱼界面';
            } else {
                const start = b.period * FISH_PERIOD_SEC;
                const now = Date.now() / 1000;
                text = (b.weather || '?') + '·' + fishPondName(b.pondId) + '·' + (b.baitName || '无');
                const active = !!(st.chain && st.chain.currentPeriod === b.period && isFishingAt(b.pondId));
                let pct;
                if (active) {
                    // 钓鱼中（方案A）：原色从左往右覆盖回青色上，时段结束刚好完全回色；
                    // pct=0 时渐变式本身即满青（开钓瞬间与覆盖动画无缝衔接），不设守卫
                    pct = Math.min(100, Math.max(0, (now - start) / FISH_PERIOD_SEC * 100));
                    bg = 'linear-gradient(90deg, ' + FISH_BAR_BASE + ' 0 ' + pct + '%, ' + FISH_BAR_COVER + ' ' + pct + '% 100%)';
                } else {
                    // 等待开钓：开钓前 4 小时（一个时段长度）青色从左覆盖，开钓时刻达 100%
                    pct = Math.min(100, Math.max(0, (now - (start - FISH_PERIOD_SEC)) / FISH_PERIOD_SEC * 100));
                    if (pct > 0) {
                        bg = 'linear-gradient(90deg, ' + FISH_BAR_COVER + ' 0 ' + pct + '%, ' + FISH_BAR_BASE + ' ' + pct + '% 100%)';
                    }
                }
                let tip;
                if (active) {
                    tip = (b.timeText || '') + ' ' + (b.weather || '') + ' ' + fishPondName(b.pondId) +
                        ' · 钓鱼中，' + fmtFishDur(start + FISH_PERIOD_SEC - now) + '后时段结束自动停钓并恢复队列 · 点击取消预约';
                } else if (now < start) {
                    tip = (b.timeText || '') + ' ' + (b.weather || '') + ' ' + fishPondName(b.pondId) +
                        ' · ' + fmtFishDur(start - now) + '后开钓（鱼饵：' + (b.baitName || '无') + '） · 点击取消预约';
                } else {
                    tip = (b.timeText || '') + ' ' + (b.weather || '') + ' ' + fishPondName(b.pondId) +
                        ' · 时段进行中 · 点击取消预约';
                }
                const extra = st.bookings.filter(function (x) { return x !== b && x.period >= curPeriod; }).length;
                if (extra > 0) tip += ' · 另有 ' + extra + ' 条后续预约';
                btn.title = tip;
                cls = 'booked';
            }
            // DOM 写缓存：多数秒内值不变，零写入
            if (btn._nekFishBg !== bg) { btn._nekFishBg = bg; btn.style.background = bg; }
            if (btn.textContent !== text) btn.textContent = text;
            btn.classList.toggle('off', cls === 'off');
            btn.classList.toggle('booked', cls === 'booked');
        }

        function ensureFishToggleButton() {
            try {
                if (!isEnabled() || !isFishTimerEnabled()) {
                    const stale = document.querySelector('.nek-fish-toggle');
                    if (stale) stale.remove();
                    return;
                }
                const row = ensureQueueButtonRow();
                if (!row) return;
                let btn = row.querySelector('.nek-fish-toggle');
                if (!btn) {
                    btn = document.createElement('div');
                    btn.className = 'nek-fish-toggle';   // 独立类名：不能复用 nek-harvest-toggle，否则收菜按钮挂载逻辑会误匹配本按钮
                    const harvestBtn = row.querySelector('.nek-harvest-toggle');
                    row.insertBefore(btn, harvestBtn || null);   // 排在「自动收菜」左侧
                    btn.addEventListener('click', function () {
                        const st = loadFishState();
                        const b = fishDisplayBooking(st, currentFishPeriod());
                        if (!b) {
                            // v1.42.0 未预约时点击切换至钓鱼界面（预约入口在钓鱼页天气预报时段条目）
                            UI.changeContent('actions', { id: 4 });
                            return;
                        }
                        const active = !!(st.chain && st.chain.currentPeriod === b.period && isFishingAt(b.pondId));
                        const msg = '定时钓鱼：取消 ' + (b.timeText || '') + ' ' + (b.weather || '') + ' ' +
                            fishPondName(b.pondId) + ' 的预约' +
                            (active ? '？正在钓鱼，取消后将停钓并恢复原队列' : '？');
                        if (window.confirm(msg)) {
                            removeFishBooking(b.pondId, b.period);
                            ensureFishToggleButton();
                        }
                    });
                }
                paintFishToggleButton(btn);
            } catch (e) { /* 忽略 */ }
        }

        // ---- 队列进度条下方研究队列按钮（与「自动收菜」「定时钓鱼」同排） ----
        // 无进行中研究且队列为空：灰米色「无研究队列」（同自动收菜 OFF 配色）；
        // 有研究任务/队列：文字「研究所类别·研究名称·当前研究等级」（如 梳毛·绒毛解析·LV2），
        // 底色金色（同另外两个按钮），淡紫色随研究进度从左向右覆盖、研究完成时完全覆盖，
        // 开始下一个研究时整键回金底重新覆盖。点击进入研究中心。
        const RESEARCH_BAR_COVER = '#c8a7f2';                      // 进度条覆盖色（淡紫色）
        const LS_RESEARCH_QUEUE_PREFIX = 'nek_enhancements_v1:';   // 与研究队列增强模块共用存储

        function researchQueueEntries() {
            try {
                const uid = game.character && game.character.uid;
                const saved = JSON.parse(localStorage.getItem(LS_RESEARCH_QUEUE_PREFIX + uid) || '{}');
                return Array.isArray(saved.queue) ? saved.queue : [];
            } catch (e) { return []; }
        }

        // 队列材料不足状态：直接复用研究队列模块已有的 researchStatus 判定（与折叠摘要同源），
        // 不另起一套游戏接口判断。研究队列模块在队首材料不足等待补充时会写入「材料不足」字样。
        function researchQueueLacking() {
            try {
                const st = String(nekEnhancements.core.view().researchStatus || '');
                return st.includes('材料不足');
            } catch (e) { return false; }
        }

        function findResearchProject(projectId) {
            for (const f of Data.research.facilities) {
                const p = (f.projects || []).find(p => +p.id === +projectId);
                if (p) return { facility: f, project: p };
            }
            return null;
        }

        function paintResearchQueueButton(btn) {
            const info = UI.researchInfo || {};
            const task = info.task, levels = info.levels || {};
            const queue = researchQueueEntries();
            let text = '', cls = 'off', bg = '', tip = '';
            const describe = function (projectId, lv) {
                const fp = findResearchProject(projectId);
                if (!fp) return false;
                text = (fp.facility.name || '').replace('研究所', '') + '·' + fp.project.name + '·LV' + lv;
                return true;
            };
            if (task && task.finishTime > task.startTime && describe(task.projectId, levels[task.projectId] || 0)) {
                cls = 'active';
                const dur = task.finishTime - task.startTime;
                const pct = Math.min(100, Math.max(0, (Date.now() / 1000 - task.startTime) / dur * 100));
                // 淡紫色从左向右覆盖金底，研究完成时完全覆盖（进度锚定任务真实时间戳）
                bg = 'linear-gradient(90deg, ' + RESEARCH_BAR_COVER + ' 0 ' + pct + '%, ' + FISH_BAR_BASE + ' ' + pct + '% 100%)';
                tip = '研究进行中：进度 ' + pct.toFixed(1) + '%，剩余 ' + fmtFishDur(Math.max(0, task.finishTime - Date.now() / 1000)) +
                    (queue.length ? '；队列另有 ' + queue.length + ' 条待研究' : '') + ' · 点击进入研究中心';
            } else if (queue.length) {
                // 无进行中研究：显示队首条目的当前等级（开研时的起点等级）
                const head = queue[0];
                if (describe(head.projectId, levels[head.projectId] || 0)) {
                    cls = 'active';
                    tip = '队列 ' + queue.length + ' 条待研究 · 点击进入研究中心';
                }
            }
            if (!text) {
                text = '无研究队列';
                cls = 'off';
                tip = '暂无研究任务与队列 · 点击进入研究中心';
            }
            // 材料确实不足（队列自动开研等待补充）：红边框 + 红色内发光提示，字保持黑色。
            // 判定复用研究队列模块已有的 researchStatus，无队列时不提示。
            const lack = cls !== 'off' && researchQueueLacking();
            if (lack) tip += ' · 队首材料不足，等待补充';
            // DOM 写缓存：秒内值不变零写入
            if (btn._nekResBg !== bg) { btn._nekResBg = bg; btn.style.background = bg; }
            if (btn.textContent !== text) btn.textContent = text;
            btn.classList.toggle('off', cls === 'off');
            btn.classList.toggle('nek-research-lack', lack);
            btn.title = tip;
        }

        function ensureResearchQueueButton() {
            try {
                if (!isEnabled()) {
                    const stale = document.querySelector('.nek-research-queue-toggle');
                    if (stale) stale.remove();
                    return;
                }
                const row = ensureQueueButtonRow();
                if (!row) return;
                let btn = row.querySelector('.nek-research-queue-toggle');
                if (!btn) {
                    btn = document.createElement('div');
                    btn.className = 'nek-research-queue-toggle';   // 独立类名：避免被收菜/钓鱼按钮的挂载逻辑误匹配
                    btn.addEventListener('click', function () {
                        UI.changeContent('research');   // 切换至研究中心界面
                    });
                    row.appendChild(btn);   // 排在「定时钓鱼」「自动收菜」右侧
                }
                paintResearchQueueButton(btn);
            } catch (e) { /* 忽略 */ }
        }

        // ---- 队列按钮行「库存提醒」：已设置预警的物品库存低于阈值时红色内发光 ----
        function openInventoryTab() {
            UI.changeContent('nek-cost');
            const activate = function () {
                let page = document.querySelector('.page.nek-cost');
                const entry = document.querySelector('.nek-cost-entry');
                if (page && !page.querySelector('.nek-cost-tabs') && entry) {
                    entry.classList.remove('active');
                    entry.click();
                    page = document.querySelector('.page.nek-cost');
                }
                const tab = page && page.querySelector('.nek-cost-tabs [data-tab="inventory"]');
                if (tab && !tab.classList.contains('active')) tab.click();
            };
            activate(); setTimeout(activate, 0); setTimeout(activate, 150);
        }
        function paintStockAlertButton(btn) {
            const list = nekEnhancements.stockShortages();
            let text = '库存充足';
            let tip = '所有已设置预警的物品库存充足 · 点击进入库存核算';
            if (list.length) {
                const first = list[0];
                text = first.name + '不足：' + first.have + (list.length > 1 ? ' 等' + list.length + '项' : '');
                tip = list.map(function (x) { return x.name + ' ' + x.have + '/' + x.th; }).join('；') + ' · 点击进入库存核算';
            }
            if (btn._nekStockText !== text) { btn._nekStockText = text; btn.textContent = text; }
            btn.classList.toggle('nek-stock-short', list.length > 0);
            btn.title = tip;
        }
        function ensureStockAlertButton() {
            try {
                if (!isEnabled() || !isCostEnabled()) {
                    const stale = document.querySelector('.nek-stock-alert-toggle');
                    if (stale) stale.remove();
                    return;
                }
                const row = ensureQueueButtonRow();
                if (!row) return;
                let btn = row.querySelector('.nek-stock-alert-toggle');
                if (!btn) {
                    btn = document.createElement('div');
                    btn.className = 'nek-stock-alert-toggle';
                    btn.addEventListener('click', openInventoryTab);
                    row.appendChild(btn);   // 排在研究队列按钮右侧
                }
                paintStockAlertButton(btn);
            } catch (e) { /* 忽略 */ }
        }

        // 任务侧栏「满」角标：劳务派遣合同满员时复用种植侧栏黄色角标样式（.tip-container > .tip.tip-default）
        // 合同数 = game.quests.work.length，上限 = game.character.quest_max（与任务页「合同数量 5 / 6」同源）
        function ensureQuestFullBadge() {
            try {
                const item = document.querySelector('.sidebar-item.action-102') ||
                    [...document.querySelectorAll('.sidebar-item')].find(function (el) {
                        const name = el.querySelector('.sidebar-item-name > span');
                        return name && name.textContent.trim() === '任务';
                    });
                if (!item) return;
                let badge = item.querySelector('.tip.nek-quest-full');
                const works = game.quests && Array.isArray(game.quests.work) ? game.quests.work.length : 0;
                const max = Number(game.character && game.character.quest_max) || 0;
                if (!(max > 0 && works >= max)) {
                    if (badge) badge.remove();   // 未满（或已领取合同）时移除角标
                    return;
                }
                let container = item.querySelector('.tip-container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'tip-container';
                    item.appendChild(container);
                }
                if (!badge) {
                    badge = document.createElement('div');
                    // 不能用 .tip-default：游戏 toggleSidebarDot(102, false) 会把 .tip.tip-default 写成 display:none，
                    // 有可领任务时还会把它的文字改成数量/「新」。基类 .sidebar-item .tip 已含全部黄色角标样式，
                    // 独立类名 .nek-quest-full 视觉与种植一致且不会被原生逻辑擦掉
                    badge.className = 'tip nek-quest-full';
                    badge.textContent = '满';
                    badge.title = '劳务派遣合同已满（' + works + '/' + max + '）';
                    container.appendChild(badge);
                }
                if (badge.style.display !== 'block') badge.style.display = 'block';   // 防御性兜底：每 30 秒纠正任何来源的内联隐藏
            } catch (e) { /* 忽略 */ }
        }

        // 预约/取消预约（点击预报时段条目触发）
        function toggleFishSchedule(pondId, period, itemEl) {
            if (!isFishTimerEnabled()) {
                UI.notifier.show('定时钓鱼功能未开启（设置-其他-定时钓鱼）', 'error', 3000);
                return;
            }
            pondId = String(pondId);
            const st = loadFishState();
            if (st.bookings.some(function (b) { return String(b.pondId) === pondId && b.period === period; })) {
                removeFishBooking(pondId, period);
                return;
            }
            // 队列已满：拒绝预约（绝不删除已有队列，要求用户自行留出空位）
            if (fishQueueFull()) {
                UI.notifier.show('定时钓鱼：队列已满，请先留出队列空位再预约（自动开钓需要空位，不会删除已有队列）', 'error', 5000);
                return;
            }
            // 读取钓鱼页下方已选鱼饵（baitElement 由原生鱼饵选择器维护，未选时为 null）
            const baitEl = UI.fishingData && UI.fishingData.baitElement;
            const baitId = baitEl ? baitEl.itemId : 0;
            let baitName = '';
            if (baitId && game.getItem) {
                const def = game.getItem(baitId);
                baitName = def && def.name ? def.name : ('#' + baitId);
            }
            if (!baitId) {
                if (!window.confirm('定时钓鱼：当前未选择鱼饵，确定以「无鱼饵 · ∞ 次」预约该时段吗？')) return;
            }
            const timeEl = itemEl.querySelector('.forecast-time');
            const wEl = itemEl.querySelector('.forecast-weather');
            const timeText = timeEl ? timeEl.textContent.trim() : '';
            const weather = wEl ? wEl.textContent.trim() : '';
            const now = Math.floor(Date.now() / 1000);
            const start = period * FISH_PERIOD_SEC;
            const inPeriod = now >= start && now < start + FISH_PERIOD_SEC;
            st.bookings.push({ pondId: pondId, period: period, weather: weather, timeText: timeText,
                baitId: baitId, baitName: baitName, createdAt: Date.now(), day: fishLocalDay() });
            st.bookings.sort(function (a, b) { return a.period - b.period; });
            saveFishState(st);
            flog('已预约：钓场 ' + pondId + ' 时段 ' + timeText + ' ' + weather + ' · 鱼饵 ' + (baitName || '无'));
            UI.notifier.show('定时钓鱼：已预约 ' + timeText + ' ' + weather +
                '（鱼饵：' + (baitName || '无') + '）' +
                (inPeriod ? '，时段进行中，即将自动开钓' : '，到点自动 ∞ 次开钓；相邻时段预约自动衔接'), 'tip', 4000);
            if (inPeriod) setTimeout(fishTimerTick, 1000);
            ensureFishToggleButton();   // 队列按钮即时刷新
            ensureFishTimerUI();        // 预报区提示条即时同步
        }

        // 停止链条钓鱼并按快照补回原队列；队头不是预约钓场的钓鱼时（用户手动更换/取消）不作处理，仅清理状态
        function stopChainAndRestore(st, msg, scheduledPondId) {
            const chain = st.chain;
            st.chain = null;
            saveFishState(st);
            const head = (game.queue || [])[0];
            const onScheduledFishing = head && head.type === 'fishing' &&
                (!scheduledPondId || String(head.id) === String(scheduledPondId));
            if (onScheduledFishing && chain && chain.snapshot) {
                fishRestoreSnapshot = chain.snapshot;
                MSG.send('queue', { type: 'cancel' });
                flog(msg || '时段结束，停止钓鱼，原队列自动接续');
                UI.notifier.show('定时钓鱼：' + (msg || '天气时段结束，已停止钓鱼，原队列自动接续'), 'tip', 4000);
            } else {
                flog((msg || '链条结束') + '；队头不是预约钓场的钓鱼，不作处理');
            }
        }

        // 开钓（新链条首个时段或衔接换钓）：mold 'start' 替换队头，∞ 次，鱼饵按预约
        function startChainBooking(st, booking) {
            if (!st.chain) {
                st.chain = { snapshot: JSON.parse(JSON.stringify(nekEnhancements.snapshotActions())),
                    currentPeriod: booking.period, pendingPond: booking.pondId, pendingAt: Date.now(), tries: 0 };
            } else {
                st.chain.currentPeriod = booking.period;
                st.chain.pendingPond = booking.pondId;
                st.chain.pendingAt = Date.now();
                st.chain.tries = 0;   // 新一轮开钓重置重试计数
            }
            saveFishState(st);
            game.startAction('fishing', booking.pondId, -1, { primaryItem: booking.baitId || 0 }, 'start');
            flog('定时钓鱼开钓：钓场 ' + booking.pondId + ' ' + (booking.timeText || '') + ' ' + (booking.weather || '') +
                ' · 鱼饵 ' + (booking.baitName || '无') + (st.chain.snapshot ? '，快照 ' + st.chain.snapshot.length + ' 条队列待补回' : ''));
            UI.notifier.show('定时钓鱼：已自动开始钓鱼（钓场 ' + booking.pondId + ' · 鱼饵 ' + (booking.baitName || '无') + '）', 'tip', 4000);
        }

        // 链条结束后按快照 diff 补回缺失行动（兼容服务端 'start' 保留/清空队尾两种行为）
        function restoreQueueSnapshot(snapshot) {
            if (!Array.isArray(snapshot)) return;
            const cur = game.queue || [];
            const key = a => {
                const item = Object.assign({}, a.item);
                const multiplier = Number(a.multiplier ?? item.multiplier ?? 1);
                delete item.multiplier;
                return JSON.stringify(cloudStable([a.type, String(a.id), item, multiplier]));
            };
            const remaining = cur.filter(Boolean).slice();
            const missing = [];
            snapshot.filter(Boolean).forEach(function (a) {
                const index = remaining.findIndex(entry => a.token != null && entry.token != null ?
                    a.token === entry.token : key(a) === key(entry));
                if (index >= 0) remaining.splice(index, 1);
                else missing.push(a);
            });
            if (!missing.length) {
                flog('原队列完整，无需补回');
                return;
            }
            let requested = 0;
            missing.forEach(function (a) {
                const count = Number(a.remaining ?? a.count ?? 1);
                if (count !== -1 && (!Number.isSafeInteger(count) || count <= 0)) return;
                flog('补回队列：', a.type, a.id, 'x' + (count === -1 ? '∞' : count));
                const item = Object.assign({}, a.item);
                if (a.multiplier != null) item.multiplier = a.multiplier;
                game.startAction(a.type, a.id, count, item, 'after');
                requested++;
            });
            if (requested) UI.notifier.show('定时钓鱼：已请求补回 ' + requested + ' 条原队列行动（排在队尾）', 'tip', 3000);
        }

        // 包装 update_queue：链条结束停钓后的首个全量队列到达时执行补回
        function installFishQueueWatcher() {
            if (MSG.__nekFishQueueWatcher) return;
            MSG.__nekFishQueueWatcher = true;
            const orig = MSG.handlers.update_queue;
            MSG.handlers.update_queue = function (content) {
                orig(content);
                if (!fishRestoreSnapshot) return;
                const snap = fishRestoreSnapshot;
                fishRestoreSnapshot = null;
                try { restoreQueueSnapshot(snap); } catch (e) { flog('队列补回异常：', e && e.message); }
            };
        }

        // 调度主循环：5 秒一次
        function fishTimerTick() {
            try {
                if (typeof game === 'undefined' || typeof MSG === 'undefined' || !game.character) return;
                if (!isEnabled() || !isFishTimerEnabled()) return;
                const st = loadFishState();
                if (!st.bookings.length && !st.chain) return;
                const curPeriod = currentFishPeriod();
                // 清理过期预约：保留当前与未来时段；链条进行中额外保留其当前时段（供收尾判断钓场）
                const before = st.bookings.length;
                st.bookings = st.bookings.filter(function (b) {
                    return b.period >= curPeriod || (st.chain && b.period === st.chain.currentPeriod);
                });
                if (st.bookings.length !== before) saveFishState(st);
                const cur = st.bookings.find(function (b) { return b.period === curPeriod; }) || null;
                if (st.chain) {
                    // 开钓请求在途：等队头到位，或 15 秒后重试（队列满则等待并低频提醒）
                    if (st.chain.pendingPond) {
                        const head = (game.queue || [])[0];
                        if (head && head.type === 'fishing' && String(head.id) === String(st.chain.pendingPond)) {
                            st.chain.pendingPond = null;
                            saveFishState(st);
                            return;
                        }
                        if (Date.now() - st.chain.pendingAt > 15000) {
                            if (fishQueueFull()) { warnFishQueueFull(); st.chain.pendingAt = Date.now(); saveFishState(st); return; }
                            st.chain.tries = (st.chain.tries || 0) + 1;
                            if (st.chain.tries > 3) {
                                // 连续多次未生效：放弃本时段（不与用户后续操作争抢），未来时段预约保留
                                st.chain = null;
                                st.bookings = st.bookings.filter(function (b) { return b.period > curPeriod; });
                                saveFishState(st);
                                flog('开钓连续多次未生效，放弃本时段预约（未来时段预约保留）');
                                UI.notifier.show('定时钓鱼：自动开钓多次未生效，已放弃本时段预约（未来时段预约保留）', 'error', 5000);
                                return;
                            }
                            flog('开钓请求 15 秒未生效，重试第 ' + st.chain.tries + ' 次');
                            st.chain.pendingAt = Date.now();
                            saveFishState(st);
                            const b = st.bookings.find(function (x) { return x.period === st.chain.currentPeriod; });
                            if (b) game.startAction('fishing', b.pondId, -1, { primaryItem: b.baitId || 0 }, 'start');
                        }
                        return;
                    }
                    if (!cur) {
                        // 时段结束且无衔接预约：队头仍是预约钓场的钓鱼 → 停钓补回；否则不作处理仅清理
                        const prevBooking = st.bookings.find(function (b) { return b.period === st.chain.currentPeriod; });
                        stopChainAndRestore(st,
                            prevBooking ? '天气时段结束，已停止钓鱼，原队列自动接续' : '预约已结束',
                            prevBooking ? prevBooking.pondId : null);
                        return;
                    }
                    if (st.chain.currentPeriod === curPeriod) return;   // 本时段已在调度中（含用户手动停钓后的不作为状态）
                    // 相邻时段衔接：队头仍是上一预约钓场的钓鱼才继续换钓；否则视为用户主动干预
                    const head = (game.queue || [])[0];
                    const prevBooking = st.bookings.find(function (b) { return b.period === st.chain.currentPeriod; });
                    const onScheduled = head && head.type === 'fishing' && prevBooking &&
                        String(head.id) === String(prevBooking.pondId);
                    if (!onScheduled) {
                        // 用户手动更换/取消钓鱼 → 不作处理：结束链条与本时段预约，未来时段预约保留
                        st.chain = null;
                        st.bookings = st.bookings.filter(function (b) { return b.period > curPeriod; });
                        saveFishState(st);
                        flog('检测到钓鱼被手动更换/取消，本时段预约结束（未来时段预约保留）');
                        return;
                    }
                    if (cur.pondId === prevBooking.pondId && (cur.baitId || 0) === (prevBooking.baitId || 0)) {
                        // 同钓场同鱼饵：∞ 次钓鱼天然持续，无需重启，仅推进链条时段
                        st.chain.currentPeriod = curPeriod;
                        saveFishState(st);
                        flog('无缝衔接下一时段（同钓场同鱼饵，继续钓鱼）');
                    } else {
                        if (fishQueueFull()) { warnFishQueueFull(); return; }
                        startChainBooking(st, cur);   // 衔接换钓：mold 'start' 直接替换队头，不停钓
                    }
                    return;
                }
                if (!cur) return;
                // 新链条：到点开钓（队列满则等待并低频提醒）
                if (fishQueueFull()) { warnFishQueueFull(); return; }
                startChainBooking(st, cur);
            } catch (e) {
                flog('调度异常：', e && e.message);
            }
        }

        // 钓鱼页装饰：预报时段可点击预约 + 预约高亮角标 + 状态条（逐条预约与倒计时）
        function ensureFishTimerUI() {
            try {
                const container = document.querySelector('.fishing-weather-forecast');
                if (!container) return;
                if (!isEnabled() || !isFishTimerEnabled()) {
                    const stale = container.querySelector('.nek-fish-timer-status');
                    if (stale) stale.remove();
                    return;
                }
                const fd = UI.fishingData;
                if (!fd || fd.selectedPondId === undefined || fd.selectedPondId === null) return;
                const pondId = String(fd.selectedPondId);
                const unlocked = (game.character.fishingForecastUnlocked || []).map(String);
                const list = container.querySelector('.fishing-weather-forecast-list');
                const period = currentFishPeriod();
                const st = loadFishState();
                if (list && unlocked.includes(pondId)) {
                    Array.prototype.forEach.call(list.children, function (item, idx) {
                        const p = period + idx + 1;
                        if (item.dataset.nekFishBound !== String(p)) {
                            item.dataset.nekFishBound = String(p);
                            item.classList.add('nek-fish-forecast-item');
                            item.addEventListener('click', function (e) {
                                e.stopPropagation();
                                toggleFishSchedule(fd.selectedPondId, p, item);
                            });
                        }
                        const b = st.bookings.find(function (x) { return String(x.pondId) === pondId && x.period === p; });
                        const active = !!(b && st.chain && st.chain.currentPeriod === p && isFishingAt(b.pondId));
                        item.classList.toggle('nek-fish-scheduled', !!(b && !active));
                        item.classList.toggle('nek-fish-active', active);
                        let badge = item.querySelector('.nek-fish-badge');
                        if (b) {
                            if (!badge) {
                                badge = document.createElement('div');
                                badge.className = 'nek-fish-badge';
                                item.appendChild(badge);
                            }
                            const bt = active ? '钓鱼中' : '已预约';
                            if (badge.textContent !== bt) badge.textContent = bt;   // 相同不重写（防 MutationObserver 自激循环）
                        } else if (badge) {
                            badge.remove();
                        }
                    });
                }
                // 常态提示条：始终渲染（预约状态在行动条「钓鱼」按钮上，此处仅作引导说明）。
                // DOM 写加缓存：值不变零写入——本函数挂在 MutationObserver 装饰链上，
                // 无条件重写 innerHTML 会再次触发观察器形成自激循环。
                let bar = container.querySelector('.nek-fish-timer-status');
                if (!bar) {
                    bar = document.createElement('div');
                    bar.className = 'nek-fish-timer-status';
                    container.appendChild(bar);
                }
                const hint = '<span class="nek-ft-hint">⏱ 点击上方预报时段可预约定时钓鱼：读取当前所选鱼饵，到点 ∞ 次自动开钓（保留原队列）；相邻时段预约自动衔接，最后一个时段结束自动恢复队列；预约状态与取消见行动条「钓鱼」按钮</span>';
                if (bar._nekHint !== hint) { bar._nekHint = hint; bar.innerHTML = hint; }
            } catch (e) { /* 忽略 */ }
        }

        function injectFishTimerStyle() {
            if (document.getElementById('nek-fishtimer-style')) return;
            const cssFt = [
                // 队列位置钓鱼状态按钮：独立类名（与收菜按钮样式一致但互不干扰），
                // 底色固定米色作为进度渐变的覆盖基准，off 状态同自动收菜 OFF 配色
                '.nek-fish-toggle { position: relative; padding: 0 8px; border-radius: 4px; color: #14504a;',
                '  background: ' + FISH_BAR_BASE + '; text-align: center; cursor: pointer;',
                '  transition: all .2s ease; font-weight: 700; font-family: system-ui; font-size: 12px;',
                '  height: 20px; line-height: 20px; letter-spacing: 1px;',
                '  border: 2px solid var(--c-black, #000); white-space: nowrap; }',
                '.nek-fish-toggle:hover { filter: brightness(1.15); -webkit-filter: brightness(1.15); }',
                '.nek-fish-toggle.off { background: ' + FISH_BAR_BASE + '; color: #939393; }',
                '.nek-fish-toggle.booked { color: #14504a; }',
                '.nek-fish-forecast-item { cursor: pointer; position: relative; }',
                '.nek-fish-forecast-item:hover { box-shadow: 0 0 0 1px rgba(55, 226, 212, .55) inset; }',
                '.nek-fish-forecast-item.nek-fish-scheduled { box-shadow: 0 0 0 1px #37e2d4 inset; background: rgba(55, 226, 212, .14); }',
                '.nek-fish-forecast-item.nek-fish-active { box-shadow: 0 0 0 1px #ffd76e inset; background: rgba(255, 215, 110, .14); }',
                '.nek-fish-badge { position: absolute; top: 2px; right: 3px; font-size: 10px; color: #37e2d4; pointer-events: none; }',
                '.nek-fish-forecast-item.nek-fish-active .nek-fish-badge { color: #ffd76e; }',
                '.nek-fish-timer-status { margin-top: 6px; padding: 6px 10px; border: 1px solid rgba(55, 226, 212, .35);',
                '  border-radius: 6px; background: rgba(10, 25, 45, .72); color: #d8fff9; font-size: 12px;',
                '  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }',
                '.nek-ft-hint { color: #7fa8a3; }',
                '.nek-ft-item { display: inline-flex; align-items: center; gap: 6px; }',
                '.nek-ft-cancel { color: #ff7a8a; cursor: pointer; text-decoration: underline; white-space: nowrap; }'
            ].join('\n');
            const s = document.createElement('style');
            s.id = 'nek-fishtimer-style';
            s.textContent = cssFt;
            document.head.appendChild(s);
        }

        function initFishTimer() {
            if (fishTimerStarted) return;
            if (typeof game === 'undefined' || typeof UI === 'undefined' ||
                typeof MSG === 'undefined' || !game.character) {
                setTimeout(initFishTimer, 1500);
                return;
            }
            fishTimerStarted = true;
            installFishQueueWatcher();
            injectFishTimerStyle();
            ensureFishToggleButton();
            setInterval(ensureFishToggleButton, 1000);   // 钓鱼状态按钮：每秒刷新文字/进度并自动补挂
            setInterval(ensureFishTimerUI, 1500);    // 钓鱼页重绘后自动补挂点击与提示条
            setInterval(fishTimerTick, FISH_TICK_MS);
            setTimeout(fishTimerTick, 8000);
            flog('已加载：预约天气预报时段自动 ∞ 次开钓（读取所选鱼饵，未选需确认；队列满拒绝预约；' +
                '多时段自动衔接；队列满/手动干预不作破坏性处理）。当前' + (isFishTimerEnabled() ? '开启' : '关闭'));
        }
        // ---------------- 云同步（v3：明文 JSON + 静态文件服务端） ----------------
        // 端点：云服务器域名 + 直连端口，Python 服务端自身启用 TLS（无需 Caddy）。
        // 游戏页是 https，必须用 https，否则被浏览器混合内容策略拦截。
        // 保持 @grant none：页面上下文原生 fetch；uid 走查询参数，服务端按 uid 读写文件。
        // 传输混淆：XOR + Base64（密钥公开，只防非明文落盘，不防蓄意篡改）。
        function cloudMark() { try { cloud.markDirty(); } catch (e) { /* 云同步未就绪，忽略 */ } }
        const CLOUD_ENDPOINT = 'https://tcc.shinki.top:19527/api/state';
        const CLOUD_XOR_KEY = 'nek-cloud-v3-2026';
        const CLOUD_MIN_INTERVAL = 2000;      // 单 uid 最小同步间隔（与服务端一致）
        const CLOUD_REQ_TIMEOUT = 3000;       // 单次请求超时：服务端挂起时也尽快结束 pull、解除 booting
        const CLOUD_LS_KEY = 'nek_cloud_enabled';
        const CLOUD_SETTING_KEYS = {
            assistant: 'nek_assistant_enabled', calc: 'nek_assistant_calc_enabled',
            market: 'nek_assistant_market_enabled', cost: 'nek_assistant_cost_enabled',
            cook: 'nek_assistant_cook_enabled',
            prod: 'nek_assistant_prod_enabled', pick: 'nek_assistant_pick_enabled',
            effmark: 'nek_assistant_effmark_enabled', foolproof: 'nek_assistant_foolproof_enabled',
            alcsort: 'nek_assistant_alcsort_enabled', cookjump: 'nek_assistant_cookjump_enabled',
            harvest: 'nek_harvest_enabled', farm: 'nek_farm_assist_enabled',
            fishtimer: 'nek_assistant_fishtimer_enabled', update: 'nek_update_check_enabled',
            alcsortMode: 'nek_assistant_alcsort_mode', stockBufferPercentage: 'nek_stock_buffer_percentage'
        };
        const CLOUD_ENH_SETTING_KEYS = ['researchQueue', 'researchFinish', 'questAccept', 'questReward', 'holdings'];
        // 修改后不再立即上传：连续 3 条修改触发一次，或最后一次修改后 5 秒触发一次。
        const CLOUD_DIRTY_BATCH = 3;
        const CLOUD_DIRTY_DELAY = 5000;
        // 生产队列完成/取消等账本自动补记不按普通修改处理：不累加编辑数，合并到 5 分钟后的一次上传，
        // 避免连续生产时每完成一条就触发云同步。
        const CLOUD_LOW_DELAY = 5 * 60 * 1000;
        // 多脚本版本容错：云端 payload 中本地脚本无法识别/覆盖的字段暂存，上传时原样带回。
        const CLOUD_KNOWN_TOP = new Set(['schema', 'uid', 'ts', 'settings', 'queue', 'fish', 'favorites', 'costItems', 'warehouseCost', 'inventoryLedger']);
        const CLOUD_STAGED_KEY = uid => 'nek_cloud_staged_v1:' + uid;
        function cloudStaged(uid) {
            try {
                const raw = JSON.parse(localStorage.getItem(CLOUD_STAGED_KEY(uid)) || '{}');
                return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
            } catch (e) { return {}; }
        }
        function cloudSaveStaged(uid, staged) {
            try { localStorage.setItem(CLOUD_STAGED_KEY(uid), JSON.stringify(staged)); } catch (e) { /* 忽略 */ }
        }
        function cloudStageUnknown(p, uid) {
            if (!p || typeof p !== 'object' || !uid) return;
            const staged = cloudStaged(uid);
            const top = staged.top && typeof staged.top === 'object' ? staged.top : {};
            const settings = staged.settings && typeof staged.settings === 'object' ? staged.settings : {};
            const fish = staged.fish && typeof staged.fish === 'object' ? staged.fish : {};
            Object.keys(p).forEach(k => { if (!CLOUD_KNOWN_TOP.has(k)) top[k] = p[k]; });
            const knownSettings = new Set(Object.keys(CLOUD_SETTING_KEYS).concat(CLOUD_ENH_SETTING_KEYS));
            if (p.settings && typeof p.settings === 'object') {
                Object.keys(p.settings).forEach(k => { if (!knownSettings.has(k)) settings[k] = p.settings[k]; });
            }
            if (p.fish && typeof p.fish === 'object') {
                Object.keys(p.fish).forEach(k => { if (k !== 'bookings') fish[k] = p.fish[k]; });
            }
            const next = {};
            if (Object.keys(top).length) next.top = top;
            if (Object.keys(settings).length) next.settings = settings;
            if (Object.keys(fish).length) next.fish = fish;
            cloudSaveStaged(uid, next);
        }
        // 成本核算：清单条目与库存成本按账号同步；归一化口径与本地读写保持一致。
        function cloudNormalizeCostItems(v) {
            if (!Array.isArray(v)) return [];
            const seen = Object.create(null), out = [];
            v.forEach(x => {
                const n = Number(x);
                if (!Number.isInteger(n) || n <= 0 || seen[n]) return;
                seen[n] = 1; out.push(n);
            });
            return out.sort((a, b) => a - b).slice(0, 500);
        }
        function cloudCostItems(uid) {
            try { return cloudNormalizeCostItems(JSON.parse(localStorage.getItem('nek_cost_items_v1:' + uid) || '[]')); }
            catch (e) { return []; }
        }
        function cloudNormalizeWarehouseCost(v) {
            if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
            const out = {};
            Object.keys(v).slice(0, 500).forEach(k => {
                const id = Number(k);
                if (!Number.isInteger(id) || id <= 0) return;
                const n = Number(v[k]);
                if (!Number.isFinite(n) || n < 0) return;
                out[String(id)] = Math.round(n * 100) / 100;
            });
            return out;
        }
        function cloudWarehouseCost(uid) {
            try { return cloudNormalizeWarehouseCost(JSON.parse(localStorage.getItem('nek_warehouse_cost_v1:' + uid) || '{}')); }
            catch (e) { return {}; }
        }
        // 库存核算账本：批次 + 阈值 + 最近200条流水，整份覆盖同步。
        function cloudNormalizeInventory(v, costs) {
            const empty = { items: {}, thresholds: {}, trades: [] };
            if (!v || typeof v !== 'object' || Array.isArray(v)) return empty;
            if (Array.isArray(v.products) || Object.values(v.items || {}).some(row => Array.isArray(row?.purchases))) {
                v = normalizeInventoryLedger(migrateAverageInventory(v, costs));
            }
            const reasons = ['初始库存', '市场买入', '市场卖出', '生产消耗', '生产成品'];
            const r2 = n => { const x = Number(n); return Number.isFinite(x) ? Math.round(x * 100) / 100 : null; };
            const out = { items: {}, thresholds: {}, trades: [] };
            const orders = normalizeInventoryOrders(v.orders);
            if (Object.keys(orders).length) out.orders = orders;
            for (const [id, row] of Object.entries(v.items || {}).slice(0, 1000)) {
                if (!/^\d+$/.test(String(id)) || Number(id) <= 1) continue;
                if (!row || typeof row !== 'object') continue;
                let seed = row.batches;
                if (!Array.isArray(seed) && Array.isArray(row.purchases)) {
                    seed = row.purchases.map(p => ({ at: p.at, reason: String(p.source || '').includes('生产') ? '生产成品' : '市场买入',
                        qty: p.quantity, unitPrice: p.price }));
                }
                const batches = (Array.isArray(seed) ? seed : []).slice(-200).map((b, i) => {
                    // 旧「换日库存」即期初快照→「初始库存」；旧「换日缺口」下阶段才在历史记录展示，此处丢弃。
                    const rawReason = b?.reason === '换日库存' ? '初始库存' : b?.reason;
                    if (rawReason === '换日缺口') return null;
                    const reason = reasons.includes(rawReason) ? rawReason : '初始库存';
                    const qty = Number(b?.qty), at = Number(b?.at), price = b?.unitPrice == null ? null : Number(b.unitPrice);
                    // 初始库存允许 qty=0（建账时仓库无货）；其余批次 qty 必须非 0。
                    if (!Number.isFinite(qty) || (qty === 0 && reason !== '初始库存') || !Number.isFinite(at) || at < 0) return null;
                    if (price != null && (!Number.isFinite(price) || price < 0)) return null;
                    const p = price == null ? null : r2(price);
                    const bs = b.source && typeof b.source === 'object' ? b.source : null;
                    const bsId = Number(bs?.id), bsQty = Number(bs?.qty), bsPrice = bs?.unitPrice == null ? null : Number(bs.unitPrice);
                    const source = bs && bsId > 1 && Number.isFinite(bsQty) && bsQty > 0 &&
                        (bsPrice == null || (Number.isFinite(bsPrice) && bsPrice >= 0))
                        ? { id: bsId, from: String(bs.from || '').slice(0, 80), qty: bsQty,
                            unitPrice: bsPrice == null ? null : r2(bsPrice) } : undefined;
                    const missing = (Array.isArray(b.missing) ? b.missing : []).slice(0, 50).map(m => ({
                        id: Number(m?.id), name: String(m?.name || '').slice(0, 60)
                    })).filter(m => Number.isInteger(m.id) && m.id > 1);
                    return { id: String(b.id || 'b' + i).slice(0, 80), at, reason,
                        qty, unitPrice: p, amount: p == null ? null : b.reason === '生产成品' && qty > 0 &&
                            Number.isFinite(b.amount) && b.amount >= 0 ? r2(b.amount) : r2(qty * p),
                        ref: b.ref != null ? String(b.ref).slice(0, 80) : undefined,
                        from: b.from != null ? String(b.from).slice(0, 80) : undefined, verified: b.verified === true,
                        checkAt: Number.isFinite(b.checkAt) && b.checkAt > 0 ? b.checkAt : undefined,
                        source, missing: missing.length ? missing : undefined, manualPrice: b.manualPrice === true };
                }).filter(Boolean).sort((a, b) => a.at - b.at);
                const quantity = Number.isSafeInteger(row.quantity) && row.quantity >= 0 ? row.quantity : 0;
                const now = Date.now();
                const history = (Array.isArray(row.history) ? row.history : [])
                    .filter(h => h && typeof h === 'object' && Number.isFinite(h.archivedAt) && now - h.archivedAt <= 5 * 24 * 3600 * 1000)
                    .slice(-200).map(h => {
                        const qty = Number(h.qty), at = Number(h.at), price = h.unitPrice == null ? null : Number(h.unitPrice);
                        if (!Number.isFinite(qty) || !Number.isFinite(at) || (price != null && (!Number.isFinite(price) || price < 0))) return null;
                        const hs = h.source && typeof h.source === 'object' ? h.source : null;
                        const hsId = Number(hs?.id), hsQty = Number(hs?.qty), hsPrice = hs?.unitPrice == null ? null : Number(hs.unitPrice);
                        return { id: String(h.id || 'h' + at).slice(0, 80), at,
                            reason: reasons.includes(h.reason) ? h.reason : '生产消耗', qty,
                            unitPrice: price == null ? null : r2(price), amount: price == null ? null : r2(qty * price),
                            from: h.from != null ? String(h.from).slice(0, 80) : undefined,
                            ref: h.ref != null ? String(h.ref).slice(0, 80) : undefined, archivedAt: Number(h.archivedAt),
                            source: hs && hsId > 1 && Number.isFinite(hsQty) && hsQty > 0 &&
                                (hsPrice == null || (Number.isFinite(hsPrice) && hsPrice >= 0))
                                ? { id: hsId, from: String(hs.from || '').slice(0, 80), qty: hsQty,
                                    unitPrice: hsPrice == null ? null : r2(hsPrice) } : undefined,
                            missing: Array.isArray(h.missing) ? h.missing.slice(0, 50).map(m => ({
                                id: Number(m?.id), name: String(m?.name || '').slice(0, 60)
                            })).filter(m => Number.isInteger(m.id) && m.id > 1) : undefined,
                            manualPrice: h.manualPrice === true };
                    }).filter(Boolean);
                if (!batches.length && !history.length && quantity <= 0) continue;
                out.items[id] = { batches, history, quantity, since: Number.isFinite(row.since) && row.since > 0 ? row.since : now };
            }
            for (const [id, raw] of Object.entries(v.thresholds || {})) {
                if (!(/^\d+$/.test(String(id)) && Number(id) > 1)) continue;
                const th = raw && typeof raw === 'object'
                    ? { qty: Number(raw.qty), pct: Number(raw.pct) } : { qty: Number(raw), pct: 0 };
                const keep = {};
                if (Number.isSafeInteger(th.qty) && th.qty > 0) keep.qty = th.qty;
                if (Number.isFinite(th.pct) && th.pct > 0) keep.pct = r2(Math.min(100, th.pct));
                if (Object.keys(keep).length) out.thresholds[id] = keep;
            }
            out.trades = (Array.isArray(v.trades) ? v.trades : []).slice(-200).map(t => {
                const at = Number(t?.at), id = Number(t?.id), qty = Number(t?.qty), price = t?.unitPrice == null ? null : Number(t.unitPrice);
                if (!(id > 1) || !Number.isFinite(at) || at <= 0 || !Number.isFinite(qty) || qty === 0) return null;
                if (price != null && (!Number.isFinite(price) || price < 0)) return null;
                return { at, id, reason: reasons.includes(t.reason) ? t.reason : '市场买入', qty,
                    unitPrice: price == null ? null : r2(price), ref: t.ref != null ? String(t.ref).slice(0, 80) : undefined };
            }).filter(Boolean).sort((a, b) => a.at - b.at);
            return out;
        }
        function cloudInventoryLedger(uid) {
            try { return cloudNormalizeInventory(JSON.parse(localStorage.getItem('nek_inventory_ledger_v1:' + uid) || 'null'), cloudWarehouseCost(uid)); }
            catch (e) { return { items: {}, thresholds: {}, trades: [] }; }
        }

        const isCloudEnabled = () => {
            try { return localStorage.getItem(CLOUD_LS_KEY) === '1'; } catch (e) { return false; }
        };
        const setCloudEnabled = v => {
            try { localStorage.setItem(CLOUD_LS_KEY, v ? '1' : '0'); } catch (e) { /* 忽略 */ }
        };
        const cloudNotify = (msg, type, ms) => {
            try { if (UI && UI.notifier && UI.notifier.show) UI.notifier.show(msg, type || 'tip', ms || 3000); } catch (e) { /* 忽略 */ }
        };
        // 回退到「登录成功但未进入游戏」页面：URL 仍是 /game、uid 仍可读，但正文只有登录框。
        // 此时必须停止同步，避免与其他客户端的同步请求冲突。
        const isLoginScreen = () => {
            try {
                const modal = document.querySelector('.modal-box');
                if (!modal) return false;
                const cs = getComputedStyle(modal);
                if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0) return false;
                const t = (modal.innerText || '').replace(/\s/g, '');
                if (!/登录|注册/.test(t)) return false;
                const container = document.querySelector('.container');
                const bodyLen = (container ? container.innerText : document.body.innerText || '').replace(/\s/g, '').length;
                return bodyLen < 80;   // 游戏主界面未渲染（实测回退态正文仅约 30 字）
            } catch (e) { return false; }
        };
        // 同步读取 uid：未登录时游戏不会提供 uid（决策1），无需等待，直接跳过同步。
        const readUidCloud = () => {
            try {
                const uid = typeof game !== 'undefined' && game && game.character && game.character.uid;
                return uid != null && String(uid) !== '' ? String(uid) : '';
            } catch (e) { return ''; }
        };
        // uid 安全闸门：覆盖本地 / 上传云端前，目标 uid 必须与「当前游戏玩家」本人一致。
        // 场景：A 的 pull 异步等待期间 A 回退登录页、B 登录进游戏；若不加闸门，
        // A 的响应回来会把 A 的云端配置写进 B 的本地（设置项是全局 key），造成串号覆盖。
        // 每次都实时读 game.character.uid，绝不信任异步启动时的缓存 uid。
        const cloudUidGuard = (uid) => {
            const cur = readUidCloud();
            if (!cur || String(cur) !== String(uid)) throw new Error('uid_changed');
            return String(uid);
        };

        // XOR + Base64 简单混淆（对称，服务端用同一密钥逆运算）
        function cloudEncode(data) {
            const raw = new TextEncoder().encode(JSON.stringify(data));
            const key = CLOUD_XOR_KEY;
            const out = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ key.charCodeAt(i % key.length);
            let bin = '';
            for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
            return btoa(bin);
        }
        function cloudDecode(blob) {
            const bin = atob(blob);
            const raw = new Uint8Array(bin.length);
            const key = CLOUD_XOR_KEY;
            for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            return JSON.parse(new TextDecoder().decode(raw));
        }

        // 市场「我的收藏」：游戏存在 localStorage.favorite，值为 itemId 数字数组（Utils.setData('favorite', list)）。
        // 读取时归一化为「去重 + 数值排序的正整数数组」，保证两端比对稳定、不受写入顺序影响。
        function cloudNormalizeFavorites(v) {
            if (!Array.isArray(v)) return [];
            const seen = Object.create(null);
            const out = [];
            v.forEach(function (x) {
                const n = Number(x);
                if (!Number.isInteger(n) || n <= 0 || seen[n]) return;
                seen[n] = 1; out.push(n);
            });
            return out.sort(function (a, b) { return a - b; }).slice(0, 500);
        }
        function cloudFavorites() {
            try { return cloudNormalizeFavorites(JSON.parse(localStorage.getItem('favorite') || '[]')); }
            catch (e) { return []; }
        }
        // 研究队列「已完成条目不复活」过滤。
        // 权威等级取 UI.researchInfo.levels（回退 game.researchLevels），
        // 并对正在研究的 task 项目 +1 ——与 enhancements.js 的 context()/plan()/settleSubmitted 同口径。
        // 注意：game.character.levels 在游戏里是空对象，真实研究等级在 researchLevels / UI.researchInfo。
        // 云端旧队列若含「目标等级 ≤ 当前有效等级」的条目，说明该级已完成，
        // 覆盖时直接丢弃——否则 plan() 会用完成后的等级重算成 N+1 并自动开研，多升一级。
        // 研究数据未就绪时原样返回（保守：宁可保留，也不误删未研究的项目）。
        function cloudQueueAlive(queue) {
            if (!Array.isArray(queue)) return [];
            let levels = null, active = null;
            try {
                const ui = (typeof UI !== 'undefined' && UI) ? UI : null;
                const g = (typeof game !== 'undefined' && game) ? game : null;
                const info = ui && ui.researchInfo;
                levels = (info && info.levels) || (g && g.researchLevels) || null;
                active = (info && info.task) || null;
            } catch (e) { /* 忽略 */ }
            if (!levels || typeof levels !== 'object') return queue.slice();   // 研究数据未就绪：不过滤
            const snapshot = Object.assign({}, levels);
            if (active && active.projectId != null) {
                const pid = active.projectId;
                snapshot[pid] = (Number(snapshot[pid]) || 0) + 1;
            }
            return queue.filter(function (e) {
                if (!e || typeof e !== 'object') return true;
                const target = e.record && Number(e.record.targetLevel);
                if (!Number.isInteger(target) || target <= 0) return true;   // 旧条目无 record：保守保留
                const lv = Number(snapshot[e.projectId]) || 0;
                return lv < target;   // 目标已达成 → 丢弃，不让已完成的等级复活
            });
        }
        // 组装 payload：设置 + 研究队列（去 submitted）+ 钓鱼预约（带 day）+ 市场收藏
        function cloudBuildPayload(uid) {
            const settings = {};
            Object.keys(CLOUD_SETTING_KEYS).forEach(k => {
                try { settings[k] = localStorage.getItem(CLOUD_SETTING_KEYS[k]); } catch (e) { settings[k] = null; }
            });
            let enh = {};
            try { enh = JSON.parse(localStorage.getItem('nek_enhancements_v1:' + uid) || '{}') || {}; } catch (e) { /* 忽略 */ }
            CLOUD_ENH_SETTING_KEYS.forEach(k => { settings[k] = enh.settings?.[k] !== false; });
            const queue = (Array.isArray(enh.queue) ? enh.queue : [])
                .filter(e => e && typeof e.key === 'string' && Number.isInteger(e.projectId))
                .slice(0, 100)
                .map(e => { const o = Object.assign({}, e); delete o.submitted; return o; });
            let bookings = [];
            try {
                const st = JSON.parse(localStorage.getItem(LS_FISH_STATE_KEY) || '{}') || {};
                if (Array.isArray(st.bookings)) bookings = st.bookings.map(b => {
                    const o = Object.assign({}, b);
                    if (!o.day) o.day = o.createdAt ? new Date(o.createdAt).toLocaleDateString('sv-SE') : todayLocal();
                    delete o.chain;
                    return o;
                });
            } catch (e) { /* 忽略 */ }
            bookings = cloudCurrentBookings(bookings);
            // 本地脚本无法覆盖的旧版本字段（top/settings/fish 的未知键）随上传原样带回。
            const staged = cloudStaged(uid);
            const stagedTop = staged.top && typeof staged.top === 'object' ? staged.top : {};
            const stagedSettings = staged.settings && typeof staged.settings === 'object' ? staged.settings : {};
            const stagedFish = staged.fish && typeof staged.fish === 'object' ? staged.fish : {};
            Object.keys(stagedSettings).forEach(k => { if (!(k in settings)) settings[k] = stagedSettings[k]; });
            const fish = { bookings };
            Object.keys(stagedFish).forEach(k => { if (!(k in fish)) fish[k] = stagedFish[k]; });
            const payload = { schema: 1, uid: uid, ts: Date.now(), settings, queue, fish, favorites: cloudFavorites(), costItems: cloudCostItems(uid), warehouseCost: cloudWarehouseCost(uid), inventoryLedger: cloudInventoryLedger(uid) };
            Object.keys(stagedTop).forEach(k => { if (!CLOUD_KNOWN_TOP.has(k)) payload[k] = stagedTop[k]; });
            return payload;
        }
        function todayLocal() {
            const d = new Date();
            const p = n => (n < 10 ? '0' : '') + n;
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
        }
        // 决策2：页面加载后把云端与本地数据比对，一致则不覆盖、不通知。
        // 只比 settings/queue/fish.bookings/favorites 四类同步内容，忽略 ts/schema 等元数据；
        // queue 去 submitted 且按实时等级丢弃已完成项、bookings 去 chain，与覆盖口径一致。
        function cloudStable(v) {
            if (Array.isArray(v)) return v.map(cloudStable);
            if (v && typeof v === 'object') {
                const out = {};
                Object.keys(v).sort().forEach(k => { out[k] = cloudStable(v[k]); });
                return out;
            }
            return v;
        }
        function cloudCurrentBookings(bookings) {
            const today = todayLocal(), period = currentFishPeriod();
            return bookings.filter(b => b && b.period >= period).map(b => {
                const entry = Object.assign({}, b);
                delete entry.chain;
                if (!entry.day && entry.createdAt) entry.day = new Date(entry.createdAt).toLocaleDateString('sv-SE');
                if (!entry.day) entry.day = today;
                return entry;
            }).filter(b => b.day === today);
        }
        function cloudPayloadBody(p) {
            // 开关按脚本真实语义归一化：布尔开关的判定是 getItem(k) !== '0'，
            // 即 null（从未写入）/ '1' 都表示「开」，只有 '0'（或 false）表示「关」。
            // 云端可能存着 null、本地存着 '1'（曾被显式写入），二者语义等价，
            // 直接 JSON.stringify 比对会误判为不同 → 刷新时误报「云端已覆盖本地」，
            // 而 cloudApply 对 null 又跳过不覆盖，造成「通知说覆盖、实际没变」的矛盾。
            const settings = cloudStable((p && p.settings) || {});
            settings.stockBufferPercentage = String(normalizeStockBuffer(settings.stockBufferPercentage));
            Object.keys(settings).forEach(k => {
                if (k === 'stockBufferPercentage') return;
                if (k === 'alcsortMode') {   // 字符串枚举，按原值比（null 归一为默认空串）
                    settings[k] = settings[k] == null ? '' : String(settings[k]);
                } else if (Object.prototype.hasOwnProperty.call(CLOUD_SETTING_KEYS, k) ||
                           CLOUD_ENH_SETTING_KEYS.indexOf(k) >= 0) {
                    settings[k] = (settings[k] === '0' || settings[k] === false) ? '0' : '1';
                }
            });
            // 收藏归一化：与 cloudFavorites 同口径（正整数、去重、排序），
            // 避免云端/本地写入顺序或字符串数字差异导致误判为不同。
            const favorites = cloudNormalizeFavorites(p && p.favorites);
            // 成本核算条目与库存成本纳入比对；未知字段不参与，避免旧脚本携带的字段造成误判。
            return cloudStable({
                settings: settings,
                // 两端都按实时等级丢弃已完成项：避免云端旧队列反复被判为「不同」而每次刷新都提示覆盖
                queue: cloudQueueAlive((p && Array.isArray(p.queue) ? p.queue : []).map(e => { const o = Object.assign({}, e); delete o.submitted; return o; })),
                bookings: cloudCurrentBookings(Array.isArray(p?.fish?.bookings) ? p.fish.bookings : []),
                favorites: favorites.slice(0, 500),
                costItems: cloudNormalizeCostItems(p && p.costItems),
                warehouseCost: cloudNormalizeWarehouseCost(p && p.warehouseCost),
                inventoryLedger: cloudNormalizeInventory(p && p.inventoryLedger, p && p.warehouseCost)
            });
        }
        function cloudSameAsLocal(remote, uid) {
            try {
                const local = cloudBuildPayload(uid);
                const probe = Object.assign({}, remote || {});
                // 旧 payload 无成本核算字段：视为与本地一致，避免因新增字段误报「已覆盖本地」。
                if (!('costItems' in probe)) probe.costItems = local.costItems;
                if (!('warehouseCost' in probe)) probe.warehouseCost = local.warehouseCost;
                if (!('inventoryLedger' in probe)) probe.inventoryLedger = local.inventoryLedger;
                if (!Object.hasOwn(probe.settings || {}, 'stockBufferPercentage')) {
                    probe.settings = { ...probe.settings, stockBufferPercentage: local.settings.stockBufferPercentage };
                }
                return JSON.stringify(cloudPayloadBody(probe)) === JSON.stringify(cloudPayloadBody(local));
            } catch (e) { return false; }
        }
        // 结构白名单校验：非法数据一律不应用（防篡改最后一道防线）
        function cloudValidate(p) {
            if (!p || typeof p !== 'object' || p.schema !== 1) return false;
            if (!/^\d{1,20}$/.test(String(p.uid || ''))) return false;
            if (!Number.isInteger(p.ts) || p.ts <= 0) return false;
            if (!p.settings || typeof p.settings !== 'object') return false;
            if (!Array.isArray(p.queue) || p.queue.length > 100) return false;
            if (p.queue.some(e => !e || typeof e.key !== 'string' || !Number.isInteger(e.projectId) || e.projectId <= 0)) return false;
            if (!p.fish || !Array.isArray(p.fish.bookings) || p.fish.bookings.length > 100) return false;
            if (p.fish.bookings.some(b => !b || b.pondId == null || !Number.isInteger(b.period))) return false;
            // 收藏：旧 payload 无 favorites 字段时视为空（向后兼容）；有则必须是正整数且限量 500。
            if (p.favorites != null && (!Array.isArray(p.favorites) || p.favorites.length > 500 ||
                p.favorites.some(x => !Number.isInteger(Number(x)) || Number(x) <= 0))) return false;
            // 成本核算条目 / 库存成本：旧 payload 无字段时兼容（视为空）；有则必须合法且限量。
            if (p.costItems != null && (!Array.isArray(p.costItems) || p.costItems.length > 500 ||
                p.costItems.some(x => !Number.isInteger(Number(x)) || Number(x) <= 0))) return false;
            if (p.warehouseCost != null && (!p.warehouseCost || typeof p.warehouseCost !== 'object' || Array.isArray(p.warehouseCost) ||
                Object.keys(p.warehouseCost).length > 500 ||
                Object.keys(p.warehouseCost).some(k => !/^\d+$/.test(k) || Number(k) <= 0 ||
                    !Number.isFinite(Number(p.warehouseCost[k])) || Number(p.warehouseCost[k]) < 0))) return false;
            // 库存核算账本：旧 payload 无字段兼容；有则归一化后限量校验。
            if (p.inventoryLedger != null && (!p.inventoryLedger || typeof p.inventoryLedger !== 'object' || Array.isArray(p.inventoryLedger) ||
                Object.keys(p.inventoryLedger.items || {}).length > 1000 ||
                (p.inventoryLedger.trades != null && (!Array.isArray(p.inventoryLedger.trades) || p.inventoryLedger.trades.length > 200)))) return false;
            return true;
        }
        // 应用云端 payload 到本地：queue 去 submitted 且丢弃已完成项、钓鱼预约按 day 过滤跨日
        function cloudApply(p, uid) {
            if (!cloudValidate(p)) throw new Error('bad_payload');
            cloudUidGuard(uid);   // 覆盖前确认目标 uid 仍是当前游戏玩家（防异步期间切换账号串配置）
            if (String(p.uid) !== String(uid)) throw new Error('uid_mismatch');
            const enh = JSON.parse(localStorage.getItem('nek_enhancements_v1:' + uid) || '{}') || {};
            if (enh.queue?.some(entry => entry?.submitted)) throw new Error('研究正在确认，请稍后同步');
            const st = JSON.parse(localStorage.getItem(LS_FISH_STATE_KEY) || '{}') || {};
            const activeBooking = st.chain && st.bookings?.find(b => b.period === st.chain.currentPeriod);
            Object.keys(CLOUD_SETTING_KEYS).forEach(k => {
                const v = p.settings[k];
                if (v === undefined) return;
                if (v === null) localStorage.removeItem(CLOUD_SETTING_KEYS[k]);
                else if (k === 'stockBufferPercentage') localStorage.setItem(CLOUD_SETTING_KEYS[k], String(normalizeStockBuffer(v)));
                else localStorage.setItem(CLOUD_SETTING_KEYS[k], k === 'alcsortMode' ? String(v) : (v === '0' || v === false ? '0' : '1'));
            });
            enh.settings = enh.settings || {};
            CLOUD_ENH_SETTING_KEYS.forEach(k => {
                if (Object.hasOwn(p.settings, k)) enh.settings[k] = p.settings[k] !== false && p.settings[k] !== '0';
            });
            enh.queue = cloudQueueAlive((p.queue || []).map(e => { const o = Object.assign({}, e); delete o.submitted; return o; }));
            localStorage.setItem('nek_enhancements_v1:' + uid, JSON.stringify(enh));
            st.bookings = cloudCurrentBookings(p.fish.bookings);
            if (activeBooking) {
                st.bookings = [activeBooking, ...st.bookings.filter(b => b.period !== activeBooking.period)];
            }
            localStorage.setItem(LS_FISH_STATE_KEY, JSON.stringify(st));
            // 市场收藏：整份覆盖，覆盖前弹窗对比两端数量由用户决定；旧 payload 无该字段则不动本地。
            if (p.favorites != null) {
                const applyFav = cloudConfirmFavorites(p);
                if (applyFav) {
                    localStorage.setItem('favorite', JSON.stringify(cloudNormalizeFavorites(p.favorites)));
                }
            }
            // 成本核算条目与库存成本整份覆盖；无字段的旧 payload 不动本地。
            // 写入后通知增强模块重绘成本页与悬停行情（增强模块监听这两个事件）。
            if (p.costItems != null) {
                localStorage.setItem('nek_cost_items_v1:' + uid, JSON.stringify(cloudNormalizeCostItems(p.costItems)));
                try { document.dispatchEvent(new CustomEvent('nek-cost-items-updated')); } catch (e) { /* 忽略 */ }
            }
            if (p.warehouseCost != null) {
                localStorage.setItem('nek_warehouse_cost_v1:' + uid, JSON.stringify(cloudNormalizeWarehouseCost(p.warehouseCost)));
                try { document.dispatchEvent(new CustomEvent('nek-stock-cost-updated', { detail: { id: 0 } })); } catch (e) { /* 忽略 */ }
            }
            if (p.inventoryLedger != null) {
                localStorage.setItem('nek_inventory_ledger_v1:' + uid, JSON.stringify(cloudNormalizeInventory(p.inventoryLedger, p.warehouseCost)));
            }
            if (p.inventoryLedger != null || Object.hasOwn(p.settings, 'stockBufferPercentage')) {
                try { document.dispatchEvent(new CustomEvent('nek-inventory-cloud-applied', { detail: { uid: String(uid) } })); } catch (e) { /* 忽略 */ }
            }
            // 较旧脚本无法本地覆盖的字段暂存，上传时原样带回，避免跨版本同步丢数据。
            cloudStageUnknown(p, uid);
            // 应用云端后本地即与云端一致：记下签名，防止事件回调里的重写立刻把同一份数据推回去。
            try { cloud.lastBodySig = JSON.stringify(cloudPayloadBody(cloudBuildPayload(String(uid)))); } catch (e) { /* 忽略 */ }
        }

        // 收藏整份覆盖前的确认：两端收藏不一致时弹窗对比数量，由用户决定是否用云端覆盖本地。
        // 返回 true=允许覆盖收藏（含两端一致无需确认的情况），false=用户取消、保留本地收藏。
        function cloudConfirmFavorites(p) {
            const remote = cloudNormalizeFavorites(p && p.favorites);
            const local = cloudFavorites();
            if (JSON.stringify(remote) === JSON.stringify(local)) return true;   // 一致：无需打扰
            const msg = '云同步：市场「我的收藏」两端不一致\n\n' +
                '云端收藏：' + remote.length + ' 项\n' +
                '本地收藏：' + local.length + ' 项\n\n' +
                '【确定】用云端收藏整份覆盖本地\n' +
                '【取消】保留本地收藏（其余设置仍按云端覆盖）';
            return window.confirm(msg);
        }

        // 挂钩游戏 Utils.setData('favorite', …)：市场收藏变化时自动触发上传。
        // cloudApply 覆盖收藏走的是原生 localStorage.setItem，不经过此挂钩，避免回环。
        function hookFavoriteCloud(tries) {
            try {
                if (typeof Utils === 'undefined' || !Utils || typeof Utils.setData !== 'function') {
                    if ((tries || 0) < 20) setTimeout(function () { hookFavoriteCloud((tries || 0) + 1); }, 300);
                    return;
                }
                if (Utils._nekCloudFavWrapped) return;
                const orig = Utils.setData;
                Utils.setData = function (key, value) {
                    const ret = orig.apply(this, arguments);
                    if (key === 'favorite') cloudMark();
                    return ret;
                };
                Utils._nekCloudFavWrapped = true;
            } catch (e) { /* 忽略 */ }
        }

        // 云同步状态机
        const cloud = {
            uid: '', dirty: false, running: false, lastPushAt: 0, failNotified: false, timer: null,
            edits: 0, idleTimer: null, idleLow: false,   // 修改计数 / 静默定时器（是否低优先级）
            lastBodySig: '',   // 上次成功上传/应用云端的数据签名：内容没变就不再重复上传
            booting: true,   // 启动加载阶段：只 pull 不 push，页面加载完成后才允许 push
            async request(method, uid, body) {
                const url = CLOUD_ENDPOINT + '?uid=' + encodeURIComponent(uid);
                const opt = { method: method, headers: { 'Content-Type': 'application/json' } };
                if (body) opt.body = JSON.stringify(body);
                // 超时保护：服务端不可达/挂起时也要在 CLOUD_REQ_TIMEOUT 内结束，
                // 否则 bootPull 长期 pending 会让 booting 无法解除、push 永久被禁。
                const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
                if (ctrl) opt.signal = ctrl.signal;
                const timer = ctrl ? setTimeout(() => ctrl.abort(), CLOUD_REQ_TIMEOUT) : null;
                try {
                    const resp = await fetch(url, opt);
                    let data = null;
                    try { data = await resp.json(); } catch (e) { /* 忽略 */ }
                    return { status: resp.status, data: data };
                } finally {
                    if (timer) clearTimeout(timer);
                }
            },
            async pull(uid) {
                if (isLoginScreen()) return { skipped: true };
                const curUid = cloudUidGuard(uid);   // 拉取前确认目标 uid 仍是当前玩家
                const r = await this.request('GET', curUid);
                if (isLoginScreen()) return { skipped: true };   // 异步等待期间回退登录页：放弃
                cloudUidGuard(curUid);   // 响应回来后再确认玩家没切换
                if (!isCloudEnabled()) return { skipped: true };
                if (r.status === 404) return { found: false };   // 云端无数据：静默
                if (r.status === 429) return { limited: true, retryMs: r.data && r.data.retryMs || CLOUD_MIN_INTERVAL };
                if (r.status !== 200 || !r.data || !r.data.data) throw new Error('http_' + r.status);
                // 先暂存云端独有的字段（较旧脚本无法本地覆盖的部分），不因「与本地一致」而漏存。
                cloudStageUnknown(r.data.data, curUid);
                // 决策2：云端与本地一致则不覆盖、不通知；仅覆盖时反馈。
                if (cloudSameAsLocal(r.data.data, curUid)) return { found: true, applied: false };
                cloudApply(r.data.data, curUid);
                cloudNotify('云同步：云端数据已覆盖本地（' + new Date().toLocaleTimeString() + '）', 'tip', 2500);
                return { found: true, applied: true };
            },
            async push(uid, payload) {
                if (isLoginScreen()) return { skipped: true };
                const curUid = cloudUidGuard(uid);   // 上传前确认目标 uid 仍是当前玩家（防切换账号串号）
                const body = { v: 1, ts: payload.ts, blob: cloudEncode(payload) };
                const r = await this.request('PUT', curUid, body);
                if (isLoginScreen()) return { skipped: true };
                cloudUidGuard(curUid);   // 异步等待期间若切换账号，放弃后续写入
                if (r.status === 429) return { limited: true, retryMs: r.data && r.data.retryMs || CLOUD_MIN_INTERVAL };
                if (r.status === 409) {
                    // LWW：本地 ts 更新则强制重推；云端更新则应用云端
                    const remote = r.data && r.data.data;
                    if (remote && Number(remote.ts) > payload.ts) {
                        if (!isCloudEnabled()) return { skipped: true };
                        cloudApply(remote, curUid);
                        cloudNotify('云同步：已采用云端较新配置', 'tip', 2500);
                        return { appliedRemote: true };
                    }
                    if (!isCloudEnabled()) return { skipped: true };
                    body.ts = Math.max(Date.now(), payload.ts) + 1;
                    body.blob = cloudEncode(Object.assign({}, payload, { ts: body.ts }));
                    const r2 = await this.request('PUT', curUid, body);
                    if (isLoginScreen() || !isCloudEnabled()) return { skipped: true };
                    cloudUidGuard(curUid);
                    if (r2.status === 200) return { ok: true };
                    if (r2.status === 429) return { limited: true, retryMs: r2.data && r2.data.retryMs || CLOUD_MIN_INTERVAL };
                    throw new Error('http_' + r2.status);
                }
                if (r.status !== 200) throw new Error('http_' + r.status);
                return { ok: true };
            },
            markDirty(low) {
                // 决策2：启动加载阶段禁止 push；决策3：登录页不 push。
                if (this.booting || !isCloudEnabled() || isLoginScreen()) return;
                this.dirty = true;
                // low=账本自动补记（生产完成/取消、核对标记）：不累加编辑数，
                // 且延长静默窗口，避免连续生产时每 3 条就上传一次。
                if (!low) this.edits++;
                // 已有普通修改待传时，低优先级补记不得把 5 秒窗口拖成 5 分钟。
                if (low && this.idleTimer && !this.idleLow) return;
                if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; this.idleLow = false; }
                this.idleLow = !!low;
                const delay = low ? CLOUD_LOW_DELAY : CLOUD_DIRTY_DELAY;
                if (!low && this.edits >= CLOUD_DIRTY_BATCH) this.flush();
                else this.idleTimer = setTimeout(() => {
                    this.idleTimer = null; this.idleLow = false;
                    if (this.dirty) this.flush();
                }, delay);
            },
            async flush(force) {
                if ((!force && this.booting) || !isCloudEnabled() || isLoginScreen()) {
                    this.dirty = false; this.edits = 0;
                    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; this.idleLow = false; }
                    return;
                }
                if (this.running) return;
                // 决策1：uid 同步读取，未登录直接跳过，不等待。
                // 防串号：始终以「当前游戏玩家」为准；若与缓存 uid 不同（A 切到 B），
                // 丢弃 A 的旧待发状态，改为处理 B，绝不把 B 的本地数据推到 A 的云端。
                const uid = readUidCloud();
                if (!uid) return;
                if (this.uid && String(this.uid) !== String(uid)) {
                    this.dirty = false;
                    this.edits = 0;
                    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; this.idleLow = false; }
                    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
                    this.lastPushAt = 0;
                }
                this.uid = uid;
                const wait = CLOUD_MIN_INTERVAL - (Date.now() - this.lastPushAt);
                if (wait > 0) {
                    if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, wait);
                    return;
                }
                this.running = true;
                this.dirty = false;
                this.edits = 0;
                if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; this.idleLow = false; }
                try {
                    const payload = cloudBuildPayload(uid);
                    // 重复写入相同内容不再上传：生产账本补记/核对标记可能反复写同一份数据，
                    // 只有 payload 正文（忽略 ts）真变化才发 PUT；手动同步（force）绕过此判断。
                    const sig = JSON.stringify(cloudPayloadBody(payload));
                    if (!force && sig === this.lastBodySig) return;
                    const r = await this.push(uid, payload);
                    this.lastPushAt = Date.now();
                    if (r && r.ok) {
                        this.lastBodySig = sig;
                        if (this.failNotified) { this.failNotified = false; }
                        cloudNotify('云同步：已上传配置', 'tip', 2500);
                    } else if (r && r.limited) {
                        this.dirty = true;
                        if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, r.retryMs + 200);
                        if (!this.failNotified) { this.failNotified = true; cloudNotify('云同步：同步过于频繁，稍后重试', 'error', 3000); }
                    }
                } catch (e) {
                    if (!this.failNotified) { this.failNotified = true; cloudNotify('云同步：上传失败（' + (e.message || '网络异常') + '）', 'error', 3500); }
                    console.warn('[云同步] push 失败', e);
                } finally {
                    this.running = false;
                    if (this.dirty && !this.timer) this.flush();
                }
            },
            async bootPull() {
                // 决策1：未登录（无 uid）不进行云同步、不等待；决策3：登录页不 pull。
                if (!isCloudEnabled() || isLoginScreen()) return;
                const uid = readUidCloud();
                if (!uid) return;   // 未登录：静默跳过
                this.uid = uid;
                try {
                    await this.pull(uid);   // 拉取失败/404/429 均静默（仅覆盖本地才反馈）
                } catch (e) {
                    console.warn('[云同步] pull 失败，使用本地数据', e);
                }
            },
            // 手动同步按钮：仅上传本地（含收藏），不拉取。忽略 booting 限制，但保留登录页/uid 闸门。
            async pushNow() {
                if (!isCloudEnabled()) { cloudNotify('云同步：请先开启云同步开关', 'tip', 2500); return; }
                if (isLoginScreen()) { cloudNotify('云同步：请先进入游戏', 'error', 2500); return; }
                const uid = readUidCloud();
                if (!uid) { cloudNotify('云同步：未获取到账号', 'error', 2500); return; }
                if (this.running) { cloudNotify('云同步：正在同步中，请稍候', 'tip', 2000); return; }
                this.uid = uid;
                // Reset lastPushAt 让手动按钮绕过客户端 2 秒节流（服务端 429 仍会兜底）。
                this.lastPushAt = 0;
                this.dirty = true;
                if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; this.idleLow = false; }
                this.edits = 0;
                await this.flush(true);
            }
        };

        // 打开开关时检查云端：无数据静默启用；有数据让用户二选一
        let cloudToggleRevision = 0;
        async function cloudOnToggle(checked, toggleEl) {
            const revision = ++cloudToggleRevision;
            if (!checked) { setCloudEnabled(false); cloudNotify('云同步：已关闭', 'tip', 2000); return; }
            if (isLoginScreen()) {
                toggleEl.checked = false;
                cloudNotify('云同步：请先进入游戏再开启', 'error', 3000);
                return;
            }
            const uid = readUidCloud();
            if (!uid) { toggleEl.checked = false; cloudNotify('云同步：未获取到账号，无法开启', 'error', 3000); return; }
            cloud.uid = uid;
            let r;
            try { r = await cloud.request('GET', uid); }
            catch (e) {
                if (revision === cloudToggleRevision) { toggleEl.checked = false; cloudNotify('云同步：连接服务端失败', 'error', 3500); }
                return;
            }
            if (revision !== cloudToggleRevision) return;
            if (isLoginScreen() || readUidCloud() !== uid) { toggleEl.checked = false; return; }
            if (r.status === 429) { toggleEl.checked = false; cloudNotify('云同步：请求过于频繁，请稍后再试', 'error', 3000); return; }
            if (r.status === 404) { setCloudEnabled(true); cloudNotify('云同步：已开启（云端暂无数据）', 'tip', 2500); cloud.markDirty(); return; }
            if (r.status !== 200 || !r.data || !r.data.data) {
                toggleEl.checked = false; cloudNotify('云同步：服务端响应异常', 'error', 3500); return;
            }
            // 有云端数据：二选一
            const useCloud = window.confirm(
                '云同步：该账号在云端已有配置数据。\n\n' +
                '【确定】使用云端数据覆盖当前浏览器\n' +
                '【取消】保留当前浏览器数据并覆盖云端'
            );
            if (useCloud) {
                try { cloudApply(r.data.data, uid); setCloudEnabled(true); cloudNotify('云同步：已开启并应用云端数据', 'tip', 3000); }
                catch (e) { toggleEl.checked = false; cloudNotify('云同步：云端数据异常，未启用', 'error', 3500); }
            } else {
                setCloudEnabled(true);
                cloud.lastPushAt = 0;
                cloud.flush();
                cloudNotify('云同步：已开启，正在上传本地数据', 'tip', 3000);
            }
        }

        // ---------------- toolbar 手动同步按钮（签到按钮旁，仅上传本地） ----------------
        function injectCloudSyncStyle() {
            if (document.getElementById('nek-cloud-sync-style')) return;
            const s = document.createElement('style');
            s.id = 'nek-cloud-sync-style';
            // 与签到按钮同款视觉（.btn.checkIn-btn.completed 青色发光态）；
            // 用 .btn.nek-cloud-sync-btn 双类选择器压过 .btn 基础样式；宽度自适应「手动云同步」五字。
            s.textContent = [
                '.btn.nek-cloud-sync-btn { opacity: 1; background: rgba(75, 225, 216, 0.5);',
                '  color: var(--color-mian); box-shadow: rgba(85, 84, 70, 0.7) 0 0 15px;',
                '  font-size: 12px; border-radius: 4px; padding: 0 6px; width: auto;',
                '  margin-left: 4px; line-height: 16px; white-space: nowrap; }',
                '.btn.nek-cloud-sync-btn.busy { opacity: .55; cursor: wait; }'
            ].join('\n');
            document.head.appendChild(s);
        }
        function ensureCloudSyncButton() {
            try {
                const bar = document.querySelector('.toolbar-container');
                if (!bar || !bar.querySelector('.checkIn-btn')) return;   // 未进入游戏
                const entry = bar.querySelector('.left-entry') || bar;
                let btn = entry.querySelector('.nek-cloud-sync-btn');
                if (!btn) {
                    btn = document.createElement('div');
                    btn.className = 'btn nek-cloud-sync-btn';
                    btn.textContent = '手动云同步';
                    btn.title = '手动同步：仅上传本地设置、研究队列、钓鱼预约与市场收藏到云端';
                    btn.addEventListener('click', async function () {
                        if (btn.classList.contains('busy')) return;
                        btn.classList.add('busy');
                        try { await cloud.pushNow(); }
                        finally { btn.classList.remove('busy'); }
                    });
                    const checkIn = entry.querySelector('.checkIn-btn');
                    if (checkIn && checkIn.nextSibling) entry.insertBefore(btn, checkIn.nextSibling);
                    else entry.appendChild(btn);
                }
            } catch (e) { /* 忽略 */ }
        }
        injectCloudSyncStyle();
        hookFavoriteCloud();   // 装好收藏写入挂钩，市场收藏变化自动触发上传
        setInterval(ensureCloudSyncButton, 1000);   // 与钓鱼按钮同策略：toolbar 重建后自动补挂
        ensureCloudSyncButton();

        // 启动顺序（4 个 init 立即执行；云同步 pull 绑定到游戏主界面顶栏 toolbar-container）：
        // 1) 四个 init 立即同步执行，不等待任何网络——服务端不可达/挂起都不影响脚本加载，
        //    与未加入云同步的原版完全相同。
        // 2) toolbar-container 只在进入游戏后创建，回退登录页移除、再进入又重建。
        //    用 MutationObserver 监听它的出现/重建，每次进入游戏（含刷新首次加载、
        //    回退登录页后重新进入）各发一次 GET；同一节点只拉一次，回退时重置以允许再拉。
        // 3) bootPull 内部闸门负责未登录/登录页跳过、uid 实时校验防串号；
        //    拉取后与本地比对，一致不覆盖不通知，仅覆盖才反馈。只 pull 不 push。
        // 4) booting 标志覆盖拉取全程，期间禁止 push；finally 无条件解除，不留死角。
        nekEnhancements.init();
        initHarvest();   // 启动自动收菜（等待游戏就绪后挂载主循环与队列位置开关）
        initFishTimer();   // 启动定时钓鱼（天气预报时段自动开钓/停止/恢复队列）
        initUpdateCheck();   // 启动检查更新（等待游戏 UI 就绪后静默检测 GitHub 最新版本）

        let bootPullToken = null;   // 本次进入游戏已为哪个 toolbar 节点发过 pull
        let bootPullBusy = false;   // 拉取进行中，防重复
        function bootPullOnToolbar(delay) {
            if (bootPullBusy) return;
            const bar = document.querySelector('.toolbar-container');
            if (!bar) return;                          // 未进入游戏（登录页无此节点）
            if (bootPullToken === bar) return;         // 该次进入已拉过
            if (!isCloudEnabled()) { cloud.booting = false; return; }
            if (!readUidCloud()) return;               // uid 未就绪，等后续 DOM 变化重试
            if (isLoginScreen()) return;               // 回退登录页：不 pull
            bootPullToken = bar;
            bootPullBusy = true;
            cloud.booting = true;
            setTimeout(async function () {
                try { await cloud.bootPull(); }
                catch (e) { console.warn('[云同步] 启动拉取异常', e); }
                finally { bootPullBusy = false; cloud.booting = false; }
            }, delay || 0);
        }

        // 主监听：toolbar-container 从无到有 / 重建 → 触发一次 pull；
        // 消失（回退登录页）时清空 token，允许下次进入重新拉。
        let seenToolbar = null;
        new MutationObserver(function () {
            const bar = document.querySelector('.toolbar-container');
            if (bar !== seenToolbar) {
                seenToolbar = bar;
                if (!bar) bootPullToken = null;
            }
            bootPullOnToolbar(300);   // 稍延时等 uid/离线数据就绪；未就绪由后续 DOM 变化重试
        }).observe(document.documentElement, { childList: true, subtree: true });

        // 兜底：若 observer 未捕获（如脚本注入时主界面已存在），延时轮询拉一次。
        (function bootWithCloud() {
            let tries = 0;
            function attempt() {
                if (bootPullToken || bootPullBusy) return;
                bootPullOnToolbar(0);
                if (++tries <= 12) setTimeout(attempt, 150);
            }
            setTimeout(attempt, 600);
        })();
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
