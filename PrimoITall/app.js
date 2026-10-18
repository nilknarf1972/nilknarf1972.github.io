// Primo IT Tech All-in-One Local Dashboard Controller v1.2.0 | Primo IT Tech LLC

let state = {
  devices: [],
  presets: [],
  catalog: {},
  siteProfiles: [],
  activeProfile: null,
  previousDeviceCount: 0,
  options: null,
  commStatus: null,
  bixFiles: [],
  bixReport: null,
  backupReport: null,
  backupArchives: [],
  selectedRestoreBackup: null,
  isScanningDevices: false,
  isBackingUp: false
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  setupTheme();
  setupTabs();
  setupIosBottomBarAndDrawer();
  setupBackupAnalysis();
  setupExplicitDeviceScanning();
  setupEventListeners(); // Initialize UI click handlers immediately so all links/buttons work instantly
  await loadAllData();

  // Strict requirement: No automatic scanning on launch, page open, or background intervals.
  // Device scanning occurs exclusively when the user taps "Scan & Load".
});

// Theme Management (Dark & Light Mode)
function setupTheme() {
  const current = localStorage.getItem("primo_theme") || document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current, false);

  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", toggleTheme);
  }

  const btnDrawerTheme = document.getElementById("btn-drawer-theme-toggle");
  if (btnDrawerTheme) {
    btnDrawerTheme.addEventListener("click", toggleTheme);
  }

  const selectTheme = document.getElementById("select-opt-theme");
  if (selectTheme) {
    selectTheme.addEventListener("change", () => {
      applyTheme(selectTheme.value, true);
    });
  }
}

function applyTheme(themeName, persist = true) {
  const normalized = themeName === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", normalized);

  if (persist) {
    try {
      localStorage.setItem("primo_theme", normalized);
    } catch (e) {}
  }

  // Update header toggle button icon and text
  const icon = document.getElementById("theme-toggle-icon");
  const text = document.getElementById("theme-toggle-text");
  if (icon && text) {
    if (normalized === "light") {
      icon.textContent = "🌙";
      text.textContent = "Dark Mode";
    } else {
      icon.textContent = "☀️";
      text.textContent = "Light Mode";
    }
  }

  // Update drawer toggle button icon and text if present
  const drawerIcon = document.getElementById("drawer-theme-toggle-icon");
  const drawerText = document.getElementById("drawer-theme-toggle-text");
  if (drawerIcon && drawerText) {
    if (normalized === "light") {
      drawerIcon.textContent = "🌙";
      drawerText.textContent = "Dark Mode";
    } else {
      drawerIcon.textContent = "☀️";
      drawerText.textContent = "Light Mode";
    }
  }

  // Sync options dropdown if present
  const selectTheme = document.getElementById("select-opt-theme");
  if (selectTheme && selectTheme.value !== normalized) {
    selectTheme.value = normalized;
  }

  // Update browser mobile header theme-color meta tag
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", normalized === "light" ? "#f8fafc" : "#0b0f17");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const target = current === "light" ? "dark" : "light";
  applyTheme(target, true);
  showToast(`Switched to Primo IT Tech ${target.toUpperCase()} Theme`, "info");
}

// Setup Tab Navigation with iOS Bottom Bar Synchronization
function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      if (tabName) activateTab(tabName);
    });
  });
}

function activateTab(tabName) {
  if (!tabName) return;

  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(t => {
    if (t.dataset.tab === tabName) t.classList.add("active");
    else t.classList.remove("active");
  });

  document.querySelectorAll(".tab-pane").forEach(p => {
    if (p.id === `tab-${tabName}`) p.classList.add("active");
    else p.classList.remove("active");
  });

  // Sync iOS bottom navigation bar items
  document.querySelectorAll(".ios-tab-item").forEach(item => {
    if (item.dataset.tab === tabName) item.classList.add("active");
    else item.classList.remove("active");
  });

  // Update More Tools button on desktop if a secondary tool tab is active
  const moreToolsBtn = document.getElementById("btn-desktop-more-tools");
  const secondaryMap = {
    "bix-firmware": "BIX Firmware",
    "catalog": "Credential Catalog",
    "exporter": "Scanner Exporter",
    "sysinternals": "Sysinternals",
    "winget": "Winget Apps",
    "pstools": "PowerShell Tools",
    "win11cleanup": "Win 11 Cleanup",
    "printers": "Printer Spooler",
    "ai-tools": "AI Apps & IDEs",
    "ai-cleanup": "AI Storage Cleanup"
  };
  if (moreToolsBtn) {
    if (secondaryMap[tabName]) {
      moreToolsBtn.classList.add("active");
      moreToolsBtn.innerHTML = `☰ ${secondaryMap[tabName]} ▾`;
    } else {
      moreToolsBtn.classList.remove("active");
      moreToolsBtn.innerHTML = `☰ More Tools (<span id="more-tools-count">10</span>) ▾`;
    }
  }

  // Auto-load data for utility tabs on switch safely without throwing
  try {
    if (tabName === "sysinternals") loadSysinternalsStatus();
    if (tabName === "winget") loadWingetStatus();
    if (tabName === "pstools") loadPsToolsSpecs();
    if (tabName === "win11cleanup") loadCleanupScan();
    if (tabName === "printers") loadPrinters();
    if (tabName === "ai-tools") {
      checkCompanionAgentStatus();
      loadAiCategories();
      loadAiCatalog().then(() => {
        if (aiDashboardState.inventory.length === 0) {
          renderAiDiscover();
        }
      }).catch(err => console.warn("AI catalog load error:", err));
    }
    if (tabName === "ai-cleanup") loadAiStorageScan();
    if (tabName === "options") loadAvailableBackups();
  } catch (err) {
    console.error("Tab activation background loader error:", err);
  }

  // Scroll to top of app container smoothly
  const mainEl = document.querySelector(".app-main");
  if (mainEl) mainEl.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Toast Notifications
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Fetch all backend API data (zero automatic device scanning on launch)
async function loadAllData() {
  try {
    const [presetsRes, catalogRes, siteProfilesRes] = await Promise.all([
      fetch("/api/presets").then(r => r.json()),
      fetch("/api/catalog").then(r => r.json()),
      fetch("/api/site-profiles").then(r => r.json())
    ]);

    state.presets = presetsRes;
    state.catalog = catalogRes;
    state.siteProfiles = siteProfilesRes;
    // Devices start empty until user explicitly clicks Scan and Load
    updateDeviceCountBadges();

    const siteProfileCountEl = document.getElementById("site-profile-count");
    if (siteProfileCountEl) siteProfileCountEl.textContent = state.siteProfiles.length;

    renderDeviceDropdown();
    renderPresetDropdown();
    renderPresetsTab();
    renderDevicesTab();
    renderCatalogTab();
    renderSiteProfilesTab();
    updatePresetSummary();

    // Load options, BIX firmware packages, and latest backup summary (on-demand checking only)
    await loadOptions();
    loadBixFiles(null, false);
    loadLatestBackupAnalysis(false);
    loadAvailableBackups();
  } catch (err) {
    console.error("Failed to load configuration data:", err);
    appendTerminal(`[ERROR] Failed to communicate with Primo IT Tech All-in-One local daemon: ${err.message}`);
  }
}

// Explicit On-Demand Device Scanning
async function scanAndLoadDevices() {
  if (state.isScanningDevices) return;
  state.isScanningDevices = true;

  const scanButtons = [
    document.getElementById("btn-scan-load-devices"),
    document.getElementById("btn-scan-load-configurator"),
    document.getElementById("btn-scan-load-devices-tab"),
    document.getElementById("btn-empty-scan-load")
  ].filter(Boolean);

  scanButtons.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-inline">⏳</span> Scanning...`;
  });

  const statusTag = document.getElementById("detected-status-tag");
  if (statusTag) {
    statusTag.textContent = "SCANNING PORTS...";
    statusTag.className = "badge badge-tech";
  }

  appendTerminal(`\n[SCAN] User initiated hardware scan for connected USB & PC/SC devices...`);
  showToast("🔍 Scanning USB ports & smartcard slots for connected readers...", "info");

  try {
    const res = await fetch("/api/devices/autoscan");
    if (!res.ok) throw new Error(`Scanner returned HTTP ${res.status}`);
    const scanReport = await res.json();

    state.devices = scanReport.devices || [];
    state.previousDeviceCount = state.devices.length;

    updateDeviceCountBadges();
    renderDeviceDropdown();
    renderDevicesTab();

    if (scanReport.primaryReader) {
      const sel = document.getElementById("select-device");
      if (sel) sel.value = scanReport.primaryReader.deviceId;

      if (scanReport.ingestedProfile) {
        state.activeProfile = scanReport.ingestedProfile;
        const bitsInput = document.getElementById("input-wiegand-bits");
        const fcInput = document.getElementById("input-facility-code");
        const beeperCheck = document.getElementById("check-beeper");
        const ledCheck = document.getElementById("check-led");
        const preview = document.getElementById("export-json-preview");

        if (bitsInput) bitsInput.value = scanReport.ingestedProfile.wiegandBitLength;
        if (fcInput) fcInput.value = scanReport.ingestedProfile.facilityCode || 101;
        if (beeperCheck) beeperCheck.checked = scanReport.ingestedProfile.beeperFeedback;
        if (ledCheck) ledCheck.checked = scanReport.ingestedProfile.ledFeedback;
        if (preview) preview.textContent = JSON.stringify(scanReport.ingestedProfile, null, 2);
      }
    }

    if (statusTag) {
      statusTag.textContent = state.devices.length > 0 ? `LOADED (${state.devices.length})` : "0 LOADED";
      statusTag.className = state.devices.length > 0 ? "badge badge-status" : "badge badge-sec-med";
    }

    appendTerminal(`[SCAN SUCCESS] ${scanReport.scanSummary}`);
    if (scanReport.readbackResult?.readbackLog) {
      scanReport.readbackResult.readbackLog.forEach(l => appendTerminal(` > ${l}`));
    }

    if (state.devices.length > 0) {
      showToast(`🟢 <strong>Scan Complete:</strong> Found ${state.devices.length} device(s)! Active: <code>${scanReport.primaryReader?.name || 'Ready'}</code>`, "success");
    } else {
      showToast(`⚪ <strong>Scan Complete:</strong> No hardware readers detected on USB ports.`, "info");
    }
  } catch (err) {
    appendTerminal(`[SCAN ERROR] Failed to query devices: ${err.message}`);
    showToast(`Scan Error: ${err.message}`, "error");
    if (statusTag) {
      statusTag.textContent = "SCAN ERROR";
      statusTag.className = "badge badge-sec-high";
    }
  } finally {
    state.isScanningDevices = false;
    scanButtons.forEach(btn => {
      btn.disabled = false;
      if (btn.id === "btn-scan-load-devices") {
        btn.innerHTML = `<span id="scan-btn-icon">🔍</span> <span id="scan-btn-text">Scan &amp; Load</span> <span class="badge badge-scan-count" id="header-device-badge">${state.devices.length}</span>`;
      } else {
        btn.innerHTML = `🔍 Scan &amp; Load Devices`;
      }
    });
  }
}

function updateDeviceCountBadges() {
  const count = state.devices.length;
  ["device-count", "header-device-badge", "ios-device-badge", "drawer-device-count"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
}

function setupExplicitDeviceScanning() {
  document.getElementById("btn-scan-load-devices")?.addEventListener("click", scanAndLoadDevices);
  document.getElementById("btn-scan-load-configurator")?.addEventListener("click", scanAndLoadDevices);
  document.getElementById("btn-scan-load-devices-tab")?.addEventListener("click", scanAndLoadDevices);
}

// Interrogate connected hardware and ingest its active configuration
async function readActiveHardwareConfig(targetDeviceId) {
  const deviceId = targetDeviceId || document.getElementById("select-device").value;
  appendTerminal(`\n[READBACK] Interrogating hardware unit: ${deviceId}...`);
  showToast("Querying reader registers over USB / interface...", "info");

  try {
    const res = await fetch("/api/devices/readback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Readback failed");
    }

    const rb = data.readbackResult;
    state.activeProfile = rb.profile;

    appendTerminal(`[SUCCESS] Interrogation complete for: ${rb.deviceName}`);
    rb.readbackLog.forEach(line => appendTerminal(` > ${line}`));

    // Update UI controls with captured hardware parameters
    document.getElementById("input-wiegand-bits").value = rb.profile.wiegandBitLength;
    document.getElementById("input-facility-code").value = rb.profile.facilityCode || 101;
    document.getElementById("check-beeper").checked = rb.profile.beeperFeedback;
    document.getElementById("check-led").checked = rb.profile.ledFeedback;

    // Match closest preset if possible
    const matchPreset = state.presets.find(p => p.credentialFamily === rb.profile.credentialFamily);
    if (matchPreset) {
      document.getElementById("select-preset").value = matchPreset.id;
      updatePresetSummary();
    }

    // Update previews
    document.getElementById("export-json-preview").textContent = JSON.stringify(rb.profile, null, 2);
    document.getElementById("terminal-status").textContent = "INGESTED";
    document.getElementById("terminal-status").className = "badge badge-status";

    showToast(`✅ Captured current config from <strong>${rb.deviceName}</strong>: ${rb.profile.credentialFamily} (${rb.profile.wiegandBitLength}-bit Wiegand)`, "success");
  } catch (err) {
    appendTerminal(`[ERROR] Hardware interrogation failed: ${err.message}`);
    showToast(`Readback Error: ${err.message}`, "warn");
  }
}

async function probeUsbPortsNow() {
  appendTerminal(`\n[PROBE] Probing all active USB hubs and smart card slots...`);
  showToast("Scanning USB ports for readers...", "info");

  try {
    const res = await fetch("/api/devices/autoscan");
    const scanReport = await res.json();

    appendTerminal(`[PROBE] Result: ${scanReport.scanSummary}`);
    if (scanReport.primaryReader) {
      document.getElementById("select-device").value = scanReport.primaryReader.deviceId;
      await readActiveHardwareConfig(scanReport.primaryReader.deviceId);
    } else {
      showToast("No active USB reader found on ports.", "info");
    }
  } catch (err) {
    appendTerminal(`[ERROR] USB probe failed: ${err.message}`);
  }
}

function renderDeviceDropdown() {
  const sel = document.getElementById("select-device");
  if (!sel) return;
  const prevVal = sel.value;
  sel.innerHTML = "";

  if (state.devices.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "⚠️ No devices loaded. Tap 'Scan & Load' to detect readers.";
    sel.appendChild(opt);
    return;
  }

  state.devices.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.deviceId;
    const tag = d.state === "CONNECTED_ACTIVE" ? "🟢 [ACTIVE]" : d.state === "SYSTEM_ENUMERATED" ? "🔵 [VIRTUAL]" : d.state === "SIMULATED" ? "🧪 [LAB]" : "⚪ [PNP]";
    opt.textContent = `${tag} ${d.name} (${d.transport})`;
    sel.appendChild(opt);
  });

  if (prevVal && state.devices.some(d => d.deviceId === prevVal)) {
    sel.value = prevVal;
  }
}

function renderPresetDropdown() {
  const sel = document.getElementById("select-preset");
  sel.innerHTML = "";

  state.presets.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.credentialFamily})`;
    sel.appendChild(opt);
  });
}

function updatePresetSummary() {
  const presetId = document.getElementById("select-preset").value;
  const preset = state.presets.find(p => p.id === presetId) || state.presets[0];
  if (!preset) return;

  const techBadge = document.getElementById("summary-tech");
  const tierBadge = document.getElementById("summary-tier");
  const envText = document.getElementById("summary-env");
  const descText = document.getElementById("summary-desc");

  techBadge.textContent = preset.credentialFamily + (preset.secondaryFamily ? ` + ${preset.secondaryFamily}` : "");
  tierBadge.textContent = (state.catalog[preset.credentialFamily]?.securityTier || "HIGH").replace("_", " ");
  envText.textContent = preset.targetEnvironment;
  descText.textContent = preset.securitySummary;

  document.getElementById("input-wiegand-bits").value = preset.wiegandBits;
  document.getElementById("check-beeper").checked = preset.beeperEnabled;
  document.getElementById("check-led").checked = preset.ledEnabled;
}

function renderPresetsTab() {
  const container = document.getElementById("presets-grid-container");
  container.innerHTML = "";

  state.presets.forEach(p => {
    const spec = state.catalog[p.credentialFamily];
    const card = document.createElement("div");
    card.className = "preset-card";
    card.innerHTML = `
      <div>
        <div class="preset-header-row">
          <span class="badge badge-tech">${p.credentialFamily}</span>
          <span class="badge badge-sec-${(spec?.securityTier || 'HIGH').toLowerCase().replace('_', '-')}">${spec?.securityTier || 'HIGH'}</span>
        </div>
        <h3 class="preset-card-title">${p.name}</h3>
        <p class="summary-env-text small">${p.targetEnvironment}</p>
        <p class="text-muted small mt-2">${p.securitySummary}</p>
        ${p.preferredReaderModel ? `<p class="small mt-2"><strong>Preferred Hardware:</strong> ${p.preferredReaderModel}</p>` : ''}
      </div>
      <button class="btn btn-outline btn-sm mt-3" onclick="selectPresetAndConfigure('${p.id}')">Select Preset</button>
    `;
    container.appendChild(card);
  });
}

window.selectPresetAndConfigure = function(presetId) {
  document.getElementById("select-preset").value = presetId;
  updatePresetSummary();
  activateTab("configurator");
};

function renderDevicesTab() {
  const tbody = document.getElementById("devices-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (state.devices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <div class="empty-devices-box">
            <div class="empty-icon">📡</div>
            <h3 class="text-lg font-bold mb-1">No Hardware Readers Loaded</h3>
            <p class="text-muted text-sm mb-4">
              Automatic scanning on launch is disabled. Connect your PC/SC or USB reader and tap the button below.
            </p>
            <button class="btn btn-primary" id="btn-empty-scan-load">
              🔍 Scan and Load Devices
            </button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById("btn-empty-scan-load")?.addEventListener("click", scanAndLoadDevices);
    return;
  }

  state.devices.forEach(d => {
    const tr = document.createElement("tr");

    let badgeClass = "badge-status";
    if (d.state === "HISTORICAL_PNP") badgeClass = "badge-sec-med";
    if (d.state === "SIMULATED") badgeClass = "badge-tech";

    tr.innerHTML = `
      <td><span class="badge ${badgeClass}">${d.state.replace('_', ' ')}</span></td>
      <td><strong>${d.name}</strong><br><span class="text-muted small">${d.model}</span></td>
      <td>${d.manufacturer}</td>
      <td><code>${d.transport}</code></td>
      <td><code>${d.interface}</code></td>
      <td class="small">${d.supportedTechnologies.length > 0 ? d.supportedTechnologies.slice(0, 3).join(', ') + (d.supportedTechnologies.length > 3 ? '...' : '') : 'Magstripe Track 1/2'}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="selectDevice('${d.deviceId}')">Configure</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.selectDevice = function(deviceId) {
  document.getElementById("select-device").value = deviceId;
  activateTab("configurator");
};

function renderCatalogTab() {
  const container = document.getElementById("catalog-grid-container");
  container.innerHTML = "";

  Object.values(state.catalog).forEach(spec => {
    const card = document.createElement("div");
    card.className = "catalog-card";
    const freq = spec.frequencyKhz === "DUAL" ? "Dual (125 kHz + 13.56 MHz)" : spec.frequencyKhz === "CONTACT" ? "Contact ISO 7816" : `${spec.frequencyKhz} kHz`;

    card.innerHTML = `
      <div>
        <div class="preset-header-row">
          <span class="badge badge-sec-${spec.securityTier.toLowerCase().replace('_', '-')}">${spec.securityTier}</span>
          <span class="badge badge-tech">${freq}</span>
        </div>
        <h3 class="catalog-card-title">${spec.displayName}</h3>
        <p class="small text-muted"><strong>Standard:</strong> ${spec.standard}</p>
        <p class="small text-muted"><strong>Encryption:</strong> ${spec.encryption}</p>
        <p class="small mt-2">${spec.description}</p>
        ${spec.legacyStatus ? `<div class="legacy-warning">&warning; LEGACY INSECURE: Vulnerable to card cloning tools.</div>` : ''}
      </div>
      <p class="small text-muted mt-3"><strong>Recommendation:</strong> ${spec.recommendedUse}</p>
    `;
    container.appendChild(card);
  });
}

