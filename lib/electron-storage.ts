// Electron-specific persistent storage implementation
// This ensures data persists between app restarts

// Browser detection utility
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

interface ElectronAPI {
  store: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    delete: (key: string) => Promise<void>
    clear: () => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

class ElectronStorage {
  private isElectron(): boolean {
    return isBrowser() && window.electronAPI !== undefined
  }

  async getItem(key: string): Promise<string | null> {
    if (!isBrowser()) return null
    
    if (this.isElectron()) {
      try {
        const value = await window.electronAPI!.store.get(key)
        return value !== undefined ? JSON.stringify(value) : null
      } catch (e) {
        console.warn('Electron storage get failed, falling back to localStorage:', e)
        return localStorage.getItem(key)
      }
    }
    
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!isBrowser()) return
    
    if (this.isElectron()) {
      try {
        const parsed = JSON.parse(value)
        await window.electronAPI!.store.set(key, parsed)
        // Also set in localStorage as backup
        localStorage.setItem(key, value)
        return
      } catch (e) {
        console.warn('Electron storage set failed, falling back to localStorage:', e)
      }
    }
    
    localStorage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    if (!isBrowser()) return
    
    if (this.isElectron()) {
      try {
        await window.electronAPI!.store.delete(key)
      } catch (e) {
        console.warn('Electron storage delete failed:', e)
      }
    }
    
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    if (!isBrowser()) return
    
    if (this.isElectron()) {
      try {
        await window.electronAPI!.store.clear()
      } catch (e) {
        console.warn('Electron storage clear failed:', e)
      }
    }
    
    localStorage.clear()
  }

  // Synchronous fallback methods for compatibility
  getItemSync(key: string): string | null {
    if (!isBrowser()) return null
    return localStorage.getItem(key)
  }

  setItemSync(key: string, value: string): void {
    if (!isBrowser()) return
    localStorage.setItem(key, value)
    
    // Async update to Electron store if available
    if (this.isElectron()) {
      this.setItem(key, value).catch(e => 
        console.warn('Background Electron storage update failed:', e)
      )
    }
  }
}

export const electronStorage = new ElectronStorage()
