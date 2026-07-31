// ========================================================================
// TEAMS ALWAYS ONLINE - CONTENT SCRIPT
// ========================================================================

(function () {
  console.log("%c[Teams Always Online]%c Content script initialized for Microsoft Teams Web.", "color: #10B981; font-weight: bold;", "color: inherit;");

  let isRunning = false;
  let keepAliveTimer = null;
  let domCheckTimer = null;
  let audioContext = null;
  let silentOscillator = null;
  let silentAudioEl = null;

  let currentSettings = {
    enabled: true,
    interval: 30,
    mode: 'stealth',
    audioKeepAlive: true,
    scheduleEnabled: false,
    scheduleStart: '09:00',
    scheduleEnd: '18:00'
  };

  // Helper: Check if chrome extension context is valid
  function isContextValid() {
    try {
      return Boolean(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function stopOrphanTimers() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (domCheckTimer) {
      clearInterval(domCheckTimer);
      domCheckTimer = null;
    }
    stopAudioKeepAlive();
  }

  // ----------------------------------------------------------------------
  // 1. Script Injection to Main World (Fallback / Support)
  // ----------------------------------------------------------------------
  function injectMainWorldScript() {
    if (document.getElementById('tao-injected-script')) return;
    try {
      if (!isContextValid()) return;
      const script = document.createElement('script');
      script.id = 'tao-injected-script';
      script.src = chrome.runtime.getURL('content/injected.js');
      script.onload = function () {
        this.remove();
        syncSettingsToMainWorld();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.warn("[Teams Always Online] Main world script injection notice:", e);
    }
  }

  function syncSettingsToMainWorld() {
    window.postMessage({
      type: 'TAO_SETTINGS_UPDATE',
      settings: currentSettings
    }, '*');
  }

  // Inject script early
  injectMainWorldScript();

  // ----------------------------------------------------------------------
  // 2. Storage & Settings Listener
  // ----------------------------------------------------------------------
  function loadAndApplySettings() {
    if (!isContextValid()) {
      stopOrphanTimers();
      return;
    }
    try {
      chrome.storage.local.get(null, (settings) => {
        if (!isContextValid()) {
          stopOrphanTimers();
          return;
        }
        if (settings) {
          currentSettings = { ...currentSettings, ...settings };
          syncSettingsToMainWorld();
          restartKeepAliveEngine();
        }
      });
    } catch (e) {
      stopOrphanTimers();
    }
  }

  try {
    if (isContextValid()) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (!isContextValid()) {
          stopOrphanTimers();
          return;
        }
        if (area === 'local') {
          let needsRestart = false;
          for (const key in changes) {
            currentSettings[key] = changes[key].newValue;
            if (['enabled', 'interval', 'mode', 'audioKeepAlive', 'scheduleEnabled', 'scheduleStart', 'scheduleEnd'].includes(key)) {
              needsRestart = true;
            }
          }
          syncSettingsToMainWorld();
          if (needsRestart) {
            restartKeepAliveEngine();
          }
        }
      });
    }
  } catch (e) {}

  // ----------------------------------------------------------------------
  // 3. Schedule Check (Working Hours)
  // ----------------------------------------------------------------------
  function isWithinWorkingHours() {
    if (!currentSettings.scheduleEnabled) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (currentSettings.scheduleStart || '09:00').split(':').map(Number);
    const [endH, endM] = (currentSettings.scheduleEnd || '18:00').split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight schedule (e.g. 22:00 to 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  // ----------------------------------------------------------------------
  // 4. Multi-Layer Audio Keep-Alive (Prevents Background Tab Throttling)
  // ----------------------------------------------------------------------
  function startAudioKeepAlive() {
    if (!currentSettings.audioKeepAlive) {
      stopAudioKeepAlive();
      return;
    }

    // Method A: HTML5 Silent Audio Loop
    try {
      if (!silentAudioEl) {
        silentAudioEl = document.createElement('audio');
        silentAudioEl.id = 'tao-silent-audio-player';
        silentAudioEl.loop = true;
        silentAudioEl.volume = 0.0001; // Inaudible
        silentAudioEl.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
        (document.body || document.documentElement).appendChild(silentAudioEl);
      }
      silentAudioEl.play().catch(() => {
        // Autoplay policy wait for user gesture
        const unlockAudio = () => {
          if (silentAudioEl) silentAudioEl.play().catch(() => {});
          if (audioContext && audioContext.state === 'suspended') audioContext.resume();
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
      });
    } catch (e) {}

    // Method B: Web Audio API Oscillator
    try {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioContext = new AudioCtx();
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.0001;

          silentOscillator = audioContext.createOscillator();
          silentOscillator.type = 'sine';
          silentOscillator.frequency.value = 20;
          silentOscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          silentOscillator.start();
        }
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch (err) {
      console.warn("[Teams Always Online] Web Audio notice:", err);
    }
  }

  function stopAudioKeepAlive() {
    if (silentAudioEl) {
      try {
        silentAudioEl.pause();
        silentAudioEl.remove();
      } catch (e) {}
      silentAudioEl = null;
    }
    if (audioContext) {
      try {
        if (silentOscillator) {
          silentOscillator.stop();
          silentOscillator.disconnect();
          silentOscillator = null;
        }
        audioContext.close();
        audioContext = null;
      } catch (e) {}
    }
  }

  // ----------------------------------------------------------------------
  // 5. Activity Execution Engine
  // ----------------------------------------------------------------------
  function dispatchSyntheticEvents() {
    if (!isContextValid()) {
      stopOrphanTimers();
      return;
    }

    if (!currentSettings.enabled || !isWithinWorkingHours()) {
      return;
    }

    const targetEl = document.body || document.documentElement;
    const x = Math.floor(Math.random() * (window.innerWidth || 800));
    const y = Math.floor(Math.random() * (window.innerHeight || 600));

    // Mouse & Pointer movement
    const mouseMoveEvt = new MouseEvent('mousemove', {
      bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y
    });
    mouseMoveEvt.__tao_synthetic__ = true;

    const pointerMoveEvt = new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true
    });
    pointerMoveEvt.__tao_synthetic__ = true;

    // Key pulse (Shift)
    const keyEvt = new KeyboardEvent('keydown', {
      key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, bubbles: true, cancelable: true
    });
    keyEvt.__tao_synthetic__ = true;

    // Scroll
    const scrollEvt = new Event('scroll', { bubbles: true, cancelable: true });
    scrollEvt.__tao_synthetic__ = true;

    // Dispatch DOM events
    if (targetEl) {
      targetEl.dispatchEvent(pointerMoveEvt);
      targetEl.dispatchEvent(mouseMoveEvt);
      targetEl.dispatchEvent(scrollEvt);
    }
    window.dispatchEvent(keyEvt);
    window.dispatchEvent(new Event('focus'));

    // Trigger activity in main world script if loaded
    if (typeof window.__tao_dispatchMainWorldActivity === 'function') {
      window.__tao_dispatchMainWorldActivity();
    }

    // Safely send status update message to background worker
    if (isContextValid()) {
      try {
        const responsePromise = chrome.runtime.sendMessage({
          action: "PING_EXECUTED",
          details: {
            type: "MULTI_LAYER_KEEP_ALIVE",
            tabTitle: document.title || "Microsoft Teams",
            message: `Çevrimiçi aktivite simüle edildi (${x}, ${y})`
          }
        });
        if (responsePromise && responsePromise.catch) {
          responsePromise.catch((err) => {
            if (err && err.message && err.message.includes('Extension context invalidated')) {
              stopOrphanTimers();
            }
          });
        }
      } catch (e) {
        stopOrphanTimers();
      }
    } else {
      stopOrphanTimers();
    }

    // Pulse UI Toast Animation
    if (currentSettings.mode === 'pulse') {
      showPulseToast();
    }
  }

  // ----------------------------------------------------------------------
  // 6. DOM Status Guard & Checker
  // Checks Teams UI for Away status and auto-refreshes if needed
  // ----------------------------------------------------------------------
  function checkTeamsUiStatus() {
    if (!isContextValid()) {
      stopOrphanTimers();
      return;
    }

    if (!currentSettings.enabled || !isWithinWorkingHours()) return;

    try {
      // Look for Teams profile / avatar status elements
      const avatarBtn = document.querySelector('[data-tid="me-control-avatar"], button[id*="person-avatar"], .fui-Avatar');
      if (avatarBtn) {
        const ariaLabel = avatarBtn.getAttribute('aria-label') || '';
        const title = avatarBtn.getAttribute('title') || '';
        const combinedText = (ariaLabel + ' ' + title + ' ' + avatarBtn.innerText).toLowerCase();

        // If status contains away / dışarıda / boşta / inactive
        if (combinedText.includes('away') || combinedText.includes('dışarıda') || combinedText.includes('boşta') || combinedText.includes('inactive')) {
          console.warn("[Teams Always Online] Detected Away status in UI! Dispatching instant activity refresh...");
          dispatchSyntheticEvents();
        }
      }
    } catch (e) {}
  }

  // ----------------------------------------------------------------------
  // 7. Visual Pulse Indicator (Pulse Mode)
  // ----------------------------------------------------------------------
  function createPulseIndicator() {
    if (document.getElementById('tao-pulse-indicator')) return;

    const pill = document.createElement('div');
    pill.id = 'tao-pulse-indicator';
    pill.className = 'tao-pulse-pill';
    pill.innerHTML = `
      <span class="tao-pulse-dot"></span>
      <span class="tao-pulse-text">Teams Online Aktif</span>
    `;
    (document.body || document.documentElement).appendChild(pill);
  }

  function removePulseIndicator() {
    const el = document.getElementById('tao-pulse-indicator');
    if (el) el.remove();
  }

  function showPulseToast() {
    const el = document.getElementById('tao-pulse-indicator');
    if (el) {
      el.classList.add('tao-ping-flash');
      setTimeout(() => {
        el.classList.remove('tao-ping-flash');
      }, 1000);
    }
  }

  // ----------------------------------------------------------------------
  // 8. Lifecycle Engine Controls
  // ----------------------------------------------------------------------
  function restartKeepAliveEngine() {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (domCheckTimer) {
      clearInterval(domCheckTimer);
      domCheckTimer = null;
    }

    if (!currentSettings.enabled) {
      stopAudioKeepAlive();
      removePulseIndicator();
      console.log("[Teams Always Online] Engine disabled.");
      return;
    }

    if (!isWithinWorkingHours()) {
      console.log("[Teams Always Online] Outside configured working hours. Paused.");
      return;
    }

    // Audio keep-alive
    startAudioKeepAlive();

    // Pulse Mode setup
    if (currentSettings.mode === 'pulse') {
      createPulseIndicator();
    } else {
      removePulseIndicator();
    }

    // Interval execution
    const intervalMs = Math.max(10, currentSettings.interval || 30) * 1000;

    // Initial ping after 1 second
    setTimeout(dispatchSyntheticEvents, 1000);

    // Periodic ping timer
    keepAliveTimer = setInterval(dispatchSyntheticEvents, intervalMs);

    // DOM UI presence checker every 15 seconds
    domCheckTimer = setInterval(checkTeamsUiStatus, 15000);

    console.log(`[Teams Always Online] Engine active. Ping interval: ${currentSettings.interval}s, Mode: ${currentSettings.mode}`);
  }

  // Initialize on load
  loadAndApplySettings();
})();
