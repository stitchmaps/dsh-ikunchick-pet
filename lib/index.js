/**
 * dsh-ikunchick-pet — host half.
 *
 * A tiny Cordis plugin that backs the browser-side basketball-chick pet with:
 *
 *   POST /api/dsh-ikunchick-pet/state
 *     { op: "get" }                       -> { ok, value: state }
 *     { op: "save", state: {...} }        -> { ok, value: state }
 *
 *   POST /api/dsh-ikunchick-pet/balance
 *     { op: "refresh" }                   -> { ok, configured, source, balance, todayUsage, ... }
 *
 * State (window position, size, prefs) lives in `<DSH_HOME>/dsh-ikunchick-pet/state.json`.
 * The balance ledger (per-day observed spend) lives in `usage.json` next to it.
 *
 * Route registration mirrors `dsh-todolist` (connection.fetch.register) so the
 * browser reaches it over the same-origin channel it already uses for panels.
 * The DeepSeek balance is read from the DSH credentials service (DEEPSEEK_API_KEY);
 * a missing key is a normal state, never an error — the pet still works.
 */
import { promises as fs, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const name = 'dsh-ikunchick-pet'

const PKG = 'dsh-ikunchick-pet'
const VERSION = '0.4.0'

// DeepSeek pricing (CNY / million tokens), [off-peak, peak]. Peak = weekdays
// 09:00-12:00 & 14:00-18:00 Beijing; weekends are always off-peak.
const PRICE_FLASH = { hit: [0.02, 0.04], miss: [1, 2], out: [4, 8] }
const PRICE_PRO = { hit: [0.15, 0.3], miss: [4.5, 9.0], out: [13.5, 27.0] }

function priceFor(model) {
  const m = String(model || '').toLowerCase()
  if (m.indexOf('pro') !== -1) return PRICE_PRO
  return PRICE_FLASH
}
function isPeakTime(timeSec) {
  const n = Number(timeSec)
  if (!isFinite(n)) return false
  const bj = new Date(n * 1000 + 8 * 3600 * 1000) // shift so UTC fields read as Beijing wall-clock
  const dow = bj.getUTCDay()
  if (dow === 0 || dow === 6) return false // weekend off-peak
  const hour = bj.getUTCHours()
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18)
}
const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const KEY_REF = 'DEEPSEEK_API_KEY'

const DEFAULT_STATE = {
  version: 1,
  position: null, // { x, y } in CSS px from viewport top-left; null => default bottom-right
  mirror: false,
  size: 1,
  hidden: false,
  prefs: {
    sound: false,
    showBadge: true,
    showBubbleOnLoad: false,
    animSpeed: 1,
    clickSound: 'nailong',
  },
}

function homeDir() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
}
function dataDir() {
  return path.join(homeDir(), PKG)
}
function stateFile() {
  return path.join(dataDir(), 'state.json')
}
function usageFile() {
  return path.join(dataDir(), 'usage.json')
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
function clamp(value, lo, hi, dflt) {
  const n = num(value)
  if (n === null) return dflt
  return Math.min(hi, Math.max(lo, n))
}

function normalizeState(raw) {
  const out = {
    version: 1,
    position: null,
    mirror: false,
    size: 1,
    hidden: false,
    prefs: { ...DEFAULT_STATE.prefs },
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.position && typeof raw.position === 'object') {
      const x = num(raw.position.x)
      const y = num(raw.position.y)
      if (x !== null && y !== null) {
        out.position = { x: Math.round(Math.max(-4000, Math.min(8000, x))), y: Math.round(Math.max(-4000, Math.min(8000, y))) }
      }
    }
    out.mirror = raw.mirror === true
    out.size = Math.round(clamp(raw.size, 0.6, 1.9, 1) * 100) / 100
    out.hidden = raw.hidden === true
    if (raw.prefs && typeof raw.prefs === 'object') {
      out.prefs.sound = raw.prefs.sound === true
      out.prefs.showBadge = raw.prefs.showBadge !== false
      out.prefs.showBubbleOnLoad = raw.prefs.showBubbleOnLoad === true
      out.prefs.animSpeed = Math.round(clamp(raw.prefs.animSpeed, 0.4, 2.5, 1) * 100) / 100
      out.prefs.clickSound = (raw.prefs.clickSound === 'none' || raw.prefs.clickSound === 'kun' || raw.prefs.clickSound === 'nailong')
        ? raw.prefs.clickSound
        : 'nailong'
    }
  }
  return out
}

