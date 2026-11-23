const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('安装文件与模块源码一致，入口、版本号和单次初始化完整', () => {
    const script = fs.readFileSync(path.join(root, '银河猫娘放置小助手.user.js'), 'utf8').replace(/\r\n/g, '\n');
    const source = fs.readFileSync(path.join(root, 'src/enhancements.js'), 'utf8').replace(/\r\n/g, '\n').split('// CommonJS test exports')[0].trim();
    const embedded = source.split('\n').map(line => line.trim() ? '        ' + line : '').join('\n');
    assert.ok(script.includes(embedded));
    assert.equal((script.match(/\/\/ NEK_ENHANCEMENTS_START/g) || []).length, 1);
    assert.equal((script.match(/\/\/ NEK_ENHANCEMENTS_END/g) || []).length, 1);
    assert.equal((script.match(/nekEnhancements\.init\(\);/g) || []).length, 1);
    assert.equal((script.match(/function \(\) \{ nekEnhancements\.decorate\(\); \}/g) || []).length, 1);
    assert.match(script, /@version\s+1\.41\.4\n/);
    assert.match(script, /@description\s+v1\.41\.4：/);
    assert.match(script, /const CURRENT_VERSION = '1\.41\.4';/);
    assert.doesNotThrow(() => new vm.Script(script));
});
