import express from 'express'
import webPush from 'web-push'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const app = express()
app.use(express.json())

// ── VAPID configuration ──────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:gate@lacher.io'

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars are required')
  process.exit(1)
}

webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

// ── Subscription storage (JSON file, fine for 3 users) ───────
const SUBS_FILE = '/data/push-subscriptions.json'

function loadSubscriptions() {
  if (!existsSync(SUBS_FILE)) return []
  try {
    return JSON.parse(readFileSync(SUBS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveSubscriptions(subs) {
  try {
    writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2))
  } catch (err) {
    console.error('Failed to save subscriptions:', err.message)
  }
}

let subscriptions = loadSubscriptions()

// ── Routes ───────────────────────────────────────────────────

/** Return the public VAPID key so the client can subscribe. */
app.get('/push/vapid-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY })
})

/**
 * Register a push subscription.
 * Body: { subscription: PushSubscription, user: string }
 */
app.post('/push/subscribe', (req, res) => {
  const { subscription, user } = req.body
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing subscription' })
  }

  // Replace existing subscription for this endpoint
  subscriptions = subscriptions.filter((s) => s.subscription.endpoint !== subscription.endpoint)
  subscriptions.push({ subscription, user: user || 'unknown' })
  saveSubscriptions(subscriptions)

  console.log(`[push] Subscribed: ${user} (${subscriptions.length} total)`)
  res.json({ ok: true })
})

/**
 * Remove a push subscription.
 * Body: { endpoint: string }
 */
app.post('/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint' })
  }

  const before = subscriptions.length
  subscriptions = subscriptions.filter((s) => s.subscription.endpoint !== endpoint)
  saveSubscriptions(subscriptions)

  console.log(`[push] Unsubscribed (${before} → ${subscriptions.length})`)
  res.json({ ok: true })
})

/**
 * Send push notification to all subscribers except the sender.
 * Body: { user: string, title: string, body: string }
 */
app.post('/push/send', async (req, res) => {
  const { user, title, body } = req.body
  if (!title || !body) {
    return res.status(400).json({ error: 'Missing title or body' })
  }

  const payload = JSON.stringify({ title, body, icon: '/gate-icon-192.png', tag: 'gate-activity' })
  const targets = subscriptions.filter((s) => s.user !== user)

  console.log(`[push] Sending to ${targets.length} subscriber(s) (from ${user})`)

  const results = await Promise.allSettled(
    targets.map((s) => webPush.sendNotification(s.subscription, payload)),
  )

  // Remove expired/invalid subscriptions
  const expired = []
  results.forEach((r, i) => {
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) {
      expired.push(targets[i].subscription.endpoint)
    }
  })

  if (expired.length) {
    subscriptions = subscriptions.filter((s) => !expired.includes(s.subscription.endpoint))
    saveSubscriptions(subscriptions)
    console.log(`[push] Removed ${expired.length} expired subscription(s)`)
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length
  res.json({ sent, total: targets.length })
})

/** Health check */
app.get('/push/health', (_req, res) => {
  res.json({ ok: true, subscriptions: subscriptions.length })
})

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PUSH_PORT || 3001
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[push-server] listening on 127.0.0.1:${PORT}`)
})
