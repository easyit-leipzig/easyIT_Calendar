/*!
 * nojquery 4.0.0 - Core
 * Modern DOM helper with backward-compatible aliases.
 * License: MIT
 */
(function (global) {
  'use strict';

  const previousAliases = {
    underscore: global._,
    dollar: global.$
  };

  const isNode = value =>
    typeof Node !== 'undefined' && value instanceof Node;

  const isNodeList = value =>
    typeof NodeList !== 'undefined' &&
    (value instanceof NodeList ||
     (typeof HTMLCollection !== 'undefined' && value instanceof HTMLCollection));

  const toArray = value => {
    if (!value) return [];
    if (value instanceof NJ) return value.elements.slice();
    if (isNode(value) || value === window || value === document) return [value];
    if (isNodeList(value)) return Array.from(value);
    if (Array.isArray(value)) return value.filter(item => isNode(item) || item === window || item === document);
    return [];
  };

  const select = (selector, context = document) => {
    if (!selector && selector !== 0) return [];
    if (selector instanceof NJ) return selector.elements.slice();
    if (isNode(selector) || selector === window || selector === document) return [selector];
    if (isNodeList(selector)) return Array.from(selector);
    if (Array.isArray(selector)) return selector.filter(isNode);
    if (typeof selector !== 'string') return [];

    const value = selector.trim();
    if (!value) return [];

    try {
      if (/^#[A-Za-z][\w\-:.]*$/.test(value) && context === document) {
        const element = document.getElementById(value.slice(1));
        return element ? [element] : [];
      }
      if (/^\.[A-Za-z_][\w-]*$/.test(value) && context === document) {
        return Array.from(document.getElementsByClassName(value.slice(1)));
      }
      if (/^[A-Za-z][\w-]*$/.test(value) && context === document) {
        return Array.from(document.getElementsByTagName(value));
      }
      return Array.from(context.querySelectorAll(value));
    } catch (error) {
      if (nj.config.debug) console.error('nojquery selector error:', error);
      return [];
    }
  };

  class NJ {
    constructor(elements = []) {
      this.elements = toArray(elements);
    }

    get length() { return this.elements.length; }
    get e() {
      if (!this.elements.length) return null;
      if (this.elements.length === 1) return this.elements[0];
      const list = this.elements.slice();
      list.item = index => list[index] || null;
      return list;
    }

    [Symbol.iterator]() { return this.elements[Symbol.iterator](); }

    each(callback) {
      if (typeof callback !== 'function') return this;
      this.elements.forEach((element, index) => callback.call(element, index, element));
      return this;
    }

    map(callback) {
      return this.elements.map((element, index) => callback.call(element, index, element));
    }

    get(index = 0) {
      if (index < 0) index = this.elements.length + index;
      return this.elements[index];
    }

    first() { return new NJ(this.elements.length ? [this.elements[0]] : []); }
    last() { return new NJ(this.elements.length ? [this.elements[this.elements.length - 1]] : []); }
    eq(index) {
      const element = this.get(index);
      return new NJ(element ? [element] : []);
    }

    find(selector) {
      const result = [];
      this.each(function () { result.push(...select(selector, this)); });
      return new NJ([...new Set(result)]);
    }

    closest(selector) {
      const result = this.elements.map(el => el.closest ? el.closest(selector) : null).filter(Boolean);
      return new NJ([...new Set(result)]);
    }

    parent() {
      return new NJ([...new Set(this.elements.map(el => el.parentElement).filter(Boolean))]);
    }

    children(selector) {
      let result = [];
      this.each(function () { result.push(...Array.from(this.children || [])); });
      if (selector) result = result.filter(el => el.matches(selector));
      return new NJ(result);
    }

    next() { return new NJ(this.elements.map(el => el.nextElementSibling).filter(Boolean)); }
    prev() { return new NJ(this.elements.map(el => el.previousElementSibling).filter(Boolean)); }

    html(value) {
      if (value === undefined) return this.get()?.innerHTML;
      return this.each(function () { this.innerHTML = value; });
    }

    text(value) {
      if (value === undefined) return this.get()?.textContent;
      return this.each(function () { this.textContent = value; });
    }

    val(value) {
      if (value === undefined) return this.get()?.value;
      return this.each(function () { this.value = value; });
    }

    append(content) { return insertContent(this, content, 'beforeend'); }
    prepend(content) { return insertContent(this, content, 'afterbegin'); }
    before(content) { return insertContent(this, content, 'beforebegin'); }
    after(content) { return insertContent(this, content, 'afterend'); }

    appendTo(target) {
      const parent = nj(target).get();
      if (!parent) return this;
      return this.each(function () { parent.appendChild(this); });
    }

    empty() { return this.each(function () { this.replaceChildren(); }); }
    remove() { return this.each(function () { this.remove(); }); }

    attr(name, value) {
      if (typeof name === 'object') {
        return this.each(function () {
          Object.entries(name).forEach(([key, val]) => this.setAttribute(key, String(val)));
        });
      }
      if (value === undefined) return this.get()?.getAttribute(name);
      return this.each(function () { this.setAttribute(name, String(value)); });
    }

    removeAttr(name) { return this.each(function () { this.removeAttribute(name); }); }
    hasAttr(name) { return !!this.get()?.hasAttribute(name); }

    prop(name, value) {
      if (value === undefined) return this.get()?.[name];
      return this.each(function () { this[name] = value; });
    }

    data(name, value) {
      if (value === undefined) return this.get()?.dataset?.[name];
      return this.each(function () {
        if (this.dataset) this.dataset[name] = String(value);
      });
    }

    removeData(name) {
      return this.each(function () {
        if (this.dataset) delete this.dataset[name];
      });
    }

    addClass(classes) {
      const list = String(classes || '').split(/\s+/).filter(Boolean);
      return this.each(function () { this.classList?.add(...list); });
    }

    removeClass(classes) {
      const list = String(classes || '').split(/\s+/).filter(Boolean);
      return this.each(function () { this.classList?.remove(...list); });
    }

    toggleClass(name, force) {
      return this.each(function () {
        if (!this.classList) return;
        force === undefined ? this.classList.toggle(name) : this.classList.toggle(name, !!force);
      });
    }

    hasClass(name) { return !!this.get()?.classList?.contains(name); }

    css(property, value) {
      if (typeof property === 'object') {
        return this.each(function () {
          Object.entries(property).forEach(([key, val]) => {
            if (key.startsWith('--')) this.style.setProperty(key, val);
            else this.style[key] = val;
          });
        });
      }
      if (value === undefined) {
        const element = this.get();
        return element ? getComputedStyle(element).getPropertyValue(property) || getComputedStyle(element)[property] : undefined;
      }
      return this.each(function () {
        if (property.startsWith('--')) this.style.setProperty(property, value);
        else this.style[property] = value;
      });
    }

    removeCss(property) {
      return this.each(function () { this.style?.removeProperty(property); });
    }

    show(display = '') {
      return this.each(function () {
        this.hidden = false;
        this.style.display = display;
        if (getComputedStyle(this).display === 'none') this.style.display = 'block';
      });
    }

    hide() {
      return this.each(function () { this.style.display = 'none'; });
    }

    toggle(display = 'block') {
      return this.each(function () {
        this.style.display = getComputedStyle(this).display === 'none' ? display : 'none';
      });
    }

    on(events, selector, handler, options) {
      if (typeof selector === 'function') {
        options = handler;
        handler = selector;
        selector = null;
      }
      if (typeof handler !== 'function') return this;

      return this.each(function () {
        const element = this;
        String(events).split(/\s+/).filter(Boolean).forEach(eventName => {
          const wrapped = selector
            ? function (event) {
                const match = event.target.closest(selector);
                if (match && element.contains(match)) handler.call(match, event);
              }
            : handler;

          element.__njEvents ||= [];
          element.__njEvents.push({ eventName, original: handler, wrapped, selector, options });
          element.addEventListener(eventName, wrapped, options || false);
        });
      });
    }

    off(events, handler) {
      const names = events ? String(events).split(/\s+/).filter(Boolean) : [];
      return this.each(function () {
        const records = this.__njEvents || [];
        this.__njEvents = records.filter(record => {
          const eventMatches = !names.length || names.includes(record.eventName);
          const handlerMatches = !handler || handler === record.original;
          if (eventMatches && handlerMatches) {
            this.removeEventListener(record.eventName, record.wrapped, record.options || false);
            return false;
          }
          return true;
        });
      });
    }

    once(events, selector, handler, options = {}) {
      if (typeof selector === 'function') {
        options = handler || {};
        handler = selector;
        selector = null;
      }
      return this.on(events, selector, handler, { ...options, once: true });
    }

    trigger(name, detail) {
      return this.each(function () {
        this.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail }));
      });
    }

    checked(value) {
      if (value === undefined) return !!this.get()?.checked;
      return this.each(function () { this.checked = !!value; });
    }

    serialize() {
      const element = this.get();
      if (!(element instanceof HTMLFormElement)) return {};
      const result = {};
      new FormData(element).forEach((value, key) => {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
          result[key] = Array.isArray(result[key]) ? [...result[key], value] : [result[key], value];
        } else {
          result[key] = value;
        }
      });
      return result;
    }

    rect() { return this.get()?.getBoundingClientRect(); }

    scrollIntoView(options = { behavior: 'smooth', block: 'start' }) {
      return this.each(function () { this.scrollIntoView(options); });
    }

    animate(keyframes, options = {}) {
      const defaults = {
        duration: nj.config.animation.duration,
        easing: nj.config.animation.easing,
        fill: 'both'
      };
      return Promise.all(this.elements.map(element => {
        if (!element.animate) return Promise.resolve();
        return element.animate(keyframes, { ...defaults, ...options }).finished;
      }));
    }

    fadeIn(duration) {
      this.show();
      return this.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration || nj.config.animation.duration });
    }

    fadeOut(duration) {
      return this.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration || nj.config.animation.duration })
        .then(() => this.hide());
    }

    is(selector) { return !!this.get()?.matches?.(selector); }
    exists() { return this.elements.length > 0; }
  }

  function insertContent(wrapper, content, position) {
    return wrapper.each(function (index) {
      if (typeof content === 'string') {
        this.insertAdjacentHTML(position, content);
        return;
      }

      const nodes = content instanceof NJ ? content.elements : toArray(content);
      if (!nodes.length) {
        this.insertAdjacentText(position, String(content ?? ''));
        return;
      }

      nodes.forEach(node => {
        const item = index === 0 ? node : node.cloneNode(true);
        if (position === 'beforeend') this.appendChild(item);
        else if (position === 'afterbegin') this.insertBefore(item, this.firstChild);
        else if (position === 'beforebegin') this.parentNode?.insertBefore(item, this);
        else if (position === 'afterend') this.parentNode?.insertBefore(item, this.nextSibling);
      });
    });
  }

  function nj(selector, context) {
    if (selector instanceof NJ) return selector;
    return new NJ(select(selector, context ? nj(context).get() : document));
  }

  nj.version = '4.0.0';
  nj.NJ = NJ;

  nj.config = {
    debug: false,
    warn: true,
    exposeUnderscore: true,
    exposeDollar: false,
    forceAliasOverwrite: false,
    ajaxTimeout: 8000,
    animation: {
      duration: 300,
      easing: 'ease'
    }
  };

  nj.ready = callback => {
    if (typeof callback !== 'function') return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else queueMicrotask(callback);
  };

  nj.create = (tag, attributes = {}, children = []) => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'text') element.textContent = value;
      else if (key === 'html') element.innerHTML = value;
      else if (key === 'class') element.className = value;
      else if (key === 'dataset' && value && typeof value === 'object') Object.assign(element.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key in element && key !== 'style') element[key] = value;
      else element.setAttribute(key, String(value));
    });
    const list = Array.isArray(children) ? children : [children];
    list.filter(item => item !== null && item !== undefined).forEach(child => {
      element.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return element;
  };

  nj.extend = (...objects) => Object.assign(...objects);
  nj.deepEqual = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch { return false; }
  };
  nj.isJSON = value => {
    try {
      if (typeof value === 'string') JSON.parse(value);
      else JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  };
  nj.arrayRemove = (array, value) => {
    const index = array.indexOf(value);
    if (index >= 0) array.splice(index, 1);
    return array;
  };
  nj.filterObjectArray = (array, field, value) => array.filter(item => item?.[field] === value);
  nj.forEach = (array, callback) => array.forEach(callback);
  nj.cssVar = (name, value) => {
    if (value === undefined) return getComputedStyle(document.documentElement).getPropertyValue(name);
    document.documentElement.style.setProperty(name, value);
    return value;
  };
  nj.detectBrowser = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'ChromiumEdge';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown';
  };

  nj.core = {
    select,
    toArray,
    isNode,
    isNodeList,
    utilities: {
      extend: nj.extend,
      deepEqual: nj.deepEqual,
      isJSON: nj.isJSON
    }
  };

  nj.exposeAliases = function (options = {}) {
    const config = {
      underscore: nj.config.exposeUnderscore,
      dollar: nj.config.exposeDollar,
      force: nj.config.forceAliasOverwrite,
      ...options
    };

    global.nj = nj;

    const expose = (name, enabled) => {
      if (!enabled) return false;
      if (global[name] !== undefined && global[name] !== nj && !config.force) {
        if (nj.config.warn) console.warn(`nojquery: alias "${name}" is already in use.`);
        return false;
      }
      global[name] = nj;
      return true;
    };

    return {
      nj: true,
      underscore: expose('_', config.underscore),
      dollar: expose('$', config.dollar)
    };
  };

  nj.releaseAlias = name => {
    if (!['_', '$'].includes(name) || global[name] !== nj) return false;
    global[name] = name === '_' ? previousAliases.underscore : previousAliases.dollar;
    return true;
  };

  nj.hasAlias = name => global[name] === nj;

  // Backward compatibility aliases
  NJ.prototype.htm = NJ.prototype.html;
  NJ.prototype.txt = NJ.prototype.text;
  NJ.prototype.v = NJ.prototype.val;
  NJ.prototype.aCh = NJ.prototype.append;
  NJ.prototype.pCh = NJ.prototype.prepend;
  NJ.prototype.app = NJ.prototype.append;
  NJ.prototype.b = NJ.prototype.before;
  NJ.prototype.a = NJ.prototype.after;
  NJ.prototype.p = NJ.prototype.parent;
  NJ.prototype.rEl = NJ.prototype.remove;
  NJ.prototype.aCN = NJ.prototype.addClass;
  NJ.prototype.rCN = NJ.prototype.removeClass;
  NJ.prototype.aCl = NJ.prototype.addClass;
  NJ.prototype.rCl = NJ.prototype.removeClass;
  NJ.prototype.tCl = NJ.prototype.toggleClass;
  NJ.prototype.hCl = NJ.prototype.hasClass;
  NJ.prototype.sty = NJ.prototype.css;
  NJ.prototype.sRP = NJ.prototype.removeCss;
  NJ.prototype.atr = NJ.prototype.attr;
  NJ.prototype.hAt = NJ.prototype.hasAttr;
  NJ.prototype.rAt = NJ.prototype.removeAttr;
  NJ.prototype.sDs = NJ.prototype.data;
  NJ.prototype.ds = NJ.prototype.data;
  NJ.prototype.tri = NJ.prototype.trigger;
  NJ.prototype.gRe = NJ.prototype.rect;
  NJ.prototype.isE = NJ.prototype.exists;
  NJ.prototype.fEl = NJ.prototype.first;
  NJ.prototype.lEl = NJ.prototype.last;
  NJ.prototype.nEl = function (number) { return typeof number === 'number' ? this.eq(number - 1) : this.next(); };
  NJ.prototype.bEl = NJ.prototype.prev;
  NJ.prototype.els = function (selector) {
    if (selector !== undefined) return nj(selector).e;
    return this.e;
  };

  nj.oEx = nj.extend;
  nj.cEq = nj.deepEqual;
  nj.isJ = nj.isJSON;
  nj.rAE = nj.arrayRemove;
  nj.fOA = nj.filterObjectArray;
  nj.fEa = (array, callback) => array.forEach((value, index) => callback(index, value));
  nj.ddS = (name, value) => nj.cssVar(name, value);
  nj.ddG = name => nj.cssVar(name);
  nj.gBr = nj.detectBrowser;

  nj.exposeAliases();
})(window);
