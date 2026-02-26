/**
 * Client-side Web Push subscription management.
 * Talks to the push-server sidecar via /push/* endpoints.
 */

let vapidPublicKey = null

/** Convert a URL-safe base64 VAPID key to a Uint8Array for the Push API. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/** Fetch the VAPID public key from the push server (cached). */
async function getVapidKey() {
  if (vapidPublicKey) return vapidPublicKey
  const resp = await fetch('/push/vapid-key')
  if (!resp.ok) throw new Error('Failed to fetch VAPID key')
  const data = await resp.json()
  vapidPublicKey = data.publicKey
  return vapidPublicKey
}

/**
 * Subscribe the current browser to push notifications.
 * @param {string} userEmail — identifies who this subscription belongs to
 * @returns {PushSubscription|null}
 */
export async function subscribePush(userEmail) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  // Wait for SW with a timeout so we don't hang if none is registered
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker not ready — is the PWA enabled?')), 5000)),
  ])
  const key = await getVapidKey()

  // Check for existing subscription first
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
  }

  // Register with our push server
  await fetch('/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), user: userEmail }),
  })

  return subscription
}

/**
 * Unsubscribe the current browser from push notifications.
 */
export async function unsubscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await fetch('/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
  }
}

/**
 * Notify all other subscribers about a gate action.
 * @param {string} userEmail — the acting user (excluded from push)
 * @param {string} action — e.g. "Opened gate"
 */
export async function sendPushNotification(userEmail, action) {
  try {
    await fetch('/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userEmail,
        title: 'Gate Activity',
        body: `${userEmail}: ${action}`,
      }),
    })
  } catch {
    // Best-effort — don't block gate operations if push server is down
  }
}

/**
 * Check if push is currently subscribed.
 * @returns {boolean}
 */
export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
