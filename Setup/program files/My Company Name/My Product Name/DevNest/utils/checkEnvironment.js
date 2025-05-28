const os = require('os');
const { execSync } = require('child_process');

function isInstalled(cmd) {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      // چک کن هم خود cmd و هم cmd.exe وجود داره
      execSync(`where ${cmd}`, { stdio: 'ignore' });
      return true;
    } else {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
      return true;
    }
  } catch {
    try {
      if (platform === 'win32') {
        execSync(`where ${cmd}.exe`, { stdio: 'ignore' });
        return true;
      }
    } catch {
      return false;
    }
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
  const platform = os.platform();

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
