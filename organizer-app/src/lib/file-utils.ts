import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface FileInfo {
  path: string
  lastModified: Date
  commitDate: Date | null
}

/**
 * Get file modification date from filesystem
 */
export async function getFileModificationDate(filePath: string): Promise<Date | null> {
  try {
    const stats = await fs.promises.stat(filePath)
    return stats.mtime
  } catch (error) {
    console.error(`Error getting modification date for ${filePath}:`, error)
    return null
  }
}

/**
 * Get latest commit date for a specific file using git log
 */
export async function getFileCommitDate(filePath: string): Promise<Date | null> {
  try {
    // Use relative path from project root
    const relativePath = path.relative(process.cwd(), filePath)
    const { stdout } = await execAsync(`git log --format="%ad" --date=iso -1 -- "${relativePath}"`)
    
    if (stdout.trim()) {
      return new Date(stdout.trim())
    }
    return null
  } catch (error) {
    console.error(`Error getting commit date for ${filePath}:`, error)
    return null
  }
}

/**
 * Get comprehensive file information including both modification and commit dates
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  const [lastModified, commitDate] = await Promise.all([
    getFileModificationDate(filePath),
    getFileCommitDate(filePath)
  ])

  return {
    path: filePath,
    lastModified: lastModified || new Date(),
    commitDate
  }
}

/**
 * Get file information for documentation files from build-time metadata
 */
export async function getDocsFileInfo(filename: string): Promise<FileInfo> {
  try {
    // Try to read from build-time metadata first
    const metadataPath = path.join(process.cwd(), 'public', 'docs-metadata.json')
    const metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'))
    
    if (metadata[filename]) {
      const fileData = metadata[filename]
      return {
        path: path.join(process.cwd(), 'public', 'docs', filename),
        lastModified: new Date(fileData.lastModified),
        commitDate: fileData.commitDate ? new Date(fileData.commitDate) : null
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read docs metadata, falling back to file system:`, error instanceof Error ? error.message : String(error))
  }
  
  // Fallback to original method if metadata is not available
  const filePath = path.join(process.cwd(), 'public', 'docs', filename)
  return getFileInfo(filePath)
}

/**
 * Format date for display in UI
 */
export function formatDate(date: Date | null): string {
  if (!date) return 'Не определено'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7) return `${diffDays} дн. назад`
  
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format date and time for display in UI (dd.MM.yyyy HH:MM) in GMT+5 timezone
 */
export function formatDateTime(date: Date | null): string {
  if (!date) return 'Не определено'
  
  // Format directly in GMT+5 timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Almaty' // GMT+5 timezone (Kazakhstan)
  })
  
  return formatter.format(date).replace(',', '')
}