// === APPLICATION ORBIX ===
// Gestionnaire de badge pour les mails Tuta

// === CONSTANTES DE TEMPS ===
const TIME_CONSTANTS = {
  timeFrequencyNormal: { "1min": 60, "5min": 300, "10min": 600, "30min": 1800, default: "5min" },
  timeFrequencyFast:   { "15s": 15, "30s": 30, "45s": 45, "1min": 60, default: "30s" },
  timeDurationFastMode:{ "1min": 60, "3min": 180, "5min": 300, "10min": 600, default: "5min" },
  timeBatterySaverMultiplier: 2
};

// === ÉTAT GLOBAL ===
let settings = {
  email: "", 
  password: "", 
  saveCredentials: false,
  mode: "activeHours", 
  activeHours: [], 
  nightPause: { startHour: "22:00", endHour: "07:00" },
  frequencyNormal: "5min", 
  frequencyFast: "30s", 
  durationFastMode: "5min",
  batterySaver: true, 
  disableRefresh: false
};

let currentUnread = 0;
let lastUnread = 0;
let fastModeTimer = null;
let normalModeTimer = null;
let isFastMode = false;

// === ÉLÉMENTS DOM ===
const els = {
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  saveCredentials: document.getElementById('saveCredentials'),
  testBtn: document.getElementById('testBtn'),
  testStatus: document.getElementById('testStatus'),
  mode: document.getElementById('mode'),
  activeHoursField: document.getElementById('activeHoursField'),
  activeHoursJSON: document.getElementById('activeHoursJSON'),
  nightPauseField: document.getElementById('nightPauseField'),
  nightStart: document.getElementById('nightStart'),
  nightEnd: document.getElementById('nightEnd'),
  frequencyNormal: document.getElementById('frequencyNormal'),
  frequencyFast: document.getElementById('frequencyFast'),
  durationFastMode: document.getElementById('durationFastMode'),
  batterySaver: document.getElementById('batterySaver'),
  disableRefresh: document.getElementById('disableRefresh'),
  saveBtn: document.getElementById('saveBtn'),
  saveStatus: document.getElementById('saveStatus')
};

// === AFFICHAGE DE LA VERSION ===
function displayAppVersion() {
  const versionEl = document.getElementById('appVersion');
  if (versionEl && ORBIX_CONFIG?.version) {
    versionEl.textContent = ORBIX_CONFIG.version;
  }
  
  // Optionnel : mettre à jour le titre de la page
  document.title = `Orbix v${ORBIX_CONFIG.version || '0.1.0'}`;
}

// === INITIALISATION ===
function init() {
  displayAppVersion();
  loadSettings();
  bindUI();
  registerServiceWorker();
  startRefreshCycle();
  console.log('🔮 Orbix initialisé');
}

function loadSettings() {
  const saved = localStorage.getItem('orbixSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      settings = { ...settings, ...parsed };
      applySettingsToUI();
    } catch (e) {
      console.error('Erreur de chargement des paramètres:', e);
    }
  }
  
  // Si les identifiants sont sauvegardés, les afficher
  if (settings.saveCredentials) {
    els.email.value = settings.email;
    els.password.value = settings.password;
  }
}

function applySettingsToUI() {
  els.mode.value = settings.mode;
  els.activeHoursJSON.value = JSON.stringify(settings.activeHours, null, 2);
  els.nightStart.value = settings.nightPause.startHour;
  els.nightEnd.value = settings.nightPause.endHour;
  els.frequencyNormal.value = settings.frequencyNormal;
  els.frequencyFast.value = settings.frequencyFast;
  els.durationFastMode.value = settings.durationFastMode;
  els.batterySaver.checked = settings.batterySaver;
  els.disableRefresh.checked = settings.disableRefresh;
  toggleScheduleFields();
}

function toggleScheduleFields() {
  const mode = els.mode.value;
  els.activeHoursField.style.display = mode === 'activeHours' ? 'block' : 'none';
  els.nightPauseField.style.display = mode === 'nightPause' ? 'block' : 'none';
}

function bindUI() {
  els.mode.addEventListener('change', () => {
    settings.mode = els.mode.value;
    toggleScheduleFields();
  });
  
  els.testBtn.addEventListener('click', testConnection);
  els.saveBtn.addEventListener('click', saveSettings);
}