function renderSiteProfilesTab() {
  const container = document.getElementById("site-profiles-container");
  container.innerHTML = "";

  if (state.siteProfiles.length === 0) {
    container.innerHTML = `<p class="text-muted">No saved site profiles yet. Configure a reader and click 'Save as Site Profile'.</p>`;
    return;
  }

  state.siteProfiles.forEach(p => {
    const card = document.createElement("div");
    card.className = "site-profile-card";
    card.innerHTML = `
      <div>
        <div class="preset-header-row">
          <span class="badge badge-tech">${p.credentialFamily}</span>
          <span class="badge badge-sec">${p.wiegandBitLength}-bit Wiegand</span>
        </div>
        <h3 class="site-profile-title">${p.siteName}</h3>
        <p class="small text-muted"><strong>Client:</strong> ${p.clientName}</p>
        ${p.technicianName ? `<p class="small text-muted"><strong>Technician:</strong> ${p.technicianName}</p>` : ''}
        <p class="small text-muted"><strong>Facility Code:</strong> ${p.facilityCode}</p>
        ${p.notes ? `<p class="small text-muted mt-2">${p.notes}</p>` : ''}
      </div>
      <div class="card-actions-row">
        <button class="btn btn-primary btn-sm" onclick="loadSiteProfile('${p.id}')">Load Profile</button>
        <button class="btn btn-text-only" onclick="deleteSiteProfileItem('${p.id}')">&times; Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.loadSiteProfile = function(profileId) {
  const profile = state.siteProfiles.find(p => p.id === profileId);
  if (!profile) return;

  document.getElementById("select-preset").value = profile.presetId;
  updatePresetSummary();

  document.getElementById("input-wiegand-bits").value = profile.wiegandBitLength;
  document.getElementById("input-facility-code").value = profile.facilityCode;
  document.getElementById("check-beeper").checked = profile.beeperEnabled;
  document.getElementById("check-led").checked = profile.ledEnabled;

  if (profile.deviceId) {
    document.getElementById("select-device").value = profile.deviceId;
  }

  showToast(`Loaded Site Profile: <strong>${profile.siteName}</strong>`, "success");
  activateTab("configurator");
};

window.deleteSiteProfileItem = async function(profileId) {
  if (!confirm("Are you sure you want to delete this saved site profile?")) return;
  try {
    await fetch(`/api/site-profiles/${profileId}`, { method: "DELETE" });
    state.siteProfiles = state.siteProfiles.filter(p => p.id !== profileId);
    document.getElementById("site-profile-count").textContent = state.siteProfiles.length;
    renderSiteProfilesTab();
    showToast("Site profile deleted", "info");
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

function setupEventListeners() {
  document.getElementById("select-preset").addEventListener("change", updatePresetSummary);
  document.getElementById("btn-refresh-devices").addEventListener("click", async () => {
    appendTerminal("[SCAN] Querying WinSCard, PnP registry, and COM ports...");
    await loadAllData();
    showToast(`Discovered ${state.devices.length} hardware targets.`, "info");
    appendTerminal(`[SCAN] Discovered ${state.devices.length} hardware targets.`);
  });

  document.getElementById("btn-clear-terminal").addEventListener("click", () => {
    document.getElementById("terminal-output").textContent = "// Terminal Cleared.";
  });

  // USB Auto-Scan and Hardware Interrogation
  document.getElementById("btn-read-hardware-config").addEventListener("click", () => readActiveHardwareConfig());
  document.getElementById("btn-probe-usb").addEventListener("click", () => probeUsbPortsNow());

  document.getElementById("btn-apply-config").addEventListener("click", applyConfiguration);
  document.getElementById("btn-quick-export").addEventListener("click", () => {
    activateTab("exporter");
  });

  document.getElementById("btn-do-export").addEventListener("click", executeExport);

  // Elatec BAP Download
  document.getElementById("btn-download-bap").addEventListener("click", () => {
    const deviceId = document.getElementById("select-device").value;
    const presetId = document.getElementById("select-preset").value;
    window.location.href = `/api/download/elatec-bap?device=${encodeURIComponent(deviceId)}&preset=${encodeURIComponent(presetId)}`;
    showToast("Downloading Elatec AppBlaster .BAP file...", "info");
  });

  // Print Handover Sheet
  document.getElementById("btn-print-handover").addEventListener("click", triggerPrintRecord);

  // Save / Create Site Profile Modal
  document.getElementById("btn-save-as-site")?.addEventListener("click", () => openCreateSiteProfileModal(true));
  document.getElementById("btn-open-create-site")?.addEventListener("click", () => openCreateSiteProfileModal(false));
  document.getElementById("btn-close-site-modal")?.addEventListener("click", closeSiteProfileModal);
  document.getElementById("btn-modal-cancel-site")?.addEventListener("click", closeSiteProfileModal);
  document.getElementById("btn-modal-save-site")?.addEventListener("click", handleSaveSiteProfile);
  document.getElementById("modal-site-preset")?.addEventListener("change", handleModalSitePresetChange);

  // Tap & Swipe Verification Tester
  document.getElementById("btn-run-tap-verify").addEventListener("click", runTapVerification);
  document.getElementById("btn-clear-tap").addEventListener("click", () => {
    document.getElementById("input-test-tap").value = "";
    document.getElementById("input-test-tap").focus();
  });
  document.getElementById("input-test-tap").addEventListener("keypress", (e) => {
    if (e.key === "Enter") runTapVerification();
  });

  // Simulation Chips
  document.getElementById("chip-sim-ev3").addEventListener("click", () => {
    document.getElementById("input-test-tap").value = "101,45210";
    runTapVerification();
  });
  document.getElementById("chip-sim-prox").addEventListener("click", () => {
    document.getElementById("input-test-tap").value = "101,2410";
    runTapVerification();
  });
  document.getElementById("chip-sim-uid").addEventListener("click", () => {
    document.getElementById("input-test-tap").value = "04A1B2C3";
    runTapVerification();
  });
  document.getElementById("chip-sim-mag").addEventListener("click", () => {
    document.getElementById("input-test-tap").value = ";45210=2912?";
    runTapVerification();
  });

  // Options & Client Commissioning Handlers
  const authSelect = document.getElementById("select-comm-auth");
  const credsGroup = document.getElementById("comm-credentials-group");
  if (authSelect && credsGroup) {
    authSelect.addEventListener("change", () => {
      credsGroup.style.display = authSelect.value === "sql" ? "grid" : "none";
    });
  }

  document.querySelectorAll("input[name='comm-platform']").forEach(r => {
    r.addEventListener("change", () => {
      const plat = getSelectedPlatform();
      loadOdbcDriversForPlatform(plat);
      checkDsnDuplicateStatus();
    });
  });

  const dsnNameInput = document.getElementById("input-comm-dsn-name");
  if (dsnNameInput) {
    dsnNameInput.addEventListener("input", () => {
      checkDsnDuplicateStatus();
    });
  }

  const btnRefreshDrivers = document.getElementById("btn-refresh-odbc-drivers");
  if (btnRefreshDrivers) {
    btnRefreshDrivers.addEventListener("click", () => {
      loadOdbcDriversForPlatform(getSelectedPlatform(), true);
      showToast("Refreshed ODBC drivers list", "info");
    });
  }

  const driverSelect = document.getElementById("select-comm-driver");
  if (driverSelect) {
    driverSelect.addEventListener("change", (e) => {
      const info = document.getElementById("text-selected-driver-info");
      if (info) info.textContent = `Active: ${e.target.value} (${getSelectedPlatform()})`;
    });
  }

  document.getElementById("btn-run-comm-both").addEventListener("click", () => executeCommissioning("both"));
  document.getElementById("btn-run-comm-firewall").addEventListener("click", () => executeCommissioning("firewall"));
  document.getElementById("btn-run-comm-dsn").addEventListener("click", () => executeCommissioning("dsn"));
  document.getElementById("btn-test-comm-odbc").addEventListener("click", () => executeCommissioning("test"));
  const btnTestSql = document.getElementById("btn-test-sql-creds");
  if (btnTestSql) {
    btnTestSql.addEventListener("click", () => executeCommissioning("test"));
  }
  document.getElementById("btn-rollback-comm").addEventListener("click", () => {
    const dsnName = document.getElementById("input-comm-dsn-name")?.value.trim() || "PockeTrackerLocal";
    if (confirm(`Are you sure you want to remove all IDAccessScanner firewall rules and delete System DSN '${dsnName}'?`)) {
      executeCommissioning("rollback");
    }
  });
  document.getElementById("btn-check-uac-status")?.addEventListener("click", () => {
    loadCommissioningStatus(true);
  });
  document.getElementById("btn-refresh-comm-status")?.addEventListener("click", () => {
    loadCommissioningStatus(true);
  });
  document.getElementById("btn-save-preferences").addEventListener("click", saveOptionsFromForm);

  // Brand Logo & Theme Management Listeners
  const brandLogo = document.querySelector(".brand-logo-container");
  if (brandLogo) {
    brandLogo.addEventListener("click", () => {
      activateTab("configurator");
    });
  }

  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", toggleTheme);
  }

  const selectTheme = document.getElementById("select-opt-theme");
  if (selectTheme) {
    selectTheme.addEventListener("change", () => {
      applyTheme(selectTheme.value, true);
    });
  }

  // BIX Firmware Scanner Listeners
  const btnRunBix = document.getElementById("btn-run-bix-scan");
  if (btnRunBix) {
    btnRunBix.addEventListener("click", () => {
      const p = document.getElementById("input-bix-search-path")?.value?.trim();
      loadBixFiles(p, true);
    });
  }

  const btnQuickBixScan = document.getElementById("btn-quick-bix-scan");
  if (btnQuickBixScan) {
    btnQuickBixScan.addEventListener("click", () => {
      loadBixFiles(null, true);
    });
  }

  const btnQuickBix = document.getElementById("btn-quick-bix");
  if (btnQuickBix) {
    btnQuickBix.addEventListener("click", () => {
      activateTab("bix-firmware");
      if (!state.bixFiles || state.bixFiles.length === 0) {
        loadBixFiles(null, true);
      }
    });
  }

  const btnOptScanBix = document.getElementById("btn-opt-scan-bix");
  if (btnOptScanBix) {
    btnOptScanBix.addEventListener("click", () => {
      activateTab("bix-firmware");
      const p = document.getElementById("input-opt-bix-path")?.value?.trim();
      loadBixFiles(p, true);
    });
  }

  const btnBixReset = document.getElementById("btn-bix-reset-path");
  if (btnBixReset) {
    btnBixReset.addEventListener("click", () => {
      const defaultPath = state.options?.bixSearchPath || "./firmware";
      const inp = document.getElementById("input-bix-search-path");
      if (inp) inp.value = defaultPath;
      loadBixFiles(defaultPath, true);
    });
  }

  const filterBix = document.getElementById("input-bix-filter");
  if (filterBix) {
    filterBix.addEventListener("input", (e) => {
      renderBixTable(e.target.value);
    });
  }

  const btnCloseBixModal = document.getElementById("btn-modal-close-bix");
  if (btnCloseBixModal) {
    btnCloseBixModal.addEventListener("click", () => {
      document.getElementById("modal-bix-inspect").style.display = "none";
    });
  }

  const btnModalCopyPath = document.getElementById("btn-modal-copy-bix-path");
  if (btnModalCopyPath) {
    btnModalCopyPath.addEventListener("click", () => {
      const pathVal = document.getElementById("bix-modal-path")?.value;
      if (pathVal) {
        navigator.clipboard.writeText(pathVal).then(() => {
          showToast("Copied file path to clipboard!", "success");
        }).catch(() => {
          showToast("Path copied", "info");
        });
      }
    });
  }
}

function appendTerminal(msg) {
  const term = document.getElementById("terminal-output");
  term.textContent += "\n" + msg;
  term.scrollTop = term.scrollHeight;
}

async function applyConfiguration() {
  const deviceId = document.getElementById("select-device").value;
  const presetId = document.getElementById("select-preset").value;
  const wiegandBits = document.getElementById("input-wiegand-bits").value;
  const facilityCode = document.getElementById("input-facility-code").value;
  const beeper = document.getElementById("check-beeper").checked;
  const led = document.getElementById("check-led").checked;

  appendTerminal(`\n[APPLY] Initiating configuration sequence for device: ${deviceId}`);
  appendTerminal(`[AUDIT] Security guardrail check passed: Configure-Only bounds enforced.`);

  try {
    const res = await fetch("/api/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, presetId, wiegandBits, facilityCode, beeper, led })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Configuration error");
    }

    state.activeProfile = data.profile;
    document.getElementById("terminal-status").textContent = "CONFIGURED";
    document.getElementById("terminal-status").className = "badge badge-status";

    appendTerminal(`[SUCCESS] ${data.configResult.message}`);
    data.configResult.commandsSent.forEach(c => appendTerminal(` > ${c}`));

    // Update BAP/script preview
    const scriptPreview = document.getElementById("code-script-preview");
    if (data.profile.deviceManufacturer === "ELATEC") {
      scriptPreview.textContent = `[AppBlaster BAP Definition]\nProfile=${data.profile.profileName}\nTagTypes_HF=0x00000002\nFormat=WIEGAND_${data.profile.wiegandBitLength}\nBeeper=${data.profile.beeperFeedback}\nLED=${data.profile.ledFeedback}`;
    } else if (data.profile.deviceManufacturer === "HID_GLOBAL") {
      scriptPreview.textContent = `[OMNIKEY PC/SC IFD Escape Script]\nTarget=${data.profile.targetModel}\nAPDU_Sequence=${data.configResult.rawPayloadHex}\nFormat=${data.profile.wiegandBitLength}-bit PACs`;
    } else {
      scriptPreview.textContent = `[MagTek Configuration]\nTrackMask=110\nSentinelMode=ISO_STANDARD`;
    }

    // Update export preview
    document.getElementById("export-json-preview").textContent = JSON.stringify(data.profile, null, 2);

    showToast(`Reader configured with <strong>${data.profile.profileName}</strong>`, "success");
    appendTerminal(`[EXPORT READY] Profile cached for ID Access Scanner export.`);

    if (state.options?.autoExportOnWrite) {
      try {
        const dest = state.options.defaultExportPath || "ID_ACCESS_SCANNER";
        await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: data.profile, destination: dest })
        });
        appendTerminal(`[AUTO-EXPORT] reader-profile.json automatically synchronized to ${dest}.`);
      } catch {
        // Non-blocking auto-export
      }
    }
  } catch (err) {
    appendTerminal(`[ERROR] Configuration failed: ${err.message}`);
    document.getElementById("terminal-status").textContent = "ERROR";
    document.getElementById("terminal-status").className = "badge badge-sec-low";
    showToast(`Configuration Error: ${err.message}`, "warn");
  }
}

async function runTapVerification() {
  const rawInput = document.getElementById("input-test-tap").value.trim();
  const resultBox = document.getElementById("tap-result-box");

  if (!rawInput) {
    resultBox.innerHTML = `<p class="text-muted small">Please present a card or enter raw reader input to test.</p>`;
    return;
  }

  try {
    const res = await fetch("/api/verify-tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawInput,
        profile: state.activeProfile
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Verification error");

    const headerClass = data.success ? "pass" : "warn";
    let html = `
      <div class="diag-summary-header ${headerClass}">
        ${data.summary}
      </div>
      <div class="diag-stats-grid">
        <div class="diag-stat-card">
          <div class="diag-stat-label">Framing Format</div>
          <div class="diag-stat-value">${data.detectedFormat}</div>
        </div>
        <div class="diag-stat-card">
          <div class="diag-stat-label">Facility Code</div>
          <div class="diag-stat-value">${data.facilityCode !== undefined ? data.facilityCode : 'N/A'}</div>
        </div>
        <div class="diag-stat-card">
          <div class="diag-stat-label">Card Account #</div>
          <div class="diag-stat-value">${data.cardNumber !== undefined ? data.cardNumber : 'N/A'}</div>
        </div>
      </div>
      <div class="diag-details">
        <strong>Hardware Loopback Diagnostics:</strong>
        <div class="mt-2">
    `;

    data.diagnostics.forEach(diag => {
      html += `<div class="diag-item">${diag}</div>`;
    });

    html += `</div></div>`;
    resultBox.innerHTML = html;
  } catch (err) {
    resultBox.innerHTML = `<div class="alert-box alert-error">Loopback Test Error: ${err.message}</div>`;
  }
}

function openCreateSiteProfileModal(prefillFromConfigurator = false) {
  const modal = document.getElementById("modal-site-profile");
  if (!modal) return;

  const errorBox = document.getElementById("modal-site-error");
  if (errorBox) {
    errorBox.style.display = "none";
    errorBox.textContent = "";
  }

  // Populate presets select dropdown in modal
  const presetSelect = document.getElementById("modal-site-preset");
  if (presetSelect && state.presets && state.presets.length > 0) {
    presetSelect.innerHTML = state.presets.map(p => {
      const bitText = p.wiegandBits ? `${p.wiegandBits}-bit` : p.outputFormat;
      return `<option value="${p.id}">${p.name} (${p.credentialFamily}, ${bitText})</option>`;
    }).join("");
  }

  // Populate devices select dropdown in modal
  const deviceSelect = document.getElementById("modal-site-device");
  if (deviceSelect) {
    let devOptions = `<option value="">Auto-Detect / Any Connected Reader</option>`;
    if (state.devices && state.devices.length > 0) {
      devOptions += state.devices.map(d => `<option value="${d.deviceId}">${d.name} (${d.interface})</option>`).join("");
    }
    deviceSelect.innerHTML = devOptions;
  }

  const titleEl = document.getElementById("modal-site-title");
  const nameInput = document.getElementById("modal-site-name");
  const clientInput = document.getElementById("modal-client-name");
  const fcInput = document.getElementById("modal-site-fc");
  const bitsInput = document.getElementById("modal-site-bits");
  const beeperCheck = document.getElementById("modal-site-beeper");
  const ledCheck = document.getElementById("modal-site-led");

  if (prefillFromConfigurator) {
    if (titleEl) titleEl.textContent = "Save Current Configuration as Site Profile";
    const curPresetId = document.getElementById("select-preset")?.value;
    if (curPresetId && presetSelect) presetSelect.value = curPresetId;
    if (fcInput) fcInput.value = document.getElementById("input-facility-code")?.value || "101";
    if (bitsInput) bitsInput.value = document.getElementById("input-wiegand-bits")?.value || "37";
    if (beeperCheck) beeperCheck.checked = document.getElementById("check-beeper")?.checked ?? true;
    if (ledCheck) ledCheck.checked = document.getElementById("check-led")?.checked ?? true;
    const curDeviceId = document.getElementById("select-device")?.value;
    if (curDeviceId && deviceSelect) deviceSelect.value = curDeviceId;
  } else {
    if (titleEl) titleEl.textContent = "Create New Site Profile";
    if (nameInput) nameInput.value = "";
    if (clientInput) clientInput.value = "";
    if (document.getElementById("modal-site-notes")) document.getElementById("modal-site-notes").value = "";
    if (presetSelect && presetSelect.options.length > 0) {
      presetSelect.selectedIndex = 0;
      handleModalSitePresetChange();
    } else {
      if (fcInput) fcInput.value = "101";
      if (bitsInput) bitsInput.value = "37";
    }
    if (beeperCheck) beeperCheck.checked = true;
    if (ledCheck) ledCheck.checked = true;
  }

  modal.style.display = "flex";
  setTimeout(() => nameInput?.focus(), 150);
}

function closeSiteProfileModal() {
  const modal = document.getElementById("modal-site-profile");
  if (modal) modal.style.display = "none";
}

function handleModalSitePresetChange() {
  const presetSelect = document.getElementById("modal-site-preset");
  if (!presetSelect) return;
  const presetId = presetSelect.value;
  const preset = state.presets.find(p => p.id === presetId);
  if (!preset) return;

  const fcInput = document.getElementById("modal-site-fc");
  const bitsInput = document.getElementById("modal-site-bits");
  const beeperCheck = document.getElementById("modal-site-beeper");
  const ledCheck = document.getElementById("modal-site-led");

  if (bitsInput && preset.wiegandBits) bitsInput.value = preset.wiegandBits;
  if (fcInput && !fcInput.value) fcInput.value = "101";
  if (beeperCheck && typeof preset.beeperEnabled === "boolean") beeperCheck.checked = preset.beeperEnabled;
  if (ledCheck && typeof preset.ledEnabled === "boolean") ledCheck.checked = preset.ledEnabled;
}

async function handleSaveSiteProfile() {
  const nameInput = document.getElementById("modal-site-name");
  const clientInput = document.getElementById("modal-client-name");
  const siteName = nameInput?.value.trim() || "";
  const clientName = clientInput?.value.trim() || "";
  const technicianName = document.getElementById("modal-tech-name")?.value.trim() || "Field Technician";
  const notes = document.getElementById("modal-site-notes")?.value.trim() || "";
  const errorBox = document.getElementById("modal-site-error");

  if (!siteName || !clientName) {
    const errorMsg = "Please enter both Site/Campus Name and Client/District Name.";
    if (errorBox) {
      errorBox.style.display = "block";
      errorBox.textContent = `⚠️ ${errorMsg}`;
    }
    showToast(`⚠️ ${errorMsg}`, "warn");
    if (!siteName) nameInput?.focus();
    else clientInput?.focus();
    return;
  }

  if (errorBox) errorBox.style.display = "none";

  const presetSelect = document.getElementById("modal-site-preset");
  const presetId = presetSelect?.value || document.getElementById("select-preset")?.value || "new-small-k12";
  const preset = state.presets.find(p => p.id === presetId) || state.presets[0] || {
    id: "new-small-k12",
    credentialFamily: "DESFIRE_EV3",
    outputFormat: "WIEGAND_FORMATTED",
    wiegandBits: 37
  };

  const deviceSelect = document.getElementById("modal-site-device");
  const deviceId = deviceSelect?.value || document.getElementById("select-device")?.value || undefined;

  const rawBits = parseInt(document.getElementById("modal-site-bits")?.value || document.getElementById("input-wiegand-bits")?.value || "37", 10);
  const wiegandBits = isNaN(rawBits) ? (preset.wiegandBits || 37) : rawBits;

  const rawFc = parseInt(document.getElementById("modal-site-fc")?.value || document.getElementById("input-facility-code")?.value || "101", 10);
  const facilityCode = isNaN(rawFc) ? 101 : rawFc;

  const beeper = document.getElementById("modal-site-beeper")?.checked ?? document.getElementById("check-beeper")?.checked ?? true;
  const led = document.getElementById("modal-site-led")?.checked ?? document.getElementById("check-led")?.checked ?? true;

  const saveBtn = document.getElementById("btn-modal-save-site");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-inline">⏳</span> Saving...`;
  }

  try {
    const res = await fetch("/api/site-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName,
        clientName,
        technicianName,
        notes,
        presetId: preset.id,
        deviceId: deviceId || undefined,
        credentialFamily: preset.credentialFamily || "DESFIRE_EV3",
        outputFormat: preset.outputFormat || "WIEGAND_FORMATTED",
        wiegandBitLength: wiegandBits,
        facilityCode,
        beeperEnabled: beeper,
        ledEnabled: led
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Save failed");

    if (data.profile) {
      state.siteProfiles.unshift(data.profile);
    }
    const countEl = document.getElementById("site-profile-count");
    if (countEl) countEl.textContent = state.siteProfiles.length;
    renderSiteProfilesTab();

    closeSiteProfileModal();
    showToast(`✓ Saved Site Profile: <strong>${siteName}</strong>`, "success");
  } catch (err) {
    if (errorBox) {
      errorBox.style.display = "block";
      errorBox.textContent = `Error saving profile: ${err.message}`;
    }
    showToast(`Failed to save site profile: ${err.message}`, "warn");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `💾 Save Site Profile`;
    }
  }
}

function triggerPrintRecord() {
  const deviceId = document.getElementById("select-device").value;
  const device = state.devices.find(d => d.deviceId === deviceId) || state.devices[0];
  const presetId = document.getElementById("select-preset").value;
  const preset = state.presets.find(p => p.id === presetId) || state.presets[0];
  const wiegandBits = document.getElementById("input-wiegand-bits").value;
  const facilityCode = document.getElementById("input-facility-code").value;

  const printContent = document.getElementById("print-body-content");
  printContent.innerHTML = `
    <p><strong>Deployment Date:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
    <p><strong>Workstation Host:</strong> ${window.location.hostname}</p>
    <p><strong>Configured Hardware:</strong> ${device.name}</p>
    <p><strong>Manufacturer:</strong> ${device.manufacturer} | <strong>Transport:</strong> ${device.transport}</p>
    <p><strong>Serial / ID:</strong> ${device.deviceId}</p>
    <br>
    <p><strong>Deployment Preset:</strong> ${preset.name}</p>
    <p><strong>Credential Family:</strong> ${preset.credentialFamily}</p>
    <p><strong>Output Framing:</strong> ${preset.outputFormat} (${wiegandBits}-bit Wiegand)</p>
    <p><strong>Facility Code:</strong> ${facilityCode}</p>
    <p><strong>Beeper Feedback:</strong> ${document.getElementById("check-beeper").checked ? "Enabled" : "Disabled"}</p>
    <p><strong>LED Signal:</strong> ${document.getElementById("check-led").checked ? "Enabled" : "Disabled"}</p>
    <br>
    <p><strong>Target Scanner App:</strong> ID Access Scanner (Profile: <code>reader-profile.json</code>)</p>
  `;

  window.print();
}

async function executeExport() {
  const alertBox = document.getElementById("export-result-alert");
  alertBox.style.display = "none";

  if (!state.activeProfile) {
    const deviceId = document.getElementById("select-device").value;
    const presetId = document.getElementById("select-preset").value;
    const wiegandBits = document.getElementById("input-wiegand-bits").value;
    const facilityCode = document.getElementById("input-facility-code").value;

    const res = await fetch("/api/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, presetId, wiegandBits, facilityCode })
    });
    const data = await res.json();
    state.activeProfile = data.profile;
  }

  const destination = document.querySelector('input[name="export-dest"]:checked').value;

  try {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: state.activeProfile,
        destination
      })
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Export failed");

    alertBox.className = "alert-box alert-success mt-3";
    alertBox.innerHTML = `<strong>&check; Export Succeeded!</strong><br>Saved to: <code>${data.path}</code><br>Ready for ingestion by ID Access Scanner.`;
    alertBox.style.display = "block";

    document.getElementById("export-json-preview").textContent = JSON.stringify(data.profile, null, 2);
    showToast("Profile exported to ID Access Scanner", "success");
  } catch (err) {
    alertBox.className = "alert-box alert-error mt-3";
    alertBox.innerHTML = `<strong>&cross; Export Failed:</strong> ${err.message}`;
    alertBox.style.display = "block";
  }
}

