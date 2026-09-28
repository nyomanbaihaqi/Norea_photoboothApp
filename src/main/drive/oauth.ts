import { safeStorage, shell } from 'electron'
import { createHash, randomBytes } from 'crypto'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { getData, saveStore } from '../store'
import { logger } from '../log'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive'
const LOGIN_TIMEOUT = 5 * 60_000

let accessToken = ''
let accessExpiry = 0

export class AuthError extends Error {}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function encrypt(token: string): string {
  if (!safeStorage.isEncryptionAvailable()) return `plain:${token}`
  return `enc:${safeStorage.encryptString(token).toString('base64')}`
}

function decrypt(stored: string): string {
  if (stored.startsWith('enc:')) {
    return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'))
  }
  if (stored.startsWith('plain:')) return stored.slice(6)
  return stored
}

export function isConnected(): boolean {
  return !!getData().settings.google.refreshToken
}

export function isConfigured(): boolean {
  const g = getData().settings.google
  return !!g.clientId && !!g.clientSecret
}

const PAGE = (title: string, msg: string): string =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>
<body style="font-family:sans-serif;background:#0f1115;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center"><h1>${title}</h1><p>${msg}</p></div></body>`

// Login OAuth: server loopback 127.0.0.1 + PKCE + state.
export async function login(): Promise<string> {
  const g = getData().settings.google
  if (!g.clientId || !g.clientSecret) throw new Error('Isi Client ID & Client Secret dulu')

  const verifier = b64url(randomBytes(32))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  const state = b64url(randomBytes(16))

  const { code, redirectUri } = await new Promise<{ code: string; redirectUri: string }>(
    (resolve, reject) => {
      let redirectUri = ''
      const server = createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (url.pathname !== '/') {
          res.writeHead(404).end()
          return
        }
        const err = url.searchParams.get('error')
        const code = url.searchParams.get('code')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        if (err || !code || url.searchParams.get('state') !== state) {
          res.end(PAGE('Gagal', 'Login dibatalkan atau tidak valid. Tutup tab ini.'))
          finish(new Error(err === 'access_denied' ? 'Login dibatalkan' : 'Login gagal'))
          return
        }
        res.end(PAGE('Berhasil ✅', 'Akun Google terhubung. Silakan kembali ke Norea Photobooth.'))
        finish(null, code)
      })
      const timeout = setTimeout(() => finish(new Error('Waktu login habis')), LOGIN_TIMEOUT)
      function finish(e: Error | null, code?: string): void {
        clearTimeout(timeout)
        server.close()
        if (e) reject(e)
        else resolve({ code: code!, redirectUri })
      }
      server.listen(0, '127.0.0.1', () => {
        const port = (server.address() as AddressInfo).port
        redirectUri = `http://127.0.0.1:${port}`
        const params = new URLSearchParams({
          client_id: g.clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: SCOPE,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state,
          access_type: 'offline',
          prompt: 'consent'
        })
        void shell.openExternal(`${AUTH_URL}?${params}`)
      })
    }
  )

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: g.clientId,
      client_secret: g.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier
    })
  })
  const json = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error_description?: string
  }
  if (!res.ok || !json.refresh_token || !json.access_token) {
    throw new Error(json.error_description || 'Gagal menukar kode login')
  }
  accessToken = json.access_token
  accessExpiry = Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000
  g.refreshToken = encrypt(json.refresh_token)
  await saveStore(true)
  return accessToken
}

export async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < accessExpiry) return accessToken
  const g = getData().settings.google
  if (!g.refreshToken) throw new AuthError('Google belum terhubung')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: g.clientId,
      client_secret: g.clientSecret,
      refresh_token: decrypt(g.refreshToken),
      grant_type: 'refresh_token'
    })
  })
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string }
  if (!res.ok || !json.access_token) {
    if (json.error === 'invalid_grant') {
      logger.warn('refresh token ditolak, Google perlu login ulang')
      logout()
      throw new AuthError('Login Google kedaluwarsa, hubungkan ulang')
    }
    throw new Error(`Gagal refresh token (${res.status})`)
  }
  accessToken = json.access_token
  accessExpiry = Date.now() + (json.expires_in ?? 3600) * 1000 - 60_000
  return accessToken
}

export function logout(): void {
  const g = getData().settings.google
  g.refreshToken = ''
  g.email = ''
  accessToken = ''
  accessExpiry = 0
  saveStore()
}
