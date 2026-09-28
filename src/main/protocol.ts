import { net, protocol } from 'electron'
import { isAbsolute, join, normalize, relative, resolve } from 'path'
import { pathToFileURL } from 'url'
import { assetsDir, getData } from './store'

// Harus dipanggil sebelum app ready.
export function registerSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'norea',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ])
}

function isInside(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return !!rel && !rel.startsWith('..') && !isAbsolute(rel)
}

// norea://asset/<nama>          → userData/assets/<nama>
// norea://file/<encoded path>   → file di dalam folder simpan foto
export function resolveNoreaUrl(url: string): string | null {
  const u = new URL(url)
  const rest = decodeURIComponent(u.pathname.replace(/^\/+/, ''))
  if (u.host === 'asset') {
    const p = normalize(join(assetsDir(), rest))
    return isInside(p, assetsDir()) ? p : null
  }
  if (u.host === 'file') {
    const p = normalize(rest)
    return isInside(p, getData().settings.saveDir) ? p : null
  }
  return null
}

export function fileToNoreaUrl(path: string): string {
  return `norea://file/${encodeURIComponent(path)}`
}

export function registerProtocol(): void {
  protocol.handle('norea', async (request) => {
    const path = resolveNoreaUrl(request.url)
    if (!path) return new Response('Tidak diizinkan', { status: 403 })
    try {
      const res = await net.fetch(pathToFileURL(path).toString())
      const headers = new Headers(res.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Cache-Control', 'no-cache')
      return new Response(res.body, { status: res.status, headers })
    } catch {
      return new Response('Tidak ditemukan', { status: 404 })
    }
  })
}
