const fs = require('fs');
const path = require('path');

const stateFilePath = path.join(__dirname, '../vagrant/selectedServices.json');

const defaultState = {
  minikube: false,
  jenkins: false,
  monitoring: false
};

if (!fs.existsSync(stateFilePath)) {
  fs.writeFileSync(stateFilePath, JSON.stringify(defaultState, null, 2));
  console.log('✅ selectedServices.json created with default values.');
} else {
  console.log('ℹ️ selectedServices.json already exists. No changes made.');
}
