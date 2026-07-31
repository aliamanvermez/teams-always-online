// ========================================================================
// TEAMS ALWAYS ONLINE - POPUP SCRIPT
// ========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const powerToggle = document.getElementById('powerToggle');
  const statusCard = document.getElementById('statusCard');
  const statusTitle = document.getElementById('statusTitle');
  const statusSubtitle = document.getElementById('statusSubtitle');
  const intervalSelect = document.getElementById('intervalSelect');
  const modeSelect = document.getElementById('modeSelect');
  const audioKeepAliveToggle = document.getElementById('audioKeepAliveToggle');
  
  const scheduleToggle = document.getElementById('scheduleToggle');
  const scheduleInputsRow = document.getElementById('scheduleInputsRow');
  const scheduleStart = document.getElementById('scheduleStart');
  const scheduleEnd = document.getElementById('scheduleEnd');

  const totalPingsVal = document.getElementById('totalPingsVal');
  const lastPingVal = document.getElementById('lastPingVal');
  const logsContainer = document.getElementById('logsContainer');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  // Load initial settings
  chrome.storage.local.get(null, (data) => {
    if (!data) return;

    powerToggle.checked = data.enabled !== false;
    intervalSelect.value = data.interval || 30;
    modeSelect.value = data.mode || 'stealth';
    audioKeepAliveToggle.checked = data.audioKeepAlive !== false;

    scheduleToggle.checked = !!data.scheduleEnabled;
    scheduleStart.value = data.scheduleStart || '09:00';
    scheduleEnd.value = data.scheduleEnd || '18:00';
    toggleScheduleInputs(scheduleToggle.checked);

    updateStatusUI(powerToggle.checked);
    updateStatsUI(data.stats);
    updateLogsUI(data.logs);
  });

  // Listen for background updates
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.stats) updateStatsUI(changes.stats.newValue);
      if (changes.logs) updateLogsUI(changes.logs.newValue);
      if (changes.enabled) {
        powerToggle.checked = changes.enabled.newValue;
        updateStatusUI(changes.enabled.newValue);
      }
    }
  });

  // Main Power Toggle
  powerToggle.addEventListener('change', () => {
    const isEnabled = powerToggle.checked;
    chrome.storage.local.set({ enabled: isEnabled }, () => {
      updateStatusUI(isEnabled);
    });
  });

  // Interval Change
  intervalSelect.addEventListener('change', () => {
    const val = parseInt(intervalSelect.value, 10);
    chrome.storage.local.set({ interval: val });
  });

  // Mode Change
  modeSelect.addEventListener('change', () => {
    chrome.storage.local.set({ mode: modeSelect.value });
  });

  // Audio Keep Alive Toggle
  audioKeepAliveToggle.addEventListener('change', () => {
    chrome.storage.local.set({ audioKeepAlive: audioKeepAliveToggle.checked });
  });

  // Schedule Toggle
  scheduleToggle.addEventListener('change', () => {
    const enabled = scheduleToggle.checked;
    toggleScheduleInputs(enabled);
    chrome.storage.local.set({ scheduleEnabled: enabled });
  });

  scheduleStart.addEventListener('change', () => {
    chrome.storage.local.set({ scheduleStart: scheduleStart.value });
  });

  scheduleEnd.addEventListener('change', () => {
    chrome.storage.local.set({ scheduleEnd: scheduleEnd.value });
  });

  // Clear Logs
  clearLogsBtn.addEventListener('click', () => {
    chrome.storage.local.set({ logs: [] }, () => {
      updateLogsUI([]);
    });
  });

  // Helper Functions
  function updateStatusUI(enabled) {
    if (enabled) {
      statusCard.classList.remove('inactive');
      statusCard.classList.add('active');
      statusTitle.textContent = "Sistem Aktif (Online)";
      statusSubtitle.textContent = "Teams Web 'Uygun' durumunda tutuluyor";
    } else {
      statusCard.classList.remove('active');
      statusCard.classList.add('inactive');
      statusTitle.textContent = "Sistem Devre Dışı";
      statusSubtitle.textContent = "Teams varsayılan boştalık modunda";
    }
  }

  function toggleScheduleInputs(enabled) {
    if (enabled) {
      scheduleInputsRow.classList.add('active');
    } else {
      scheduleInputsRow.classList.remove('active');
    }
  }

  function updateStatsUI(stats) {
    if (!stats) return;
    totalPingsVal.textContent = stats.totalPings || 0;
    if (stats.lastPingTime) {
      const date = new Date(stats.lastPingTime);
      lastPingVal.textContent = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } else {
      lastPingVal.textContent = 'Henüz yok';
    }
  }

  function updateLogsUI(logs) {
    if (!logs || logs.length === 0) {
      logsContainer.innerHTML = '<div class="log-empty">Henüz aktivite kaydı bulunmuyor.</div>';
      return;
    }

    logsContainer.innerHTML = logs.map(log => `
      <div class="log-item">
        <span class="log-time">[${log.timestamp || ''}]</span>
        <span class="log-text">${log.details || ''}</span>
      </div>
    `).join('');
  }
});
