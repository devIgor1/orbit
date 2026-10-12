const encoder = new TextEncoder()
function base64url(data: Uint8Array) {
  return btoa(String.fromCharCode(...data))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}
export async function sha256(text: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text))), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}
export async function appJwt(appId: string, pem: string, now = Date.now()) {
  const raw = pem.replace(/-----[A-Z ]+-----|\s/g, '')
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const seconds = Math.floor(now / 1000)
  const payload = [
    { alg: 'RS256', typ: 'JWT' },
    { iat: seconds - 60, exp: seconds + 540, iss: appId },
  ]
    .map((value) => base64url(encoder.encode(JSON.stringify(value))))
    .join('.')
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(payload))
  return `${payload}.${base64url(new Uint8Array(signature))}`
}
export async function verifySignature(body: string, signature: string | null, secret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'verify',
  ])
  const bytes = Uint8Array.from(signature.slice(7).match(/../g) ?? [], (value) => parseInt(value, 16))
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(body))
}
export async function equalSecret(left: string, right: string) {
  // Fixed-length digest comparison avoids leaking the configured bearer secret.
  const a = await sha256(left)
  const b = await sha256(right)
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return difference === 0
}