// === SAUVEGARDE DES PARAMÈTRES ===
function saveSettings() {
  try {
    // Récupérer les valeurs
    settings.email = els.email.value.trim();
    settings.password = els.password.value;
    settings.saveCredentials = els.saveCredentials.checked;
    settings.frequencyNormal = els.frequencyNormal.value;
    settings.frequencyFast = els.frequencyFast.value;
    settings.durationFastMode = els.durationFastMode.value;
    settings.batterySaver = els.batterySaver.checked;
    settings.disableRefresh = els.disableRefresh.checked;

    // Parser les plages horaires
    if (settings.mode === 'activeHours') {
      settings.activeHours = JSON.parse(els.activeHoursJSON.value);
      if (!Array.isArray(settings.activeHours)) {
        throw new Error('Les plages horaires doivent être un tableau');
      }
    } else {
      settings.activeHours = [];
    }
    
    // Pause nocturne
    settings.nightPause = { 
      startHour: els.nightStart.value, 
      endHour: els.nightEnd.value 
    };

    // Sauvegarder dans localStorage
    const toSave = { ...settings };
    if (!settings.saveCredentials) {
      toSave.email = ""; 
      toSave.password = "";
    }
    localStorage.setItem('orbixSettings', JSON.stringify(toSave));
    
    // Feedback visuel
    els.saveStatus.textContent = "✅ Paramètres enregistrés avec succès";
    els.saveStatus.className = "status success";
    
    // Redémarrer le cycle de rafraîchissement
    restartRefreshCycle();
    
    setTimeout(() => { 
      els.saveStatus.textContent = ""; 
    }, 4000);
    
  } catch (e) {
    els.saveStatus.textContent = `❌ Erreur: ${e.message}`;
    els.saveStatus.className = "status error";
    console.error('Erreur sauvegarde:', e);
  }
}

// === TEST DE CONNEXION ===
async function testConnection() {
  const email = els.email.value.trim();
  const password = els.password.value;
  
  if (!email || !password) {
    els.testStatus.textContent = "❌ Veuillez saisir email et mot de passe";
    els.testStatus.className = "status error";
    return;
  }
  
  els.testBtn.disabled = true;
  els.testStatus.textContent = "⏳ Test de connexion en cours...";
  els.testStatus.className = "status";
  
  try {
    const count = await fetchTutaUnreadCount(email, password);
    els.testStatus.textContent = `✅ Connexion réussie ! ${count} mail(s) non lu(s)`;
    els.testStatus.className = "status success";
    updateBadge(count);
  } catch (err) {
    els.testStatus.textContent = `❌ ${err.message}`;
    els.testStatus.className = "status error";
  } finally {
    els.testBtn.disabled = false;
  }
}

// === LOGIQUE DE RAFRAÎCHISSEMENT ===
function shouldCheckNow() {
  if (settings.disableRefresh) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  if (settings.mode === 'always') {
    return true;
  }
  
  if (settings.mode === 'nightPause') {
    const [startH, startM] = settings.nightPause.startHour.split(':').map(Number);
    const [endH, endM] = settings.nightPause.endHour.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    
    // Si la pause traverse minuit (ex: 22h-7h)
    if (startTotal > endTotal) {
      return currentTotalMinutes < endTotal || currentTotalMinutes >= startTotal;
    }
    // Pause normale (ex: 9h-17h)
    return currentTotalMinutes < startTotal || currentTotalMinutes >= endTotal;
  }
  
  if (settings.mode === 'activeHours') {
    return settings.activeHours.some(slot => {
      if (slot.day.toLowerCase() !== currentDay) return false;
      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      return currentTotalMinutes >= startTotal && currentTotalMinutes < endTotal;
    });
  }
  
  return true;
}

async function getIntervalMs() {
  let baseInterval;
  
  if (isFastMode) {
    baseInterval = TIME_CONSTANTS.timeFrequencyFast[settings.frequencyFast] * 1000;
  } else {
    baseInterval = TIME_CONSTANTS.timeFrequencyNormal[settings.frequencyNormal] * 1000;
  }
  
  // Mode économie de batterie
  if (settings.batterySaver && navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      if (battery.level < 0.2 && !battery.charging) {
        baseInterval *= TIME_CONSTANTS.timeBatterySaverMultiplier;
        console.log('🔋 Mode économie activé (batterie faible)');
      }
    } catch (e) {
      // Ignorer si l'API batterie n'est pas disponible
    }
  }
  
  return baseInterval;
}

