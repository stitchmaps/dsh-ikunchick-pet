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
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const name = 'dsh-ikunchick-pet'

const PKG = 'dsh-ikunchick-pet'
const VERSION = '0.2.0'
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

function beijingDay() {
  const t = new Date(Date.now() + 8 * 3600 * 1000)
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

// ---- wiring --------------------------------------------------------------

export function apply(ctx) {
  try { ctx.logger?.info?.(`[${PKG}] host active · v${VERSION}`) } catch {}

  const waits = createWaitTracker()
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
      } catch {}
    })
  } catch {}

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
  })
}

// Exported for offline unit tests only (not used at runtime).
export const __test__ = { normalizeState, updateUsage, handleState, handleBalance, readState, writeState, createWaitTracker }
