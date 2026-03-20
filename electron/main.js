const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

let mainWindow = null
let httpServer = null
let nextApp = null
let PORT = Number(process.env.PORT) || 32145

// Simple file logger to capture startup issues in production
const logsDir = path.join(app.getPath('userData'), 'logs')
const logFile = path.join(logsDir, 'app.log')
function writeLog(line) {
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${line}\n`)
  } catch {}
}
;['log','warn','error'].forEach((m)=>{
  const orig = console[m]
  console[m] = (...args)=>{
    const msg = args.map(a=>{
      try { return typeof a === 'string' ? a : JSON.stringify(a) } catch { return String(a) }
    }).join(' ')
    writeLog(`[${m.toUpperCase()}] ${msg}`)
    try { orig.apply(console, args) } catch {}
  }
})
process.on('unhandledRejection', (r)=>{ console.error('UnhandledRejection', r) })
process.on('uncaughtException', (e)=>{ console.error('UncaughtException', e) })


async function startNextServer() {
  // Start Next.js programmatically. If packaged and no production .next exists,
  // copy the app to a writable userData directory and run dev mode from there.
  const next = require('next')
  const packagedAppPath = app.getAppPath()
  const devSourcePath = path.join(__dirname, '..')
  const baseDir = app.isPackaged ? packagedAppPath : devSourcePath
  const nextBuildPath = path.join(baseDir, '.next')
  const hasProdBuild = fs.existsSync(nextBuildPath) && fs.existsSync(path.join(nextBuildPath, 'BUILD_ID'))

  let dir = baseDir
  let dev = false

  if (!hasProdBuild) {
    dev = true
    console.warn('[electron] No production .next build found. Running in development mode.')
    
    if (app.isPackaged) {
      // For packaged apps without production build, use the source directory directly
      dir = packagedAppPath
    } else {
      // For development, use the project directory
      dir = devSourcePath
    }
  }

  nextApp = next({ dev, dir })
  await nextApp.prepare()
  const handle = nextApp.getRequestHandler()

  await new Promise((resolve, reject) => {
    httpServer = http.createServer((req, res) => handle(req, res))

    const maxRetries = 15
    let attempts = 0

    function tryListen() {
      attempts += 1
      writeLog(`[electron] Attempt ${attempts}/${maxRetries} listening on fixed port ${PORT}`)
      httpServer.once('error', (err) => {
        console.error('[electron] HTTP server error', err)
        if (err && err.code === 'EADDRINUSE') {
          if (attempts < maxRetries) {
            // Wait and retry the same fixed port to preserve origin for IndexedDB
            setTimeout(() => {
              tryListen()
            }, 1000)
            return
          }
          const msg = `Port ${PORT} is in use. Please close the other app or free the port.`
          try { dialog.showErrorBox('Port In Use', msg) } catch {}
          return reject(new Error(msg))
        }
        return reject(err)
      })

      try {
        httpServer.listen(PORT, () => {
          const addr = httpServer.address()
          PORT = typeof addr === 'object' && addr ? addr.port : PORT
          console.log('[electron] HTTP server listening on', PORT)
          resolve()
        })
      } catch (e) {
        if (attempts < maxRetries) {
          setTimeout(() => tryListen(), 1000)
        } else {
          reject(e)
        }
      }
    }

    tryListen()
  })
}

async function createWindow() {
  try { app.setAppUserModelId('TakoradiLibrary') } catch {}
  await startNextServer()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#0b0b0b',
    center: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    closable: true,
  })

  // Show a lightweight splash/loading page immediately
  const loadingHtml = `data:text/html;charset=utf-8,` +
    encodeURIComponent(`
      <html><head><meta charset="utf-8"/><title>Starting...</title>
      <style>html,body{height:100%;margin:0;background:#0b0b0b;color:#fff;display:flex;align-items:center;justify-content:center;font-family:sans-serif}</style>
      </head><body>
        <div>
          <div style="font-size:18px;opacity:.9">Starting Nexus LMS...</div>
          <div style="font-size:12px;opacity:.6;margin-top:8px">If this screen stays for long, your firewall may be blocking the local server.</div>
        </div>
      </body></html>
    `)
  try { 
    await mainWindow.loadURL(loadingHtml)
    mainWindow.show()
    mainWindow.focus()
  } catch (e) {
    console.error('Failed to load loading page:', e)
    mainWindow.show()
  }

  const target = `http://localhost:${PORT}`
  console.log('[electron] Loading URL', target)

  // Helper: load with timeout and simple retry once
  async function loadTargetWithTimeout(url, timeoutMs = 30000) {
    const controller = { done: false }
    const timer = setTimeout(() => {
      if (!controller.done) {
        console.warn('[electron] loadURL timeout, will retry once')
        try { mainWindow.webContents.stop() } catch {}
      }
    }, timeoutMs)
    try {
      await mainWindow.loadURL(url)
    } finally {
      controller.done = true
      clearTimeout(timer)
    }
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('did-fail-load', code, desc)
  })

  try {
    await loadTargetWithTimeout(target, 30000)
    mainWindow.show()
    mainWindow.focus()
  } catch (e) {
    console.warn('First load failed, retrying once...', e)
    try { 
      await loadTargetWithTimeout(target, 15000) 
      mainWindow.show()
      mainWindow.focus()
    } catch (ee) {
      console.error('Second load failed', ee)
      mainWindow.show()
      try { 
        dialog.showErrorBox('Startup Error', 'Failed to load app UI. Please check your firewall and try again.') 
      } catch {}
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  try {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(() => resolve()))
    }
  } catch (_) {}
})

// Ensure single instance
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.moveTop()
    }
  })
}

app.whenReady().then(async () => {
  try {
    await createWindow()
  } catch (e) {
    console.error('Failed to create window', e)
    try { dialog.showErrorBox('Startup Error', String(e && e.message || e)) } catch {}
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
})
