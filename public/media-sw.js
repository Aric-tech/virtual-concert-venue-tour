const mediaPath = new URL('./media/', self.registration.scope).pathname;
let manifestPromise;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function getManifest() {
  manifestPromise ||= fetch(`${mediaPath}manifest.json`).then(response => {
    if (!response.ok) throw new Error('Media manifest unavailable');
    return response.json();
  });
  return manifestPromise;
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(mediaPath) || !url.pathname.endsWith('.mp4')) return;
  const name = url.pathname.slice(mediaPath.length, -4);
  if (!['part1', 'part2'].includes(name)) return;
  event.respondWith(serveVideo(event.request, name));
});

async function serveVideo(request, name) {
  try {
    const entry = (await getManifest())[name];
    const total = entry.size;
    const range = request.headers.get('Range');
    let start = 0;
    let end = total - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${total}`}});
      if (!match[1]) start = Math.max(0, total - Number(match[2]));
      else start = Number(match[1]);
      if (match[2] && match[1]) end = Math.min(total - 1, Number(match[2]));
      if (start >= total || end < start) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${total}`}});
      end = Math.min(end, start + 2 * 1024 * 1024 - 1);
    }
    const chunks = [];
    let offset = 0;
    for (const part of entry.parts) {
      const partEnd = offset + part.size - 1;
      if (partEnd >= start && offset <= end) {
        const response = await fetch(`${mediaPath}${part.file}`);
        if (!response.ok) throw new Error(`Media part unavailable: ${part.file}`);
        const data = new Uint8Array(await response.arrayBuffer());
        chunks.push(data.subarray(Math.max(0, start - offset), Math.min(part.size, end - offset + 1)));
      }
      offset += part.size;
      if (offset > end) break;
    }
    const body = new Uint8Array(end - start + 1);
    let position = 0;
    for (const chunk of chunks) { body.set(chunk, position); position += chunk.length; }
    if (position !== body.length) throw new Error('Incomplete media range');
    return new Response(body, {status: range ? 206 : 200, headers: {
      'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes',
      'Content-Length': String(body.length),
      ...(range ? {'Content-Range': `bytes ${start}-${end}/${total}`} : {}),
    }});
  } catch (error) {
    return new Response(String(error), {status: 503});
  }
}
