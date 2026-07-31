// ========================================================================
// TEAMS ALWAYS ONLINE - INJECTED SCRIPT (MAIN WORLD)
// Operates in Teams' main JavaScript execution context.
// ========================================================================

(function () {
  if (window.__TAO_INJECTED__) return;
  window.__TAO_INJECTED__ = true;

  console.log("%c[Teams Always Online - Main Engine]%c Main world interceptors active.", "color: #10B981; font-weight: bold;", "color: inherit;");

  let settings = {
    enabled: true,
    interval: 30,
    audioKeepAlive: true,
    scheduleEnabled: false,
    scheduleStart: '09:00',
    scheduleEnd: '18:00'
  };

  // ----------------------------------------------------------------------
  // 1. Receive settings updates from content script
  // ----------------------------------------------------------------------
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'TAO_SETTINGS_UPDATE') {
      settings = { ...settings, ...event.data.settings };
    }
  });

  // ----------------------------------------------------------------------
  // 2. Page Visibility & Focus Override
  // Always report the document as visible & focused to Teams Web v2.
  // ----------------------------------------------------------------------
  try {
    Object.defineProperty(document, 'hidden', {
      get: function () {
        return settings.enabled ? false : false;
      },
      configurable: true
    });

    Object.defineProperty(document, 'visibilityState', {
      get: function () {
        return settings.enabled ? 'visible' : 'visible';
      },
      configurable: true
    });

    const origHasFocus = document.hasFocus;
    document.hasFocus = function () {
      if (settings.enabled) return true;
      return origHasFocus ? origHasFocus.apply(this, arguments) : true;
    };
  } catch (e) {
    console.warn("[Teams Always Online] Visibility override notice:", e);
  }

  // Prevent Teams from attaching visibilitychange & blur event listeners that trigger Away
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'visibilitychange' || type === 'blur' || type === 'pagehide') {
      const wrappedListener = function (e) {
        if (settings.enabled) {
          // Block event propagation to Teams idle detection scripts
          if (e && e.stopImmediatePropagation) {
            e.stopImmediatePropagation();
          }
          return;
        }
        return typeof listener === 'function' ? listener.apply(this, arguments) : listener.handleEvent(e);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // ----------------------------------------------------------------------
  // 3. Event isTrusted Override for Extension-Generated Events
  // Allows Teams React/Fluent UI event handlers to trust synthetic activity
  // ----------------------------------------------------------------------
  try {
    const isTrustedDesc = Object.getOwnPropertyDescriptor(Event.prototype, 'isTrusted');
    if (isTrustedDesc && isTrustedDesc.get) {
      const originalIsTrustedGetter = isTrustedDesc.get;
      Object.defineProperty(Event.prototype, 'isTrusted', {
        get: function () {
          if (this.__tao_synthetic__) return true;
          return originalIsTrustedGetter.call(this);
        },
        configurable: true
      });
    }
  } catch (e) {
    console.warn("[Teams Always Online] isTrusted override notice:", e);
  }

  // ----------------------------------------------------------------------
  // 4. Network Interception (Fetch & XHR) - Override Outgoing Presence Payload
  // If Teams attempts to send "Away" or "Inactive" payload, rewrite to "Available"
  // ----------------------------------------------------------------------
  function isPresenceEndpoint(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('presence') ||
      lower.includes('/signals') ||
      lower.includes('/userpresence') ||
      lower.includes('/me/presence') ||
      lower.includes('/availability') ||
      lower.includes('/publish')
    );
  }

  function sanitizePresencePayload(bodyStr) {
    if (!settings.enabled || !bodyStr || typeof bodyStr !== 'string') return bodyStr;
    try {
      let data = JSON.parse(bodyStr);
      let modified = false;

      // Single or nested presence object check
      const targets = [data, data.presence, data.userPresence, data.status].filter(Boolean);
      for (const target of targets) {
        if (typeof target === 'object') {
          if (target.availability && target.availability !== 'Available') {
            target.availability = 'Available';
            modified = true;
          }
          if (target.activity && target.activity !== 'Available') {
            target.activity = 'Available';
            modified = true;
          }
          if (target.status && target.status !== 'Available' && target.status !== 'Online') {
            target.status = 'Available';
            modified = true;
          }
          if (target.availability === 'Away' || target.availability === 'Offline' || target.availability === 'Inactive' || target.availability === 'BeRightBack') {
            target.availability = 'Available';
            modified = true;
          }
        }
      }

      if (modified) {
        console.log("%c[Teams Always Online]%c Overrode presence payload to 'Available'", "color: #10B981; font-weight: bold;", "color: inherit;");
        return JSON.stringify(data);
      }
    } catch (e) {
      // Body was not JSON
    }
    return bodyStr;
  }

  // Patch window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (resource, config) {
    if (settings.enabled && config && config.body) {
      const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
      if (isPresenceEndpoint(url)) {
        config.body = sanitizePresencePayload(config.body);
      }
    }
    return originalFetch.apply(this, arguments);
  };

  // Patch XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__tao_url = url;
    return originalXHROpen.apply(this, arguments);
  };

  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    if (settings.enabled && body && this.__tao_url && isPresenceEndpoint(this.__tao_url)) {
      body = sanitizePresencePayload(body);
    }
    return originalXHRSend.call(this, [body]);
  };

  // ----------------------------------------------------------------------
  // 5. Main World Synthetic Activity Dispatcher
  // ----------------------------------------------------------------------
  window.__tao_dispatchMainWorldActivity = function () {
    if (!settings.enabled) return;

    const x = Math.floor(Math.random() * (window.innerWidth || 800));
    const y = Math.floor(Math.random() * (window.innerHeight || 600));

    // Pointer event
    const pointerEvt = new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true
    });
    pointerEvt.__tao_synthetic__ = true;

    // Mouse event
    const mouseEvt = new MouseEvent('mousemove', {
      bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y
    });
    mouseEvt.__tao_synthetic__ = true;

    // Shift key pulse
    const keyEvt = new KeyboardEvent('keydown', {
      key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, bubbles: true, cancelable: true
    });
    keyEvt.__tao_synthetic__ = true;

    // Scroll event
    const scrollEvt = new Event('scroll', { bubbles: true, cancelable: true });
    scrollEvt.__tao_synthetic__ = true;

    const targetEl = document.body || document.documentElement;
    if (targetEl) {
      targetEl.dispatchEvent(pointerEvt);
      targetEl.dispatchEvent(mouseEvt);
      targetEl.dispatchEvent(scrollEvt);
    }
    window.dispatchEvent(keyEvt);

    // Focus event
    const focusEvt = new FocusEvent('focus', { bubbles: true });
    focusEvt.__tao_synthetic__ = true;
    window.dispatchEvent(focusEvt);
  };

})();
