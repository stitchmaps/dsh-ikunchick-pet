/**
 * dsh-ikunchick-pet — browser half.
 *
 * A "鸡你太美" basketball-chick desktop pet that lives in the bottom-right
 * corner of the DSH Web GUI. It renders into the root-scoped `shell.overlay`
 * slot as a fixed-position sprite driven by the 8x9 pixel spritesheet.
 *
 * This is the READABLE source. The shipped ./client.js is produced from it by
 * `scripts/build-client.mjs`, which replaces `__SPRITE_DATA_URI__` with the
 * base64 webp spritesheet (assets/spritesheet.webp). Do not put the huge data
 * URI in this file by hand.
 *
 * Loaded through the DSH web module loader as a lazy CJS factory.
 */
;(function () {
  var MODULE_ID = 'dsh-ikunchick-pet'
  var loader = typeof window !== 'undefined' ? window.__ModuleLoader__ : undefined
  if (!loader || typeof loader.load !== 'function') return

  loader.load({
    id: MODULE_ID,
    factory: function (require) {
      var module = { exports: {} }
      var React = require('react')
      var h = React.createElement

      var NS = MODULE_ID
      var SPRITE = '__SPRITE_DATA_URI__' // replaced at build time
      var CLICK_KUN = '__CLICK_KUN_URI__' // replaced at build time (唱跳rap篮球)
      var CLICK_NAILONG = '__CLICK_NAILONG_URI__' // replaced at build time (奶龙笑)

      // Spritesheet geometry: 8 columns x 9 rows of equal cells.
      var COLS = 8
      var ROWS = 9
      // On-screen base size (the sheet is drawn scaled to this per cell).
      var BASE_W = 112
      var BASE_H = 121

      // Named animations -> frame sequences as [row, col] pairs into the grid.
      var ANIM = {
        idle:     { fps: 5,  frames: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 4], [0, 3], [0, 2], [0, 1]] },
        dribble:  { fps: 11, frames: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]] },
        dribble2: { fps: 11, frames: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7]] },
        wave:     { fps: 8,  frames: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 2], [3, 1]] },
        raise:    { fps: 7,  frames: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 3], [4, 2], [4, 1]] },
        talk:     { fps: 7,  frames: [[5, 1], [5, 4], [5, 3], [5, 1]] },
        rest:     { fps: 3,  frames: [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4]] },
      }

      // ---- locale ---------------------------------------------------------
      var STR = {
        zh: {
          menuTitle: '鸡你太美 · 设置',
          size: '大小', small: '小', normal: '中', large: '大',
          speed: '动画', slow: '慢', normalSpeed: '常', fast: '快',
          sound: '按压音效', badge: '余额角标',
          clickSound: '点击音效', csOff: '关', csNailong: '奶龙笑', csKun: '唱跳rap',
          refresh: '刷新余额', refreshDoing: '刷新中…',
          reset: '回到右下角', hide: '隐藏小鸡',
          restore: '叫回小鸡',
          skip: '收起',
          balLoading: '正在查余额…',
          balNoKey: '没配置 DEEPSEEK_API_KEY，看不到余额啦',
          balFail: '余额没查到，等会儿再试',
          balTotal: '余额', balToday: '今日已用',
          waitQ: '有人在等你回答', waitA: '有人在等你授权', waitFrom: '来自', waitNow: '点我收起，去处理一下～',
          consumeHead: '本轮消耗', consumeTokens: 'Token', consumeModel: '模型', consumeHint: '对话结束啦，这是本轮的额度～',
          phrases: [
            '鸡你太美~', '唱、跳、rap、篮球！', '练习两年半，就等你啦',
            '要不要投个三分？', '运球一百遍，手都不酸～', '打铁了…再来一个！',
            '好球！这波稳了', '我是你的篮球小鸡 🐤', '盖帽成功，耶！',
          ],
        },
        en: {
          menuTitle: 'Ikun Chick · Settings',
          size: 'Size', small: 'S', normal: 'M', large: 'L',
          speed: 'Motion', slow: 'Slow', normalSpeed: 'Normal', fast: 'Fast',
          sound: 'Press sound', badge: 'Balance badge',
          clickSound: 'Click sound', csOff: 'Off', csNailong: 'Nailong', csKun: 'Rap',
          refresh: 'Refresh balance', refreshDoing: 'Refreshing…',
          reset: 'Back to corner', hide: 'Hide chick',
          restore: 'Call chick back',
          skip: 'Dismiss',
          balLoading: 'Checking balance…',
          balNoKey: 'No DEEPSEEK_API_KEY — balance unavailable',
          balFail: 'Balance fetch failed, retry later',
          balTotal: 'Balance', balToday: 'Today used',
          waitQ: 'Someone is waiting for your answer', waitA: 'Someone is waiting for your approval',
          waitFrom: 'from', waitNow: 'Click to dismiss and go handle it~',
          consumeHead: 'This turn', consumeTokens: 'Token', consumeModel: 'model', consumeHint: 'Turn finished — this round cost',
          phrases: [
            "Chicken you're so beautiful~", 'Sing, dance, rap, basketball!',
            'Two and a half years of practice!', 'Wanna shoot a three?',
            'Dribbling a hundred times~', 'Brick! One more shot!',
            'Nice shot, nailed it', "I'm your basketball chick 🐤", 'Blocked it, yay!',
          ],
        },
      }

      var lang = 'en'
      try { if (typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || navigator.userLanguage || '')) lang = 'zh' } catch (e) {}
      function s(key) {
        var d = STR[lang] || STR.en
        if (d[key] !== undefined) return d[key]
        return STR.en[key] !== undefined ? STR.en[key] : key
      }

      var CLIENT_DEFAULTS = {
        version: 1, position: null, mirror: false, size: 1, hidden: false,
        prefs: { sound: false, showBadge: true, showBubbleOnLoad: false, animSpeed: 1, clickSound: 'nailong' },
      }

      // ---- small utils ----------------------------------------------------
      function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)) }
      function dispW(size) { return Math.round(BASE_W * (size || 1)) }
      function dispH(size) { return Math.round(BASE_H * (size || 1)) }
      function viewport() {
        return {
          w: (typeof window !== 'undefined' && window.innerWidth) || 1280,
          h: (typeof window !== 'undefined' && window.innerHeight) || 800,
        }
      }
      function defaultPos(w, hgt) {
        var v = viewport()
        return { x: Math.round(v.w - w - 24), y: Math.round(v.h - hgt - 88) }
      }
      function clampPos(p, w, hgt) {
        var v = viewport()
        return {
          x: Math.round(clamp(p && p.x != null ? p.x : 0, 6, Math.max(6, v.w - w - 6))),
          y: Math.round(clamp(p && p.y != null ? p.y : 0, 6, Math.max(6, v.h - hgt - 6))),
        }
      }
      function mergeState(raw) {
        var out = {
          version: 1, position: null, mirror: false, size: 1, hidden: false,
          prefs: { sound: false, showBadge: true, showBubbleOnLoad: false, animSpeed: 1, clickSound: 'nailong' },
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          if (raw.position && typeof raw.position === 'object' && isFinite(raw.position.x) && isFinite(raw.position.y)) {
            out.position = { x: Number(raw.position.x), y: Number(raw.position.y) }
          }
          out.mirror = raw.mirror === true
          out.size = clamp(Number(raw.size) || 1, 0.6, 1.9)
          out.hidden = raw.hidden === true
          if (raw.prefs && typeof raw.prefs === 'object') {
            out.prefs.sound = raw.prefs.sound === true
            out.prefs.showBadge = raw.prefs.showBadge !== false
            out.prefs.showBubbleOnLoad = raw.prefs.showBubbleOnLoad === true
            out.prefs.animSpeed = clamp(Number(raw.prefs.animSpeed) || 1, 0.4, 2.5)
            out.prefs.clickSound = normalizeClick(raw.prefs.clickSound)
          }
        }
        return out
      }
      function normalizeClick(v) { return (v === 'none' || v === 'kun' || v === 'nailong') ? v : 'nailong' }
      function money(n) {
        var v = Number(n)
        if (!isFinite(v)) return '—'
        return v.toFixed(2)
      }
      function fmtCost(n) {
        var v = Number(n)
        if (!isFinite(v)) return '—'
        if (v === 0) return '0.00'
        if (v >= 1) return v.toFixed(2)
        if (v >= 0.1) return v.toFixed(3)
        if (v >= 0.001) return v.toFixed(4)
        return v.toPrecision(2)
      }
      function fmtTokens(n) {
        var v = Number(n) || 0
        if (v >= 1000000) return (v / 1000000).toFixed(2) + 'M'
        if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
        return String(Math.round(v))
      }

      // ---- host IO --------------------------------------------------------
      function loadState() {
        try {
          return fetch('api/' + MODULE_ID + '/state', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'get' }),
          }).then(function (r) { return r.ok ? r.json() : null })
            .then(function (j) { return j && j.ok ? j.value : null })
            .catch(function () { return null })
        } catch (e) { return Promise.resolve(null) }
      }
      function saveState(state) {
        try {
          fetch('api/' + MODULE_ID + '/state', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'save', state: state }),
          }).catch(function () {})
        } catch (e) { /* ignore */ }
      }
      function fetchBalance() {
        try {
          return fetch('api/' + MODULE_ID + '/balance', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'refresh' }),
          }).then(function (r) { return r.ok ? r.json() : null }).catch(function () { return null })
        } catch (e) { return Promise.resolve(null) }
      }
      function fetchWait() {
        try {
          return fetch('api/' + MODULE_ID + '/wait', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'get' }),
          }).then(function (r) { return r.ok ? r.json() : null }).catch(function () { return null })
        } catch (e) { return Promise.resolve(null) }
      }
      function fetchTurn() {
        try {
          return fetch('api/' + MODULE_ID + '/turn', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ op: 'get' }),
          }).then(function (r) { return r.ok ? r.json() : null }).catch(function () { return null })
        } catch (e) { return Promise.resolve(null) }
      }

      // ---- optional soft "boing" on press (WebAudio, no asset) -------------
      var audioCtx = null
      function boing() {
        try {
          var AC = window.AudioContext || window.webkitAudioContext
          if (!AC) return
          if (!audioCtx) audioCtx = new AC()
          var ctx = audioCtx
          if (ctx.state === 'suspended') ctx.resume()
          var t = ctx.currentTime
          var osc = ctx.createOscillator()
          var gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(520, t)
          osc.frequency.exponentialRampToValueAtTime(190, t + 0.14)
          gain.gain.setValueAtTime(0.0001, t)
          gain.gain.exponentialRampToValueAtTime(0.12, t + 0.012)
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
          osc.connect(gain); gain.connect(ctx.destination)
          osc.start(t); osc.stop(t + 0.22)
        } catch (e) { /* ignore */ }
      }

      // ---- click sound clips (baked data URIs) ----------------------------
      function playClip(uri) {
        try {
          if (!uri) return
          var a = new Audio(uri)
          a.volume = 0.9
          var p = a.play()
          if (p && typeof p.catch === 'function') p.catch(function () {})
        } catch (e) { /* ignore */ }
      }
      function playClickSound(kind) {
        if (kind === 'kun') playClip(CLICK_KUN)
        else if (kind === 'nailong') playClip(CLICK_NAILONG)
      }

      // ---- styles ---------------------------------------------------------
      function injectStyles() {
        if (typeof document === 'undefined') return
        var marker = MODULE_ID + '/styles'
        if (document.querySelector('style[data-plugin-css="' + marker + '"]') !== null) return
        var el = document.createElement('style')
        el.dataset.plugin = MODULE_ID
        el.dataset.pluginCss = marker
        el.textContent = [
          '.ikc-root{position:absolute;inset:0;pointer-events:none}',
          '.ikc-pet{position:fixed;pointer-events:auto;z-index:2;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;will-change:left,top}',
          '.ikc-pet.ikc-dragging{cursor:grabbing}',
          '.ikc-press{width:100%;height:100%;transform-origin:50% 100%;transition:transform .16s cubic-bezier(.34,1.56,.64,1)}',
          '.ikc-pet.ikc-pressed .ikc-press{transform:scale(1.12,.86)}',
          '.ikc-bob{width:100%;height:100%;animation:ikc-bob 2.8s ease-in-out infinite}',
          '.ikc-pet.ikc-resting .ikc-bob{animation-duration:5s}',
          '@keyframes ikc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
          '.ikc-sprite{display:block;width:100%;height:100%;background-repeat:no-repeat;image-rendering:pixelated;image-rendering:crisp-edges;transition:transform .18s ease;filter:drop-shadow(0 6px 7px rgba(0,0,0,.22))}',
          '.ikc-shadow{position:absolute;left:50%;bottom:-4px;width:64%;height:11px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.30),rgba(0,0,0,0) 70%);pointer-events:none}',
          '.ikc-badge{position:absolute;left:50%;top:-10px;transform:translateX(-50%);pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:11px;line-height:1.5;font-variant-numeric:tabular-nums;font-weight:600;color:var(--dsw-alias-label-primary,#f2f2f2);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#20232b) 82%,transparent);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));box-shadow:0 3px 10px rgba(0,0,0,.25);backdrop-filter:blur(8px);white-space:nowrap}',
          '.ikc-badge .ikc-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#2ecc71)}',
          '.ikc-zzz{position:absolute;right:-4px;top:-18px;font-size:14px;font-weight:700;color:var(--dsw-alias-label-secondary,#9aa0aa);pointer-events:none;animation:ikc-float 2.6s ease-in-out infinite}',
          '@keyframes ikc-float{0%{opacity:0;transform:translateY(2px) scale(.9)}30%{opacity:1}100%{opacity:0;transform:translateY(-12px) scale(1.1)}}',
          '.ikc-bubble{position:absolute;bottom:calc(100% + 12px);box-sizing:border-box;width:max-content;max-width:250px;padding:9px 12px;border-radius:12px;font-size:12.5px;line-height:1.55;color:var(--dsw-alias-label-primary,#f2f2f2);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#20232b) 90%,transparent);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));box-shadow:0 8px 24px rgba(0,0,0,.30);backdrop-filter:blur(10px);pointer-events:auto;animation:ikc-pop .16s ease-out}',
          '.ikc-bubble:after{content:"";position:absolute;bottom:-6px;width:10px;height:10px;background:inherit;border-right:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));transform:rotate(45deg)}',
          '.ikc-bubble.ikc-left:after{left:22px}',
          '.ikc-bubble.ikc-right:after{right:22px}',
          '@keyframes ikc-pop{from{opacity:0;transform:translateY(4px) scale(.96)}to{opacity:1;transform:none}}',
          '.ikc-phrase{font-weight:700;font-size:13.5px;margin-bottom:2px}',
          '.ikc-line{opacity:.85;font-variant-numeric:tabular-nums;display:flex;justify-content:space-between;gap:14px}',
          '.ikc-line b{font-weight:600}',
          '.ikc-bubble.ikc-reminder{border-color:var(--dsw-alias-state-warn-primary,#f0a04b);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f0a04b) 28%,transparent),0 12px 30px rgba(0,0,0,.36);animation:ikc-reminder-in .22s ease-out}',
          '.ikc-bubble.ikc-reminder:after{border-color:var(--dsw-alias-state-warn-primary,#f0a04b)}',
          '@keyframes ikc-reminder-in{0%{opacity:0;transform:translateY(6px) scale(.9)}60%{transform:translateY(0) scale(1.03)}100%{transform:none}}',
          '.ikc-reminder-title{font-weight:800;font-size:13.5px;margin-bottom:3px;color:var(--dsw-alias-state-warn-primary,#f0a04b)}',
          '.ikc-reminder .ikc-hint{opacity:.6;font-size:11.5px;margin-top:2px;justify-content:flex-start}',
          '.ikc-bubble.ikc-consume{border-color:var(--dsw-alias-brand-primary,#4d8dff);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#4d8dff) 24%,transparent),0 12px 30px rgba(0,0,0,.36);animation:ikc-reminder-in .22s ease-out}',
          '.ikc-bubble.ikc-consume:after{border-color:var(--dsw-alias-brand-primary,#4d8dff)}',
          '.ikc-consume-title{display:flex;align-items:baseline;gap:6px;font-weight:800;font-size:13px;margin-bottom:3px;color:var(--dsw-alias-brand-primary,#4d8dff)}',
          '.ikc-consume-title b{font-size:17px;font-variant-numeric:tabular-nums}',
          '.ikc-consume .ikc-hint{opacity:.6;font-size:11.5px;margin-top:2px;justify-content:flex-start}',
          '.ikc-waitdot{position:absolute;right:-6px;top:-12px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:var(--dsw-alias-state-warn-primary,#f0a04b);color:#241700;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;box-shadow:0 0 0 0 rgba(240,160,75,.55);animation:ikc-pulse 1.4s ease-out infinite}',
          '@keyframes ikc-pulse{0%{box-shadow:0 0 0 0 rgba(240,160,75,.55)}70%{box-shadow:0 0 0 10px rgba(240,160,75,0)}100%{box-shadow:0 0 0 0 rgba(240,160,75,0)}}',
          '.ikc-menu{position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);box-sizing:border-box;width:248px;padding:10px;border-radius:14px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#20232b) 94%,transparent);border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.16));box-shadow:0 14px 40px rgba(0,0,0,.38);backdrop-filter:blur(12px);pointer-events:auto;color:var(--dsw-alias-label-primary,#f2f2f2);font-size:12px}',
          '.ikc-menu-title{font-size:12px;font-weight:700;letter-spacing:.02em;padding:2px 4px 8px;color:var(--dsw-alias-label-secondary,#9aa0aa)}',
          '.ikc-menu-row{display:flex;align-items:center;gap:8px;padding:4px 2px}',
          '.ikc-menu-label{flex:none;width:36px;color:var(--dsw-alias-label-secondary,#9aa0aa)}',
          '.ikc-seg{display:flex;flex:1;gap:4px}',
          '.ikc-seg button{flex:1;min-width:0;font:inherit;font-size:11.5px;padding:4px 0;border-radius:8px;cursor:pointer;color:var(--dsw-alias-label-primary,#f2f2f2);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));transition:background .15s,border-color .15s}',
          '.ikc-seg button.ikc-on{background:var(--dsw-alias-button-primary-fill,#3b6ff5);border-color:transparent;color:#fff}',
          '.ikc-tog{display:flex;align-items:center;justify-content:space-between;padding:6px 2px;cursor:pointer}',
          '.ikc-tog .ikc-sw{flex:none;width:34px;height:19px;border-radius:999px;background:var(--dsw-alias-bg-layer-3,rgba(255,255,255,.14));position:relative;transition:background .15s}',
          '.ikc-tog .ikc-sw:after{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:transform .15s}',
          '.ikc-tog.ikc-on .ikc-sw{background:var(--dsw-alias-button-primary-fill,#3b6ff5)}',
          '.ikc-tog.ikc-on .ikc-sw:after{transform:translateX(15px)}',
          '.ikc-menu-btn{display:block;width:100%;box-sizing:border-box;text-align:left;font:inherit;font-size:12px;padding:7px 10px;margin-top:5px;border-radius:9px;cursor:pointer;color:var(--dsw-alias-label-primary,#f2f2f2);background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.05));border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));transition:background .15s}',
          '.ikc-menu-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.10))}',
          '.ikc-menu-btn.ikc-danger{color:var(--dsw-alias-state-warn-primary,#f0a04b)}',
          '.ikc-catcher{position:fixed;inset:0;z-index:1;background:transparent;pointer-events:auto}',
          '.ikc-restore{position:fixed;right:18px;bottom:18px;z-index:2;pointer-events:auto;width:40px;height:40px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.18));background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#20232b) 88%,transparent);box-shadow:0 6px 18px rgba(0,0,0,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;backdrop-filter:blur(8px)}',
        ].join('\n')
        document.head.appendChild(el)
      }

      // ---- Sprite (self-animating) ----------------------------------------
      function Sprite(props) {
        var animName = props.anim
        var size = props.size
        var speed = props.speed
        var mirror = props.mirror
        var anim = ANIM[animName] || ANIM.idle
        var state = React.useState(0)
        var idx = state[0]
        var setIdx = state[1]

        React.useEffect(function () {
          setIdx(0)
          var frames = anim.frames
          var ms = Math.max(28, 1000 / ((anim.fps || 8) * Math.max(0.2, speed || 1)))
          var i = 0
          var id = setInterval(function () {
            i = (i + 1) % frames.length
            setIdx(i)
          }, ms)
          return function () { clearInterval(id) }
        }, [animName, speed])

        var f = anim.frames[Math.min(idx, anim.frames.length - 1)] || anim.frames[0]
        var w = dispW(size)
        var hgt = dispH(size)
        return h('div', {
          className: 'ikc-sprite',
          style: {
            backgroundImage: 'url("' + SPRITE + '")',
            backgroundSize: (COLS * w) + 'px ' + (ROWS * hgt) + 'px',
            backgroundPosition: (-(f[1] * w)) + 'px ' + (-(f[0] * hgt)) + 'px',
            transform: mirror ? 'scaleX(-1)' : 'none',
          },
          'aria-hidden': 'true',
        })
      }

      // ---- busy detection (any session running) --------------------------
      function computeBusy(snap) {
        if (!snap || !snap.byId) return false
        var byId = snap.byId
        var ids = Array.isArray(snap.ids) ? snap.ids : Object.keys(byId)
        for (var i = 0; i < ids.length; i++) {
          var sm = byId[ids[i]]
          if (sm && sm.running) return true
        }
        if (snap.current && byId[snap.current] && byId[snap.current].running) return true
        return false
      }
      function useSessionsBusy(svc) {
        var st = React.useState(false)
        var busy = st[0]
        var setBusy = st[1]
        React.useEffect(function () {
          if (!svc || !svc.list || typeof svc.list.getSnapshot !== 'function') return undefined
          function update() { try { setBusy(computeBusy(svc.list.getSnapshot())) } catch (e) {} }
          update()
          var unsub = null
          try { if (typeof svc.list.subscribe === 'function') unsub = svc.list.subscribe(update) } catch (e) { unsub = null }
          return function () { try { if (typeof unsub === 'function') unsub() } catch (e) {} }
        }, [svc])
        return busy
      }

      // ---- Widget ---------------------------------------------------------
      function createWidget(ctx) {
        var sessionsSvc = null
        try { if (ctx && typeof ctx.get === 'function') sessionsSvc = ctx.get('sessions') } catch (e) { sessionsSvc = null }

        function Widget(props) {
          var readyState = React.useState(false)
          var ready = readyState[0]
          var setReady = readyState[1]

          var stateState = React.useState(mergeState(null))
          var uiState = stateState[0]
          var setUiState = stateState[1]
          var stateRef = React.useRef(uiState)
          function commit(next) {
            var v = typeof next === 'function' ? next(stateRef.current) : next
            stateRef.current = v
            setUiState(v)
            saveState(v)
          }
          function patch(partial) {
            commit(Object.assign({}, stateRef.current, partial))
          }

          var posState = React.useState({ x: 0, y: 0 })
          var pos = posState[0]
          var setPosRaw = posState[1]
          var posRef = React.useRef(pos)
          function setPos(p) { posRef.current = p; setPosRaw(p) }

          var pressedState = React.useState(false)
          var pressed = pressedState[0]
          var setPressed = pressedState[1]

          var bubbleState = React.useState(false)
          var bubbleOpen = bubbleState[0]
          var setBubbleOpen = bubbleState[1]
          var phraseState = React.useState(0)
          var phraseIdx = phraseState[0]
          var setPhraseIdx = phraseState[1]

          var menuState = React.useState(false)
          var menuOpen = menuState[0]
          var setMenuOpen = menuState[1]

          var oneShotState = React.useState(null)
          var oneShot = oneShotState[0]
          var setOneShot = oneShotState[1]
          var oneShotTimer = React.useRef(null)

          var restingState = React.useState(false)
          var resting = restingState[0]
          var setResting = restingState[1]

          var balState = React.useState(null)
          var bal = balState[0]
          var setBal = balState[1]
          var refreshingState = React.useState(false)
          var refreshing = refreshingState[0]
          var setRefreshing = refreshingState[1]

          var waitState2 = React.useState(null)
          var waitPending = waitState2[0]
          var setWaitPending = waitState2[1]
          var reminderState = React.useState(false)
          var reminderOpen = reminderState[0]
          var setReminderOpen = reminderState[1]
          var lastWaitId = React.useRef(null)
          var reminderTimer = React.useRef(null)

          var consumeState = React.useState(null)
          var consume = consumeState[0]
          var setConsume = consumeState[1]
          var consumeOpenState = React.useState(false)
          var consumeOpen = consumeOpenState[0]
          var setConsumeOpen = consumeOpenState[1]
          var turnInitRef = React.useRef(false)
          var lastTurnSeq = React.useRef(null)
          var consumeTimer = React.useRef(null)

          var lastInteract = React.useRef(Date.now())
          var dragRef = React.useRef(null)
          var petRef = React.useRef(null)
          var bubbleTimer = React.useRef(null)

          var busy = useSessionsBusy(sessionsSvc)
          var busyRef = React.useRef(busy)
          var prevBusy = React.useRef(busy)

          // init: load persisted state and place the pet
          React.useEffect(function () {
            var alive = true
            loadState().then(function (sv) {
              if (!alive) return
              var st = mergeState(sv)
              stateRef.current = st
              setUiState(st)
              var w = dispW(st.size), hgt = dispH(st.size)
              var p = st.position ? st.position : defaultPos(w, hgt)
              p = clampPos(p, w, hgt)
              posRef.current = p
              setPosRaw(p)
              setReady(true)
              if (st.prefs.showBubbleOnLoad && !st.hidden) openBubble()
            })
            return function () { alive = false }
          }, [])

          // keep clamped on resize
          React.useEffect(function () {
            function onResize() {
              if (!ready) return
              var st = stateRef.current
              var w = dispW(st.size), hgt = dispH(st.size)
              var p = clampPos(posRef.current, w, hgt)
              posRef.current = p
              setPosRaw(p)
            }
            window.addEventListener('resize', onResize)
            return function () { window.removeEventListener('resize', onResize) }
          }, [ready])

          // inactivity -> resting
          React.useEffect(function () {
            if (busy) { setResting(false); return }
            var id = setInterval(function () {
              setResting(!document.hidden && Date.now() - lastInteract.current > 65000)
            }, 3000)
            return function () { clearInterval(id) }
          }, [busy])

          // celebrate when a run finishes
          React.useEffect(function () {
            busyRef.current = busy
            if (prevBusy.current === true && busy === false) {
              play('raise', 1600)
              if (stateRef.current.prefs.sound) boing()
            }
            prevBusy.current = busy
          }, [busy])

          // balance polling
          React.useEffect(function () {
            var alive = true
            function pull() {
              fetchBalance().then(function (r) { if (alive && r) setBal(r) })
            }
            pull()
            var id = setInterval(pull, 60000)
            return function () { alive = false; clearInterval(id) }
          }, [])

          // waiting-for-user polling -> pop a reminder on a new pending interaction
          React.useEffect(function () {
            var alive = true
            function pull() {
              fetchWait().then(function (r) {
                if (!alive) return
                var p = r && r.ok ? r.pending : null
                setWaitPending(p || null)
                if (p && p.id && p.id !== lastWaitId.current) {
                  lastWaitId.current = p.id
                  setBubbleOpen(false)
                  setMenuOpen(false)
                  setReminderOpen(true)
                  clearTimeout(reminderTimer.current)
                  reminderTimer.current = setTimeout(function () { setReminderOpen(false) }, 20000)
                  play('raise', 2000)
                  var cs = stateRef.current ? stateRef.current.prefs.clickSound : 'nailong'
                  if (cs && cs !== 'none') playClickSound(cs)
                } else if (!p) {
                  lastWaitId.current = null
                  setReminderOpen(false)
                }
              })
            }
            pull()
            var id = setInterval(pull, 1500)
            return function () { alive = false; clearInterval(id); clearTimeout(reminderTimer.current) }
          }, [])

          // per-turn consumption: settle on turn end (host bumps seq) -> pop a cost bubble
          React.useEffect(function () {
            var alive = true
            function pull() {
              fetchTurn().then(function (r) {
                if (!alive || !r || !r.ok) return
                var seq = typeof r.seq === 'number' ? r.seq : null
                if (seq === null) return
                if (!turnInitRef.current) { turnInitRef.current = true; lastTurnSeq.current = seq; return }
                if (seq !== lastTurnSeq.current) {
                  lastTurnSeq.current = seq
                  if (r.turn) {
                    setConsume(r.turn)
                    setConsumeOpen(true)
                    setBubbleOpen(false)
                    play('raise', 1600)
                    clearTimeout(consumeTimer.current)
                    consumeTimer.current = setTimeout(function () { setConsumeOpen(false) }, 14000)
                  }
                }
              })
            }
            pull()
            var id = setInterval(pull, 2000)
            return function () { alive = false; clearInterval(id); clearTimeout(consumeTimer.current) }
          }, [])

          // outside click closes bubble/menu
          React.useEffect(function () {
            if (!bubbleOpen && !menuOpen) return
            function onDoc(e) {
              var node = petRef.current
              if (node && node.contains(e.target)) return
              setBubbleOpen(false)
              setMenuOpen(false)
            }
            window.addEventListener('pointerdown', onDoc, true)
            return function () { window.removeEventListener('pointerdown', onDoc, true) }
          }, [bubbleOpen, menuOpen])

          React.useEffect(function () { return function () { clearTimeout(oneShotTimer.current); clearTimeout(bubbleTimer.current) } }, [])

          function interact() {
            lastInteract.current = Date.now()
            if (resting) setResting(false)
          }
          function play(name, ms) {
            setOneShot(name)
            clearTimeout(oneShotTimer.current)
            oneShotTimer.current = setTimeout(function () { setOneShot(null) }, ms || 1200)
          }
          function openBubble() {
            var phrases = (STR[lang] || STR.en).phrases
            setPhraseIdx(Math.floor(Math.random() * phrases.length))
            setBubbleOpen(true)
            setMenuOpen(false)
            clearTimeout(bubbleTimer.current)
            bubbleTimer.current = setTimeout(function () { setBubbleOpen(false) }, 6500)
          }
          function toggleBubble() {
            if (reminderOpen && waitPending) { setReminderOpen(false); return }
            if (consumeOpen && consume) { setConsumeOpen(false); return }
            if (bubbleOpen) { setBubbleOpen(false); return }
            openBubble()
          }

          // --- pointer drag ---
          function onPointerDown(e) {
            if (e.button !== undefined && e.button !== 0) return
            interact()
            setMenuOpen(false)
            var st = stateRef.current
            try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) {}
            dragRef.current = {
              id: e.pointerId, startX: e.clientX, startY: e.clientY,
              baseX: posRef.current.x, baseY: posRef.current.y, moved: false,
            }
            setPressed(true)
            if (st.prefs.sound) boing()
          }
          function onPointerMove(e) {
            var d = dragRef.current
            if (!d || d.id !== e.pointerId) return
            var dx = e.clientX - d.startX
            var dy = e.clientY - d.startY
            if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
            if (!d.moved) return
            var st = stateRef.current
            var w = dispW(st.size), hgt = dispH(st.size)
            var p = clampPos({ x: d.baseX + dx, y: d.baseY + dy }, w, hgt)
            setPos(p)
          }
          function onPointerUp(e) {
            var d = dragRef.current
            dragRef.current = null
            setPressed(false)
            if (!d) return
            if (!d.moved) { playClickSound(stateRef.current.prefs.clickSound); toggleBubble(); play('wave', 1500); return }
            snapAndCommit()
          }

          function snapAndCommit() {
            var st = stateRef.current
            var w = dispW(st.size), hgt = dispH(st.size)
            var v = viewport()
            var p = clampPos(posRef.current, w, hgt)
            var snapDist = Math.max(60, w * 0.6)
            var mirror = st.mirror
            if (p.x <= snapDist) { p.x = 8; mirror = true }               // snapped left -> face inward
            else if (v.w - (p.x + w) <= snapDist) { p.x = v.w - w - 8; mirror = false }
            p = clampPos(p, w, hgt)
            posRef.current = p
            setPos(p)
            commit(Object.assign({}, st, { position: { x: p.x, y: p.y }, mirror: mirror }))
            interact()
          }

          function changeSize(val) {
            var st = stateRef.current
            var w = dispW(val), hgt = dispH(val)
            var p = clampPos(posRef.current, w, hgt)
            posRef.current = p
            setPos(p)
            commit(Object.assign({}, st, { size: val, position: { x: p.x, y: p.y } }))
            interact()
          }
          function changeSpeed(val) {
            var st = stateRef.current
            commit(Object.assign({}, st, { prefs: Object.assign({}, st.prefs, { animSpeed: val }) }))
            interact()
          }
          function changeClickSound(val) {
            var st = stateRef.current
            commit(Object.assign({}, st, { prefs: Object.assign({}, st.prefs, { clickSound: val }) }))
            interact()
            playClickSound(val)
          }
          function togglePref(key) {
            var st = stateRef.current
            var prefs = Object.assign({}, st.prefs)
            prefs[key] = !prefs[key]
            commit(Object.assign({}, st, { prefs: prefs }))
            interact()
            if (key === 'sound' && prefs.sound) boing()
          }
          function doRefresh() {
            setRefreshing(true)
            fetchBalance().then(function (r) { setBal(r); setRefreshing(false) })
            interact()
          }
          function doReset() {
            var st = stateRef.current
            var w = dispW(st.size), hgt = dispH(st.size)
            var p = clampPos(defaultPos(w, hgt), w, hgt)
            posRef.current = p
            setPos(p)
            commit(Object.assign({}, st, { position: { x: p.x, y: p.y }, mirror: false }))
            interact()
          }
          function doHide() {
            var st = stateRef.current
            setBubbleOpen(false); setMenuOpen(false)
            commit(Object.assign({}, st, { hidden: true }))
          }
          function restore() {
            var st = stateRef.current
            var w = dispW(st.size), hgt = dispH(st.size)
            var p = clampPos(st.position || defaultPos(w, hgt), w, hgt)
            posRef.current = p
            setPos(p)
            commit(Object.assign({}, st, { hidden: false }))
            play('wave', 1400)
          }

          if (!ready) return null

          var st = uiState
          if (st.hidden) {
            return h('div', { className: 'ikc-root', style: { pointerEvents: 'none' } }, [
              h('div', {
                key: 'restore', className: 'ikc-restore', title: s('restore'), role: 'button', tabIndex: 0,
                onPointerDown: function (e) { e.stopPropagation() },
                onClick: restore,
                onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') restore() },
              }, '🐤'),
            ])
          }

          var w = dispW(st.size)
          var hgt = dispH(st.size)
          var anim = oneShot || (busy ? 'dribble' : (resting ? 'rest' : 'idle'))
          var rightSide = pos.x + w / 2 > viewport().w / 2

          var children = []

          // ground shadow
          children.push(h('div', { className: 'ikc-shadow', key: 'shadow' }))

          // body
          children.push(h('div', {
            key: 'body', className: 'ikc-press',
            onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp,
            onPointerCancel: onPointerUp,
            onContextMenu: function (e) { e.preventDefault(); interact(); setMenuOpen(true) },
          }, [
            h('div', { className: 'ikc-bob', key: 'bob' }, h(Sprite, { anim: anim, size: st.size, speed: st.prefs.animSpeed, mirror: st.mirror })),
          ]))

          if (resting && !busy) children.push(h('div', { className: 'ikc-zzz', key: 'zzz' }, 'z Z'))

          // balance badge
          if (st.prefs.showBadge && bal && bal.configured && bal.balance && bal.balance.total != null) {
            children.push(h('div', {
              key: 'badge', className: 'ikc-badge', title: s('balTotal') + ' ' + (bal.balance.currency || 'CNY'),
              onPointerDown: function (e) { e.stopPropagation() },
              onClick: function (e) { e.stopPropagation(); playClickSound(stateRef.current.prefs.clickSound); openBubble() },
            }, [h('span', { className: 'ikc-dot', key: 'd' }), '¥' + money(bal.balance.total)]))
          }

          // waiting indicator: pulsing "!" persists while a session awaits the user
          if (waitPending && !reminderOpen) {
            children.push(h('div', {
              key: 'waitdot', className: 'ikc-waitdot', role: 'button',
              title: s(waitPending.kind === 'approval' ? 'waitA' : 'waitQ'),
              onPointerDown: function (e) { e.stopPropagation() },
              onClick: function (e) { e.stopPropagation(); setReminderOpen(true) },
            }, '!'))
          }

          // reminder bubble (takes precedence over the normal speech bubble)
          if (reminderOpen && waitPending) children.push(renderReminder())
          else if (consumeOpen && consume) children.push(renderConsume())
          else if (bubbleOpen) children.push(renderBubble())

          // menu
          if (menuOpen) children.push(renderMenu())

          return h('div', {
            className: 'ikc-root',
            style: { pointerEvents: 'none' },
            ref: function (n) { /* container ref not needed */ },
          }, h('div', {
            className: 'ikc-pet' + (pressed ? ' ikc-pressed' : '') + (resting && !busy ? ' ikc-resting' : ''),
            ref: petRef,
            style: { left: pos.x + 'px', top: pos.y + 'px', width: w + 'px', height: hgt + 'px' },
          }, children))

          function renderBubble() {
            var phrases = (STR[lang] || STR.en).phrases
            var phrase = phrases[phraseIdx % phrases.length] || phrases[0]
            var lines = []
            lines.push(h('div', { className: 'ikc-phrase', key: 'p' }, phrase))
            if (bal && bal.configured === false) {
              lines.push(h('div', { className: 'ikc-line', key: 'nokey' }, s('balNoKey')))
            } else if (bal && bal.configured && bal.balance && bal.balance.total != null) {
              lines.push(h('div', { className: 'ikc-line', key: 'total' }, [
                h('span', { key: 'l' }, s('balTotal')),
                h('b', { key: 'v' }, '¥' + money(bal.balance.total)),
              ]))
              if (bal.todayUsage != null && bal.todayUsage > 0) {
                lines.push(h('div', { className: 'ikc-line', key: 'today' }, [
                  h('span', { key: 'l' }, s('balToday')),
                  h('b', { key: 'v' }, '¥' + money(bal.todayUsage)),
                ]))
              }
            } else if (bal && bal.error) {
              lines.push(h('div', { className: 'ikc-line', key: 'err' }, s('balFail')))
            } else {
              lines.push(h('div', { className: 'ikc-line', key: 'load' }, s('balLoading')))
            }
            return h('div', {
              className: 'ikc-bubble ' + (rightSide ? 'ikc-right' : 'ikc-left'),
              key: 'bubble',
              onPointerDown: function (e) { e.stopPropagation() },
              onClick: function (e) { e.stopPropagation(); setPhraseIdx((phraseIdx + 1) % phrases.length) },
            }, lines)
          }

          function renderReminder() {
            var p = waitPending || {}
            var isApproval = p.kind === 'approval'
            var lines = []
            lines.push(h('div', { className: 'ikc-reminder-title', key: 't' }, (isApproval ? '🔐 ' : '🙋 ') + s(isApproval ? 'waitA' : 'waitQ')))
            if (p.title) lines.push(h('div', { className: 'ikc-line', key: 'from' }, [h('span', { key: 'f' }, s('waitFrom')), h('b', { key: 'n' }, String(p.title).slice(0, 24))]))
            lines.push(h('div', { className: 'ikc-line ikc-hint', key: 'hint' }, s('waitNow')))
            return h('div', {
              className: 'ikc-bubble ikc-reminder ' + (rightSide ? 'ikc-right' : 'ikc-left'),
              key: 'reminder',
              onPointerDown: function (e) { e.stopPropagation() },
              onClick: function (e) { e.stopPropagation(); setReminderOpen(false) },
            }, lines)
          }

          function renderConsume() {
            var c = consume || {}
            var amount = Number(c.amount) || 0
            var lines = []
            lines.push(h('div', { className: 'ikc-consume-title', key: 't' }, [
              h('span', { key: 'h' }, s('consumeHead')),
              h('b', { key: 'a' }, '¥' + fmtCost(amount)),
            ]))
            var meta = []
            if (c.tokens != null) meta.push(s('consumeTokens') + ' ' + fmtTokens(c.tokens))
            if (c.model) meta.push(String(c.model).replace(/^.*\//, ''))
            if (meta.length) lines.push(h('div', { className: 'ikc-line', key: 'm' }, meta.join(' · ')))
            if (c.title) lines.push(h('div', { className: 'ikc-line', key: 's' }, s('waitFrom') + ' · ' + String(c.title).slice(0, 24)))
            lines.push(h('div', { className: 'ikc-line ikc-hint', key: 'hint' }, s('consumeHint')))
            return h('div', {
              className: 'ikc-bubble ikc-consume ' + (rightSide ? 'ikc-right' : 'ikc-left'),
              key: 'consume',
              onPointerDown: function (e) { e.stopPropagation() },
              onClick: function (e) { e.stopPropagation(); setConsumeOpen(false) },
            }, lines)
          }

          function renderMenu() {
            function seg(label, options, current, onPick) {
              return h('div', { className: 'ikc-menu-row', key: 'row-' + label }, [
                h('div', { className: 'ikc-menu-label', key: 'lab' }, label),
                h('div', { className: 'ikc-seg', key: 'seg' }, options.map(function (opt) {
                  var on = Math.abs(opt[1] - current) < 0.001
                  return h('button', {
                    key: opt[0], type: 'button', className: on ? 'ikc-on' : '',
                    onClick: function (e) { e.stopPropagation(); onPick(opt[1]) },
                  }, opt[0])
                })),
              ])
            }
            function segS(label, options, current, onPick) {
              return h('div', { className: 'ikc-menu-row', key: 'row-' + label }, [
                h('div', { className: 'ikc-menu-label', key: 'lab' }, label),
                h('div', { className: 'ikc-seg', key: 'seg' }, options.map(function (opt) {
                  var on = opt[1] === current
                  return h('button', {
                    key: opt[0], type: 'button', className: on ? 'ikc-on' : '',
                    onClick: function (e) { e.stopPropagation(); onPick(opt[1]) },
                  }, opt[0])
                })),
              ])
            }
            function toggle(label, on, onToggle) {
              return h('div', {
                className: 'ikc-tog' + (on ? ' ikc-on' : ''), key: 'tog-' + label,
                onClick: function (e) { e.stopPropagation(); onToggle() },
              }, [h('span', { key: 'l' }, label), h('span', { className: 'ikc-sw', key: 'sw' })])
            }
            return h('div', {
              className: 'ikc-menu', key: 'menu',
              onPointerDown: function (e) { e.stopPropagation() },
            }, [
              h('div', { className: 'ikc-menu-title', key: 'title' }, s('menuTitle')),
              seg(s('size'), [[s('small'), 0.8], [s('normal'), 1.1], [s('large'), 1.4]], nearest(st.size, [0.8, 1.1, 1.4]), changeSize),
              seg(s('speed'), [[s('slow'), 0.7], [s('normalSpeed'), 1.0], [s('fast'), 1.4]], nearest(st.prefs.animSpeed, [0.7, 1.0, 1.4]), changeSpeed),
              segS(s('clickSound'), [[s('csOff'), 'none'], [s('csNailong'), 'nailong'], [s('csKun'), 'kun']], st.prefs.clickSound, changeClickSound),
              toggle(s('sound'), st.prefs.sound, function () { togglePref('sound') }),
              toggle(s('badge'), st.prefs.showBadge, function () { togglePref('showBadge') }),
              h('button', { className: 'ikc-menu-btn', key: 'refresh', type: 'button', onClick: function (e) { e.stopPropagation(); doRefresh() } }, refreshing ? s('refreshDoing') : s('refresh')),
              h('button', { className: 'ikc-menu-btn', key: 'reset', type: 'button', onClick: function (e) { e.stopPropagation(); doReset() } }, s('reset')),
              h('button', { className: 'ikc-menu-btn ikc-danger', key: 'hide', type: 'button', onClick: function (e) { e.stopPropagation(); doHide() } }, s('hide')),
            ])
          }

          function nearest(v, list) {
            var best = list[0], bd = Infinity
            for (var i = 0; i < list.length; i++) { var d2 = Math.abs(list[i] - v); if (d2 < bd) { bd = d2; best = list[i] } }
            return best
          }
        }
        Widget.displayName = 'IkunchickPetWidget'
        return Widget
      }

      // ---- apply ----------------------------------------------------------
      function stringOnly(obj) {
        var out = {}
        for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k) && typeof obj[k] === 'string') out[k] = obj[k] }
        return out
      }

      function apply(ctx) {
        ctx.effect(function () { return ctx.locale.register(NS, { zh: stringOnly(STR.zh), en: stringOnly(STR.en) }) }, MODULE_ID + ': dictionaries')
        injectStyles()
        var Widget = createWidget(ctx)
        ctx.slots.inject('shell.overlay', function () {
          return ctx.slots.register({
            name: 'shell.overlay',
            id: MODULE_ID,
            order: 60,
            registrant: MODULE_ID,
          }, Widget)
        })
      }

      module.exports = { name: MODULE_ID, inject: ['slots', 'locale'], apply: apply }
      return module.exports
    },
  })
})()
