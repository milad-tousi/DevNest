const os = require('os');
const { execSync } = require('child_process');

function isInstalled(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isWSL() {
  return os.release().toLowerCase().includes('microsoft');
}

function detectProvider() {
  return 'virtualbox';
}

function checkEnvironment() {
  const platform = os.platform(); // 'linux', 'darwin', 'win32'

  const tools = {
    vagrant: isInstalled('vagrant'),
    ansible: isInstalled('ansible'),
    virtualbox: isInstalled('VBoxManage'),
    libvirt: false,
    libvirtRunning: false,
    kvm: false
  };

  return {
    platform,
    isWSL: isWSL(),
    provider: detectProvider(),
    tools
  };
}

module.exports = checkEnvironment;
