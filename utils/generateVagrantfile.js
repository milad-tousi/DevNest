const fs = require('fs');
const path = require('path');

// 📦 Blocks for each service with static IPs
const blocks = {
  minikube: () => `
  config.vm.define "minikube" do |minikube|
    minikube.vm.box = "generic/ubuntu2204"
    minikube.vm.hostname = "minikube.local"
    minikube.vm.network "private_network", ip: "192.168.56.10"
    minikube.vm.provision "shell", path: "scripts/minikube.sh"
  end
  `,

  jenkins: () => `
  config.vm.define "jenkins" do |jenkins|
    jenkins.vm.box = "generic/ubuntu2204"
    jenkins.vm.hostname = "jenkins.local"
    jenkins.vm.network "private_network", ip: "192.168.56.11"
    jenkins.vm.provision "shell", path: "scripts/jenkins.sh"
  end
  `,

  monitoring: () => `
  config.vm.define "monitoring" do |monitoring|
    monitoring.vm.box = "generic/ubuntu2204"
    monitoring.vm.hostname = "monitoring.local"
    monitoring.vm.network "private_network", ip: "192.168.56.12"
    monitoring.vm.provision "shell", path: "scripts/monitoring.sh"
  end
  `
};

// 📂 Copy provision scripts to target dir
function copyProvisionScripts(destScriptsDir) {
  const srcScriptsDir = path.join(__dirname, '../vagrant/scripts');
  fs.mkdirSync(destScriptsDir, { recursive: true });

  const files = ['minikube.sh', 'jenkins.sh', 'monitoring.sh'];
  for (const file of files) {
    const src = path.join(srcScriptsDir, file);
    const dest = path.join(destScriptsDir, file);

    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    } else {
      console.warn(`⚠️ Script not found: ${file}`);
    }
  }
}

// 🏗 Generate the Vagrantfile with selected blocks
function generateVagrantfile(newSelections = {}, options = {}) {
  const { mergePrevious = false, basePath } = options;

  if (!basePath) {
    console.error('❌ generateVagrantfile: basePath is required');
    return;
  }

  const templatePath = path.join(__dirname, '../vagrant/Vagrantfile.template');
  const outputPath = path.join(basePath, 'Vagrantfile');
  const stateFile = path.join(basePath, 'selectedServices.json');
  const scriptsPath = path.join(basePath, 'scripts');

  let current = {
    minikube: false,
    jenkins: false,
    monitoring: false
  };

  if (mergePrevious && fs.existsSync(stateFile)) {
    try {
      current = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    } catch (e) {
      console.warn('⚠️ Could not parse selectedServices.json, using defaults.');
    }
  }

  const updated = { ...current };
  for (const key of Object.keys(newSelections)) {
    if (newSelections[key] === true) updated[key] = true;
  }

  fs.writeFileSync(stateFile, JSON.stringify(updated, null, 2));

  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    console.error('❌ Failed to read Vagrantfile.template:', err.message);
    return;
  }

  // 👇 Detect provider from environment
  const detectEnv = require('./checkEnvironment');
  const provider = detectEnv().provider;

  const result = template
    .replace('{{PROVIDER}}', provider)
    .replace('{{MINIKUBE_BLOCK}}', updated.minikube ? blocks.minikube() : '')
    .replace('{{JENKINS_BLOCK}}', updated.jenkins ? blocks.jenkins() : '')
    .replace('{{MONITORING_BLOCK}}', updated.monitoring ? blocks.monitoring() : '');

  fs.mkdirSync(basePath, { recursive: true });

  copyProvisionScripts(scriptsPath);

  try {
    fs.writeFileSync(outputPath, result);
    console.log(`✅ Vagrantfile generated at ${outputPath}`);
  } catch (err) {
    console.error('❌ Failed to write Vagrantfile:', err.message);
  }
}

module.exports = generateVagrantfile;
