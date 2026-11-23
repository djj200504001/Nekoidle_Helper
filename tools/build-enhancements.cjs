const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, '银河猫娘放置小助手.user.js');
const version = '1.41.2';
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
            storage: { getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v), removeItem: k => localStorage.removeItem(k) }
        });\n` + end;
if (script.includes(start)) script = script.slice(0, script.indexOf(start)) + block + script.slice(script.indexOf(end) + end.length);
else script = script.replace('        // ---------------- 设置页开关（游戏设置 → 其他） ----------------', block + '\n\n        // ---------------- 设置页开关（游戏设置 → 其他） ----------------');
if (!script.includes('function () { nekEnhancements.decorate(); }')) {
    script = script.replace('function () { decorateMarketMarkers(); }', 'function () { decorateMarketMarkers(); },\n                    function () { nekEnhancements.decorate(); }');
}
if (!script.includes('        nekEnhancements.init();')) script = script.replace('        initHarvest();   // 启动自动收菜', '        nekEnhancements.init();\n        initHarvest();   // 启动自动收菜');
script = script.replace(/(\/\/ @version\s+)\S+/, (_, prefix) => prefix + version)
    .replace(/const CURRENT_VERSION = '[^']+';/, "const CURRENT_VERSION = '" + version + "';")
    .replace(/(\/\/ @description\s+)(?:v1\.\d+\.\d+：[^。]*。)?/, (_, prefix) =>
        prefix + 'v' + version + '：研究队列记录并预留开研材料，支持桌面和手机手动收起与展开，手机端支持滚动吸顶折叠，材料不足或无效的条目显示红字及原因；支持自动结算研究、自动接受任务和领取任务奖励，梳毛/采集/生产/烹饪产出物显示背包库存和队列预计产出。');
new (require('node:vm').Script)(script, { filename: file });
if (!script.includes(block) || !script.includes('        nekEnhancements.init();') || !script.includes('function () { nekEnhancements.decorate(); }')) {
    throw new Error('Userscript integration anchors changed; build aborted.');
}
fs.writeFileSync(file, script.replace(/\n/g, newline));
console.log('Built v' + version + ' userscript.');
