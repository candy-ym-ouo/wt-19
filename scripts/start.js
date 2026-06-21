const net = require('net');
const { spawn } = require('child_process');

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();

      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(port + 1);
          return;
        }
        reject(err);
      });

      server.once('listening', () => {
        server.close(() => resolve(port));
      });

      server.listen(port);
    };

    tryPort(startPort);
  });
}

function runCommand(args, env = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      stdio: options.stdio || 'inherit',
      env: { ...process.env, ...env },
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(child);
        return;
      }
      reject(new Error(`命令失败: npm ${args.join(' ')}`));
    });
  });
}

function spawnLongRunning(args, env = {}) {
  return spawn('npm', args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

async function main() {
  const backendPort = await findFreePort(5001);
  const frontendPort = await findFreePort(5173);
  const apiTarget = `http://127.0.0.1:${backendPort}`;

  console.log(`构建前端资源...`);
  await runCommand(['run', 'build', '--prefix', 'client'], {
    VITE_PORT: String(frontendPort),
    VITE_API_TARGET: apiTarget,
  });

  console.log(`后端地址: ${apiTarget}`);
  console.log(`前端会从 http://127.0.0.1:${frontendPort} 开始尝试可用端口`);

  const children = [
    spawnLongRunning(['run', 'start', '--prefix', 'server'], { PORT: String(backendPort) }),
    spawnLongRunning(['run', 'preview', '--prefix', 'client', '--', '--host', '127.0.0.1', '--port', String(frontendPort)], {
      VITE_PORT: String(frontendPort),
      VITE_API_TARGET: apiTarget,
    }),
  ];

  let shuttingDown = false;

  const stopAll = (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    children.forEach((child) => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    });
    setTimeout(() => process.exit(exitCode), 100);
  };

  process.on('SIGINT', () => stopAll(0));
  process.on('SIGTERM', () => stopAll(0));

  children.forEach((child) => {
    child.on('error', (err) => {
      console.error('启动失败', err);
      stopAll(1);
    });

    child.on('exit', (code) => {
      if (shuttingDown) return;
      if (code && code !== 0) {
        stopAll(code);
      }
    });
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