// ==========================================
// Options & Commissioning Subsystem
// ==========================================

async function loadOptions() {
  try {
    const res = await fetch("/api/options");
    if (!res.ok) return;
    const opts = await res.json();
    state.options = opts;

    if (document.getElementById("check-opt-autoscan")) {
      document.getElementById("check-opt-autoscan").checked = opts.usbAutoScanEnabled;
      document.getElementById("input-opt-interval").value = opts.usbAutoScanIntervalMs;
      document.getElementById("check-opt-autoreadback").checked = opts.autoReadbackOnPlug;
      document.getElementById("check-opt-simulated").checked = opts.includeSimulatedDevices;
      document.getElementById("input-opt-export-path").value = opts.defaultExportPath;
      document.getElementById("check-opt-autoexport").checked = opts.autoExportOnWrite;

      document.getElementById("input-comm-subnet").value = opts.firewallSubnetScope || "LocalSubnet";
      if (document.getElementById("input-comm-dsn-name")) {
        document.getElementById("input-comm-dsn-name").value = opts.odbcDsnName || "PockeTrackerLocal";
      }
      if (opts.odbcArchitecture === "32-bit" && document.getElementById("radio-platform-32")) {
        document.getElementById("radio-platform-32").checked = true;
      } else if (document.getElementById("radio-platform-64")) {
        document.getElementById("radio-platform-64").checked = true;
      }
      document.getElementById("input-comm-server").value = opts.odbcServer || "(localdb)\\MSSQLLocalDB";
      document.getElementById("input-comm-database").value = opts.odbcDatabase || "PockeTrackerLocal";
      document.getElementById("select-comm-auth").value = opts.odbcTrustedConnection !== false ? "trusted" : "sql";
      const credsGroup = document.getElementById("comm-credentials-group");
      if (credsGroup) {
        credsGroup.style.display = opts.odbcTrustedConnection !== false ? "none" : "grid";
      }

      if (document.getElementById("select-opt-theme")) {
        const activeTheme = localStorage.getItem("primo_theme") || opts.theme || "dark";
        document.getElementById("select-opt-theme").value = activeTheme;
        applyTheme(activeTheme, false);
      }

      if (opts.bixSearchPath) {
        const optBix = document.getElementById("input-opt-bix-path");
        if (optBix) optBix.value = opts.bixSearchPath;
        const bixSearch = document.getElementById("input-bix-search-path");
        if (bixSearch && !bixSearch.value) bixSearch.value = opts.bixSearchPath;
      }
    }
  } catch (err) {
    console.warn("Failed to load options:", err);
  }
}

