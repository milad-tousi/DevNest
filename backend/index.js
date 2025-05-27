const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec, spawn, execSync, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');


require('../utils/initSelectedServices');
const checkEnvironment = require('../utils/checkEnvironment');
const generateVagrantfile = require('../utils/generateVagrantfile');
const { appendLog, clearLog, readLog } = require('../utils/logManager');
const { createUser, loginUser } = require('./auth');
const verifyToken = require('./middleware/authMiddleware');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('DevNest Backend is running!');
});

// 🔐 Auth routes
app.post('/api/signup', createUser);
app.post('/api/login', loginUser);

// 🖥️ System Info
app.get('/api/system-info', (req, res) => {
  const env = checkEnvironment();
  res.json(env);
});

// 📦 Install requirements
app.post('/api/install-requirements', (req, res) => {
  const platform = os.platform();
  let installer;

  if (platform === 'win32') {
    const batPath = path.join(__dirname, '../installer/windows/install_requirements.bat');
    installer = spawn('cmd.exe', ['/c', `"${batPath}"`], { shell: true });
  } else {
    const shPath = path.join(__dirname, '../installer/linux/install_requirements.sh');
    installer = spawn('bash', [shPath]);
  }

  installer.stdout.on('data', (data) => console.log(`[Installer] ${data}`));
  installer.stderr.on('data', (data) => console.error(`[Installer Error] ${data}`));
  installer.on('exit', (code) => console.log(`Installer exited with code ${code}`));

  res.json({ message: '⚙️ Installing requirements...' });
});

// 🔐 Create lab URL endpoint
app.get('/api/create-lab-url', verifyToken, (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  res.json({ streamUrl: `/api/create-lab?${query}` });
});

// 🔐 Create lab
app.get('/api/create-lab', (req, res, next) => {
  const token = req.query.token;
  if (token) req.headers.authorization = `Bearer ${token}`;
  next();
}, verifyToken, (req, res) => {
  const username = req.user.username;
  const vagrantPath = path.join(__dirname, '../vagrant', username);

  const services = {
    minikube: req.query.minikube === 'true',
    jenkins: req.query.jenkins === 'true',
    monitoring: req.query.monitoring === 'true'
  };

  const env = checkEnvironment();
  if (!env.tools.vagrant) return res.status(400).send('❌ Vagrant not installed');

  fs.mkdirSync(vagrantPath, { recursive: true });

  try {
    generateVagrantfile(services, { mergePrevious: true, basePath: vagrantPath });
  } catch {
    return res.status(500).send('❌ Failed to generate Vagrantfile');
  }

  clearLog();

  const child = spawn('vagrant', ['up'], { cwd: vagrantPath });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  child.stdout.on('data', (data) => {
    const text = data.toString();
    appendLog(text);
    text.split('\n').forEach(line => line.trim() && res.write(`data: ${line}\n\n`));
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    appendLog(text);
    text.split('\n').forEach(line => line.trim() && res.write(`data: [stderr] ${line}\n\n`));
  });

  child.on('close', (code) => {
    res.write(`data: 🏁 Vagrant finished with code ${code}\n\n`);
    res.write(`event: end\ndata: done\n\n`);
    res.end();
  });
});

// 🔐 SSH Info
app.get('/api/ssh-info', verifyToken, (req, res) => {
  const username = req.user.username;
  const vagrantPath = path.join(__dirname, '../vagrant', username);
  if (!fs.existsSync(vagrantPath)) return res.json({});

  const isWindows = process.platform === 'win32';

  const formatKeyPath = (p) => {
    const abs = path.resolve(p);
    return isWindows ? `"${abs.replace(/\\/g, '\\\\')}"` : `"${abs}"`;
  };

  try {
    const sshConfig = execSync('vagrant ssh-config', { cwd: vagrantPath }).toString();
    const blocks = sshConfig.split('Host ').slice(1);
    const sshInfo = {};

    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const vm = lines[0];
      const host = lines.find(l => l.startsWith('HostName'))?.split(/\s+/)[1];
      const port = lines.find(l => l.startsWith('Port'))?.split(/\s+/)[1];
      const user = lines.find(l => l.startsWith('User'))?.split(/\s+/)[1];

      // 🔧 مسیر کلید را دستی بساز چون ssh-config ممکنه ناقص باشه
      const key = path.join(vagrantPath, `.vagrant/machines/${vm}/virtualbox/private_key`);

      if (vm && host && port && user && fs.existsSync(key)) {
        let ip = null;
        try {
          const out = execSync(`vagrant ssh ${vm} -c "ip -4 addr show eth1 | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'"`, { cwd: vagrantPath }).toString();
          ip = out.trim();
        } catch (e) {
          console.warn(`⚠️ Could not get eth1 IP for ${vm}`);
        }

        const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${host} -p ${port} -i ${formatKeyPath(key)}`;
        sshInfo[vm] = { command: sshCommand };
        if (ip) sshInfo[vm].ip = ip;

        if (vm === 'jenkins' && ip) {
          sshInfo[vm].web = `http://${ip}:8080`;

          const keyPath = formatKeyPath(key).replace(/^"|"$/g, ''); // remove quotes

          sshInfo[vm].adminPassword = (() => {
            try {
              const sshArgs = [
                '-tt',
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'UserKnownHostsFile=/dev/null',
                '-i', keyPath,
                '-p', port,
                `${user}@${host}`,
                'sudo cat /var/lib/jenkins/.jenkins/secrets/initialAdminPassword 2>/dev/null || echo WAITING'
              ];

              for (let i = 0; i < 5; i++) {
                const result = spawnSync('ssh', sshArgs, { encoding: 'utf-8' });
                const out = result.stdout?.trim();
                if (!out) continue;

                const pwd = out.split('\n').map(l => l.trim()).find(l => /^[a-z0-9]{12,}$/.test(l));
                if (pwd && pwd !== 'WAITING') return pwd;

                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
              }
              return null;
            } catch (e) {
              console.warn(`⚠️ Could not retrieve Jenkins admin password:`, e.message);
              return null;
            }
          })();
        }

        if (vm === 'monitoring' && ip) {
          sshInfo[vm].Grafana = `http://${ip}:3000`;
          sshInfo[vm].prometheus = `http://${ip}:9090`;
        }
      }
    });

    res.json(sshInfo);
  } catch (err) {
    console.error('❌ Failed to parse vagrant ssh-config:', err);
    res.status(500).json({ error: 'Failed to retrieve SSH info' });
  }
});

// 📝 Install log
app.get('/api/install-log', (req, res) => {
  const log = readLog();
  res.send(log);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 DevNest backend is running on http://localhost:${PORT}`);
});