async function readJson(file, fallback) {
  try {
    const text = await fs.readFile(file, 'utf8')
    return JSON.parse(text)
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      try { process.emitWarning(`[${PKG}] read ${path.basename(file)} failed: ${String(error)}`) } catch {}
    }
    return fallback
  }
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(tmp, file)
}

async function readState() {
  return normalizeState(await readJson(stateFile(), null))
}
async function writeState(raw) {
  const state = normalizeState(raw)
  await writeJsonAtomic(stateFile(), state)
  return state
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

async function handleState(request) {
  let body = null
  try { body = await request.json() } catch { body = null }
  const op = body && typeof body === 'object' ? body.op : undefined
  try {
    if (op === 'save') {
      const state = await writeState(body && body.state)
      return json({ ok: true, value: state })
    }
    const state = await readState()
    return json({ ok: true, value: state })
  } catch (error) {
    return json({ ok: false, error: { code: `${PKG}/io`, message: String(error) } })
  }
}

// ---- balance -------------------------------------------------------------

function beijingDay(ms) {
  const t = new Date((ms == null ? Date.now() : ms) + 8 * 3600 * 1000)
  return t.toISOString().slice(0, 10)
}

async function updateUsage(balance) {
  const today = beijingDay()
  let ledger = null
  const prev = await readJson(usageFile(), null)
  if (prev && typeof prev === 'object' && prev.date === today && num(prev.last) !== null) {
    ledger = { date: today, last: num(prev.last), used: num(prev.used) || 0 }
  }
  if (ledger === null) {
    // First observation of the day: establish the baseline, zero observed spend.
    ledger = { date: today, last: balance, used: 0 }
  } else {
    const delta = ledger.last - balance
    if (delta > 0) ledger.used += delta // only downward moves count as spend; recharges are ignored
    ledger.last = balance
  }
  try { await writeJsonAtomic(usageFile(), ledger) } catch (error) {
    try { process.emitWarning(`[${PKG}] write usage failed: ${String(error)}`) } catch {}
  }
  return { todayUsed: Math.max(0, ledger.used) }
}

async function resolveKey(getCreds) {
  let creds = null
  try { creds = getCreds() } catch {}
  if (!creds || typeof creds.resolve !== 'function') return null
  try {
    const resolved = await creds.resolve(KEY_REF)
    if (resolved === null || resolved === undefined) return null
    if (typeof resolved === 'string') return resolved
    if (typeof resolved.value === 'string') return resolved.value
    if (typeof resolved.secret === 'string') return resolved.secret
    return null
  } catch {
    return null
  }
}

async function fetchDeepSeekBalance(key) {
  let res
  try {
    res = await fetch(BALANCE_URL, {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json', 'user-agent': PKG },
      signal: AbortSignal.timeout(9000),
    })
  } catch (error) {
    return { ok: false, code: 'NETWORK', error: String((error && error.message) || error).slice(0, 200) }
  }
  if (!res.ok) return { ok: false, code: 'HTTP', error: `HTTP ${res.status}` }
  let data
  try { data = await res.json() } catch { return { ok: false, code: 'PARSE', error: 'response is not JSON' } }
  const infos = Array.isArray(data && data.balance_infos) ? data.balance_infos : []
  const info = infos.find((i) => String((i && i.currency) || '').toUpperCase() === 'CNY') || infos[0]
  if (!info || num(info.total_balance) === null) {
    return { ok: false, code: 'SHAPE', error: 'unexpected balance payload' }
  }
  return {
    ok: true,
    currency: String(info.currency || 'CNY'),
    totalBalance: num(info.total_balance),
    bonusBalance: num(info.granted_balance),
    rechargeBalance: num(info.topped_up_balance),
    updatedAt: Date.now(),
  }
}

async function handleBalance(request, getCreds) {
  try {
    const key = await resolveKey(getCreds)
    if (!key) {
      return json({ ok: true, configured: false, source: 'none', balance: null, message: 'missing DEEPSEEK_API_KEY' })
    }
    const result = await fetchDeepSeekBalance(key)
    if (!result.ok) {
      return json({ ok: true, configured: true, source: 'apikey', balance: null, error: result.error || result.code })
    }
    const usage = await updateUsage(result.totalBalance)
    return json({
      ok: true,
      configured: true,
      source: 'apikey',
      balance: {
        currency: result.currency,
        total: result.totalBalance,
        bonus: result.bonusBalance,
        recharge: result.rechargeBalance,
        updatedAt: result.updatedAt,
      },
      todayUsage: usage.todayUsed,
    })
  } catch (error) {
    return json({ ok: true, configured: null, source: 'none', balance: null, error: String(error) })
  }
}

// ---- waiting-for-user tracking ------------------------------------------
//
// `ask_user_question` is a *suspending* tool call: the model emits a tool/call,
// DSH waits for the user to answer, and no `turn/end` arrives meanwhile. DSH also
// raises `approval/asked` while it waits for permission. We keep only the latest
// suspended interaction and expose it on /wait so the pet can pop a reminder.
function createWaitTracker() {
  const state = { pending: null, sessionName: '' }

  function eventCallId(event) {
    try {
      const d = (event && event.data) || {}
      const msg = d.message || {}
      const list = Array.isArray(msg.content) ? msg.content : []
      for (const c of list) if (c && (c.toolCallId || c.tool_call_id)) return String(c.toolCallId || c.tool_call_id)
      if (msg && (msg.callId || msg.toolCallId || msg.tool_call_id)) return String(msg.callId || msg.toolCallId || msg.tool_call_id)
      return String(d.callId || d.call_id || d.toolCallId || d.id || '')
    } catch {
      return ''
    }
  }
  function pickSessionName(session) {
    try {
      if (!session || typeof session !== 'object') return ''
      const cands = [
        session.name, session.title, session.label,
        session.summary && session.summary.title, session.summary && session.summary.name,
        session.meta && session.meta.title, session.meta && session.meta.name,
      ]
      for (const c of cands) { const s = String(c == null ? '' : c).trim(); if (s) return s.slice(0, 80) }
    } catch {}
    return ''
  }

  function note(sid, event, session, titleFromService) {
    try {
      const type = String((event && event.type) || '')
      const data = (event && event.data) || {}
      const now = Date.now()
      if (type === 'session/title') {
        const ti = String(data.title == null ? '' : data.title).trim()
        if (ti) state.sessionName = ti.slice(0, 80)
        return
      }
      let nm = ''
      try { nm = typeof titleFromService === 'function' ? (titleFromService(session) || '') : '' } catch { nm = '' }
      if (!nm) nm = pickSessionName(session)
      if (nm) state.sessionName = String(nm).slice(0, 80)

      if (type === 'tool/call' && String(data.name || data.toolName || '') === 'ask_user_question') {
        state.pending = { kind: 'question', id: eventCallId(event) || ('q' + now), ts: now, session: sid, title: state.sessionName || '' }
        return
      }
      if (type === 'tool/result') {
        if (state.pending && state.pending.kind === 'question') {
          const cid = eventCallId(event)
          if (!cid || cid === state.pending.id) state.pending = null
        }
        return
      }
      if (type === 'approval/asked') {
        state.pending = { kind: 'approval', id: String(data.id || ('a' + now)), ts: now, session: sid, title: state.sessionName || '' }
        return
      }
      if (type.indexOf('approval/') === 0) {
        if (state.pending && state.pending.kind === 'approval') {
          const id2 = String(data.id || '')
          if (!id2 || id2 === state.pending.id) state.pending = null
        }
        return
      }
      if (type === 'turn/end' || type === 'turn/start') state.pending = null
    } catch {}
  }

  return { note, get: () => state.pending }
}

// ---- per-turn consumption tracking --------------------------------------
//
// `assistant/message` events carry the real per-step token usage; we aggregate
// by (session, turn) and settle the money amount on `turn/end`, then bump a
// persisted `seq` so the browser pops a "本轮消耗" bubble for each finished turn.
const LEDGER_MAX = 300
function round6(n) { const v = Number(n); return isFinite(v) ? Math.round(v * 1e6) / 1e6 : 0 }

function createTurnTracker(turnFile, ledgerFile) {
  let seq = 0
  try {
    const prev = JSON.parse(readFileSync(turnFile, 'utf8'))
    if (prev && typeof prev.seq === 'number' && prev.seq >= 0) seq = prev.seq
  } catch {}
  let lastTurn = null
  let sessionName = ''
  const aggs = new Map()
  const subagents = new Set()

  function writeSeq() {
    try {
      mkdirSync(path.dirname(turnFile), { recursive: true })
      writeFileSync(turnFile, JSON.stringify({ seq, updatedAt: new Date().toISOString() }), 'utf8')
    } catch {}
  }
  function readLedger() {
    try {
      const parsed = JSON.parse(readFileSync(ledgerFile, 'utf8'))
      if (parsed && Array.isArray(parsed.entries)) return parsed.entries.filter((e) => e && typeof e === 'object')
    } catch {}
    return []
  }
  function appendLedger(entry) {
    try {
      const entries = readLedger()
      entries.unshift(entry)
      if (entries.length > LEDGER_MAX) entries.length = LEDGER_MAX
      mkdirSync(path.dirname(ledgerFile), { recursive: true })
      const tmp = ledgerFile + '.' + process.pid + '.tmp'
      writeFileSync(tmp, JSON.stringify({ version: 1, entries }), 'utf8')
      renameSync(tmp, ledgerFile)
    } catch {}
  }
  function markSubagent(id) { const sid = id ? String(id) : ''; if (sid) subagents.add(sid) }

  function finalize(sid) {
    const agg = aggs.get(sid)
    aggs.delete(sid)
    if (!agg || (agg.cost <= 0 && agg.tokens <= 0)) return
    if (subagents.has(String(sid))) return // don't pop/record for subagent runs
    const entry = {
      ts: agg.ts,
      amount: round6(agg.cost),
      tokens: agg.tokens,
      input: agg.input || 0,
      cache: agg.cache || 0,
      output: agg.output || 0,
      model: agg.model || '',
      sessionId: sid,
      title: sessionName || '',
      turn: agg.turn,
    }
    lastTurn = entry
    seq++
    writeSeq()
    appendLedger(entry)
  }

  function note(sid, event, session, titleFromService) {
    try {
      const type = String((event && event.type) || '')
      const d = (event && event.data) || {}
      if (type === 'session/title') {
        const ti = String(d.title == null ? '' : d.title).trim()
        if (ti) sessionName = ti.slice(0, 80)
        return
      }
      let nm = ''
      try { nm = typeof titleFromService === 'function' ? (titleFromService(session) || '') : '' } catch {}
      if (nm) sessionName = String(nm).slice(0, 80)

      if (type === 'assistant/message') {
        const usage = d.usage
        if (!usage || typeof usage !== 'object') return
        const turnN = Number(d.turn)
        const turn = isFinite(turnN) ? turnN : 0
        const input = Number(usage.inputTokens) || 0
        const cache = Number(usage.cacheReadTokens) || 0
        const output = Number(usage.outputTokens) || 0
        const toks = input + cache + output
        if (toks <= 0) return
        const model = d.message && d.message.source ? String(d.message.source.model || '') : ''
        const p = priceFor(model)
        const off = isPeakTime(Math.floor(Date.now() / 1000)) ? 1 : 0
        const cost = (cache / 1e6) * p.hit[off] + (input / 1e6) * p.miss[off] + (output / 1e6) * p.out[off]
        let agg = aggs.get(sid)
        if (!agg || agg.turn !== turn) {
          agg = { turn, cost: 0, tokens: 0, input: 0, cache: 0, output: 0, model: '', ts: Date.now() }
          aggs.set(sid, agg)
        }
        agg.cost += cost
        agg.tokens += toks
        agg.input += input
        agg.cache += cache
        agg.output += output
        if (model) agg.model = model
        agg.ts = Date.now()
        return
      }
      if (type === 'turn/end') { finalize(sid); return }
    } catch {}
  }

  function getLedger() {
    const entries = readLedger()
    const now = Date.now()
    const today = beijingDay(now)
    const weekStart = beijingDay(now - 6 * 86400000)
    let todayAmount = 0, todayTokens = 0, todayTurns = 0
    let weekAmount = 0, allAmount = 0, allTokens = 0, allTurns = 0
    const byModel = {}
    const byDay = {}
    for (const e of entries) {
      const amount = Number(e.amount) || 0
      const tokens = Number(e.tokens) || 0
      const ts = Number(e.ts) || 0
      const day = ts ? beijingDay(ts) : today
      allAmount += amount; allTokens += tokens; allTurns += 1
      if (day === today) { todayAmount += amount; todayTokens += tokens; todayTurns += 1 }
      if (day >= weekStart && day <= today) weekAmount += amount
      const mk = String(e.model || '') || '未知'
      const bm = byModel[mk] || (byModel[mk] = { amount: 0, tokens: 0, turns: 0 })
      bm.amount += amount; bm.tokens += tokens; bm.turns += 1
      const bd = byDay[day] || (byDay[day] = { amount: 0, tokens: 0, turns: 0 })
      bd.amount += amount; bd.tokens += tokens; bd.turns += 1
    }
    const days = []
    for (let i = 6; i >= 0; i--) {
      const day = beijingDay(now - i * 86400000)
      const v = byDay[day] || { amount: 0, tokens: 0, turns: 0 }
      days.push({ date: day.slice(5), amount: v.amount, tokens: v.tokens, turns: v.turns })
    }
    return {
      entries: entries.slice(0, 200).map((e) => ({
        ts: Number(e.ts) || 0,
        amount: Number(e.amount) || 0,
        tokens: Number(e.tokens) || 0,
        input: Number(e.input) || 0,
        cache: Number(e.cache) || 0,
        output: Number(e.output) || 0,
        model: String(e.model || ''),
        title: String(e.title || ''),
        turn: Number(e.turn) || 0,
      })),
      summary: { todayAmount, todayTokens, todayTurns, weekAmount, allAmount, allTokens, allTurns, byModel, days },
    }
  }

  return { note, markSubagent, get: () => ({ seq, turn: lastTurn }), getLedger }
}

// ---- wiring --------------------------------------------------------------

export function apply(ctx) {
  try { ctx.logger?.info?.(`[${PKG}] host active · v${VERSION}`) } catch {}

  const waits = createWaitTracker()
  const turns = createTurnTracker(path.join(dataDir(), 'turn.json'), path.join(dataDir(), 'ledger.json'))
  const titleFromService = (session) => {
    try {
      const svc = typeof ctx.get === 'function' ? ctx.get('sessionTitle') : null
      if (!svc || typeof svc.get !== 'function' || !session) return ''
      const snap = svc.get(session)
      const ti = typeof snap === 'string' ? snap : (snap && (snap.title || snap.text))
      return String(ti == null ? '' : ti).trim()
    } catch { return '' }
  }
  try {
    ctx.on('session/event', (session, event) => {
      try {
        const sid = session && session.id ? session.id : 'default'
        waits.note(sid, event, session, titleFromService)
        turns.note(sid, event, session, titleFromService)
      } catch {}
    })
  } catch {}
  try { ctx.on('subagent/start', (info) => { try { turns.markSubagent(info && info.id) } catch {} }) } catch {}
  try { ctx.on('subagent/end', (info) => { try { turns.markSubagent(info && info.id) } catch {} }) } catch {}

  ctx.inject(['connection'], (scope) => {
    let connection
    try { connection = scope.get('connection') } catch { connection = undefined }
    const register = connection && connection.fetch && typeof connection.fetch.register === 'function'
      ? connection.fetch.register.bind(connection.fetch)
      : undefined
    if (register === undefined) {
      try { ctx.logger?.warn?.(`[${PKG}] connection.fetch.register unavailable; routes not registered`) } catch {}
      return
    }

    const getCreds = () => {
      try { const c = scope.get('credentials'); if (c) return c } catch {}
      try { const c = ctx.get && ctx.get('credentials'); if (c) return c } catch {}
      return null
    }

    scope.effect(
      () => register({
        path: `/api/${PKG}/state`,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: handleState,
      }),
      `${PKG}: state route`,
    )
    scope.effect(
      () => register({
        path: `/api/${PKG}/balance`,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => handleBalance(request, getCreds),
      }),
      `${PKG}: balance route`,
    )
    scope.effect(
      () => register({
        path: `/api/${PKG}/wait`,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: () => json({ ok: true, pending: waits.get() }),
      }),
      `${PKG}: wait route`,
    )
    scope.effect(
      () => register({
        path: `/api/${PKG}/turn`,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: () => {
          const cur = turns.get()
          return json({ ok: true, seq: cur.seq, turn: cur.turn })
        },
      }),
      `${PKG}: turn route`,
    )
    scope.effect(
      () => register({
        path: `/api/${PKG}/ledger`,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: () => json({ ok: true, ...turns.getLedger() }),
      }),
      `${PKG}: ledger route`,
    )
  })
}

// Exported for offline unit tests only (not used at runtime).
export const __test__ = { normalizeState, updateUsage, handleState, handleBalance, readState, writeState, createWaitTracker, createTurnTracker, priceFor, isPeakTime }
