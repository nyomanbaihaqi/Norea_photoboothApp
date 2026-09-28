import { execFile } from 'child_process'

export interface WinPrinterStatus {
  name: string
  status: number
  jobCount: number
}

// Command tetap, tanpa input user (lihat docs/10-security-agent.md).
const PS_ARGS = [
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-Printer | Select-Object Name,PrinterStatus,JobCount | ConvertTo-Json -Compress'
]

export function queryWindowsPrinters(): Promise<WinPrinterStatus[]> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve([])
    execFile(
      'powershell.exe',
      PS_ARGS,
      { windowsHide: true, timeout: 10_000 },
      (err, stdout) => {
        if (err || !stdout.trim()) return resolve([])
        try {
          const parsed = JSON.parse(stdout)
          const list = Array.isArray(parsed) ? parsed : [parsed]
          resolve(
            list.map((p: { Name: string; PrinterStatus: number; JobCount: number }) => ({
              name: p.Name,
              status: Number(p.PrinterStatus) || 0,
              jobCount: Number(p.JobCount) || 0
            }))
          )
        } catch {
          resolve([])
        }
      }
    )
  })
}