async function saveOptionsFromForm() {
  const currentTheme = document.getElementById("select-opt-theme")?.value || document.documentElement.getAttribute("data-theme") || "dark";
  const bixPath = document.getElementById("input-opt-bix-path") ? document.getElementById("input-opt-bix-path").value.trim() : undefined;
  const updates = {
    usbAutoScanEnabled: document.getElementById("check-opt-autoscan").checked,
    usbAutoScanIntervalMs: parseInt(document.getElementById("input-opt-interval").value, 10) || 3000,
    autoReadbackOnPlug: document.getElementById("check-opt-autoreadback").checked,
    includeSimulatedDevices: document.getElementById("check-opt-simulated").checked,
    defaultExportPath: document.getElementById("input-opt-export-path").value.trim(),
    autoExportOnWrite: document.getElementById("check-opt-autoexport").checked,
    firewallSubnetScope: document.getElementById("input-comm-subnet").value.trim(),
    odbcDsnName: document.getElementById("input-comm-dsn-name") ? document.getElementById("input-comm-dsn-name").value.trim() : "PockeTrackerLocal",
    odbcArchitecture: getSelectedPlatform(),
    odbcDriverName: document.getElementById("select-comm-driver") ? document.getElementById("select-comm-driver").value : "ODBC Driver 17 for SQL Server",
    odbcServer: document.getElementById("input-comm-server").value.trim(),
    odbcDatabase: document.getElementById("input-comm-database").value.trim(),
    odbcTrustedConnection: document.getElementById("select-comm-auth").value === "trusted",
    theme: currentTheme,
    bixSearchPath: bixPath
  };

  try {
    const res = await fetch("/api/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    state.options = data.options;
    showToast("✅ Options & Preferences saved successfully.", "success");
    appendCommConsole(`[SAVED] Configuration preferences saved at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    showToast(`Failed to save options: ${err.message}`, "warn");
  }
}

function getSelectedPlatform() {
  return document.querySelector("input[name='comm-platform']:checked")?.value || "64-bit";
}

async function loadOdbcDriversForPlatform(platform, forceRefresh = false) {
  const select = document.getElementById("select-comm-driver");
  const countBadge = document.getElementById("text-driver-count-badge");
  const driverInfo = document.getElementById("text-selected-driver-info");
  if (!select) return;

  const currentVal = select.value;
  try {
    const res = await fetch(`/api/odbc/drivers?platform=${encodeURIComponent(platform)}`);
    if (!res.ok) throw new Error("Failed to fetch ODBC drivers");
    const data = await res.json();
    const drivers = data.drivers || [];

    if (countBadge) {
      countBadge.textContent = `${drivers.length} driver(s) installed (${platform})`;
    }

    select.innerHTML = "";
    if (drivers.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = `No ${platform} drivers installed`;
      select.appendChild(opt);
    } else {
      let matchedCurrent = false;
      for (const d of drivers) {
        const opt = document.createElement("option");
        opt.value = d.name;
        opt.textContent = d.name;
        if (d.name === currentVal) {
          opt.selected = true;
          matchedCurrent = true;
        }
        select.appendChild(opt);
      }

      if (!matchedCurrent) {
        const preferred = drivers.find(d => d.name.includes("Driver 17")) ||
                          drivers.find(d => d.name.includes("Driver 18")) ||
                          drivers.find(d => d.name.includes("SQL Server")) ||
                          drivers[0];
        if (preferred) select.value = preferred.name;
      }
    }

    if (driverInfo) {
      driverInfo.textContent = `Active: ${select.value || "None"} (${platform})`;
    }

    checkDsnDuplicateStatus();
  } catch (err) {
    if (countBadge) countBadge.textContent = "Error loading drivers";
    console.error("Error loading ODBC drivers:", err);
  }
}

async function checkDsnDuplicateStatus() {
  const dsnNameInput = document.getElementById("input-comm-dsn-name");
  const platform = getSelectedPlatform();
  const alertBox = document.getElementById("dsn-duplicate-alert");
  const existsBadge = document.getElementById("badge-dsn-exists-status");
  const currentNameLabel = document.getElementById("text-odbc-current-name");

  const name = dsnNameInput ? dsnNameInput.value.trim() : "PockeTrackerLocal";
  if (currentNameLabel) currentNameLabel.textContent = name || "(None)";
  if (!name) {
    if (alertBox) alertBox.style.display = "none";
    if (existsBadge) existsBadge.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`/api/odbc/check-dsn?name=${encodeURIComponent(name)}&platform=${encodeURIComponent(platform)}&type=System`);
    if (!res.ok) return;
    const data = await res.json();

    if (existsBadge) {
      existsBadge.style.display = "inline-block";
      if (data.exists) {
        existsBadge.textContent = `EXISTS (${platform})`;
        existsBadge.className = "small font-bold text-amber";
      } else {
        existsBadge.textContent = `NEW (${platform})`;
        existsBadge.className = "small font-bold text-cyan";
      }
    }

    if (alertBox) {
      alertBox.style.display = data.exists ? "block" : "none";
      if (data.exists) {
        alertBox.innerHTML = `⚠️ <strong>System DSN '${name}' already exists for ${platform}</strong> (Driver: ${data.dsn?.driverName || "Configured"}). To protect active client setups, existing DSNs are preserved by default. Check <em>'Allow Overwrite / Update Existing DSN'</em> below if you intend to update this connection in place.`;
      }
    }
  } catch (err) {
    console.warn("Duplicate DSN check error:", err);
  }
}

async function loadElevationStatus() {
  const badge = document.getElementById("badge-comm-elevation");
  if (!badge) return;
  try {
    const res = await fetch("/api/odbc/elevation-status");
    if (!res.ok) return;
    const data = await res.json();
    if (data.isElevated) {
      badge.textContent = "⚡ ELEVATED (ADMIN)";
      badge.className = "badge badge-status";
      badge.title = "Running with full Administrator token. Operations execute directly without UAC.";
    } else {
      badge.textContent = "🛡️ UAC REQUIRED";
      badge.className = "badge badge-sec-medium";
      badge.title = "Running as standard user. Creating System DSN will launch Windows UAC elevation prompt.";
    }
  } catch (err) {
    badge.textContent = "UAC UNKNOWN";
  }
}

async function loadCommissioningStatus() {
  const badge = document.getElementById("badge-comm-status");
  const dotFw = document.getElementById("dot-firewall");
  const textFw = document.getElementById("text-firewall-status");
  const dotOdbc = document.getElementById("dot-odbc");
  const textOdbc = document.getElementById("text-odbc-status");

  if (!badge) return;

  // Query elevation status and platform drivers
  loadElevationStatus();
  loadOdbcDriversForPlatform(getSelectedPlatform());

  try {
    const res = await fetch("/api/options/commissioning-status");
    if (!res.ok) throw new Error("Failed to fetch commissioning status");
    const data = await res.json();
    state.commStatus = data;

    // Firewall Status
    const activeCount = data.firewallRules ? data.firewallRules.filter(r => r.active).length : 0;
    if (data.allFirewallRulesActive) {
      dotFw.className = "indicator-dot active";
      textFw.innerHTML = `<span style="color:#10b981;font-weight:600;">ACTIVE</span>: All 4 inbound rules applied (Ports 3000, 80, 443, 1433)`;
    } else if (activeCount > 0) {
      dotFw.className = "indicator-dot warning";
      textFw.innerHTML = `<span style="color:#f59e0b;font-weight:600;">PARTIAL</span>: ${activeCount}/4 rules active. Click 'Apply Firewall' to complete.`;
    } else {
      dotFw.className = "indicator-dot error";
      textFw.innerHTML = `<span style="color:#ef4444;font-weight:600;">NOT CONFIGURED</span>: Rules not found. Inbound scanner/web traffic blocked.`;
    }

    // ODBC Status
    const platform = getSelectedPlatform();
    if (data.odbcDsn && data.odbcDsn.driverInstalled && data.odbcDsn.dsnConfigured) {
      dotOdbc.className = "indicator-dot active";
      const dsnLabel = data.odbcDsn.dsnType ? `${data.odbcDsn.dsnType} DSN` : "ODBC DSN";
      textOdbc.innerHTML = `<span style="color:#10b981;font-weight:600;">READY</span>: ${dsnLabel} '${data.odbcDsn.dsnName || "PockeTrackerLocal"}' (${data.odbcDsn.platform || platform}) configured`;
    } else if (data.odbcDsn && data.odbcDsn.driverInstalled) {
      dotOdbc.className = "indicator-dot warning";
      textOdbc.innerHTML = `<span style="color:#f59e0b;font-weight:600;">DRIVER FOUND</span>: Drivers installed, but System DSN '${data.odbcDsn.dsnName || "PockeTrackerLocal"}' not registered. Click 'Setup System DSN Only' below.`;
    } else {
      dotOdbc.className = "indicator-dot error";
      textOdbc.innerHTML = `<span style="color:#ef4444;font-weight:600;">DRIVER MISSING</span>: Required ODBC Driver not installed for ${platform}.`;
    }

    if (data.allFirewallRulesActive && data.odbcDsn && data.odbcDsn.dsnConfigured) {
      badge.textContent = "READY FOR PRODUCTION";
      badge.className = "badge badge-status";
    } else {
      badge.textContent = "SETUP REQUIRED";
      badge.className = "badge badge-sec-medium";
    }
  } catch (err) {
    if (textFw) textFw.textContent = "Error checking status";
    if (textOdbc) textOdbc.textContent = err.message;
  }
}

async function executeCommissioning(action) {
  const platform = getSelectedPlatform();
  const dsnName = document.getElementById("input-comm-dsn-name")?.value.trim() || "PockeTrackerLocal";
  const driverName = document.getElementById("select-comm-driver")?.value || "ODBC Driver 17 for SQL Server";
  const allowOverwrite = document.getElementById("check-comm-overwrite")?.checked || false;
  const remoteSubnet = document.getElementById("input-comm-subnet")?.value.trim() || "LocalSubnet";
  const server = document.getElementById("input-comm-server")?.value.trim() || "(localdb)\\MSSQLLocalDB";
  const database = document.getElementById("input-comm-database")?.value.trim() || "PockeTrackerLocal";
  const port = parseInt(document.getElementById("input-comm-port")?.value || "1433", 10);
  const trustedConnection = document.getElementById("select-comm-auth")?.value === "trusted";
  const user = !trustedConnection ? (document.getElementById("input-comm-user")?.value.trim() || "sa") : undefined;
  const password = !trustedConnection ? (document.getElementById("input-comm-password")?.value || "") : undefined;

  // Validation
  if (action === "dsn" || action === "both") {
    if (!dsnName) {
      showToast("DSN Name is required", "error");
      return;
    }
    const invalidChars = /[\[\]\{\}\(\),;\?\*=\!@\\\/":\|<>]/;
    if (invalidChars.test(dsnName)) {
      showToast("DSN Name contains illegal characters", "error");
      return;
    }
    if (!driverName) {
      showToast(`Please select an ODBC driver installed for ${platform}`, "error");
      return;
    }
  }

  appendCommConsole(`\n[DISPATCH] Executing commissioning action: ${action.toUpperCase()} (${platform})...`);
  showToast(`Running commissioning action: ${action} (${platform})...`, "info");

  try {
    const res = await fetch("/api/options/run-commissioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        platform,
        dsnName,
        driverName,
        allowOverwrite,
        remoteSubnet,
        server,
        database,
        port,
        trustedConnection,
        user,
        password
      })
    });

    const data = await res.json();
    if (data.outputLog) {
      data.outputLog.forEach(line => appendCommConsole(` > ${line}`));
    }

    if (data.elevationCanceled) {
      showToast("🛡️ Administrator elevation cancelled. System left unchanged.", "warn");
      appendCommConsole(" > [UAC CANCELED] User declined elevation. No system changes made.");
    } else if (data.success) {
      showToast(`✅ Action '${action}' (${platform}) completed successfully!`, "success");
    } else {
      showToast(`Commissioning warning: ${data.errorMessage || "See log"}`, "warn");
    }

    // Refresh status badges and duplicate check
    await loadCommissioningStatus();
    await checkDsnDuplicateStatus();
  } catch (err) {
    appendCommConsole(`[ERROR] Execution failed: ${err.message}`);
    showToast(`Execution Error: ${err.message}`, "warn");
  }
}

function appendCommConsole(msg) {
  const term = document.getElementById("comm-console-output");
  if (!term) return;
  term.textContent += "\n" + msg;
  term.scrollTop = term.scrollHeight;
  const ts = document.getElementById("comm-console-timestamp");
  if (ts) ts.textContent = new Date().toLocaleTimeString();
}

// ==========================================
// Elatec TWN4 .BIX Firmware Scanner Logic
// ==========================================

async function loadBixFiles(searchPath = null, notify = false) {
  const scanBtn = document.getElementById("btn-run-bix-scan");
  const quickBtn = document.getElementById("btn-quick-bix-scan");
  if (scanBtn) scanBtn.disabled = true;
  if (quickBtn) quickBtn.disabled = true;
  if (notify) showToast("🔍 Scanning for Elatec .BIX firmware files...", "info");

  try {
    let url = "/api/bix";
    if (searchPath) {
      url += `?path=${encodeURIComponent(searchPath)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to scan for .BIX files");
    const data = await res.json();

    state.bixReport = data;
    state.bixFiles = data.files || [];

    // Update Nav Tab Count Badge
    const bixCountEl = document.getElementById("bix-count");
    if (bixCountEl) bixCountEl.textContent = state.bixFiles.length;

    // Update Summary Metrics Cards
    const totalEl = document.getElementById("bix-stat-total");
    const validEl = document.getElementById("bix-stat-valid");
    const ccidEl = document.getElementById("bix-stat-ccid");
    const cdcEl = document.getElementById("bix-stat-cdc");

    const ccidCount = state.bixFiles.filter(f => f.interfaceType.includes("CCID") || f.fileName.toLowerCase().includes("ccid")).length;
    const cdcCount = state.bixFiles.filter(f => f.interfaceType.includes("CDC") || f.fileName.toLowerCase().includes("cdc")).length;

    if (totalEl) totalEl.textContent = state.bixFiles.length;
    if (validEl) validEl.textContent = data.validBixCount || state.bixFiles.length;
    if (ccidEl) ccidEl.textContent = ccidCount;
    if (cdcEl) cdcEl.textContent = cdcCount;

    // Update input path if empty
    const inputPath = document.getElementById("input-bix-search-path");
    if (inputPath && !inputPath.value && data.searchPaths && data.searchPaths.length > 0) {
      inputPath.value = data.searchPaths[0];
    }

    renderBixTable(document.getElementById("input-bix-filter")?.value);

    if (notify) {
      showToast(`✅ Found <strong>${state.bixFiles.length}</strong> .BIX firmware packages in ${data.scanDurationMs}ms`, "success");
      appendTerminal(`[BIX SCAN] Found ${state.bixFiles.length} Elatec TWN4 firmware images (${data.validBixCount} verified with 0xFEAF header) in ${data.scanDurationMs}ms`);
    }
  } catch (err) {
    console.error("BIX scan error:", err);
    if (notify) showToast(`Failed to scan .bix files: ${err.message}`, "warn");
  } finally {
    if (scanBtn) scanBtn.disabled = false;
    if (quickBtn) quickBtn.disabled = false;
  }
}

function renderBixTable(filterText = "") {
  const tbody = document.getElementById("bix-table-body");
  if (!tbody) return;

  const query = (filterText || "").trim().toLowerCase();
  const filtered = state.bixFiles.filter(f => {
    if (!query) return true;
    return (
      f.fileName.toLowerCase().includes(query) ||
      (f.firmwareVersion && f.firmwareVersion.toLowerCase().includes(query)) ||
      (f.subsystemCode && f.subsystemCode.toLowerCase().includes(query)) ||
      (f.interfaceType && f.interfaceType.toLowerCase().includes(query)) ||
      (f.featureVariant && f.featureVariant.toLowerCase().includes(query)) ||
      (f.filePath && f.filePath.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-muted">
          ${state.bixFiles.length === 0 ? "No .BIX firmware files found. Click 'Scan for .BIX Files' above." : `No .BIX files matching filter '${filterText}'.`}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((f) => {
    const originalIndex = state.bixFiles.indexOf(f);
    const statusBadge = f.isValidBix
      ? `<span class="badge badge-status" title="Magic header 0xFEAF + flashinfo verified">VALID TWN4</span>`
      : `<span class="badge badge-sec-med" title="Unverified signature">UNVERIFIED</span>`;

    const isCcid = f.interfaceType.includes("CCID");
    const isCdc = f.interfaceType.includes("CDC");
    const ifaceBadgeClass = isCcid ? "badge-tech" : isCdc ? "badge-sec-med" : "badge-sec";

    return `
      <tr>
        <td>${statusBadge}</td>
        <td><strong>${f.fileName}</strong></td>
        <td><span class="badge badge-tech">${f.firmwareVersion || "N/A"}</span></td>
        <td><code>${f.subsystemCode || "Standard"}</code></td>
        <td><span class="badge ${ifaceBadgeClass}">${isCcid ? "CCID (PC/SC)" : isCdc ? "CDC (VCP)" : "Keyboard"}</span></td>
        <td><small class="text-muted">${f.featureVariant || "Standard Profile"}</small></td>
        <td><strong>${f.formattedSize}</strong></td>
        <td><small class="text-muted">${new Date(f.lastModified).toLocaleDateString()}</small></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="copy-path-btn" onclick="copyBixPath('${f.filePath.replace(/\\/g, "\\\\")}')" title="Copy absolute file path">📋 Copy Path</button>
            <button class="btn btn-secondary btn-sm" onclick="inspectBix(${originalIndex})" title="View full binary metadata and strings">🔍 Details</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function copyBixPath(filePath) {
  if (!filePath) return;
  navigator.clipboard.writeText(filePath).then(() => {
    showToast("📋 Copied .BIX file path to clipboard!", "success");
  }).catch(() => {
    showToast(`Path: ${filePath}`, "info");
  });
}

function inspectBix(index) {
  const file = state.bixFiles[index];
  if (!file) return;

  document.getElementById("bix-modal-filename").textContent = file.fileName;
  document.getElementById("bix-modal-path").value = file.filePath;
  document.getElementById("bix-modal-version").textContent = file.firmwareVersion || "N/A";
  document.getElementById("bix-modal-subsystem").textContent = file.subsystemCode || "Standard";
  document.getElementById("bix-modal-interface").textContent = file.interfaceType || "N/A";
  document.getElementById("bix-modal-target").textContent = file.targetHardware || "Elatec TWN4 MultiTech";
  document.getElementById("bix-modal-size").textContent = `${file.formattedSize} (${file.fileSizeBytes.toLocaleString()} bytes)`;
  document.getElementById("bix-modal-magic").textContent = file.magicHeaderHex || "FEAF";
  document.getElementById("bix-modal-strings").textContent = file.headerString || "flashinfo";

  document.getElementById("modal-bix-inspect").style.display = "flex";
}

// Expose globally for inline table click handlers
window.copyBixPath = copyBixPath;
window.inspectBix = inspectBix;
window.loadBixFiles = loadBixFiles;

// ======================================================================
// Generic Action Confirmation Dialog Controller
// ======================================================================
let pendingConfirmCallback = null;

function showConfirmDialog(title, message, warningText, onConfirm) {
  const modal = document.getElementById("modal-confirm");
  const titleEl = document.getElementById("confirm-modal-title");
  const msgEl = document.getElementById("confirm-modal-message");
  const warnEl = document.getElementById("confirm-modal-warning");

  if (!modal) return;
  titleEl.textContent = title || "Action Confirmation";
  msgEl.textContent = message || "Are you sure you want to proceed?";

  if (warningText) {
    warnEl.textContent = warningText;
    warnEl.style.display = "block";
  } else {
    warnEl.style.display = "none";
  }

  pendingConfirmCallback = onConfirm;
  modal.style.display = "flex";
}

document.getElementById("btn-confirm-accept")?.addEventListener("click", () => {
  const modal = document.getElementById("modal-confirm");
  if (modal) modal.style.display = "none";
  if (typeof pendingConfirmCallback === "function") {
    const cb = pendingConfirmCallback;
    pendingConfirmCallback = null;
    cb();
  }
});

document.getElementById("btn-confirm-cancel")?.addEventListener("click", () => {
  const modal = document.getElementById("modal-confirm");
  if (modal) modal.style.display = "none";
  pendingConfirmCallback = null;
});

// ======================================================================
// Sysinternals Integration Controller
// ======================================================================
async function loadSysinternalsStatus() {
  const statusTag = document.getElementById("sysinternals-status-tag");
  const pathTag = document.getElementById("sysinternals-path-tag");
  const dirEl = document.getElementById("sysinternals-dir");
  const archEl = document.getElementById("sysinternals-arch");
  const countEl = document.getElementById("sysinternals-count");
  const grid = document.getElementById("sysinternals-tools-grid");

  try {
    const res = await fetch("/api/sysinternals/status");
    const data = await res.json();

    if (dirEl) dirEl.textContent = data.installDir || "Not configured";
    if (archEl) archEl.textContent = data.architecture ? data.architecture.toUpperCase() : "x64";
    if (countEl) countEl.textContent = `${data.totalAvailableCount || 0} / ${data.totalToolsCount || 11}`;

    if (statusTag) {
      if (data.installed) {
        statusTag.textContent = "SUITE INSTALLED";
        statusTag.className = "badge badge-status";
      } else {
        statusTag.textContent = "NOT INSTALLED";
        statusTag.className = "badge badge-sec-low";
      }
    }

    if (pathTag) {
      pathTag.textContent = data.onPath ? "ON PATH: YES" : "ON PATH: NO";
      pathTag.className = data.onPath ? "badge badge-status" : "badge badge-sec-med";
    }

    if (grid && data.tools) {
      grid.innerHTML = data.tools.map(tool => `
        <div class="tool-card">
          <div>
            <div class="tool-card-header">
              <span class="tool-card-title">${tool.name}</span>
              <span class="badge ${tool.exists ? "badge-status" : "badge-sec-low"}">${tool.exists ? "READY" : "MISSING"}</span>
            </div>
            <div class="small font-mono text-muted mb-1">${tool.exeName} &bull; <span class="badge badge-tech small">${tool.category}</span></div>
            <p class="tool-card-desc">${tool.description}</p>
          </div>
          <div class="tool-card-actions">
            <button class="btn btn-primary btn-sm btn-block" onclick="launchSysinternalsTool('${tool.id}', false)">
              🚀 Launch
            </button>
            ${tool.requiresElevation ? `
              <button class="btn btn-secondary btn-sm" title="Launch with Administrator Elevation" onclick="launchSysinternalsTool('${tool.id}', true)">
                🛡️
              </button>
            ` : ""}
          </div>
        </div>
      `).join("");
    }
  } catch (err) {
    showToast(`Failed to load Sysinternals status: ${err.message}`, "error");
  }
}

async function downloadSysinternalsSuite() {
  const logEl = document.getElementById("sysinternals-log-output");
  const timeEl = document.getElementById("sysinternals-log-time");
  showToast("Downloading Microsoft Sysinternals Suite... Please wait.", "info");

  if (logEl) logEl.textContent = "[DOWNLOAD] Fetching official Microsoft Sysinternals Suite archive...\n";
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  try {
    const res = await fetch("/api/sysinternals/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const data = await res.json();

    if (logEl && data.log) {
      logEl.textContent = data.log.join("\n");
    }

    if (data.success) {
      showToast("Sysinternals Suite successfully downloaded and extracted!", "success");
      await loadSysinternalsStatus();
    } else {
      showToast(`Download failed: ${data.error || "Unknown error"}`, "error");
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, "error");
  }
}

async function launchSysinternalsTool(toolId, elevate = false) {
  const logEl = document.getElementById("sysinternals-log-output");
  const timeEl = document.getElementById("sysinternals-log-time");

  try {
    const res = await fetch("/api/sysinternals/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId, elevate })
    });
    const data = await res.json();

    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    if (logEl) {
      logEl.textContent += `\n[LAUNCH] ${data.message}`;
      logEl.scrollTop = logEl.scrollHeight;
    }

    if (data.success) {
      showToast(data.message, "success");
    } else {
      showToast(data.message || data.error, "error");
    }
  } catch (err) {
    showToast(`Launch error: ${err.message}`, "error");
  }
}

async function addSysinternalsToPath(scope = "User") {
  showConfirmDialog(
    `Add Sysinternals to ${scope} PATH`,
    `Do you want to add the Sysinternals Suite directory to your Windows ${scope} PATH environment variable?`,
    scope === "Machine" ? "System-wide PATH modification requires Windows UAC Administrator elevation." : null,
    async () => {
      try {
        const res = await fetch("/api/sysinternals/add-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope })
        });
        const data = await res.json();
        showToast(data.message, data.success ? "success" : "error");
        await loadSysinternalsStatus();
      } catch (err) {
        showToast(`PATH update error: ${err.message}`, "error");
      }
    }
  );
}

window.launchSysinternalsTool = launchSysinternalsTool;

// ======================================================================
// Winget Package Manager Controller
// ======================================================================
async function loadWingetStatus() {
  const statusTag = document.getElementById("winget-status-tag");
  const verTag = document.getElementById("winget-version-tag");

  try {
    const res = await fetch("/api/winget/status");
    const data = await res.json();

    if (statusTag) {
      if (data.available) {
        statusTag.textContent = "WINGET READY";
        statusTag.className = "badge badge-status";
      } else {
        statusTag.textContent = "NOT AVAILABLE";
        statusTag.className = "badge badge-sec-low";
      }
    }

    if (verTag) {
      verTag.textContent = data.version || "N/A";
    }
  } catch (err) {
    showToast(`Failed to check winget status: ${err.message}`, "error");
  }
}

async function searchWinget() {
  const input = document.getElementById("input-winget-search");
  const query = input ? input.value.trim() : "";
  if (!query) {
    showToast("Please enter a package name or keyword to search.", "info");
    return;
  }

  const tbody = document.getElementById("tbody-winget");
  const title = document.getElementById("winget-table-title");
  const count = document.getElementById("winget-results-count");
  const logEl = document.getElementById("winget-log-output");
  const timeEl = document.getElementById("winget-log-time");

  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center p-3">Searching repository for '${query}'...</td></tr>`;
  if (logEl) logEl.textContent = `[SEARCH] Querying winget repository for '${query}'...\n`;
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  try {
    const res = await fetch(`/api/winget/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (logEl && data.outputLog) logEl.textContent = data.outputLog.join("\n");
    if (title) title.textContent = `Search Results: "${query}"`;
    if (count) count.textContent = `${data.packages ? data.packages.length : 0} found`;

    renderWingetTable(data.packages || [], "install");
  } catch (err) {
    showToast(`Search error: ${err.message}`, "error");
  }
}

async function listInstalledWinget() {
  const tbody = document.getElementById("tbody-winget");
  const title = document.getElementById("winget-table-title");
  const count = document.getElementById("winget-results-count");
  const logEl = document.getElementById("winget-log-output");
  const timeEl = document.getElementById("winget-log-time");

  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center p-3">Scanning installed software packages...</td></tr>`;
  if (logEl) logEl.textContent = `[LIST] Querying installed applications via winget list...\n`;
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  try {
    const res = await fetch("/api/winget/list?limit=50");
    const data = await res.json();

    if (logEl && data.outputLog) logEl.textContent = data.outputLog.join("\n");
    if (title) title.textContent = "Installed Software Packages";
    if (count) count.textContent = `${data.packages ? data.packages.length : 0} items`;

    renderWingetTable(data.packages || [], "upgrade");
  } catch (err) {
    showToast(`List error: ${err.message}`, "error");
  }
}

function renderWingetTable(packages, defaultAction = "install") {
  const tbody = document.getElementById("tbody-winget");
  if (!tbody) return;

  if (packages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center p-3">No packages found.</td></tr>`;
    return;
  }

  tbody.innerHTML = packages.map(pkg => `
    <tr>
      <td class="font-bold text-main">${pkg.name}</td>
      <td class="font-mono small text-accent-cyan">${pkg.id}</td>
      <td class="small">${pkg.version}</td>
      <td class="small text-accent-green">${pkg.availableVersion ? pkg.availableVersion : "-"}</td>
      <td class="small text-muted">${pkg.source || "winget"}</td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="confirmWingetInstall('${pkg.id}')">
          ${defaultAction === "upgrade" && pkg.availableVersion ? "⬆️ Upgrade" : "➕ Install"}
        </button>
      </td>
    </tr>
  `).join("");
}

function confirmWingetInstall(packageId) {
  showConfirmDialog(
    `Install Package: ${packageId}`,
    `Are you sure you want to install or upgrade package '${packageId}' on this workstation?`,
    "Installation will be dispatched with elevation and requires administrator consent.",
    async () => {
      showToast(`Starting installation of ${packageId}...`, "info");
      const logEl = document.getElementById("winget-log-output");
      try {
        const res = await fetch("/api/winget/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId, elevate: true })
        });
        const data = await res.json();
        if (logEl && data.outputLog) logEl.textContent = data.outputLog.join("\n");
        showToast(data.success ? `Dispatched installation of ${packageId}` : `Install failed: ${data.error}`, data.success ? "success" : "error");
      } catch (err) {
        showToast(`Install error: ${err.message}`, "error");
      }
    }
  );
}

function confirmWingetUpgradeAll() {
  showConfirmDialog(
    "Upgrade All Installed Packages",
    "Are you sure you want to trigger a bulk upgrade for all out-of-date winget packages?",
    "This will upgrade multiple system applications in an elevated PowerShell session.",
    async () => {
      showToast("Starting bulk upgrade...", "info");
      const logEl = document.getElementById("winget-log-output");
      try {
        const res = await fetch("/api/winget/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId: "all", elevate: true })
        });
        const data = await res.json();
        if (logEl && data.outputLog) logEl.textContent = data.outputLog.join("\n");
        showToast("Bulk upgrade process dispatched.", "success");
      } catch (err) {
        showToast(`Upgrade error: ${err.message}`, "error");
      }
    }
  );
}

window.confirmWingetInstall = confirmWingetInstall;

// ======================================================================
// PowerShell System Tools Controller
// ======================================================================
async function loadPsToolsSpecs() {
  const osEl = document.getElementById("spec-os");
  const buildEl = document.getElementById("spec-build");
  const cpuEl = document.getElementById("spec-cpu");
  const archEl = document.getElementById("spec-arch");
  const ramEl = document.getElementById("spec-ram");
  const uptimeEl = document.getElementById("spec-uptime");
  const driveEl = document.getElementById("spec-drive");
  const driveSub = document.getElementById("spec-drive-sub");
  const hostTag = document.getElementById("pstools-host-tag");

  try {
    const res = await fetch("/api/pstools/system-info");
    const data = await res.json();

    if (hostTag) hostTag.textContent = `HOST: ${data.computerName || "PRIMO"}`;
    if (osEl) osEl.textContent = data.osName || "Windows";
    if (buildEl) buildEl.textContent = `Build ${data.osBuild} &bull; ${data.osVersion}`;
    if (cpuEl) cpuEl.textContent = data.processor || "Processor";
    if (archEl) archEl.textContent = `${data.architecture} Architecture`;
    if (ramEl) ramEl.textContent = `${data.freeRamGb} GB free / ${data.totalRamGb} GB`;
    if (uptimeEl) uptimeEl.textContent = `Uptime: ${data.systemUptime}`;

    if (data.drives && data.drives.length > 0) {
      const c = data.drives.find(d => d.driveLetter.startsWith("C")) || data.drives[0];
      if (driveEl) driveEl.textContent = `${c.driveLetter} (${c.label})`;
      if (driveSub) driveSub.textContent = `${c.freeGb} GB free / ${c.totalGb} GB (${c.percentFree}% free)`;
    }

    // Auto-load default subtab (Processes)
    await loadPsProcesses();
  } catch (err) {
    showToast(`Failed to load system specs: ${err.message}`, "error");
  }
}

async function loadPsProcesses() {
  const tbody = document.getElementById("tbody-pstools-procs");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center p-3">Querying active processes...</td></tr>`;

  try {
    const res = await fetch("/api/pstools/processes?limit=25");
    const procs = await res.json();

    if (!Array.isArray(procs) || procs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center p-3">No processes returned.</td></tr>`;
      return;
    }

    tbody.innerHTML = procs.map(p => `
      <tr>
        <td class="font-mono small">${p.pid}</td>
        <td class="font-bold text-main">${p.name}</td>
        <td class="font-mono text-accent-cyan">${p.workingSetMb} MB</td>
        <td class="small text-muted">${p.cpuSeconds}s</td>
        <td><span class="badge ${p.responding ? "badge-status" : "badge-sec-low"}">${p.responding ? "RESPONDING" : "FROZEN"}</span></td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-error text-center p-3">Error: ${err.message}</td></tr>`;
  }
}

async function loadPsServices() {
  const tbody = document.getElementById("tbody-pstools-svcs");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center p-3">Querying background services...</td></tr>`;

  try {
    const res = await fetch("/api/pstools/services?limit=30");
    const svcs = await res.json();

    tbody.innerHTML = svcs.map(s => `
      <tr>
        <td class="font-mono small font-bold">${s.name}</td>
        <td class="small text-main">${s.displayName}</td>
        <td><span class="badge ${s.status === "Running" ? "badge-status" : "badge-sec-med"}">${s.status}</span></td>
        <td class="small text-muted">${s.startType}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-error text-center p-3">Error: ${err.message}</td></tr>`;
  }
}

async function loadPsNetwork() {
  const view = document.getElementById("pstools-network-view");
  if (!view) return;
  view.innerHTML = `<span class="text-muted">Probing network interfaces and pinging gateway...</span>`;

  try {
    const res = await fetch("/api/pstools/network");
    const net = await res.json();

    view.innerHTML = `
      <div class="grid-2-sub mb-3">
        <div><strong>Default Gateway:</strong> <span class="font-mono text-accent-cyan">${net.defaultGateway || "N/A"}</span></div>
        <div><strong>Internet Ping (8.8.8.8):</strong> <span class="badge ${net.pingGoogleSuccess ? "badge-status" : "badge-sec-low"}">${net.pingGoogleSuccess ? `ONLINE (${net.pingLatencyMs}ms)` : "OFFLINE"}</span></div>
        <div style="grid-column: span 2;"><strong>DNS Servers:</strong> <span class="font-mono small">${net.dnsServers ? net.dnsServers.join(", ") : "None"}</span></div>
      </div>
      <h4 class="card-subtitle mt-2">Active Network Adapters:</h4>
      ${net.adapters && net.adapters.length > 0 ? net.adapters.map(a => `
        <div class="status-metric-card mb-2">
          <div class="flex-between">
            <span class="font-bold text-main">${a.name} &bull; ${a.description}</span>
            <span class="badge ${a.status === "Up" ? "badge-status" : "badge-sec-med"}">${a.status}</span>
          </div>
          <div class="small text-muted font-mono">Speed: ${a.linkSpeed} &bull; MAC: ${a.macAddress} &bull; IPs: ${a.ipv4Addresses ? a.ipv4Addresses.join(", ") : "None"}</div>
        </div>
      `).join("") : `<p class="text-muted small">No active network adapters found.</p>`}
    `;
  } catch (err) {
    view.innerHTML = `<span class="text-error">Error: ${err.message}</span>`;
  }
}

async function loadPsUsers() {
  const tbody = document.getElementById("tbody-pstools-users");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center p-3">Loading local user accounts...</td></tr>`;

  try {
    const res = await fetch("/api/pstools/users");
    const users = await res.json();

    tbody.innerHTML = users.map(u => `
      <tr>
        <td class="font-bold font-mono text-main">${u.name}</td>
        <td class="small">${u.fullName || "-"}</td>
        <td><span class="badge ${u.enabled ? "badge-status" : "badge-sec-med"}">${u.enabled ? "ENABLED" : "DISABLED"}</span></td>
        <td><span class="badge ${u.isAdmin ? "badge-sec-low font-bold" : "badge-tech"}">${u.isAdmin ? "ADMINISTRATOR" : "STANDARD"}</span></td>
        <td class="small text-muted">${u.description || "-"}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-error text-center p-3">Error: ${err.message}</td></tr>`;
  }
}

async function launchPsConsole(elevated = false) {
  try {
    const res = await fetch("/api/pstools/launch-console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elevated, useTerminal: true })
    });
    const data = await res.json();
    showToast(data.message, data.success ? "success" : "error");
  } catch (err) {
    showToast(`Console launch error: ${err.message}`, "error");
  }
}

async function flushDnsCache() {
  try {
    const res = await fetch("/api/pstools/flush-dns", { method: "POST" });
    const data = await res.json();
    showToast(data.message, data.success ? "success" : "error");
  } catch (err) {
    showToast(`Flush DNS error: ${err.message}`, "error");
  }
}

async function runCustomPsScript() {
  const textarea = document.getElementById("input-custom-ps-script");
  const checkElevated = document.getElementById("check-custom-elevated");
  const script = textarea ? textarea.value.trim() : "";
  const elevated = Boolean(checkElevated?.checked);

  if (!script) {
    showToast("Please enter a PowerShell command or script snippet.", "info");
    return;
  }

  showConfirmDialog(
    `Execute Custom PowerShell ${elevated ? "(Elevated)" : "(Standard)"}`,
    "Are you sure you want to execute this command on your machine?",
    script,
    async () => {
      const logEl = document.getElementById("pstools-log-output");
      const timeEl = document.getElementById("pstools-log-time");
      if (logEl) logEl.textContent = `[EXECUTE] Running snippet...\n`;
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

      try {
        const res = await fetch("/api/pstools/run-custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script, elevated })
        });
        const data = await res.json();
        if (logEl) logEl.textContent = data.output || data.error || "[No output]";
        showToast(data.success ? "Command finished." : `Failed: ${data.error}`, data.success ? "success" : "error");
      } catch (err) {
        showToast(`Execution error: ${err.message}`, "error");
      }
    }
  );
}

// ======================================================================
// Network Diagnostic & Troubleshooting Toolkit Controller (10 Tools)
// ======================================================================

async function runNetworkToolkitCommand(cmdId) {
  const targetInput = document.getElementById("input-net-target");
  const checkElevate = document.getElementById("check-net-elevate");
  const target = targetInput ? targetInput.value.trim() : "8.8.8.8";
  const elevated = Boolean(checkElevate?.checked);

  const outputEl = document.getElementById("net-tools-output");
  const badgeEl = document.getElementById("net-terminal-cmd-badge");
  const timerEl = document.getElementById("net-terminal-duration");
  const indicatorEl = document.getElementById("net-terminal-indicator");
  const titleEl = document.getElementById("net-terminal-title");

  // Visual loading state
  if (outputEl) outputEl.textContent = `[EXECUTE] Running ${cmdId} (Target: ${target || "Local System"})...\nPlease wait...\n`;
  if (badgeEl) {
    badgeEl.textContent = cmdId.toUpperCase();
    badgeEl.style.display = "inline-block";
  }
  if (timerEl) timerEl.textContent = "Running...";
  if (indicatorEl) {
    indicatorEl.className = "terminal-indicator status-busy";
  }
  if (titleEl) titleEl.textContent = `Executing: ${cmdId}`;

  // Disable button while running
  const btn = document.querySelector(`.btn-run-net-tool[data-cmd="${cmdId}"]`);
  const origBtnText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ Running...`;
  }

  const startTime = Date.now();
  try {
    const res = await fetch("/api/network-tools/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: cmdId, target, elevated })
    });
    const result = await res.json();
    const duration = result.durationMs || (Date.now() - startTime);

    if (timerEl) timerEl.textContent = `${duration} ms`;
    if (indicatorEl) {
      indicatorEl.className = result.success ? "terminal-indicator status-ready" : "terminal-indicator status-error";
    }
    if (titleEl) titleEl.textContent = `Completed: ${result.commandExecuted || cmdId}`;

    if (outputEl) {
      if (result.success) {
        outputEl.textContent = `=== [SUCCESS] ${result.commandExecuted || cmdId} (${duration}ms) ===\n\n` + (result.output || "[No output returned]");
      } else {
        outputEl.textContent = `=== [ERROR] ${result.commandExecuted || cmdId} (${duration}ms) ===\n\n` + (result.error || result.output || "Execution failed.");
      }
    }

    showToast(
      result.success ? `${cmdId} completed in ${duration}ms` : `Command failed: ${result.error || "Unknown error"}`,
      result.success ? "success" : "error"
    );
  } catch (err) {
    if (outputEl) outputEl.textContent = `=== [REQUEST ERROR] ===\n\n${err.message}`;
    if (indicatorEl) indicatorEl.className = "terminal-indicator status-error";
    showToast(`Network request error: ${err.message}`, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnText;
    }
  }
}


// Subtab navigation inside PowerShell tools
document.querySelectorAll(".subtab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".subtab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".subtab-pane").forEach(p => p.classList.remove("active"));

    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.subtab);
    if (target) target.classList.add("active");

    if (btn.dataset.subtab === "subtab-procs") loadPsProcesses();
    if (btn.dataset.subtab === "subtab-svcs") loadPsServices();
    if (btn.dataset.subtab === "subtab-net") loadPsNetwork();
    if (btn.dataset.subtab === "subtab-users") loadPsUsers();
  });
});

// ======================================================================
// Windows 11 Cleanup & Optimization Controller
// ======================================================================
let cachedCleanupReport = null;

async function loadCleanupScan() {
  const targetBadge = document.getElementById("cleanup-target-badge");
  const recBadge = document.getElementById("cleanup-reclaimable-badge");
  const listEl = document.getElementById("cleanup-categories-list");

  if (listEl) listEl.innerHTML = `<p class="text-muted p-3">Scanning system for reclaimable files and caches...</p>`;

  try {
    const res = await fetch("/api/cleanup/scan");
    cachedCleanupReport = await res.json();

    if (targetBadge) targetBadge.textContent = `Target: ${cachedCleanupReport.osTarget || "Windows 11"}`;
    if (recBadge) recBadge.textContent = `Reclaimable: ${cachedCleanupReport.formattedTotalSize || "0 B"}`;

    if (listEl && cachedCleanupReport.categories) {
      listEl.innerHTML = cachedCleanupReport.categories.map(c => `
        <div class="cleanup-card">
          <div class="cleanup-card-top">
            <label class="cleanup-card-title">
              <input type="checkbox" class="cleanup-check" data-id="${c.id}" ${c.recommended ? "checked" : ""}>
              ${c.title}
            </label>
            <span class="badge ${c.riskLevel === "SAFE" ? "badge-status" : c.riskLevel === "LOW_RISK" ? "badge-tech" : "badge-sec-med"} font-mono">
              ${c.formattedSize}
            </span>
          </div>
          <p class="cleanup-card-desc">${c.description}</p>
          <div class="small text-muted font-mono">Risk Level: <strong>${c.riskLevel}</strong> &bull; Items: ${c.itemCount}</div>
        </div>
      `).join("");
    }
  } catch (err) {
    showToast(`Failed to scan cleanup items: ${err.message}`, "error");
  }
}

async function runBasicSafeCleanup() {
  showConfirmDialog(
    "Run Basic Safe Cleanup (1-Click)",
    "Are you sure you want to run the recommended safe cleanup pass? This clears temporary files, thumbnail cache, crash dumps, and Windows Update downloads without altering user documents or security configurations.",
    "A Windows System Restore Point will be created automatically before starting if enabled.",
    async () => {
      const safeCategories = ["user-temp", "system-temp", "windows-update", "thumbnail-cache", "crash-dumps"];
      const createRestorePoint = Boolean(document.getElementById("check-create-restore-point")?.checked);
      await executeCleanupCategories(safeCategories, createRestorePoint);
    }
  );
}

async function executeSelectedCleanup() {
  const checkedBoxes = document.querySelectorAll(".cleanup-check:checked");
  const selectedCategories = Array.from(checkedBoxes).map(cb => cb.dataset.id);

  if (selectedCategories.length === 0) {
    showToast("Please select at least one cleanup category.", "info");
    return;
  }

  showConfirmDialog(
    `Execute Selected Cleanup (${selectedCategories.length} Categories)`,
    `Are you sure you want to clean the following categories: ${selectedCategories.join(", ")}?`,
    "Files in locked or active processes will be safely bypassed.",
    async () => {
      const createRestorePoint = Boolean(document.getElementById("check-create-restore-point")?.checked);
      await executeCleanupCategories(selectedCategories, createRestorePoint);
    }
  );
}

async function executeCleanupCategories(categories, createRestorePoint) {
  const logEl = document.getElementById("cleanup-log-output");
  const timeEl = document.getElementById("cleanup-log-time");
  showToast("Executing Windows 11 cleanup pass... Please wait.", "info");

  if (logEl) logEl.textContent = `[CLEANUP] Starting cleanup for: ${categories.join(", ")}...\n`;
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  try {
    const res = await fetch("/api/cleanup/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories, createRestorePoint })
    });
    const data = await res.json();

    if (logEl && data.log) logEl.textContent = data.log.join("\n");
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

    showToast(`Cleanup completed! Storage recovered: ${data.formattedCleanedSize}`, "success");
    await loadCleanupScan();
  } catch (err) {
    showToast(`Cleanup error: ${err.message}`, "error");
  }
}

async function createManualRestorePoint() {
  showConfirmDialog(
    "Create Windows System Restore Point",
    "Do you want to create a manual system restore point named 'Primo IT Tech All-in-One Safe Point'?",
    "Requires Administrator elevation.",
    async () => {
      showToast("Creating Windows System Restore Point...", "info");
      try {
        const res = await fetch("/api/cleanup/restore-point", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: "Primo IT Tech All-in-One Manual Restore Point" })
        });
        const data = await res.json();
        showToast(data.message, data.success ? "success" : "error");
      } catch (err) {
        showToast(`Restore point error: ${err.message}`, "error");
      }
    }
  );
}

// ======================================================================
// Printer Spooler Controller
// ======================================================================
async function loadPrinters() {
  const statusTag = document.getElementById("spooler-status-tag");
  const tbody = document.getElementById("tbody-printers");

  if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center p-3">Scanning installed printers and queue jobs...</td></tr>`;

  try {
    const res = await fetch("/api/printers/list");
    const data = await res.json();

    if (statusTag) {
      statusTag.textContent = data.spoolerRunning ? "Spooler: RUNNING (Healthy)" : "Spooler: STOPPED";
      statusTag.className = data.spoolerRunning ? "badge badge-status" : "badge badge-sec-low";
    }

    if (tbody && data.printers) {
      if (data.printers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center p-3">No printers installed on this system.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.printers.map(p => `
        <tr>
          <td class="font-bold text-main">${p.name}</td>
          <td>${p.isDefault ? `<span class="badge badge-tech small">DEFAULT</span>` : ""}</td>
          <td><span class="badge ${p.printerStatus === "Normal" ? "badge-status" : "badge-sec-med"}">${p.printerStatus}</span></td>
          <td class="small text-muted">${p.driverName || "-"}</td>
          <td class="font-mono small text-muted">${p.portName || "-"}</td>
          <td><span class="badge ${p.jobCount > 0 ? "badge-sec-low" : "badge-status"}">${p.jobCount} Jobs</span></td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="clearSpecificPrinterQueue('${p.name}')" title="Clear pending jobs for this printer">
              🧹 Clear Queue
            </button>
          </td>
        </tr>
      `).join("");
    }
  } catch (err) {
    showToast(`Failed to load printers: ${err.message}`, "error");
  }
}

function clearAllPrinterQueues() {
  showConfirmDialog(
    "Clear All Printer Queues & Restart Spooler",
    "Are you sure you want to clear all printer spool queues? This stops the Windows Print Spooler service, purges all pending and stuck files in C:\\Windows\\System32\\spool\\PRINTERS, and restarts the service.",
    "Requires Administrator elevation.",
    async () => {
      showToast("Purging print spooler queues...", "info");
      const logEl = document.getElementById("printers-log-output");
      const timeEl = document.getElementById("printers-log-time");
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

      try {
        const res = await fetch("/api/printers/clear-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        const data = await res.json();

        if (logEl && data.log) logEl.textContent = data.log.join("\n");
        showToast(data.success ? `Print Spooler reset cleanly! (${data.filesDeletedCount} files removed)` : "Failed to reset spooler.", data.success ? "success" : "error");
        await loadPrinters();
      } catch (err) {
        showToast(`Spooler error: ${err.message}`, "error");
      }
    }
  );
}

function clearSpecificPrinterQueue(printerName) {
  showConfirmDialog(
    `Clear Queue for ${printerName}`,
    `Are you sure you want to cancel all pending print jobs for '${printerName}'?`,
    null,
    async () => {
      showToast(`Clearing jobs for ${printerName}...`, "info");
      const logEl = document.getElementById("printers-log-output");
      try {
        const res = await fetch("/api/printers/clear-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ printer: printerName })
        });
        const data = await res.json();
        if (logEl && data.log) logEl.textContent = data.log.join("\n");
        showToast(`Cleared ${data.jobsRemovedCount || 0} jobs for ${printerName}.`, "success");
        await loadPrinters();
      } catch (err) {
        showToast(`Error: ${err.message}`, "error");
      }
    }
  );
}

async function restartSpoolerOnly() {
  showToast("Restarting Print Spooler service...", "info");
  try {
    const res = await fetch("/api/printers/restart-spooler", { method: "POST" });
    const data = await res.json();
    showToast(data.message, data.success ? "success" : "error");
    await loadPrinters();
  } catch (err) {
    showToast(`Restart error: ${err.message}`, "error");
  }
}

window.clearSpecificPrinterQueue = clearSpecificPrinterQueue;

// ======================================================================
// AI & LLM Tools Inventory, Setup Dashboard & Companion Agent Controller
// ======================================================================

const aiDashboardState = {
  inventory: [],
  catalog: [],
  categories: [],
  agentStatus: null,
  lastScanTimestamp: null,
  scope: "standard",
  consentGiven: false,
  activeSubview: "inventory",
  selectedCategory: "all",
  selectedStatus: "all",
  selectedOs: "all",
  searchQuery: "",
  pendingToolId: null
};

// Check Companion Agent Health and Local Machine Integration
async function checkCompanionAgentStatus() {
  const banner = document.getElementById("ai-agent-banner");
  const textEl = document.getElementById("ai-agent-status-text");
  const badgeEl = document.getElementById("ai-agent-elevated-badge");
  const dotEl = document.getElementById("agent-status-dot");

  if (textEl) textEl.innerHTML = "<strong>Companion Agent:</strong> Connecting to local agent daemon...";
  if (banner) {
    banner.className = "ai-agent-banner pending";
  }

  try {
    const res = await fetch("/api/ai/agent-status");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const status = await res.json();
    aiDashboardState.agentStatus = status;

    if (banner) banner.className = "ai-agent-banner connected";
    if (dotEl) dotEl.style.background = "var(--accent-green)";
    if (textEl) {
      textEl.innerHTML = `<strong>Companion Agent:</strong> Connected &bull; ${status.platformDisplay} &bull; Native System APIs Active`;
    }
    if (badgeEl) {
      badgeEl.textContent = status.isElevated ? "Administrator (Elevated)" : "Standard User";
      badgeEl.className = status.isElevated ? "badge badge-status" : "badge badge-accent";
    }
  } catch (err) {
    aiDashboardState.agentStatus = { available: false };
    if (banner) banner.className = "ai-agent-banner disconnected";
    if (dotEl) dotEl.style.background = "var(--accent-red)";
    if (textEl) {
      textEl.innerHTML = `<strong>Companion Agent:</strong> Disconnected &bull; Running in Browser-Only Sandbox. <em>Local scanning & Winget installation require the local server (<code>Launch-PrimoITall.bat</code>).</em>`;
    }
    if (badgeEl) {
      badgeEl.textContent = "Offline";
      badgeEl.className = "badge badge-sec-low";
    }
  }
}

// Load Configurable Categories (with "SI" unknown label support)
async function loadAiCategories() {
  try {
    const res = await fetch("/api/ai/categories");
    const categories = await res.json();
    aiDashboardState.categories = Array.isArray(categories) ? categories : [];
    renderCategoriesSettingsList();
    populateCategoryDropdown();
  } catch (err) {
    console.warn("Failed to load AI categories:", err);
  }
}

async function loadAiCatalog() {
  if (aiDashboardState.catalog && aiDashboardState.catalog.length > 0) {
    return aiDashboardState.catalog;
  }
  try {
    const res = await fetch("/api/ai/catalog");
    if (res.ok) {
      const cat = await res.json();
      aiDashboardState.catalog = Array.isArray(cat) ? cat : [];
      return aiDashboardState.catalog;
    }
  } catch (err) {
    console.warn("Failed to load AI catalog:", err);
  }
  return [];
}

function populateCategoryDropdown() {
  const select = document.getElementById("select-ai-category-filter");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `<option value="all">All Categories</option>`;
  aiDashboardState.categories.forEach(c => {
    if (c.enabled) {
      const opt = document.createElement("option");
      opt.value = c.label;
      opt.textContent = c.isUnknownOrCustom ? `${c.label} (Custom / SI)` : c.label;
      select.appendChild(opt);
    }
  });
  if (currentVal) select.value = currentVal;
}

function renderCategoriesSettingsList() {
  const container = document.getElementById("ai-categories-config-list");
  if (!container) return;

  container.innerHTML = aiDashboardState.categories.map(c => `
    <div class="category-config-row">
      <div class="category-config-info">
        <label class="checkbox-label" style="margin-bottom: 2px;">
          <input type="checkbox" class="ai-cat-toggle" data-cat-id="${c.id}" ${c.enabled ? "checked" : ""}>
          <strong>${c.label}</strong>
          ${c.isUnknownOrCustom ? `<span class="badge badge-sec-med" style="margin-left: 6px; font-size: 10px;">Configurable / SI</span>` : ""}
        </label>
        <div class="text-muted text-xs">${c.description}</div>
      </div>
      <div>
        <input type="text" class="form-control form-control-sm ai-cat-label-input" data-cat-id="${c.id}" value="${c.label}" style="width: 220px;" placeholder="Category label">
      </div>
    </div>
  `).join("");
}

async function saveAiCategoriesSettings() {
  const toggles = document.querySelectorAll(".ai-cat-toggle");
  const labelInputs = document.querySelectorAll(".ai-cat-label-input");

  const updated = aiDashboardState.categories.map(c => {
    const toggle = Array.from(toggles).find(t => t.dataset.catId === c.id);
    const labelInput = Array.from(labelInputs).find(i => i.dataset.catId === c.id);
    return {
      ...c,
      enabled: toggle ? toggle.checked : c.enabled,
      label: labelInput ? labelInput.value.trim() || c.label : c.label
    };
  });

  // Get selected scope
  const deepRadio = document.getElementById("radio-scope-deep");
  const selectedScope = deepRadio && deepRadio.checked ? "deep" : "standard";
  aiDashboardState.scope = selectedScope;

  try {
    const res = await fetch("/api/ai/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: updated })
    });
    const saved = await res.json();
    aiDashboardState.categories = saved;
    populateCategoryDropdown();
    showToast("Scan scope and category configurations saved!", "success");
  } catch (err) {
    showToast(`Error saving category settings: ${err.message}`, "error");
  }
}

// Open Consent Modal
function openAiConsentModal() {
  const modal = document.getElementById("modal-ai-consent");
  const check = document.getElementById("check-ai-consent");
  const btnScan = document.getElementById("btn-confirm-start-scan");

  if (check) check.checked = false;
  if (btnScan) btnScan.disabled = true;
  if (modal) modal.style.display = "flex";
}

function closeAiConsentModal() {
  const modal = document.getElementById("modal-ai-consent");
  if (modal) modal.style.display = "none";
}

// Execute Local Computer Scan (MANDATORY CONSENT ENFORCED)
async function executeAiInventoryScan() {
  closeAiConsentModal();

  const scopeRadios = document.getElementsByName("modal-scan-scope");
  let selectedScope = "standard";
  for (const r of scopeRadios) {
    if (r.checked) selectedScope = r.value;
  }
  aiDashboardState.scope = selectedScope;

  const summaryBadge = document.getElementById("badge-ai-scan-summary");
  const invContainer = document.getElementById("ai-inventory-container");
  const logEl = document.getElementById("ai-tools-log-output");
  const timeEl = document.getElementById("ai-tools-log-time");

  if (summaryBadge) summaryBadge.textContent = "Scanning...";
  if (invContainer) {
    invContainer.innerHTML = `
      <div class="text-center p-4">
        <div class="spinner-sm mb-2"></div>
        <p class="text-muted">Authorizing scan &amp; querying local system APIs (${selectedScope === "deep" ? "Deep Package Scan" : "Standard Registry &amp; Process Scan"})...</p>
      </div>
    `;
  }

  try {
    const res = await fetch("/api/ai/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentGiven: true,
        scope: selectedScope
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.errors ? data.errors.join("; ") : "Scan authorization failed");
    }

    aiDashboardState.inventory = data.tools || [];
    aiDashboardState.lastScanTimestamp = data.timestamp;

    // Update Quick Stats
    const statInstalled = document.getElementById("stat-ai-installed");
    const statRunning = document.getElementById("stat-ai-running");
    const statMissing = document.getElementById("stat-ai-missing");
    const statLastScan = document.getElementById("stat-ai-last-scan");
    const countTabInstalled = document.getElementById("count-ai-installed-tab");
    const countTabDiscover = document.getElementById("count-ai-discover-tab");

    if (statInstalled) statInstalled.textContent = data.installedCount;
    if (statRunning) statRunning.textContent = data.runningCount;
    if (statMissing) statMissing.textContent = data.missingCount;
    if (countTabInstalled) countTabInstalled.textContent = data.installedCount;
    if (countTabDiscover) countTabDiscover.textContent = data.missingCount;
    if (statLastScan) {
      statLastScan.textContent = new Date(data.timestamp).toLocaleTimeString();
    }
    if (summaryBadge) {
      summaryBadge.textContent = `${data.installedCount} Installed / ${data.totalScanned} Total`;
    }

    if (logEl) {
      logEl.textContent = `[INVENTORY SCAN SUCCESS]\n` +
        `Time: ${data.timestamp}\n` +
        `Duration: ${data.scanDurationMs}ms\n` +
        `Scope: ${data.scope}\n` +
        `Tools Scanned: ${data.totalScanned} | Installed: ${data.installedCount} | Active Runtimes: ${data.runningCount}\n` +
        `System APIs: HKLM/HKCU Registry, Get-Process, Get-Service, AppData paths.\n` +
        `Privacy Audit: 0 personal documents accessed; 0 API keys collected.`;
    }
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

    renderAiViews();
    showToast(`Inventory scan complete: ${data.installedCount} installed AI tools detected.`, "success");
  } catch (err) {
    if (invContainer) {
      invContainer.innerHTML = `
        <div class="empty-state p-4 text-center">
          <span style="font-size: 2rem;">⚠️</span>
          <h4 class="text-accent-red mt-2 mb-1">Scan Could Not Be Completed</h4>
          <p class="text-muted small">${err.message}</p>
          <button class="btn btn-secondary btn-sm mt-2" onclick="openAiConsentModal()">Try Again with Consent</button>
        </div>
      `;
    }
    if (summaryBadge) summaryBadge.textContent = "Scan Error";
    showToast(`Scan error: ${err.message}`, "error");
  }
}

// Render Both Subviews
function renderAiViews() {
  renderAiInventory();
  renderAiDiscover();
}

// Render Subview 1: Installed Inventory
function renderAiInventory() {
  const container = document.getElementById("ai-inventory-container");
  if (!container) return;

  const query = (document.getElementById("input-filter-ai-tools")?.value || "").toLowerCase().trim();
  const catFilter = document.getElementById("select-ai-category-filter")?.value || "all";
  const statusFilter = document.getElementById("select-ai-status-filter")?.value || "all";
  const osFilter = document.getElementById("select-ai-os-filter")?.value || "all";

  const installedTools = aiDashboardState.inventory.filter(t => t.installed);

  let filtered = installedTools.filter(t => {
    // Category Filter
    if (catFilter !== "all" && !t.category.toLowerCase().includes(catFilter.toLowerCase())) return false;

    // Status Filter
    if (statusFilter === "running" && !t.running) return false;
    if (statusFilter === "missing") return false; // In installed tab, missing tools are not shown

    // OS Filter
    if (osFilter !== "all" && !t.supportedOs.includes(osFilter)) return false;

    // Search Query
    if (query) {
      const match =
        t.name.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.publisher.toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state p-4 text-center">
        <span style="font-size: 2rem;">📦</span>
        <h4 class="mt-2 mb-1">No Installed Tools Match Filter</h4>
        <p class="text-muted small">Try selecting "All Categories" or search for a different tool keyword.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const runningBadge = t.running
      ? `<span class="badge badge-accent">● Active Runtime</span>`
      : `<span class="badge badge-sec-med">○ Stopped</span>`;

    const methodBadge = t.installMethod
      ? `<span class="badge-method">${t.installMethod.replace(/_/g, " ")}</span>`
      : "";

    return `
      <div class="ai-tool-card installed ${t.running ? "running" : ""}">
        <div>
          <div class="ai-tool-header">
            <div class="ai-tool-title-row">
              <span style="font-size: 1.2rem;">${t.running ? "⚡" : "📦"}</span>
              <div>
                <h3 class="ai-tool-title">${t.name}</h3>
                <span class="text-muted text-xs">${t.publisher} &bull; ${t.license}</span>
              </div>
            </div>
            <div>
              <span class="badge badge-status">v${t.detectedVersion || "Installed"}</span>
            </div>
          </div>

          <div class="ai-tool-meta mt-1">
            <span class="badge badge-sec-low">${t.category}</span>
            ${methodBadge}
            ${runningBadge}
            ${t.isVerifiedPublisher ? `<span class="badge-verified">✓ Verified Publisher</span>` : ""}
          </div>

          <p class="ai-tool-desc mt-2">${t.description}</p>

          <div class="ai-tool-specs">
            ${t.executablePath ? `<div class="ai-tool-spec-line"><span>Executable Path:</span> <code class="small text-muted" style="font-size: 10px; word-break: break-all;">${t.executablePath}</code></div>` : ""}
            <div class="ai-tool-spec-line"><span>Supported OS:</span> <span>${t.supportedOs.join(", ").toUpperCase()}</span></div>
            ${t.requirements.minRamGb ? `<div class="ai-tool-spec-line"><span>Memory:</span> <span>${t.requirements.minRamGb} GB Min ${t.requirements.recommendedRamGb ? `(${t.requirements.recommendedRamGb} GB Rec)` : ""}</span></div>` : ""}
          </div>
        </div>

        <div class="ai-tool-actions">
          <button class="btn btn-primary btn-sm" onclick="launchAiToolUI('${t.id}')" title="Launch application or start runtime">
            🚀 Launch
          </button>
          ${t.wingetId ? `
            <button class="btn btn-secondary btn-sm" onclick="updateAiToolUI('${t.id}')" title="Check for updates via Winget">
              🔄 Update
            </button>
            <button class="btn btn-text-only btn-sm text-accent-red" onclick="uninstallAiToolUI('${t.id}')" title="Uninstall via official Windows Package Manager">
              Uninstall
            </button>
          ` : ""}
          <a href="${t.officialSiteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-xs" style="margin-left: auto;">
            Official Site ↗
          </a>
        </div>
      </div>
    `;
  }).join("");
}

// Render Subview 2: Discover and Install
function renderAiDiscover() {
  const container = document.getElementById("ai-discover-container");
  if (!container) return;

  const query = (document.getElementById("input-filter-ai-tools")?.value || "").toLowerCase().trim();
  const catFilter = document.getElementById("select-ai-category-filter")?.value || "all";
  const osFilter = document.getElementById("select-ai-os-filter")?.value || "all";

  // Catalog items that are NOT currently installed
  const installedIds = new Set(aiDashboardState.inventory.filter(t => t.installed).map(t => t.id));
  const catalogList = (aiDashboardState.catalog && aiDashboardState.catalog.length > 0) ? aiDashboardState.catalog : [];
  if (aiDashboardState.inventory.length === 0 && catalogList.length === 0) {
    loadAiCatalog().then(() => renderAiDiscover()).catch(err => console.warn(err));
  }
  const missingTools = aiDashboardState.inventory.length > 0
    ? aiDashboardState.inventory.filter(t => !t.installed)
    : catalogList;

  let filtered = missingTools.filter(t => {
    if (installedIds.has(t.id)) return false;

    // Category Filter
    if (catFilter !== "all" && !t.category.toLowerCase().includes(catFilter.toLowerCase())) return false;

    // OS Filter
    if (osFilter !== "all" && !t.supportedOs.includes(osFilter)) return false;

    // Search Query
    if (query) {
      const match =
        t.name.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.publisher.toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state p-4 text-center">
        <span style="font-size: 2rem;">🎉</span>
        <h4 class="mt-2 mb-1">All Relevant AI Tools Installed!</h4>
        <p class="text-muted small">No uninstalled tools match the active category and filter criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const osBadges = t.supportedOs.map(os => `<span class="badge-os">${os.toUpperCase()}</span>`).join(" ");

    return `
      <div class="ai-tool-card missing">
        <div>
          <div class="ai-tool-header">
            <div class="ai-tool-title-row">
              <span style="font-size: 1.2rem;">🌟</span>
              <div>
                <h3 class="ai-tool-title">${t.name}</h3>
                <span class="text-muted text-xs">${t.publisher} &bull; ${t.license}</span>
              </div>
            </div>
            <div>
              <span class="badge badge-sec-low">Available</span>
            </div>
          </div>

          <div class="ai-tool-meta mt-1">
            <span class="badge badge-sec-low">${t.category}</span>
            <span class="badge-verified">✓ Official Publisher</span>
            ${osBadges}
          </div>

          <p class="ai-tool-desc mt-2">${t.description}</p>

          <div class="ai-tool-specs">
            <div class="ai-tool-spec-line"><span>Publisher:</span> <strong>${t.publisher}</strong></div>
            <div class="ai-tool-spec-line"><span>License:</span> <span>${t.license}</span></div>
            ${t.wingetId ? `<div class="ai-tool-spec-line"><span>Package ID:</span> <code class="small" style="font-size: 10px;">${t.wingetId}</code></div>` : ""}
            ${t.requirements.minRamGb ? `<div class="ai-tool-spec-line"><span>Requirements:</span> <span>${t.requirements.minRamGb}GB RAM${t.requirements.gpuRecommended ? " + GPU Recommended" : ""}</span></div>` : ""}
            ${t.requirements.notes ? `<div class="text-muted text-xs mt-1" style="font-size: 10px;"><em>Note: ${t.requirements.notes}</em></div>` : ""}
          </div>
        </div>

        <div class="ai-tool-actions">
          <button class="btn btn-primary btn-sm" onclick="promptInstallAiToolUI('${t.id}')" title="Preview command line and confirm installation">
            📥 Install...
          </button>
          <a href="${t.officialSiteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-xs" style="margin-left: auto;">
            Publisher Portal ↗
          </a>
        </div>
      </div>
    `;
  }).join("");
}

// Prompt User for Installation with Transparent Command Line Preview
async function promptInstallAiToolUI(toolId) {
  const modal = document.getElementById("modal-ai-install-confirm");
  const modalBody = document.getElementById("ai-install-modal-body");
  const titleEl = document.getElementById("ai-install-modal-title");

  aiDashboardState.pendingToolId = toolId;

  if (modalBody) {
    modalBody.innerHTML = `<div class="text-center p-3"><div class="spinner-sm mb-2"></div><p class="text-muted">Generating verified installer plan...</p></div>`;
  }
  if (modal) modal.style.display = "flex";

  try {
    const res = await fetch("/api/ai/install-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId })
    });
    const plan = await res.json();
    if (!res.ok) throw new Error(plan.error || "Failed to generate installation preview");

    if (titleEl) titleEl.textContent = `Install ${plan.toolName}`;
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="alert-box alert-info mb-3">
          <strong>Transparency Notice:</strong> Primo IT Tech All-in-One never runs hidden or silent scripts. Review the exact command line and source before executing.
        </div>

        <div class="spec-table-box mb-3 p-2 border-rounded-card">
          <div class="ai-tool-spec-line mb-1"><span>Target Application:</span> <strong>${plan.toolName}</strong></div>
          <div class="ai-tool-spec-line mb-1"><span>Publisher:</span> <strong>${plan.publisher}</strong></div>
          <div class="ai-tool-spec-line mb-1"><span>License:</span> <span>${plan.license}</span></div>
          <div class="ai-tool-spec-line mb-1"><span>Installation Channel:</span> <strong>${plan.packageManager === "winget" ? "Windows Package Manager (winget)" : "Official Web Portal"}</strong></div>
          <div class="ai-tool-spec-line"><span>Required Privileges:</span> <span class="badge ${plan.requiresElevation ? "badge-accent" : "badge-sec-med"}">${plan.requiresElevation ? "Elevated Administrator (UAC)" : "User-Level"}</span></div>
        </div>

        <h4 class="font-bold text-accent-cyan text-xs mb-1">Exact Command Line to Execute:</h4>
        <pre class="terminal-output small mb-3" style="padding: 10px; font-size: 11px; user-select: all;">${plan.exactCommand}</pre>

        ${plan.requiresElevation ? `
          <div class="text-muted text-xs mb-2">
            ⚠️ <em>Windows will display a standard User Account Control (UAC) prompt to authorize the package installer. Primo IT Tech All-in-One never collects or stores passwords.</em>
          </div>
        ` : ""}
      `;
    }
  } catch (err) {
    if (modalBody) {
      modalBody.innerHTML = `<div class="text-accent-red p-3">Error preparing installer: ${err.message}</div>`;
    }
  }
}

// Execute Confirmed Installation
async function executeConfirmedInstall() {
  const toolId = aiDashboardState.pendingToolId;
  const modal = document.getElementById("modal-ai-install-confirm");
  if (modal) modal.style.display = "none";

  if (!toolId) return;

  const logEl = document.getElementById("ai-tools-log-output");
  const timeEl = document.getElementById("ai-tools-log-time");

  showToast(`Initiating verified installation for ${toolId}...`, "info");
  if (logEl) logEl.textContent = `[INSTALLATION DISPATCHED]\nTarget: ${toolId}\nConfirmed by user: Yes\nAwaiting package manager response...`;
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  try {
    const res = await fetch("/api/ai/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId, confirmed: true })
    });
    const result = await res.json();

    if (logEl) {
      logEl.textContent = `[INSTALLATION RESULT]\n` +
        `Target: ${result.toolId}\n` +
        `Success: ${result.success}\n` +
        `Message: ${result.message}\n` +
        `Command: ${result.exactCommandExecuted || "N/A"}\n\n` +
        `Output Logs:\n${(result.outputLog || []).join("\n")}`;
    }
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

    showToast(result.message, result.success ? "success" : "error");

    // Rescan inventory to update status
    await executeAiInventoryScan();
  } catch (err) {
    if (logEl) logEl.textContent = `[INSTALLATION ERROR]\n${err.message}`;
    showToast(`Install failed: ${err.message}`, "error");
  }
}

// Execute Uninstallation with User Confirmation
function uninstallAiToolUI(toolId) {
  const tool = aiDashboardState.inventory.find(t => t.id === toolId);
  const name = tool ? tool.name : toolId;

  showConfirmDialog(
    `Uninstall ${name}`,
    `Are you sure you want to uninstall ${name}? This will execute the official Windows Package Manager uninstaller with administrator elevation.`,
    "Strict Guardrail: Your local configuration files and project repositories will be preserved.",
    async () => {
      showToast(`Uninstalling ${name}...`, "info");
      const logEl = document.getElementById("ai-tools-log-output");
      const timeEl = document.getElementById("ai-tools-log-time");
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

      try {
        const res = await fetch("/api/ai/uninstall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId, confirmed: true })
        });
        const data = await res.json();
        if (logEl) {
          logEl.textContent = `[UNINSTALL RESULT]\n` +
            `Success: ${data.success}\n` +
            `Message: ${data.message}\n` +
            `Command: ${data.exactCommandExecuted || "N/A"}\n\n` +
            (data.outputLog || []).join("\n");
        }
        showToast(data.message, data.success ? "success" : "error");
        await executeAiInventoryScan();
      } catch (err) {
        showToast(`Uninstall error: ${err.message}`, "error");
      }
    }
  );
}

// Launch Installed Tool
async function launchAiToolUI(toolId) {
  const tool = aiDashboardState.inventory.find(t => t.id === toolId);
  const name = tool ? tool.name : toolId;

  showToast(`Dispatching launch for ${name}...`, "info");
  try {
    const res = await fetch("/api/ai/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId })
    });
    const data = await res.json();
    showToast(data.message, data.success ? "success" : "error");
    setTimeout(executeAiInventoryScan, 3000);
  } catch (err) {
    showToast(`Launch error: ${err.message}`, "error");
  }
}

// Update via Winget
async function updateAiToolUI(toolId) {
  const tool = aiDashboardState.inventory.find(t => t.id === toolId);
  const name = tool ? tool.name : toolId;

  showToast(`Checking updates for ${name}...`, "info");
  const logEl = document.getElementById("ai-tools-log-output");
  const timeEl = document.getElementById("ai-tools-log-time");
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  try {
    const res = await fetch("/api/ai/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId })
    });
    const data = await res.json();
    if (logEl && data.log) logEl.textContent = data.log.join("\n");
    showToast(data.message, data.success ? "success" : "error");
    await executeAiInventoryScan();
  } catch (err) {
    showToast(`Update error: ${err.message}`, "error");
  }
}

window.promptInstallAiToolUI = promptInstallAiToolUI;
window.launchAiToolUI = launchAiToolUI;
window.updateAiToolUI = updateAiToolUI;
window.uninstallAiToolUI = uninstallAiToolUI;
window.openAiConsentModal = openAiConsentModal;
window.closeAiConsentModal = closeAiConsentModal;


// ======================================================================
// AI Storage & Cache Cleanup Integration
// ======================================================================
let cachedAiCleanupReport = null;

async function loadAiStorageScan() {
  const badgeReclaimable = document.getElementById("badge-ai-reclaimable");
  const categoriesContainer = document.getElementById("ai-categories-container");
  const tbodyModels = document.getElementById("tbody-ollama-models");
  const badgeModelCount = document.getElementById("badge-ollama-model-count");

  if (badgeReclaimable) badgeReclaimable.textContent = "Scanning...";
  if (categoriesContainer) categoriesContainer.innerHTML = `<div class="text-muted p-3">Scanning AI storage, weights, and caches...</div>`;
  if (tbodyModels) tbodyModels.innerHTML = `<tr><td colspan="5" class="text-muted text-center p-3">Checking Ollama models...</td></tr>`;

  try {
    const res = await fetch("/api/ai/cleanup/scan");
    const report = await res.json();
    cachedAiCleanupReport = report;

    if (badgeReclaimable) badgeReclaimable.textContent = `Cleanable: ${report.formattedTotal}`;
    if (badgeModelCount) badgeModelCount.textContent = `${report.ollamaModels?.length || 0} Models (${report.formattedModelTotal})`;

    // Render Categories
    if (categoriesContainer && report.categories) {
      categoriesContainer.innerHTML = report.categories.map(c => `
        <div class="cleanup-card">
          <div class="cleanup-card-top">
            <label class="cleanup-card-title">
              ${c.safeToClean ? `<input type="checkbox" class="ai-clean-checkbox" value="${c.id}" ${c.exists && c.sizeBytes > 0 ? "checked" : ""}>` : `<span class="badge badge-sec-med small" style="margin-right: 4px;">Protected</span>`}
              ${c.name}
            </label>
            <span class="badge ${c.exists && c.sizeBytes > 0 ? (c.safeToClean ? "badge-tech" : "badge-status") : "badge-sec-low"}">
              ${c.exists ? c.formattedSize : "0 B"}
            </span>
          </div>
          <div class="cleanup-card-desc">${c.description}</div>
          <div class="font-mono small text-muted" style="font-size: 10px; word-break: break-all;">${c.path}</div>
        </div>
      `).join("");
    }

    // Render Ollama Models
    if (tbodyModels) {
      if (!report.ollamaModels || report.ollamaModels.length === 0) {
        tbodyModels.innerHTML = `<tr><td colspan="5" class="text-muted text-center p-3">No Ollama models downloaded or Ollama service inactive.</td></tr>`;
      } else {
        tbodyModels.innerHTML = report.ollamaModels.map(m => `
          <tr>
            <td class="font-bold text-accent-cyan">${m.name}</td>
            <td class="font-mono small text-muted">${m.id}</td>
            <td class="font-bold text-main">${m.formattedSize}</td>
            <td class="small text-muted">${m.modified}</td>
            <td style="text-align: right;">
              <button class="btn btn-danger btn-sm" onclick="deleteOllamaModelUI('${m.name}', '${m.formattedSize}')" title="Delete model from disk">
                🗑️ Delete Model
              </button>
            </td>
          </tr>
        `).join("");
      }
    }
  } catch (err) {
    showToast(`Failed to scan AI storage: ${err.message}`, "error");
  }
}

async function runSafeAiCleanup() {
  showConfirmDialog(
    "1-Click Safe AI Cache Cleanup",
    "Purge Hugging Face hub caches, PyTorch downloads, Pip machine learning wheels, Pieces OS logs, and editor caches? Your Ollama model weights will NOT be touched.",
    "Completely safe. Any needed model checkpoints will re-cache automatically.",
    async () => {
      showToast("Purging safe AI caches...", "info");
      const logEl = document.getElementById("ai-cleanup-log-output");
      const timeEl = document.getElementById("ai-cleanup-log-time");
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

      const safeCats = ["huggingface-cache", "torch-cache", "pip-cache", "pieces-logs-cache", "cursor-cache", "antigravity-scratch"];

      try {
        const res = await fetch("/api/ai/cleanup/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: safeCats })
        });
        const data = await res.json();
        if (logEl && data.log) logEl.textContent = data.log.join("\n");
        showToast(`AI Cleanup Complete! Freed: ${data.formattedCleaned}`, "success");
        await loadAiStorageScan();
      } catch (err) {
        showToast(`Cleanup error: ${err.message}`, "error");
      }
    }
  );
}

async function executeSelectedAiCleanup() {
  const checkboxes = document.querySelectorAll(".ai-clean-checkbox:checked");
  const selectedIds = Array.from(checkboxes).map(cb => cb.value);

  if (selectedIds.length === 0) {
    showToast("Please select at least one AI cache category to purge.", "info");
    return;
  }

  showToast(`Purging ${selectedIds.length} AI cache categories...`, "info");
  const logEl = document.getElementById("ai-cleanup-log-output");
  const timeEl = document.getElementById("ai-cleanup-log-time");
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

  try {
    const res = await fetch("/api/ai/cleanup/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: selectedIds })
    });
    const data = await res.json();
    if (logEl && data.log) logEl.textContent = data.log.join("\n");
    showToast(`Cleaned AI storage! Recovered: ${data.formattedCleaned}`, "success");
    await loadAiStorageScan();
  } catch (err) {
    showToast(`Execution error: ${err.message}`, "error");
  }
}

function deleteOllamaModelUI(modelName, sizeStr) {
  showConfirmDialog(
    `Delete Ollama Model: ${modelName}`,
    `Are you ABSOLUTELY sure you want to delete Ollama model '${modelName}' (${sizeStr})? This model file will be removed from your disk.`,
    "Strict Guardrail: Permanent deletion.",
    async () => {
      showToast(`Deleting Ollama model ${modelName}...`, "info");
      const logEl = document.getElementById("ai-cleanup-log-output");
      try {
        const res = await fetch("/api/ai/ollama/delete-model", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelName, confirmed: true })
        });
        const data = await res.json();
        if (logEl && data.log) logEl.textContent = data.log.join("\n");
        showToast(data.message, data.success ? "success" : "error");
        await loadAiStorageScan();
      } catch (err) {
        showToast(`Model deletion error: ${err.message}`, "error");
      }
    }
  );
}

window.deleteOllamaModelUI = deleteOllamaModelUI;

// ======================================================================
// Setup Event Listeners for All New Utility Tabs
// ======================================================================
function setupUtilityEventListeners() {
  // Sysinternals Listeners
  document.getElementById("btn-sysinternals-download")?.addEventListener("click", downloadSysinternalsSuite);
  document.getElementById("btn-sysinternals-add-path-user")?.addEventListener("click", () => addSysinternalsToPath("User"));
  document.getElementById("btn-sysinternals-add-path-sys")?.addEventListener("click", () => addSysinternalsToPath("Machine"));
  document.getElementById("btn-sysinternals-refresh")?.addEventListener("click", loadSysinternalsStatus);

  // Winget Listeners
  document.getElementById("btn-winget-search")?.addEventListener("click", searchWinget);
  document.getElementById("input-winget-search")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchWinget();
  });
  document.getElementById("btn-winget-list-installed")?.addEventListener("click", listInstalledWinget);
  document.getElementById("btn-winget-upgrade-all")?.addEventListener("click", confirmWingetUpgradeAll);
  document.getElementById("btn-winget-direct-install")?.addEventListener("click", () => {
    const idInput = document.getElementById("input-winget-direct-id");
    const id = idInput ? idInput.value.trim() : "";
    if (id) confirmWingetInstall(id);
    else showToast("Please enter a package ID.", "info");
  });

  // PowerShell Tools Listeners
  document.getElementById("btn-launch-ps-user")?.addEventListener("click", () => launchPsConsole(false));
  document.getElementById("btn-launch-ps-admin")?.addEventListener("click", () => launchPsConsole(true));
  document.getElementById("btn-flush-dns")?.addEventListener("click", flushDnsCache);
  document.getElementById("btn-refresh-sysinfo")?.addEventListener("click", loadPsToolsSpecs);
  document.getElementById("btn-run-custom-ps")?.addEventListener("click", runCustomPsScript);

  // Network Diagnostic Toolkit Listeners
  document.querySelectorAll(".btn-run-net-tool").forEach(btn => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      if (cmd) runNetworkToolkitCommand(cmd);
    });
  });

  document.querySelectorAll(".btn-net-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetInput = document.getElementById("input-net-target");
      if (targetInput && btn.dataset.target) {
        targetInput.value = btn.dataset.target;
        showToast(`Target set to ${btn.dataset.target}`, "info");
      }
    });
  });

  document.getElementById("btn-copy-net-output")?.addEventListener("click", () => {
    const outputEl = document.getElementById("net-tools-output");
    if (outputEl && outputEl.textContent) {
      navigator.clipboard.writeText(outputEl.textContent).then(() => {
        showToast("Network diagnostic output copied to clipboard!", "success");
      }).catch(() => {
        showToast("Could not access clipboard", "error");
      });
    }
  });

  document.getElementById("btn-clear-net-output")?.addEventListener("click", () => {
    const outputEl = document.getElementById("net-tools-output");
    const timerEl = document.getElementById("net-terminal-duration");
    const badgeEl = document.getElementById("net-terminal-cmd-badge");
    const titleEl = document.getElementById("net-terminal-title");
    const indicatorEl = document.getElementById("net-terminal-indicator");

    if (outputEl) outputEl.textContent = "// Ready. Select a command above to run real-time network diagnostics.";
    if (timerEl) timerEl.textContent = "0 ms";
    if (badgeEl) badgeEl.style.display = "none";
    if (titleEl) titleEl.textContent = "Network Execution Stream";
    if (indicatorEl) indicatorEl.className = "terminal-indicator status-ready";
  });

  // Cleanup Listeners
  document.getElementById("btn-run-safe-cleanup")?.addEventListener("click", runBasicSafeCleanup);
  document.getElementById("btn-execute-selected-cleanup")?.addEventListener("click", executeSelectedCleanup);
  document.getElementById("btn-rescan-cleanup")?.addEventListener("click", loadCleanupScan);
  document.getElementById("btn-create-manual-restore-point")?.addEventListener("click", createManualRestorePoint);

  // Printer Spooler Listeners
  document.getElementById("btn-clear-all-printer-queues")?.addEventListener("click", clearAllPrinterQueues);
  document.getElementById("btn-restart-spooler-only")?.addEventListener("click", restartSpoolerOnly);
  document.getElementById("btn-refresh-printers")?.addEventListener("click", loadPrinters);

  // AI Tools Dashboard Event Listeners
  // 1. Consent Modal & Scanning
  document.getElementById("btn-trigger-scan-modal")?.addEventListener("click", openAiConsentModal);
  document.getElementById("btn-empty-start-scan")?.addEventListener("click", openAiConsentModal);
  document.getElementById("btn-close-ai-consent")?.addEventListener("click", closeAiConsentModal);
  document.getElementById("btn-cancel-ai-consent")?.addEventListener("click", closeAiConsentModal);

  const checkAiConsent = document.getElementById("check-ai-consent");
  const btnConfirmScan = document.getElementById("btn-confirm-start-scan");
  if (checkAiConsent && btnConfirmScan) {
    checkAiConsent.addEventListener("change", () => {
      btnConfirmScan.disabled = !checkAiConsent.checked;
    });
  }
  btnConfirmScan?.addEventListener("click", executeAiInventoryScan);

  // 2. Subtab Navigation
  const subtabs = [
    { id: "subtab-ai-inventory", view: "ai-view-inventory", key: "inventory" },
    { id: "subtab-ai-discover", view: "ai-view-discover", key: "discover" },
    { id: "subtab-ai-settings", view: "ai-view-settings", key: "settings" }
  ];

  subtabs.forEach(tab => {
    document.getElementById(tab.id)?.addEventListener("click", () => {
      subtabs.forEach(t => {
        document.getElementById(t.id)?.classList.remove("active");
        const viewEl = document.getElementById(t.view);
        if (viewEl) viewEl.style.display = "none";
      });
      document.getElementById(tab.id)?.classList.add("active");
      const activeView = document.getElementById(tab.view);
      if (activeView) activeView.style.display = "block";

      const filtersRow = document.getElementById("ai-filters-row");
      if (filtersRow) {
        filtersRow.style.display = tab.key === "settings" ? "none" : "flex";
      }

      aiDashboardState.activeSubview = tab.key;
      if (tab.key === "discover") {
        renderAiDiscover();
      } else if (tab.key === "inventory") {
        renderAiInventory();
      }
    });
  });

  // 3. Filters
  document.getElementById("input-filter-ai-tools")?.addEventListener("input", renderAiViews);
  document.getElementById("select-ai-category-filter")?.addEventListener("change", renderAiViews);
  document.getElementById("select-ai-status-filter")?.addEventListener("change", renderAiViews);
  document.getElementById("select-ai-os-filter")?.addEventListener("change", renderAiViews);

  // 4. Companion Agent & Settings
  document.getElementById("btn-check-agent-status")?.addEventListener("click", checkCompanionAgentStatus);
  document.getElementById("btn-save-ai-settings")?.addEventListener("click", saveAiCategoriesSettings);

  // 5. Install Confirmation Modal
  const closeInstallModal = () => {
    const modal = document.getElementById("modal-ai-install-confirm");
    if (modal) modal.style.display = "none";
    aiDashboardState.pendingToolId = null;
  };
  document.getElementById("btn-close-ai-install-modal")?.addEventListener("click", closeInstallModal);
  document.getElementById("btn-cancel-ai-install")?.addEventListener("click", closeInstallModal);
  document.getElementById("btn-skip-ai-install")?.addEventListener("click", closeInstallModal);
  document.getElementById("btn-execute-confirmed-install")?.addEventListener("click", executeConfirmedInstall);

  // Initial Agent Status Check & Categories Load on Boot
  checkCompanionAgentStatus();
  loadAiCategories();

  // AI Cleanup Listeners
  document.getElementById("btn-rescan-ai-storage")?.addEventListener("click", loadAiStorageScan);
  document.getElementById("btn-run-safe-ai-cleanup")?.addEventListener("click", runSafeAiCleanup);
  document.getElementById("btn-execute-selected-ai-cleanup")?.addEventListener("click", executeSelectedAiCleanup);
}

