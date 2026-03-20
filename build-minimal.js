const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ultra-minimal Next.js build with aggressive memory management
async function buildMinimal() {
  console.log('Starting minimal Next.js build...');
  
  // Clean any existing build
  const nextDir = path.join(__dirname, '.next');
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
  }
  
  // Force garbage collection every 100ms during build
  const gcInterval = setInterval(() => {
    if (global.gc) {
      global.gc();
    }
  }, 100);
  
  return new Promise((resolve, reject) => {
    const buildProcess = spawn('npx', ['next', 'build', '--no-lint'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=1536 --max-semi-space-size=32 --expose-gc',
        NEXT_DISABLE_SWC_COMPILATION_PARALLEL: '1',
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_ENV: 'production'
      },
      shell: true
    });
    
    buildProcess.on('close', (code) => {
      clearInterval(gcInterval);
      if (code === 0) {
        console.log('Build completed successfully!');
        resolve();
      } else {
        console.error(`Build failed with code ${code}`);
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    
    buildProcess.on('error', (err) => {
      clearInterval(gcInterval);
      console.error('Build process error:', err);
      reject(err);
    });
  });
}

buildMinimal().catch(console.error);
