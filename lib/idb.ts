// IndexedDB helper using idb. Guards against SSR and unavailable environments.
import type { DBSchema, IDBPDatabase } from 'idb'

let dbPromise: Promise<IDBPDatabase<AppDB> | null> | null = null

interface AppDB extends DBSchema {
  books: { key: string; value: any }
  members: { key: string; value: any }
  authors: { key: string; value: any }
  transactions: { key: string; value: any }
  visitors: { key: string; value: any }
  active_visits: { key: string; value: any }
}

// Explicit literal union for store names to satisfy idb type overloads
export type StoreName = 'books' | 'members' | 'authors' | 'transactions' | 'visitors' | 'active_visits'

async function getDb(): Promise<IDBPDatabase<AppDB> | null> {
  if (typeof window === 'undefined' || !(window as any).indexedDB) {
    console.warn('IndexedDB not available')
    return null
  }
  
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const { openDB } = await import('idb')
        const db = await openDB<AppDB>('librarymanapp_db', 2, {
          upgrade(db, oldVersion) {
            // Version 1 to 2 migration
            if (oldVersion < 2) {
              if (db.objectStoreNames.contains('books')) db.deleteObjectStore('books')
              if (db.objectStoreNames.contains('members')) db.deleteObjectStore('members')
              if (db.objectStoreNames.contains('authors')) db.deleteObjectStore('authors')
              if (db.objectStoreNames.contains('transactions')) db.deleteObjectStore('transactions')
              if (db.objectStoreNames.contains('visitors')) db.deleteObjectStore('visitors')
              if (db.objectStoreNames.contains('active_visits')) db.deleteObjectStore('active_visits')
            }
            
            // Create fresh stores with proper keyPath
            if (!db.objectStoreNames.contains('books')) {
              db.createObjectStore('books', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('members')) {
              db.createObjectStore('members', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('authors')) {
              db.createObjectStore('authors', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('transactions')) {
              db.createObjectStore('transactions', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('visitors')) {
              db.createObjectStore('visitors', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('active_visits')) {
              db.createObjectStore('active_visits', { keyPath: 'id' })
            }
          },
        })
        return db
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error)
        return null
      }
    })()
  }
  
  try {
    return await dbPromise
  } catch (error) {
    console.error('Error accessing IndexedDB:', error)
    return null
  }
}

export async function idbWriteArray(store: StoreName, data: any[]): Promise<void> {
  try {
    const db = await getDb()
    if (!db) {
      console.warn('No database available for writing')
      return
    }
    
    const tx = db.transaction(store, 'readwrite')
    // Clear existing data
    await tx.store.clear()
    
    // Store each item individually with its ID as key
    for (const item of data) {
      if (item) {
        // Ensure the item has required fields
        const itemToStore = { ...item }
        if (!itemToStore.id) {
          itemToStore.id = crypto.randomUUID()
        }
        if (store === 'authors' || store === 'books') {
          itemToStore.addedDate = itemToStore.addedDate || new Date().toISOString()
          itemToStore.updatedDate = new Date().toISOString()
        }
        await tx.store.put(itemToStore)
      }
    }
    
    await tx.done
    
    // Force a re-render of components by dispatching a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`db-${store}-updated`))
    }
  } catch (error) {
    console.error(`Error writing to ${store}:`, error)
    throw error
  }
}

export async function idbReadArray<T = any>(store: StoreName): Promise<T[]> {
  try {
    const db = await getDb()
    if (!db) {
      console.warn('No database available for reading')
      return []
    }
    
    const tx = db.transaction(store, 'readonly')
    const allItems = await tx.store.getAll()
    await tx.done
    
    // Filter out any null/undefined items and ensure we return an array
    const items = Array.isArray(allItems) ? allItems.filter(Boolean) : []
    
    // Ensure items have required fields
    return items.map(item => {
      if (store === 'authors' || store === 'books') {
        return {
          ...item,
          addedDate: item.addedDate || new Date().toISOString(),
          updatedDate: item.updatedDate || new Date().toISOString()
        }
      }
      return item
    })
  } catch (error) {
    console.error(`Error reading from ${store}:`, error)
    return []
  }
}

export async function idbReadAllStores(): Promise<Record<StoreName, any[]>> {
  try {
    const db = await getDb()
    if (!db) {
      console.warn('No database available for reading all stores')
      return {
        books: [],
        members: [],
        authors: [],
        transactions: [],
        visitors: [],
        active_visits: []
      }
    }

    const stores: StoreName[] = ['books', 'members', 'authors', 'transactions', 'visitors', 'active_visits']
    const result: Record<string, any[]> = {}

    for (const store of stores) {
      try {
        const tx = db.transaction(store, 'readonly')
        const items = await tx.store.getAll()
        result[store] = Array.isArray(items) ? items.filter(Boolean) : []
        await tx.done
      } catch (error) {
        console.error(`Error reading store ${store}:`, error)
        result[store] = []
      }
    }

    return result as Record<StoreName, any[]>
  } catch (error) {
    console.error('Error in idbReadAllStores:', error)
    return {
      books: [],
      members: [],
      authors: [],
      transactions: [],
      visitors: [],
      active_visits: []
    }
  }
}
