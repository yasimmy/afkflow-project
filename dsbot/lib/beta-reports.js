const fs = require('node:fs');
const path = require('node:path');

const dataPath = path.join(__dirname, '..', 'data');
const reportsPath = path.join(dataPath, 'beta-reports.json');

function readReports() {
  fs.mkdirSync(dataPath, { recursive: true });
  if (!fs.existsSync(reportsPath)) fs.writeFileSync(reportsPath, '{}');
  return JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
}

function writeReports(reports) {
  fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
}

function saveReport(report) {
  const reports = readReports();
  reports[report.id] = report;
  writeReports(reports);
}

function getReport(id) {
  return readReports()[id.toUpperCase()];
}

function saveResponse(id, response) {
  const reports = readReports();
  const report = reports[id.toUpperCase()];
  if (!report) return false;

  report.response = response;
  report.respondedAt = new Date().toISOString();
  writeReports(reports);
  return true;
}

module.exports = { getReport, saveReport, saveResponse };
