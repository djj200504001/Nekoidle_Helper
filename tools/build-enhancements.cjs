const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, '银河猫娘放置小助手.user.js');
const version = '1.53.0';
const original = fs.readFileSync(file, 'utf8');
const newline = original.includes('\r\n') ? '\r\n' : '\n';
let script = original.replace(/\r\n/g, '\n');
const source = fs.readFileSync(path.join(root, 'src/enhancements.js'), 'utf8').replace(/\r\n/g, '\n').split('// CommonJS test exports')[0].trim();
const start = '        // NEK_ENHANCEMENTS_START';
const end = '        // NEK_ENHANCEMENTS_END';
const block = start + '\n' + source.split('\n').map(l => l.trim() ? '        ' + l : '').join('\n') + '\n' +
    `        const nekEnhancements = createNekEnhancements({
            game: () => typeof game !== 'undefined' ? game : null,
            ui: () => typeof UI !== 'undefined' ? UI : null,
            msg: () => typeof MSG !== 'undefined' ? MSG : null,
            data: () => typeof Data !== 'undefined' ? Data : null,
            cookingChestDivisor: typeof CHEST_TIME_DIVISOR_COOKING !== 'undefined' ? CHEST_TIME_DIVISOR_COOKING : 21600,
            enabled: isEnabled, costEnabled: isCostEnabled, identifyAction, document, window,
            storage: { getItem: k => localStorage.getItem(k), setItem: (k, v) => { localStorage.setItem(k, v); if (k.indexOf('nek_enhancements_v1:') === 0 && k.indexOf(':lease') === -1) cloudMark(); }, removeItem: k => localStorage.removeItem(k) }
        });\n` + end;