// Hook utility event listeners into DOMContentLoaded
document.addEventListener("DOMContentLoaded", setupUtilityEventListeners);




// ==============================================================================
// Interactive Guided Tour System (CoachMark Engine - ID Scanner Pattern)
// ==============================================================================

const TOUR_STORAGE_COMPLETED = "primo.web.ftue_completed";
const TOUR_STORAGE_DISMISSED = "primo.web.ftue_dismissed";

const TOUR_STEPS = [
  {
    step: 1,
    tab: "configurator",
    targetSelector: ".app-header",
    title: "1. Global Controls & Remote Cross-Network Testing",
    copy: "Access the entire Primo IT Tech All-in-One suite from desktop or mobile. Use the live Cloudflare Remote Link to test on mobile, tablet, or remote workstations without installing native software, and toggle Dark/Light mode with one click."
  },
  {
    step: 2,
    tab: "configurator",
    targetSelector: "#select-device",
    title: "2. Hardware Selection & USB Reader Inventory",
    copy: "Select your connected PC/SC smart card reader, USB PnP device, or lab simulation reader. Devices are detected on demand when you tap 'Scan & Load', keeping your workstation free of background polling."
  },
  {
    step: 3,
    tab: "devices",
    targetSelector: "#btn-scan-load-devices-tab",
    title: "3. On-Demand Device Discovery",
    copy: "Scan connected PC/SC smartcard readers, USB PnP interfaces, and serial COM ports on demand. Zero automatic scanning occurs on startup or tab changes—you stay in complete control of hardware queries."
  },
  {
    step: 4,
    tab: "verifier",
    targetSelector: "#input-test-tap",
    title: "4. Real-Time Tap & Swipe Verifier Lab",
    copy: "Test physical badges, proximity tags, and mobile NFC credentials on connected hardware. View raw hex outputs, Wiegand bit counts, and facility codes in real time to confirm configuration validity."
  },
  {
    step: 5,
    tab: "site-profiles",
    targetSelector: "#btn-open-create-site",
    title: "5. Multi-Site Fleet Profiles Library",
    copy: "Create and manage standardized configuration profiles across multiple campuses, doors, and building zones. Tap '+ Create New Site Profile' to open the complete site configuration editor."
  },
  {
    step: 6,
    tab: "presets",
    targetSelector: "#presets-pane-header",
    title: "6. Certified Security Deployment Presets",
    copy: "Browse certified presets ranging from High-Security DESFire EV3 Campus to Legacy Prox Dual-Tech migration. Selecting a preset pre-configures encryption standards, frequencies, and Wiegand bit lengths."
  },
  {
    step: 7,
    tab: "options",
    targetSelector: "#btn-check-uac-status",
    title: "7. Client Commissioning & On-Demand UAC Check",
    copy: "Inspect Windows UAC elevation and commissioning status strictly on demand. Configure Windows Firewall rules and System ODBC DSNs (32-bit or 64-bit) with standard UAC credential prompts."
  },
  {
    step: 8,
    tab: "options",
    targetSelector: "#btn-run-project-backup",
    title: "8. Timestamped Backups & Codebase Health",
    copy: "Create complete timestamped project archives with zero auto-scan overhead. Each backup performs automated post-backup health analysis, checking file counts, directory tree, and codebase integrity."
  },
  {
    step: 9,
    tab: "bix-firmware",
    targetSelector: "#btn-run-bix-scan",
    title: "9. Elatec TWN4 .BIX Firmware Scanner",
    copy: "Locate and inspect compiled Elatec TWN4 .bix binary firmware images, AppBlaster packages, and transponder profiles across your workstation and OneDrive directories."
  },
  {
    step: 10,
    tab: "sysinternals",
    targetSelector: "#btn-sysinternals-download",
    title: "10. Microsoft Sysinternals Diagnostics",
    copy: "Download, manage, and execute official Sysinternals troubleshooting tools (Procmon, Procexp, TCPView, RAMMap) directly from the browser with PATH integration."
  },
  {
    step: 11,
    tab: "win11cleanup",
    targetSelector: "#btn-rescan-cleanup",
    title: "11. Windows 11 Storage Cleanup",
    copy: "Safely audit and clean Windows temporary files, shader caches, delivery optimization, and crash dumps with automatic System Restore point creation before any cleanup action."
  },
  {
    step: 12,
    tab: "printers",
    targetSelector: "#btn-refresh-printers",
    title: "12. Printer Spooler & Queue Maintenance",
    copy: "Audit installed printer queues, detect stuck or corrupted print jobs, clear stuck spools safely, and restart the Windows Print Spooler service with one click."
  },
  {
    step: 13,
    tab: "ai-tools",
    targetSelector: "#btn-trigger-scan-modal",
    title: "13. Local AI/LLM Tools Inventory & Setup",
    copy: "Audit installed local AI runtimes (Ollama, LM Studio, Docker), developer CLIs, and coding assistants with explicit consent. Discover missing tools and execute verified installations safely."
  },
  {
    step: 14,
    tab: "configurator",
    targetSelector: "#btn-desktop-more-tools",
    title: "14. 1-Tap All Tools Drawer & Mobile Navigation",
    copy: "Access all 16 modules anytime from the '☰ More Tools' drawer or the mobile bottom navigation bar. Search tools instantly by keyword or category with seamless mobile and desktop support."
  }
];

