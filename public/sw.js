/*
 * Lets the app open without a connection. Pages: network first, falling back
 * to the cached shell. Built assets have hashed names, so they never change
 * and are served from cache. Supabase and other APIs always go to the network;
 * offline diary adds are queued by the app itself (src/mealQueue.ts).
 *
 * shortcut: old hashed assets stay cached until VERSION changes; bump it if
 * the cache ever grows noticeably.
 */
const VERSION = 'v1'
const CACHE = `trainlog-${VERSION}`
const SHELL = new URL('./', self.registration.scope).href

self.addEventListener('install', e => {
	e.waitUntil(caches.open(CACHE).then(c => c.add(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
	e.waitUntil(caches.keys()
		.then(keys => Promise.all(keys.filter(k => k.startsWith('trainlog-') && k !== CACHE).map(k => caches.delete(k))))
		.then(() => self.clients.claim()))
})

self.addEventListener('fetch', e => {
	const req = e.request
	if (req.method !== 'GET') return
	const url = new URL(req.url)

	if (req.mode === 'navigate') {
		e.respondWith(fetch(req)
			.then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(SHELL, copy)); return res })
			.catch(() => caches.match(SHELL)))
		return
	}

	const sameOriginAsset = url.origin === self.location.origin && url.pathname.includes('/assets/')
	const font = url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com'
	if (!sameOriginAsset && !font) return

	e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
		if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
		return res
	})))
})
