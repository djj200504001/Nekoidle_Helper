// 仅供离线接入测试使用的最小 DOM；不连接浏览器或游戏服务。
class Element {
    constructor(tag, owner) {
        this.tagName = tag.toUpperCase(); this.ownerDocument = owner; this.parentNode = null;
        this.childNodes = []; this.dataset = {}; this.listeners = {}; this._text = ''; this._class = '';
        this._hidden = false; this._title = ''; this.id = '';
        const classes = () => new Set(this._class.split(/\s+/).filter(Boolean));
        this.classList = {
            contains: name => classes().has(name),
            add: (...names) => { const values = classes(); names.forEach(n => values.add(n)); this.className = [...values].join(' '); },
            remove: (...names) => { const values = classes(); names.forEach(n => values.delete(n)); this.className = [...values].join(' '); },
            toggle: (name, force) => { const values = classes(), add = force ?? !values.has(name); if (add) values.add(name); else values.delete(name); this.className = [...values].join(' '); return add; }
        };
    }
    mutate() { if (this.ownerDocument) this.ownerDocument.mutations++; }
    get className() { return this._class; }
    set className(value) { if (this._class !== value) { this._class = value; this.mutate(); } }
    get hidden() { return this._hidden; }
    set hidden(value) { this._hidden = value; this.mutate(); }
    get title() { return this._title; }
    set title(value) { this._title = value; this.mutate(); }
    get children() { return this.childNodes.filter(c => c.tagName !== '#TEXT'); }
    get firstElementChild() { return this.children[0] || null; }
    get nextElementSibling() {
        const siblings = this.parentNode?.children || [];
        return siblings[siblings.indexOf(this) + 1] || null;
    }
    get textContent() { return this._text + this.childNodes.map(c => c.textContent).join(''); }
    set textContent(value) {
        this._text = String(value); this.childNodes.forEach(c => { c.parentNode = null; }); this.childNodes = []; this.mutate();
    }
    get isConnected() { let e = this; while (e.parentNode) e = e.parentNode; return e.tagName === '#DOCUMENT'; }
    appendChild(child) { if (child.parentNode) child.remove(); child.parentNode = this; this.childNodes.push(child); this.mutate(); return child; }
    // 离线几何：仅 top 参与（吸顶折叠判定用），测试可写 el._rectTop 模拟滚动位置
    getBoundingClientRect() { return { top: this._rectTop || 0 }; }
    insertBefore(node, ref) {
        if (node.parentNode) node.remove();
        if (!ref || ref.parentNode !== this) return this.appendChild(node);
        this.childNodes.splice(this.childNodes.indexOf(ref), 0, node); node.parentNode = this; this.mutate(); return node;
    }
    append(...children) { children.forEach(c => this.appendChild(typeof c === 'string' ? this.ownerDocument.createTextNode(c) : c)); }
    replaceChildren(...children) { this.textContent = ''; this.append(...children); }
    remove() { if (this.parentNode) { const parent = this.parentNode; parent.childNodes = parent.childNodes.filter(c => c !== this); this.parentNode = null; parent.mutate(); } }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(listener => listener !== fn); }
    fire(type) { this.listeners[type]?.forEach(fn => fn({ stopPropagation() {} })); }
    matches(selector) {
        const parts = selector.trim().split(/\s+/), last = parts.pop();
        const atomic = (el, s) => {
            if (s.startsWith('.')) return s.slice(1).split('.').every(c => el.classList.contains(c));
            if (s.startsWith('#')) return el.id === s.slice(1);
            const attribute = s.match(/^\[data-([a-z-]+)\]$/);
            if (attribute) return attribute[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()) in el.dataset;
            return el.tagName.toLowerCase() === s.toLowerCase();
        };
        if (!atomic(this, last)) return false;
        let cursor = this.parentNode;
        while (parts.length) {
            const part = parts.pop();
            while (cursor && !atomic(cursor, part)) cursor = cursor.parentNode;
            if (!cursor) return false;
            cursor = cursor.parentNode;
        }
        return true;
    }
    querySelectorAll(selector) {
        const selectors = selector.split(','); const result = [];
        const walk = el => el.children.forEach(child => { if (selectors.some(s => child.matches(s))) result.push(child); walk(child); });
        walk(this); return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
class Document extends Element {
    constructor() {
        super('#document', null); this.ownerDocument = this; this.mutations = 0;
        this.head = this.createElement('head'); this.body = this.createElement('body'); this.append(this.head, this.body);
    }
    createElement(tag) { return new Element(tag, this); }
    createTextNode(value) { const node = new Element('#text', this); node.textContent = value; return node; }
    getElementById(id) { return this.querySelector('#' + id); }
}
module.exports = { Document };
