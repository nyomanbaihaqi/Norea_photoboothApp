import { readFile } from 'fs/promises'
import { basename } from 'path'
import { AuthError, getAccessToken } from './oauth'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

export class DriveHttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` }
  })
  if (res.status === 401) throw new AuthError('Akses Google ditolak, hubungkan ulang')
  if (!res.ok) {
    let msg = `Drive error ${res.status}`
    try {
      const j = (await res.json()) as { error?: { message?: string } }
      if (j.error?.message) msg = j.error.message
    } catch {
      // abaikan
    }
    throw new DriveHttpError(res.status, msg)
  }
  return (await res.json()) as T
}

export async function getAccountEmail(): Promise<string> {
  const j = await call<{ user?: { emailAddress?: string } }>(`${API}/about?fields=user(emailAddress)`)
  return j.user?.emailAddress ?? ''
}

export async function getFolder(
  id: string
): Promise<{ name: string; isFolder: boolean; canAdd: boolean }> {
  const j = await call<{
    name: string
    mimeType: string
    capabilities?: { canAddChildren?: boolean }
  }>(
    `${API}/files/${encodeURIComponent(id)}?fields=name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`
  )
  return {
    name: j.name,
    isFolder: j.mimeType === 'application/vnd.google-apps.folder',
    canAdd: j.capabilities?.canAddChildren ?? false
  }
}

export async function generateIds(count: number): Promise<string[]> {
  const j = await call<{ ids: string[] }>(
    `${API}/files/generateIds?count=${count}&space=drive&type=files`
  )
  return j.ids ?? []
}

export async function uploadFile(
  path: string,
  folderId: string,
  fileId?: string
): Promise<string> {
  const data = await readFile(path)
  const boundary = `norea${Date.now().toString(16)}`
  const meta: Record<string, unknown> = { name: basename(path), parents: [folderId] }
  if (fileId) meta.id = fileId
  const mime = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
        `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`
    ),
    data,
    Buffer.from(`\r\n--${boundary}--`)
  ])
  const j = await call<{ id: string }>(
    `${UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=id`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body
    }
  )
  return j.id
}

export async function shareAnyone(fileId: string): Promise<void> {
  await call(`${API}/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  })
}
