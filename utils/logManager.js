// utils/logManager.js
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../vagrant/devnest.log');

// ✅ Append log text to file
function appendLog(text) {
  fs.appendFileSync(LOG_PATH, text);
}

// ✅ Clear the log file
function clearLog() {
  fs.writeFileSync(LOG_PATH, '');
}

// ✅ Read full log
function readLog() {
  if (!fs.existsSync(LOG_PATH)) return '';
  return fs.readFileSync(LOG_PATH, 'utf-8');
}

module.exports = {
  appendLog,
  clearLog,
  readLog
};
