// ========================================================================
// TEAMS ALWAYS ONLINE - BACKGROUND SERVICE WORKER (Manifest V3)
// ========================================================================

const DEFAULT_SETTINGS = {
  enabled: true,
  interval: 30, // seconds
  mode: 'stealth', // 'stealth' | 'pulse'
  audioKeepAlive: true,
  scheduleEnabled: false,
  scheduleStart: '09:00',
  scheduleEnd: '18:00',
  stats: {
    totalPings: 0,
    lastPingTime: null,
    sessionStart: Date.now()
  },
  logs: []
};

// Initialize or update badge on worker startup
function initBackgroundWorker() {
  chrome.storage.local.get(null, (data) => {
    if (!data || Object.keys(data).length === 0) {
      chrome.storage.local.set(DEFAULT_SETTINGS, () => {
        updateBadge(true);
      });
    } else {
      updateBadge(data.enabled !== false);
    }
  });

  chrome.alarms.create("teamsKeepAliveCheck", { periodInMinutes: 1 });
}

initBackgroundWorker();

// Install listener
chrome.runtime.onInstalled.addListener(() => {
  initBackgroundWorker();
});

// Alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "teamsKeepAliveCheck") {
    chrome.storage.local.get(["enabled"], (result) => {
      updateBadge(result.enabled !== false);
    });
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    updateBadge(changes.enabled.newValue);
  }
});

// Message listener from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PING_EXECUTED") {
    handlePingExecuted(message.details);
    sendResponse({ status: "ACK" });
  } else if (message.action === "GET_STATUS") {
    chrome.storage.local.get(null, (data) => {
      sendResponse(data);
    });
    return true; // Async response
  } else if (message.action === "TOGGLE_STATE") {
    chrome.storage.local.get(["enabled"], (data) => {
      const newState = !data.enabled;
      chrome.storage.local.set({ enabled: newState }, () => {
        updateBadge(newState);
        sendResponse({ enabled: newState });
      });
    });
    return true;
  }
});

// Update Extension Icon Badge
function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#10B981" }); // Emerald Green
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#EF4444" }); // Red
  }
}

// Track ping stats & store max 50 log messages
function handlePingExecuted(details = {}) {
  chrome.storage.local.get(["stats", "logs"], (res) => {
    const currentStats = res.stats || { totalPings: 0, sessionStart: Date.now() };
    const logs = res.logs || [];

    const updatedStats = {
      ...currentStats,
      totalPings: (currentStats.totalPings || 0) + 1,
      lastPingTime: new Date().toISOString()
    };

    const newLog = {
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: details.type || 'SYNTHETIC_EVENT',
      tabTitle: details.tabTitle || 'Teams Web',
      details: details.message || 'Keep-alive event triggered'
    };

    // Keep latest 50 logs
    const updatedLogs = [newLog, ...logs].slice(0, 50);

    chrome.storage.local.set({
      stats: updatedStats,
      logs: updatedLogs
    });
  });
}