const from = script.indexOf(start), to = script.indexOf(end);
if (from < 0 || to <= from || from !== script.lastIndexOf(start) || to !== script.lastIndexOf(end)) {
    throw new Error('Expected one ordered pair of enhancement markers; install file was not changed.');
}
script = script.slice(0, from) + block + script.slice(to + end.length);
if (!script.includes('function () { nekEnhancements.decorate(); }')) {
    script = script.replace('function () { decorateMarketMarkers(); }', 'function () { decorateMarketMarkers(); },\n                    function () { nekEnhancements.decorate(); }');
}
if (!/nekEnhancements\.init\(\);/.test(script)) script = script.replace('        initHarvest();   // 启动自动收菜', '        nekEnhancements.init();\n        initHarvest();   // 启动自动收菜');
script = script.replace(/(\/\/ @version\s+)\S+/, (_, prefix) => prefix + version)
    .replace(/const CURRENT_VERSION = '[^']+';/, "const CURRENT_VERSION = '" + version + "';")
    // 整行替换：任何以 // @description 开头直到行尾的内容都替换掉，避免每次 build 在尾部累积旧段落。
    .replace(/(\/\/ @description)[^\r\n]*/, (_, prefix) =>
        prefix + '  v' + version + '：成本核算卡片展开标题左侧加三角指示（展开后旋转）；市场详情只对生产/烹饪成品显示「精算」按钮；成本核算（侧栏入口+精算）改为独立设置开关并纳入云同步；烹饪/生产/采集列表优化、点金辅助、农业辅助五项合并为设置页「生产采集界面优化」一个开关。v1.52.0——库存成本输入限两位小数；小计括号差额为 +0 时不显示；成本核算清单与库存成本纳入云同步（整份覆盖、归一化比对）；云同步改为连续 3 条修改或停止修改 5 秒后上传，云端旧脚本无法本地覆盖的字段暂存并在上传时原样带回。v1.51.0——成本核算卡片改为「直接买入材料」「从基础原料制作」两个可展开块——前者仅列一层直接材料、含库存成本列与按出售/收购小计的括号差额（正数绿字、负数红字），后者列完整逐层树、无库存成本列与括号；展开状态跨重绘保留。v1.50.0——修复小计括号差额：中间产物自身录有库存成本时按它核算，不再误展开子节点显示 +0；成本核算页改为复用主脚本行情 API（含 v1.44.4 单物品强刷修复），缺报价材料恢复行情后自动重绘，不再另拉全量快照自造取数。v1.49.0——修复替换食材按钮尺寸（不再覆盖原生 .btn 字号/内边距）；「仓库成本」改名「库存成本」，录入浮窗改确定/清空/取消三按钮；悬停物品行情新增库存成本行；成本表用量并入材料列（x数字）、第二列改库存成本，最终小计括号显示市场小计−库存合计差额。v1.48.0——物品菜单新增彩色像素图标「仓库成本」（背包无该物品时隐藏，录入浮窗默认填左一价，确定保存、点外部关闭），市场买入后按库存与成交价加权更新本地成本；替换食材按钮与删除按钮等高；面包等战斗掉落物改标「战斗掉落」。v1.47.1——修复成本核算侧栏图标显示样式差异、精算按钮样式，选择浮层筛选点击消失与图标重叠（全部档不显示第二层），采集/掉落类食材误标「配方不可用」，替换食材改用游戏原生选择界面。v1.47.0——成本核算界面改炼金式两层筛选图标网格（全部/生产/烹饪各四分支）；侧栏入口换趋势图表图标；市场详情收藏旁新增「精算」按钮一键加入/剔除清单；成本核算支持烹饪配方与「食材重构」替代食材（研究 126 解锁后显示替换按钮）。v1.46.2——修复全量市场快照漏物品（如无卖单的松露意面）时误判「暂无市场行情」——缺底数先走单物品强刷确认，失败延时重试，快照到达后恢复同物品其他等级。v1.46.1——统一成本核算入口的侧栏文字样式，并换用表格图标。v1.46.0——成本核算支持自选清单与宽屏双列。v1.45.2——收紧成本表，材料用量与双侧报价分列对齐。v1.45.1——修复成本核算页展开长配方后无法滚动的问题。v1.45.0——新增奇点科技生产成本核算，可逐层展开至采集和梳毛原料。v1.44.3——修复云同步开关与预约恢复、研究账号切换、定时钓鱼队列恢复及构建校验。v1.44.2——修复研究队列云同步「已完成研究复活」竞态——云端旧队列覆盖本地时，按游戏实时等级过滤掉目标已达成的条目（与 plan()/settleSubmitted 同口径，含正在研究任务 +1），比对时同口径过滤避免每次刷新误报覆盖。v1.44.1——toolbar「手动云同步」按钮改为与签到按钮同款青色发光样式（文字由「同步」改「手动云同步」）。v1.44.0——云同步新增市场「我的收藏」同步（localStorage.favorite 的 itemId 数组，归一化去重排序后入 payload；挂钩 Utils.setData 自动上传；云端覆盖前弹窗对比两端收藏数量由用户决定整份覆盖）+ toolbar 签到按钮旁新增「同步」按钮（仅上传本地到云端，不拉取）。v1.43.7——修复刷新时误报「云端已覆盖本地」——开关按脚本真实语义归一化比对（null 或 1 都=开、0=关），null 与 1 不再判为不同；研究按钮缺料红框内发光改呼吸动画。v1.43.6——研究队列按钮缺料提示——队首材料确实不足（复用研究队列已有的 researchStatus 判定）时，快捷按钮红边框 + 红色内发光、字保持黑色，title 补注「队首材料不足，等待补充」。v1.43.5——pull 绑定到游戏主界面顶栏 toolbar-container——进入游戏（含刷新、回退登录页后重新进入）时各发一次 GET，同一节点只拉一次、回退清空以允许再拉；服务端 GET/GET 与 PUT/PUT 各自 2 秒限流、两者互不干扰。v1.43.4——修复刷新不发 pull：从 document-idle 延后到主界面就绪后再拉。v1.43.3——云同步 uid 安全加固——覆盖/上传前实时校验当前游戏玩家 uid（pull 请求前后双闸、push 上传前后双闸、flush 检测账号切换丢弃旧状态），防止 A 回退登录页后 B 登录被 A 的云端配置串号覆盖。v1.43.2——云同步与脚本加载并行——4 个 init 立即执行不等网络，服务端不可达/挂起都不影响加载（单次请求 3 秒超时）；启动只 pull 不 push，拉取后与本地比对，一致不覆盖不通知，仅云端覆盖本地 / push 成功 / push 失败三类用通知栏反馈；回退登录页不 push、不 pull；未登录不同步、不等待 uid；设置页云同步开关，本地设置/研究队列/钓鱼预约变化时 2 秒节流自动上传；首次开启云端有数据则二选一，无数据静默启用；钓鱼预约新增 day 日期字段跨日不同步；队列条目去 submitted、本地租约不进 payload；明文 JSON + XOR/Base64 混淆传输。自动收菜按钮 60 秒往返进度 CSS keyframes 动画；研究队列（预留材料与自动结算）、自动接受任务/领奖、市场行情、采集/生产/烹饪详情优化、防呆设置、点金辅助、农业辅助（自动收菜+好友农场预览）、检查更新、定时钓鱼、炼金经验效率与越级计算等，详见脚本正文。');
new (require('node:vm').Script)(script, { filename: file });
if (!script.includes(block) || !/nekEnhancements\.init\(\);/.test(script) || !script.includes('function () { nekEnhancements.decorate(); }')) {
    throw new Error('Userscript integration anchors changed; build aborted.');
}
fs.writeFileSync(file, script.replace(/\n/g, newline));
console.log('Built v' + version + ' userscript.');
