const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, '银河猫娘放置小助手.user.js');
const version = '1.44.1';
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
            enabled: isEnabled, identifyAction, document, window,
            storage: { getItem: k => localStorage.getItem(k), setItem: (k, v) => { localStorage.setItem(k, v); if (k.indexOf('nek_enhancements_v1:') === 0 && k.indexOf(':lease') === -1) cloudMark(); }, removeItem: k => localStorage.removeItem(k) }
        });\n` + end;
if (script.includes(start)) script = script.slice(0, script.indexOf(start)) + block + script.slice(script.indexOf(end) + end.length);
else script = script.replace('        // ---------------- 设置页开关（游戏设置 → 其他） ----------------', block + '\n\n        // ---------------- 设置页开关（游戏设置 → 其他） ----------------');
if (!script.includes('function () { nekEnhancements.decorate(); }')) {
    script = script.replace('function () { decorateMarketMarkers(); }', 'function () { decorateMarketMarkers(); },\n                    function () { nekEnhancements.decorate(); }');
}
if (!/nekEnhancements\.init\(\);/.test(script)) script = script.replace('        initHarvest();   // 启动自动收菜', '        nekEnhancements.init();\n        initHarvest();   // 启动自动收菜');
script = script.replace(/(\/\/ @version\s+)\S+/, (_, prefix) => prefix + version)
    .replace(/const CURRENT_VERSION = '[^']+';/, "const CURRENT_VERSION = '" + version + "';")
    // 整行替换：任何以 // @description 开头直到行尾的内容都替换掉，避免每次 build 在尾部累积旧段落。
    .replace(/(\/\/ @description)[^\r\n]*/, (_, prefix) =>
        prefix + '  v' + version + '：toolbar「手动云同步」按钮改为与签到按钮同款青色发光样式（文字由「同步」改「手动云同步」）。v1.44.0——云同步新增市场「我的收藏」同步（localStorage.favorite 的 itemId 数组，归一化去重排序后入 payload；挂钩 Utils.setData 自动上传；云端覆盖前弹窗对比两端收藏数量由用户决定整份覆盖）+ toolbar 签到按钮旁新增「同步」按钮（仅上传本地到云端，不拉取）。v1.43.7——修复刷新时误报「云端已覆盖本地」——开关按脚本真实语义归一化比对（null 或 1 都=开、0=关），null 与 1 不再判为不同；研究按钮缺料红框内发光改呼吸动画。v1.43.6——研究队列按钮缺料提示——队首材料确实不足（复用研究队列已有的 researchStatus 判定）时，快捷按钮红边框 + 红色内发光、字保持黑色，title 补注「队首材料不足，等待补充」。v1.43.5——pull 绑定到游戏主界面顶栏 toolbar-container——进入游戏（含刷新、回退登录页后重新进入）时各发一次 GET，同一节点只拉一次、回退清空以允许再拉；服务端 GET/GET 与 PUT/PUT 各自 2 秒限流、两者互不干扰。v1.43.4——修复刷新不发 pull：从 document-idle 延后到主界面就绪后再拉。v1.43.3——云同步 uid 安全加固——覆盖/上传前实时校验当前游戏玩家 uid（pull 请求前后双闸、push 上传前后双闸、flush 检测账号切换丢弃旧状态），防止 A 回退登录页后 B 登录被 A 的云端配置串号覆盖。v1.43.2——云同步与脚本加载并行——4 个 init 立即执行不等网络，服务端不可达/挂起都不影响加载（单次请求 3 秒超时）；启动只 pull 不 push，拉取后与本地比对，一致不覆盖不通知，仅云端覆盖本地 / push 成功 / push 失败三类用通知栏反馈；回退登录页不 push、不 pull；未登录不同步、不等待 uid；设置页云同步开关，本地设置/研究队列/钓鱼预约变化时 2 秒节流自动上传；首次开启云端有数据则二选一，无数据静默启用；钓鱼预约新增 day 日期字段跨日不同步；队列条目去 submitted、本地租约不进 payload；明文 JSON + XOR/Base64 混淆传输。自动收菜按钮 60 秒往返进度 CSS keyframes 动画；研究队列（预留材料与自动结算）、自动接受任务/领奖、市场行情、采集/生产/烹饪详情优化、防呆设置、点金辅助、农业辅助（自动收菜+好友农场预览）、检查更新、定时钓鱼、炼金经验效率与越级计算等，详见脚本正文。');
new (require('node:vm').Script)(script, { filename: file });
if (!script.includes(block) || !/nekEnhancements\.init\(\);/.test(script) || !script.includes('function () { nekEnhancements.decorate(); }')) {
    throw new Error('Userscript integration anchors changed; build aborted.');
}
fs.writeFileSync(file, script.replace(/\n/g, newline));
console.log('Built v' + version + ' userscript.');
