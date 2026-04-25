export function openFullDashboard() {
  const dashboardUrl = chrome.runtime.getURL('src/popup/dashboard.html');
  chrome.tabs.create({ url: dashboardUrl });
}