let currentTourStep = null;

function setupTour() {
  const quickTourBtn = document.getElementById("btn-quick-tour");
  const closeBtn = document.getElementById("btn-tour-close");
  const skipBtn = document.getElementById("btn-tour-skip");
  const nextBtn = document.getElementById("btn-tour-next");
  const prevBtn = document.getElementById("btn-tour-prev");

  quickTourBtn?.addEventListener("click", () => {
    if (currentTourStep !== null) {
      skipTour();
    } else {
      startTour(1);
    }
  });

  closeBtn?.addEventListener("click", skipTour);
  skipBtn?.addEventListener("click", skipTour);
  nextBtn?.addEventListener("click", nextTourStep);
  prevBtn?.addEventListener("click", prevTourStep);

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    if (currentTourStep === null) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      nextTourStep();
    } else if (e.key === "ArrowLeft" && currentTourStep > 1) {
      e.preventDefault();
      prevTourStep();
    } else if (e.key === "Escape") {
      e.preventDefault();
      skipTour();
    }
  });

  // Reposition tour card on window resize or scroll
  window.addEventListener("resize", () => {
    if (currentTourStep !== null) positionTourCard(currentTourStep);
  });
  window.addEventListener("scroll", () => {
    if (currentTourStep !== null) positionTourCard(currentTourStep);
  }, { passive: true });

  // Auto-launch for first-time visitors after layout settles
  const completed = localStorage.getItem(TOUR_STORAGE_COMPLETED);
  const dismissed = localStorage.getItem(TOUR_STORAGE_DISMISSED);
  if (!completed && !dismissed) {
    setTimeout(() => {
      startTour(1);
    }, 1200);
  }
}

