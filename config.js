// config.js - Configuration globale d'Orbix
const ORBIX_CONFIG = {
  // === VERSION ===
  version: "0.1.0",  // ← Modifier ici pour mettre à jour la version
  
  // === APP ===
  appName: "Orbix",
  description: "Badge de mails non lus pour Tuta",
  
  // === API & REQUÊTES ===
  maxRequestsPerHour: 60,
  apiTimeout: 10000, // 10 secondes
  
  // === TEMPS (en secondes) ===
  timeFrequencyNormal: { "1min": 60, "5min": 300, "10min": 600, "30min": 1800, default: "5min" },
  timeFrequencyFast:   { "15s": 15, "30s": 30, "45s": 45, "1min": 60, default: "30s" },
  timeDurationFastMode:{ "1min": 60, "3min": 180, "5min": 300, "10min": 600, default: "5min" },
  timeBatterySaverMultiplier: 2,
  
  // === BADGE ===
  badgeMaxValue: 9,
  badgeOverflowText: "9+",
  
  // === STOCKAGE ===
  storageKey: "orbixSettings",
  
  // === UI ===
  themeColor: "#5E0F2F",
  defaultLang: "fr-FR"
};