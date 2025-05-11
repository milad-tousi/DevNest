const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec, spawn, execSync } = require('child_process');
const path = require('path');
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
  const scriptPath = path.join(__dirname, 'scripts/install_requirements.sh');
  const child = exec(`bash ${scriptPath}`);

  child.stdout.on('data', (data) => console.log(`[Installer] ${data}`));
  child.stderr.on('data', (data) => console.error(`[Installer Error] ${data}`));
  child.on('exit', (code) => console.log(`Installer exited with code ${code}`));

  res.json({ message: '⚙️ Installing requirements...' });
});

// 🔐 Create lab URL endpoint
app.get('/api/create-lab-url', verifyToken, (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  const streamUrl = `/api/create-lab?${query}`;
  res.json({ streamUrl });
});

// 🔐 Create lab - user scoped (support query token for SSE)
app.get('/api/create-lab', (req, res, next) => {
  const tokenFromQuery = req.query.token;
  if (tokenFromQuery) {
    req.headers.authorization = `Bearer ${tokenFromQuery}`;
  }
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
  if (!env.tools.vagrant) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('❌ Vagrant not installed\n');
  }

  if (!fs.existsSync(vagrantPath)) {
    fs.mkdirSync(vagrantPath, { recursive: true });
  }

  try {
    generateVagrantfile(services, { mergePrevious: true, basePath: vagrantPath });
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    return res.end('❌ Failed to generate Vagrantfile\n');
  }

  clearLog();

  const child = spawn('vagrant', ['up'], { cwd: vagrantPath });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  child.stdout.on('data', (data) => {
    const text = data.toString();
    appendLog(text);
    text.split('\n').forEach(line => {
      if (line.trim()) res.write(`data: ${line}\n\n`);
    });
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    appendLog(text);
    text.split('\n').forEach(line => {
      if (line.trim()) res.write(`data: [stderr] ${line}\n\n`);
    });
  });

  child.on('close', (code) => {
    res.write(`data: 🏁 Vagrant finished with code ${code}\n\n`);
    res.write(`event: end\ndata: done\n\n`);
    res.end();
  });
});

// 🔐 SSH Info - user scoped
app.get('/api/ssh-info', verifyToken, (req, res) => {
  const username = req.user.username;
  const vagrantPath = path.join(__dirname, '../vagrant', username);

  if (!fs.existsSync(vagrantPath)) return res.json({});

  const sshInfo = {};

  try {
    const output = execSync('vagrant ssh-config', { cwd: vagrantPath }).toString();
    const blocks = output.split('Host ').slice(1);

    blocks.forEach(block => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      const vm = lines[0];
      const host = lines.find(l => l.startsWith('HostName'))?.split(/\s+/)[1];
      const port = lines.find(l => l.startsWith('Port'))?.split(/\s+/)[1];
      const user = lines.find(l => l.startsWith('User'))?.split(/\s+/)[1];
      const key = lines.find(l => l.startsWith('IdentityFile'))?.split(/\s+/)[1];

      if (vm && host && port && user && key) {
        let ip;
        try {
          const ipOutput = execSync(
            `vagrant ssh ${vm} -c "ip -4 addr show eth1 | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'"`,
            { cwd: vagrantPath }
          ).toString();
          ip = ipOutput.trim();
        } catch (err) {
          console.warn(`⚠️ Could not get eth1 IP for ${vm}`);
        }

        sshInfo[vm] = {
          command: `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${host} -p ${port} -i "${key}"`,
          ...(ip ? { ip } : {}),
          ...(vm === 'jenkins' && ip ? {
            web: `http://${ip}:8080`,
            adminPassword: (() => {
              try {
                const sshCommand = [
                  'ssh',
                  '-tt',
                  '-o StrictHostKeyChecking=no',
                  '-o UserKnownHostsFile=/dev/null',
                  `-i "${key}"`,
                  `-p ${port}`,
                  `${user}@${host}`,
                  `"sudo cat /var/lib/jenkins/.jenkins/secrets/initialAdminPassword 2>/dev/null || echo 'WAITING'"`
                ].join(' ');

                for (let i = 0; i < 5; i++) {
                  const output = execSync(sshCommand, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
                  const lines = output.split('\n').map(line => line.trim());
                  const password = lines.find(line => /^[a-z0-9]{12,}$/.test(line));
                  if (password && password !== 'WAITING') return password;
                  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
                }
                return null;
              } catch (e) {
                console.warn(`⚠️ Could not retrieve Jenkins admin password:`, e.message);
                return null;
              }
            })()
          } : {}),
          ...(vm === 'monitoring' && ip ? {
            Grafana: `http://${ip}:3000`,
            prometheus: `http://${ip}:9090`
          } : {})
        };
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