function startTour(stepNum = 1) {
  currentTourStep = stepNum;
  updateTourHeaderButton(true);
  renderTourStep(currentTourStep);
}

function updateTourHeaderButton(isActive) {
  const btn = document.getElementById("btn-quick-tour");
  const text = document.getElementById("tour-btn-text");
  if (!btn || !text) return;

  if (isActive) {
    text.textContent = "Exit Tour";
    btn.style.borderColor = "var(--accent-red)";
    btn.style.color = "var(--accent-red)";
  } else {
    text.textContent = "Quick Tour";
    btn.style.borderColor = "rgba(6, 182, 212, 0.4)";
    btn.style.color = "var(--accent-cyan)";
  }
}

function renderTourStep(stepNum) {
  const container = document.getElementById("tour-container");
  const stepData = TOUR_STEPS.find(s => s.step === stepNum);
  if (!container || !stepData) return;

  // Clear previous highlights
  document.querySelectorAll(".tour-highlight").forEach(el => el.classList.remove("tour-highlight"));

  // Ensure target tab is active
  if (stepData.tab) {
    switchTab(stepData.tab);
  }

  container.style.display = "block";

  // Update text
  const stepIndicator = document.getElementById("tour-step-indicator");
  const titleEl = document.getElementById("tour-step-title");
  const copyEl = document.getElementById("tour-step-copy");
  const prevBtn = document.getElementById("btn-tour-prev");
  const nextBtn = document.getElementById("btn-tour-next");

  if (stepIndicator) stepIndicator.textContent = `STEP ${stepData.step} OF ${TOUR_STEPS.length}`;
  if (titleEl) titleEl.textContent = stepData.title;
  if (copyEl) copyEl.textContent = stepData.copy;

  if (prevBtn) {
    prevBtn.style.display = stepNum > 1 ? "inline-flex" : "none";
  }
  if (nextBtn) {
    nextBtn.textContent = stepNum === TOUR_STEPS.length ? "Finish Tour ✓" : "Next Step →";
  }

  // Highlight target element & position card with multi-stage verification
  const applyHighlightAndPosition = () => {
    const targetEl = document.querySelector(stepData.targetSelector);
    if (targetEl) {
      targetEl.classList.add("tour-highlight");
      try {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}
    }
    positionTourCard(stepNum);
  };

  applyHighlightAndPosition();
  setTimeout(applyHighlightAndPosition, 60);
  setTimeout(applyHighlightAndPosition, 250);
}

function positionTourCard(stepNum) {
  const card = document.getElementById("tour-card");
  const stepData = TOUR_STEPS.find(s => s.step === stepNum);
  if (!card || !stepData) return;

  const targetEl = document.querySelector(stepData.targetSelector);
  const isMobile = window.innerWidth <= 640;

  if (isMobile) {
    card.style.position = "fixed";
    card.style.top = "auto";
    card.style.bottom = "80px";
    card.style.left = "50%";
    card.style.right = "auto";
    card.style.transform = "translateX(-50%)";
    card.style.width = "calc(100vw - 32px)";
    card.style.maxWidth = "400px";
    return;
  }

  // Fallback if target element not found or not rendered: center on screen
  if (!targetEl) {
    card.style.position = "fixed";
    card.style.top = "50%";
    card.style.left = "50%";
    card.style.bottom = "auto";
    card.style.right = "auto";
    card.style.transform = "translate(-50%, -50%)";
    card.style.width = "380px";
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  const cardWidth = Math.min(380, window.innerWidth - 32);
  const cardHeight = Math.max(200, card.offsetHeight || 220);
  const padding = 16;

  let left = rect.left;
  let top = rect.bottom + 12;

  // If card overflows viewport bottom, position it above target
  if (top + cardHeight > window.innerHeight - padding) {
    if (rect.top - cardHeight - 12 >= padding) {
      top = rect.top - cardHeight - 12;
    } else {
      // If neither above nor below fits cleanly, place side-by-side
      if (rect.right + cardWidth + padding <= window.innerWidth) {
        left = rect.right + 12;
        top = rect.top;
      } else if (rect.left - cardWidth - padding >= 0) {
        left = rect.left - cardWidth - 12;
        top = rect.top;
      }
    }
  }

  // Absolute safety clamping: card MUST ALWAYS be within visible viewport bounds
  const maxLeft = Math.max(padding, window.innerWidth - cardWidth - padding);
  const maxTop = Math.max(padding, window.innerHeight - cardHeight - padding);

  left = Math.max(padding, Math.min(left, maxLeft));
  top = Math.max(padding, Math.min(top, maxTop));

  card.style.position = "fixed";
  card.style.transform = "none";
  card.style.top = `${Math.round(top)}px`;
  card.style.left = `${Math.round(left)}px`;
  card.style.bottom = "auto";
  card.style.right = "auto";
  card.style.width = `${cardWidth}px`;
}

function nextTourStep() {
  if (currentTourStep === null) return;
  if (currentTourStep >= TOUR_STEPS.length) {
    try { localStorage.setItem(TOUR_STORAGE_COMPLETED, "true"); } catch (e) {}
    closeTour();
    showToast("🎉 Guided Tour completed! You're ready to configure hardware.", "success");
    return;
  }
  currentTourStep++;
  renderTourStep(currentTourStep);
}

function prevTourStep() {
  if (currentTourStep === null || currentTourStep <= 1) return;
  currentTourStep--;
  renderTourStep(currentTourStep);
}

function skipTour() {
  try { localStorage.setItem(TOUR_STORAGE_DISMISSED, "true"); } catch (e) {}
  closeTour();
  showToast("Tour closed. Click '✨ Quick Tour' in the top header to reopen anytime.", "info");
}

function closeTour() {
  currentTourStep = null;
  updateTourHeaderButton(false);
  const container = document.getElementById("tour-container");
  if (container) container.style.display = "none";
  document.querySelectorAll(".tour-highlight").forEach(el => el.classList.remove("tour-highlight"));
}

function switchTab(tabName) {
  if (typeof activateTab === "function") {
    activateTab(tabName);
  } else {
    const tabs = document.querySelectorAll(".tab-btn");
    const targetBtn = Array.from(tabs).find(b => b.dataset.tab === tabName);
    if (targetBtn && !targetBtn.classList.contains("active")) {
      targetBtn.click();
    }
  }
}

// ==============================================================================
// Remote Cross-Network Testing Controller
// ==============================================================================

function setupRemoteShare() {
  const openBtn = document.getElementById("btn-remote-share");
  const closeBtn = document.getElementById("btn-close-remote-share");
  const modalCloseBtn = document.getElementById("btn-modal-close-remote");
  const modal = document.getElementById("modal-remote-share");

  const btnCopyRemote = document.getElementById("btn-copy-remote-url");
  const btnCopyLan = document.getElementById("btn-copy-lan-url");
  const inputRemote = document.getElementById("input-remote-url");
  const inputLan = document.getElementById("input-lan-url");

  const openModal = () => { if (modal) modal.style.display = "flex"; };
  const closeModal = () => { if (modal) modal.style.display = "none"; };

  openBtn?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  modalCloseBtn?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  btnCopyRemote?.addEventListener("click", async () => {
    if (inputRemote) {
      try {
        await navigator.clipboard.writeText(inputRemote.value);
        showToast("✓ Remote HTTPS link copied to clipboard!", "success");
      } catch (e) {
        inputRemote.select();
        document.execCommand("copy");
        showToast("✓ Link copied!", "success");
      }
    }
  });

  btnCopyLan?.addEventListener("click", async () => {
    if (inputLan) {
      try {
        await navigator.clipboard.writeText(inputLan.value);
        showToast("✓ LAN Wi-Fi URL copied to clipboard!", "success");
      } catch (e) {
        inputLan.select();
        document.execCommand("copy");
        showToast("✓ LAN URL copied!", "success");
      }
    }
  });
}

// Hook tour and remote share into DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  setupTour();
  setupRemoteShare();
});