async function startRefreshCycle() {
  if (settings.disableRefresh) {
    console.log('🚫 Rafraîchissement désactivé');
    return;
  }
  
  clearTimers();
  
  const runCheck = async () => {
    if (!shouldCheckNow()) {
      console.log('⏸️ En dehors des plages actives');
      scheduleNextCheck();
      return;
    }
    
    try {
      const newCount = await fetchTutaUnreadCount(settings.email, settings.password);
      
      if (newCount !== currentUnread) {
        console.log(`📬 Nouveau compteur: ${currentUnread} → ${newCount}`);
        lastUnread = currentUnread;
        currentUnread = newCount;
        updateBadge(currentUnread);
        
        // Si nouveau mail détecté
        if (currentUnread > lastUnread) {
          console.log('📨 Nouveau mail détecté ! Mode rapide activé');
          triggerFastMode();
          return;
        }
      }
      
      scheduleNextCheck();
      
      // Notification au service worker
      notifyServiceWorker('ping', { unread: currentUnread });
      
    } catch (e) {
      console.warn('⚠️ Échec de la vérification:', e.message);
      scheduleNextCheck();
    }
  };
  
  const scheduleNextCheck = async () => {
    if (settings.disableRefresh) return;
    const delay = await getIntervalMs();
    normalModeTimer = setTimeout(runCheck, delay);
  };
  
  // Premier lancement immédiat
  runCheck();
}

function clearTimers() {
  if (normalModeTimer) {
    clearTimeout(normalModeTimer);
    normalModeTimer = null;
  }
  if (fastModeTimer) {
    clearTimeout(fastModeTimer);
    fastModeTimer = null;
  }
}

function restartRefreshCycle() {
  clearTimers();
  startRefreshCycle();
}

function triggerFastMode() {
  if (isFastMode) {
    clearTimeout(fastModeTimer);
  }
  
  isFastMode = true;
  clearTimers();
  
  const runFast = async () => {
    if (!shouldCheckNow() || !isFastMode) return;
    
    try {
      const newCount = await fetchTutaUnreadCount(settings.email, settings.password);
      if (newCount !== currentUnread) {
        lastUnread = currentUnread;
        currentUnread = newCount;
        updateBadge(currentUnread);
      }
    } catch (e) {
      console.warn('Mode rapide - erreur:', e);
    }
    
    if (!settings.disableRefresh && isFastMode) {
      const interval = TIME_CONSTANTS.timeFrequencyFast[settings.frequencyFast] * 1000;
      normalModeTimer = setTimeout(runFast, interval);
    }
  };
  
  runFast();
  
  // Retour au mode normal après la durée configurée
  const duration = TIME_CONSTANTS.timeDurationFastMode[settings.durationFastMode] * 1000;
  fastModeTimer = setTimeout(() => {
    console.log('⏱️ Fin du mode rapide');
    isFastMode = false;
    clearTimers();
    startRefreshCycle();
  }, duration);
}

// === GESTION DU BADGE ===
function updateBadge(count) {
  // Badge natif (App Badging API)
  if ('setAppBadge' in navigator) {
    if (count === 0) {
      navigator.clearAppBadge().catch(console.warn);
    } else {
      // Limiter à 9+ pour l'affichage
      const badgeCount = count > 9 ? undefined : count;
      navigator.setAppBadge(badgeCount).catch(console.warn);
    }
  }
  
  // Badge dans le titre (fallback)
  if (count > 0) {
    document.title = `(${count}) Orbix`;
  } else {
    document.title = 'Orbix - Paramètres';
  }
}

const BACKEND_URL = 'https://orbix-tuta-proxy.onrender.com';

async function fetchTutaUnreadCount(email, password) {
  if (!email || !password) {
    throw new Error('Identifiants manquants');
  }

  const response = await fetch(`${BACKEND_URL}/api/unread`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000) // 10s timeout
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || `Erreur serveur (${response.status})`);
  }

  const data = await response.json();
  console.log(`📬 Backend: ${data.unread} mails (cache: ${data.fromCache})`);
  return data.unread;
}

// === SERVICE WORKER ===
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Écouter les mises à jour
        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nouvelle version disponible, rechargement...');
              window.location.reload();
            }
          });
        });
        
        // Messages du SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'badge_update') {
            updateBadge(event.data.count);
          }
        });
      })
      .catch(error => {
        console.error('❌ Échec de l\'enregistrement du SW:', error);
      });
  }
}

function notifyServiceWorker(type, payload) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type, ...payload });
  }
}

// === DEMARRAGE ===
document.addEventListener('DOMContentLoaded', init);

// Gestion du beforeinstallprompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('💾 Application installable détectée');
});