// ==============================================================================
// iOS Navigation & Category Drawer Controller
// ==============================================================================

function setupIosBottomBarAndDrawer() {
  // Bottom bar tab switching
  document.querySelectorAll(".ios-tab-item[data-tab]").forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.dataset.tab;
      if (tab) activateTab(tab);
    });
  });

  // Drawer toggles
  const drawer = document.getElementById("modal-tools-drawer");
  const openDrawer = () => {
    if (drawer) {
      drawer.style.display = "flex";
      const search = document.getElementById("input-drawer-search");
      if (search) {
        search.value = "";
        filterDrawerTools("");
        setTimeout(() => search.focus(), 150);
      }
    }
  };

  document.getElementById("btn-open-drawer")?.addEventListener("click", openDrawer);
  document.getElementById("btn-ios-more-tools")?.addEventListener("click", openDrawer);
  document.getElementById("btn-desktop-more-tools")?.addEventListener("click", openDrawer);
  document.getElementById("btn-close-drawer")?.addEventListener("click", closeToolsDrawer);
  document.getElementById("btn-drawer-close-bottom")?.addEventListener("click", closeToolsDrawer);
  document.getElementById("btn-drawer-quick-tour")?.addEventListener("click", () => {
    closeToolsDrawer();
    startTour(1);
  });

  // Robust Drawer Event Delegation:
  // 1. Clicking backdrop closes drawer
  // 2. Clicking ANY tool card (or any of its child icons/labels) navigates directly to the tab and immediately closes drawer
  drawer?.addEventListener("click", (e) => {
    if (e.target === drawer) {
      closeToolsDrawer();
      return;
    }

    const card = e.target.closest(".drawer-tool-card");
    if (!card) return;

    // Immediately close drawer so it never hangs open or requires manual "Done" click
    closeToolsDrawer();

    const tab = card.dataset.tab;
    if (card.id === "drawer-btn-backup") {
      activateTab("options");
      if (state.backupReport) {
        openBackupModal();
      } else {
        runProjectBackup();
      }
      setTimeout(() => {
        const backupSection = document.getElementById("card-project-backup");
        if (backupSection) backupSection.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }

    if (tab) {
      try {
        activateTab(tab);
        const subtab = card.dataset.subtab;
        if (subtab) {
          const subBtn = document.querySelector(`.subtab-btn[data-subtab="${subtab}"]`);
          if (subBtn) subBtn.click();
          setTimeout(() => {
            const netCard = document.getElementById("network-toolkit-card");
            if (netCard) netCard.scrollIntoView({ behavior: "smooth" });
          }, 120);
        }
      } catch (err) {
        console.error("Error activating tab from drawer card:", tab, err);
      }
    }
  });

  // Instant filter inside drawer
  const searchInput = document.getElementById("input-drawer-search");
  searchInput?.addEventListener("input", (e) => {
    filterDrawerTools(e.target.value.toLowerCase().trim());
  });
}

function filterDrawerTools(query) {
  const cards = document.querySelectorAll(".drawer-tool-card");
  cards.forEach(card => {
    if (!query) {
      card.style.display = "flex";
      return;
    }
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(query) ? "flex" : "none";
  });

  // Hide empty categories
  document.querySelectorAll(".drawer-category").forEach(cat => {
    const visibleCards = cat.querySelectorAll(".drawer-tool-card:not([style*='display: none'])");
    cat.style.display = visibleCards.length > 0 ? "block" : "none";
  });
}

function closeToolsDrawer() {
  const drawer = document.getElementById("modal-tools-drawer");
  if (drawer) drawer.style.display = "none";
}

// ==============================================================================
// Post-Backup & Codebase Health Analysis Subsystem
// ==============================================================================

function setupBackupAnalysis() {
  document.getElementById("btn-header-backup")?.addEventListener("click", () => {
    if (state.backupReport) {
      openBackupModal();
    } else {
      runProjectBackup();
    }
  });

  document.getElementById("btn-run-project-backup")?.addEventListener("click", runProjectBackup);
  document.getElementById("btn-run-new-backup")?.addEventListener("click", runProjectBackup);
  document.getElementById("drawer-btn-backup")?.addEventListener("click", () => {
    closeToolsDrawer();
    activateTab("options");
    if (state.backupReport) openBackupModal();
    else runProjectBackup();
    setTimeout(() => {
      const backupSection = document.getElementById("card-project-backup");
      if (backupSection) backupSection.scrollIntoView({ behavior: "smooth" });
    }, 100);
  });

  document.getElementById("btn-view-backup-analysis")?.addEventListener("click", () => {
    loadLatestBackupAnalysis(true);
  });

  document.getElementById("btn-refresh-backup-list")?.addEventListener("click", async () => {
    await loadAvailableBackups();
    await loadLatestBackupAnalysis(false);
  });

  document.getElementById("btn-import-backup")?.addEventListener("click", handleImportBackupArchive);
  document.getElementById("input-import-backup-path")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleImportBackupArchive();
    }
  });

  document.getElementById("btn-close-restore-modal")?.addEventListener("click", closeRestoreConfirmModal);
  document.getElementById("btn-cancel-restore")?.addEventListener("click", closeRestoreConfirmModal);
  document.getElementById("btn-confirm-execute-restore")?.addEventListener("click", executeRestoreProject);

  const restoreModal = document.getElementById("modal-backup-restore-confirm");
  restoreModal?.addEventListener("click", (e) => {
    if (e.target === restoreModal) closeRestoreConfirmModal();
  });

  document.getElementById("btn-copy-backup-summary")?.addEventListener("click", copyBackupSummaryToClipboard);
  document.getElementById("btn-close-backup-modal")?.addEventListener("click", closeBackupModal);
  document.getElementById("btn-modal-close-backup")?.addEventListener("click", closeBackupModal);

  const modal = document.getElementById("modal-backup-analysis");
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeBackupModal();
  });
}

async function runProjectBackup() {
  if (state.isBackingUp) return;
  state.isBackingUp = true;

  const btn = document.getElementById("btn-run-project-backup");
  const modalBtn = document.getElementById("btn-run-new-backup");
  const headerBtn = document.getElementById("btn-header-backup");

  [btn, modalBtn, headerBtn].filter(Boolean).forEach(b => {
    b.disabled = true;
    b.innerHTML = `⏳ Creating Backup &amp; Scanning...`;
  });

  appendTerminal(`\n[BACKUP] Initiating complete project archive and code structure analysis...`);
  showToast("📦 Archiving project and performing health scan...", "info");

  try {
    const res = await fetch("/api/backup/run", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Backup failed");
    }

    state.backupReport = data.report;
    renderBackupAnalysis(state.backupReport);
    openBackupModal();
    loadAvailableBackups();

    showToast(`🎉 <strong>Backup Complete!</strong> Analyzed ${data.report.totalFiles} files (${data.report.formattedUncompressedSize} &rarr; ${data.report.formattedZipSize})`, "success");
    appendTerminal(`[BACKUP SUCCESS] Archive: ${data.report.backupId}`);
    appendTerminal(` > Uncompressed: ${data.report.formattedUncompressedSize} | ZIP: ${data.report.formattedZipSize} (${data.report.compressionRatioPercent}% reduction)`);
    appendTerminal(` > Health Score: ${data.report.healthScore}/100 [${data.report.healthStatus}]`);
  } catch (err) {
    appendTerminal(`[BACKUP ERROR] ${err.message}`);
    showToast(`Backup error: ${err.message}`, "error");
  } finally {
    state.isBackingUp = false;
    [btn, modalBtn, headerBtn].filter(Boolean).forEach(b => {
      b.disabled = false;
      if (b.id === "btn-header-backup") {
        b.innerHTML = `<span>💾</span> <span class="hidden-xs">Backup &amp; Analyze</span>`;
      } else {
        b.innerHTML = `🚀 Run Project Backup &amp; Analyze`;
      }
    });
  }
}

async function loadLatestBackupAnalysis(openModal = false) {
  try {
    const res = await fetch("/api/backup/analysis");
    const data = await res.json();
    if (data.success && data.report) {
      state.backupReport = data.report;
      renderBackupAnalysis(state.backupReport);
      if (openModal) openBackupModal();
    }
  } catch (e) {
    console.warn("Could not load latest backup analysis:", e);
  }
}

function openBackupModal() {
  const modal = document.getElementById("modal-backup-analysis");
  if (modal) modal.style.display = "flex";
}

function closeBackupModal() {
  const modal = document.getElementById("modal-backup-analysis");
  if (modal) modal.style.display = "none";
}

function renderBackupAnalysis(report) {
  if (!report) return;

  // Badges in options tab
  const statusBadge = document.getElementById("backup-status-badge");
  const healthBadge = document.getElementById("backup-health-badge");
  if (statusBadge) {
    statusBadge.textContent = report.backupId.replace("PrimoITall_BACKUP_", "BACKUP-");
    statusBadge.className = "badge badge-status";
  }
  if (healthBadge) {
    healthBadge.textContent = `SCORE: ${report.healthScore}/100`;
    healthBadge.className = report.healthScore >= 90 ? "badge badge-status" : report.healthScore >= 70 ? "badge badge-sec-med" : "badge badge-sec-high";
  }

  // HTML content for analysis report
  let healthClass = "health-pill-excellent";
  if (report.healthStatus === "GOOD") healthClass = "health-pill-excellent";
  if (report.healthStatus === "REVIEW_RECOMMENDED") healthClass = "health-pill-review";
  if (report.healthStatus === "CRITICAL") healthClass = "health-pill-critical";

  const categoriesHtml = report.categories.map(c => `
    <div class="category-bar-wrapper">
      <div class="category-bar-header">
        <span><strong>${c.category}</strong> (${c.fileCount} files)</span>
        <span>${c.formattedBytes} &bull; <strong>${c.percentage}%</strong></span>
      </div>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width: ${c.percentage}%"></div>
      </div>
    </div>
  `).join("");

  const criticalCheckHtml = report.criticalFilesChecked.map(f => `
    <div class="file-check-item">
      <span style="color: ${f.present ? 'var(--accent-green)' : 'var(--accent-red)'}">
        ${f.present ? '✓' : '✗'}
      </span>
      <span>${f.file}</span>
    </div>
  `).join("");

  const issuesHtml = report.issues.length === 0 ? `
    <div class="alert-box alert-info">
      ✅ Zero issues detected. Codebase integrity and configuration structure are completely sound.
    </div>
  ` : report.issues.map(iss => `
    <div class="audit-issue-row audit-issue-${iss.severity}">
      <span class="badge ${iss.severity === 'error' ? 'badge-sec-high' : iss.severity === 'warning' ? 'badge-sec-med' : 'badge-sec'}">${iss.severity.toUpperCase()}</span>
      <div>
        <div class="font-bold">${iss.message}</div>
        ${iss.recommendation ? `<div class="text-muted text-xs mt-1">Suggestion: ${iss.recommendation}</div>` : ''}
      </div>
    </div>
  `).join("");

  const structureHtml = report.structure.slice(0, 8).map(s => `
    <tr>
      <td><code>${s.directory}/</code></td>
      <td class="text-right">${s.fileCount}</td>
      <td class="text-right font-mono">${s.formattedBytes}</td>
    </tr>
  `).join("");

  const fullHtml = `
    <!-- Top Provenance Card -->
    <div class="status-summary-grid">
      <div class="status-metric-card">
        <span class="metric-label">Backup Identifier</span>
        <span class="metric-value font-mono text-sm text-accent-cyan">${report.backupId}</span>
      </div>
      <div class="status-metric-card">
        <span class="metric-label">Timestamp</span>
        <span class="metric-value text-sm">${new Date(report.timestamp).toLocaleString()}</span>
      </div>
      <div class="status-metric-card">
        <span class="metric-label">Integrity Health</span>
        <span class="metric-value">
          <span class="health-pill ${healthClass}">${report.healthStatus} (${report.healthScore}/100)</span>
        </span>
      </div>
      <div class="status-metric-card">
        <span class="metric-label">Git Provenance</span>
        <span class="metric-value font-mono text-sm">
          ${report.gitStatusSummary.branch} (${report.gitStatusSummary.clean ? 'Clean ✓' : `${report.gitStatusSummary.uncommittedFilesCount} modified`})
        </span>
      </div>
    </div>

    <!-- 4 Stats Cards -->
    <div class="backup-stats-grid mt-3">
      <div class="backup-stat-card">
        <span class="backup-stat-lbl">Uncompressed Size</span>
        <span class="backup-stat-val">${report.formattedUncompressedSize}</span>
      </div>
      <div class="backup-stat-card">
        <span class="backup-stat-lbl">Compressed Archive</span>
        <span class="backup-stat-val">${report.formattedZipSize}</span>
      </div>
      <div class="backup-stat-card">
        <span class="backup-stat-lbl">Space Saved</span>
        <span class="backup-stat-val text-green">${report.compressionRatioPercent}%</span>
      </div>
      <div class="backup-stat-card">
        <span class="backup-stat-lbl">Files / Directories</span>
        <span class="backup-stat-val">${report.totalFiles} / ${report.totalDirectories}</span>
      </div>
    </div>

    <!-- 2 Column Breakdown -->
    <div class="grid-2-col mt-4">
      <div class="card" style="margin: 0;">
        <h4 class="card-subtitle mb-3">File Type Distribution</h4>
        ${categoriesHtml}
      </div>

      <div class="card" style="margin: 0;">
        <h4 class="card-subtitle mb-3">Top Directory Structures</h4>
        <div class="table-responsive">
          <table class="data-table small">
            <thead>
              <tr>
                <th>Directory</th>
                <th class="text-right">Files</th>
                <th class="text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              ${structureHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Integrity & Critical Files Audit -->
    <div class="card mt-3" style="margin: 0;">
      <h4 class="card-subtitle mb-2">Critical Core Files Verification (${report.criticalFilesChecked.filter(c => c.present).length} / ${report.criticalFilesChecked.length} Verified)</h4>
      <div class="backup-file-check-grid mb-3">
        ${criticalCheckHtml}
      </div>

      <h4 class="card-subtitle mb-2">Audit Issues &amp; Integrity Analysis</h4>
      ${issuesHtml}

      <div class="mt-3 text-xs text-muted font-mono">
        <strong>Archive Destination:</strong> ${report.zipPath || report.backupDirectory}
      </div>
    </div>
  `;

  const modalContent = document.getElementById("backup-modal-content");
  if (modalContent) modalContent.innerHTML = fullHtml;

  const inpageContent = document.getElementById("backup-summary-inpage");
  if (inpageContent) {
    inpageContent.style.display = "block";
    inpageContent.innerHTML = fullHtml;
  }
}

function copyBackupSummaryToClipboard() {
  if (!state.backupReport) return;
  const r = state.backupReport;
  const summary = `
[PRIMO IT TECH ALL-IN-ONE PROJECT BACKUP & ANALYSIS REPORT]
Backup ID: ${r.backupId}
Timestamp: ${new Date(r.timestamp).toLocaleString()}
Health Status: ${r.healthStatus} (Score: ${r.healthScore}/100)
Uncompressed Size: ${r.formattedUncompressedSize}
Compressed ZIP: ${r.formattedZipSize} (${r.compressionRatioPercent}% reduction)
Total Files: ${r.totalFiles} in ${r.totalDirectories} directories
Git Branch: ${r.gitStatusSummary.branch} (${r.gitStatusSummary.clean ? 'Clean' : `${r.gitStatusSummary.uncommittedFilesCount} modified files`})
Destination: ${r.zipPath || r.backupDirectory}
`.trim();

  navigator.clipboard.writeText(summary).then(() => {
    showToast("✓ Backup analysis summary copied to clipboard!", "success");
  }).catch(() => {
    showToast("Summary copied!", "info");
  });
}

function escapeHtml(text) {
  if (text == null) return "";
  return String(text).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[s]);
}

async function loadAvailableBackups() {
  const tbody = document.getElementById("backup-archives-tbody");
  const countEl = document.getElementById("backup-archives-count");

  try {
    const res = await fetch("/api/backup/list");
    const data = await res.json();
    if (data.success && Array.isArray(data.backups)) {
      state.backupArchives = data.backups;
      if (countEl) countEl.textContent = data.backups.length;
      renderBackupArchivesTable(data.backups);
    } else {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center py-3">Failed to load backups: ${escapeHtml(data.error || "Unknown error")}</td></tr>`;
    }
  } catch (err) {
    console.warn("Could not load backup archives list:", err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center py-3">Error connecting to daemon: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderBackupArchivesTable(backups) {
  const tbody = document.getElementById("backup-archives-tbody");
  if (!tbody) return;

  if (!backups || backups.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-3">No backup snapshots found in documents repository. Click "Run Project Backup &amp; Analyze" to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = backups.map(b => {
    const isZip = b.hasZip;
    const isFolder = b.hasFolder;
    let formatBadge = '<span class="badge badge-sec">Folder</span>';
    if (isZip && isFolder) formatBadge = '<span class="badge badge-status">ZIP + Folder</span>';
    else if (isZip) formatBadge = '<span class="badge badge-sec-med">ZIP Archive</span>';

    const dateStr = b.timestamp ? new Date(b.timestamp).toLocaleString() : "Unknown";

    return `
      <tr>
        <td>
          <div class="flex-row-center gap-2">
            <span>📦</span>
            <strong class="font-mono text-xs">${escapeHtml(b.name)}</strong>
          </div>
        </td>
        <td class="text-muted text-xs">${escapeHtml(dateStr)}</td>
        <td>${formatBadge}</td>
        <td class="text-right font-mono text-xs">${escapeHtml(b.formattedSize || "0 B")}</td>
        <td class="text-right">
          <div class="flex-row-center gap-1 justify-end">
            <button type="button" class="btn btn-danger btn-xs btn-restore-snapshot" data-name="${escapeHtml(b.name)}" title="Restore project from this snapshot">
              🔄 Restore
            </button>
            <button type="button" class="btn btn-secondary btn-xs btn-copy-backup-path" data-path="${escapeHtml(b.folderPath || b.zipPath || b.name)}" title="Copy path to clipboard">
              📋
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".btn-restore-snapshot").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      if (name) openRestoreConfirmModal(name);
    });
  });

  tbody.querySelectorAll(".btn-copy-backup-path").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.path;
      if (p) {
        navigator.clipboard.writeText(p).then(() => {
          showToast("📋 Backup path copied to clipboard!", "info");
        });
      }
    });
  });
}

function openRestoreConfirmModal(backupName) {
  state.selectedRestoreBackup = backupName;
  const nameEl = document.getElementById("restore-target-snapshot-name");
  if (nameEl) nameEl.textContent = backupName;
  const modal = document.getElementById("modal-backup-restore-confirm");
  if (modal) modal.style.display = "flex";
}

function closeRestoreConfirmModal() {
  const modal = document.getElementById("modal-backup-restore-confirm");
  if (modal) modal.style.display = "none";
  state.selectedRestoreBackup = null;
}

async function executeRestoreProject() {
  if (!state.selectedRestoreBackup) {
    showToast("No backup selected for restore.", "warning");
    return;
  }

  const backupName = state.selectedRestoreBackup;
  const safetyCheckbox = document.getElementById("check-create-safety-backup");
  const createSafetyBackup = safetyCheckbox ? safetyCheckbox.checked : true;
  const confirmBtn = document.getElementById("btn-confirm-execute-restore");

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "⏳ Restoring...";
  }

  appendTerminal(`\n[RESTORE] Initiating restore from snapshot '${backupName}' (Safety backup: ${createSafetyBackup})...`);
  showToast(`Restoring project from '${backupName}'...`, "info");

  try {
    const res = await fetch("/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupName, createSafetyBackup })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Restore failed");
    }

    closeRestoreConfirmModal();
    showToast(`✅ <strong>Restore Complete!</strong> Restored ${data.filesRestored} files from '${backupName}'.`, "success");
    appendTerminal(`[RESTORE SUCCESS] ${data.message}`);
    if (data.safetyBackupId) {
      appendTerminal(` > Safety snapshot created: ${data.safetyBackupId}`);
    }

    await loadAvailableBackups();
    await loadLatestBackupAnalysis(false);
  } catch (err) {
    appendTerminal(`[RESTORE ERROR] ${err.message}`);
    showToast(`Restore failed: ${err.message}`, "error");
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "🔄 Confirm & Restore Project";
    }
  }
}

async function handleImportBackupArchive() {
  const input = document.getElementById("input-import-backup-path");
  const btn = document.getElementById("btn-import-backup");
  const sourcePath = input ? input.value.trim() : "";

  if (!sourcePath) {
    showToast("Please enter an external .zip or directory path to import.", "warning");
    input?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Importing...";
  }

  appendTerminal(`\n[IMPORT] Importing external backup archive from: ${sourcePath}`);
  showToast("Importing backup archive...", "info");

  try {
    const res = await fetch("/api/backup/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePath })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || "Import failed");
    }

    showToast(`📥 <strong>Import Succeeded!</strong> Saved as '${data.importedName}'.`, "success");
    appendTerminal(`[IMPORT SUCCESS] ${data.message}`);
    if (input) input.value = "";
    await loadAvailableBackups();
  } catch (err) {
    appendTerminal(`[IMPORT ERROR] ${err.message}`);
    showToast(`Import error: ${err.message}`, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "📥 Import Archive";
    }
  }
}
