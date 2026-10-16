(() => {
  "use strict";

  const CONFIG = Object.freeze({
    owner: "Minecraftman04",
    repo: "Weather-App",
    branch: "main",
    path: "data/saved-locations.json",
    apiVersion: "2026-03-10"
  });

  const KEYS = Object.freeze({
    favourites: "weatherDashboardFavoriteLocations",
    dirty: "weatherDashboardGitHubSyncDirty",
    token: "weatherDashboardGitHubSyncToken",
    lastSync: "weatherDashboardGitHubSyncLastSync"
  });

  const MAX_LOCATIONS = 8;
  const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}`;
  const tokenTemplateUrl = "https://github.com/settings/personal-access-tokens/new?name=Weather-App+location+sync&description=Updates+the+shared+saved-locations+JSON+file+for+the+Weather-App&target_name=Minecraftman04&expires_in=366&contents=write";

  let syncInFlight = false;
  let lastLocalSnapshot = serialiseLocations(readLocalLocations());
  let ui = null;

  function normaliseLocation(value) {
    const latitude = Number(value?.latitude);
    const longitude = Number(value?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return {
      name: String(value?.name || "Saved location"),
      admin2: String(value?.admin2 || ""),
      admin1: String(value?.admin1 || ""),
      country: String(value?.country || ""),
      latitude,
      longitude,
      elevation: value?.elevation !== null && value?.elevation !== "" && Number.isFinite(Number(value?.elevation)) ? Number(value.elevation) : null,
      launchSite: String(value?.launchSite || "")
    };
  }

  function normaliseLocations(values) {
    if (!Array.isArray(values)) return [];
    const result = [];
    for (const value of values) {
      const location = normaliseLocation(value);
      if (!location) continue;
      const duplicate = result.some(existing =>
        Math.abs(existing.latitude - location.latitude) < 0.0002 &&
        Math.abs(existing.longitude - location.longitude) < 0.0002 &&
        existing.launchSite === location.launchSite
      );
      if (!duplicate) result.push(location);
      if (result.length >= MAX_LOCATIONS) break;
    }
    return result;
  }

  function readLocalLocations() {
    try {
      return normaliseLocations(JSON.parse(localStorage.getItem(KEYS.favourites) || "[]"));
    } catch {
      return [];
    }
  }

  function writeLocalLocations(locations) {
    const normalised = normaliseLocations(locations);
    localStorage.setItem(KEYS.favourites, JSON.stringify(normalised));
    lastLocalSnapshot = serialiseLocations(normalised);
  }

  function serialiseLocations(locations) {
    return JSON.stringify(normaliseLocations(locations));
  }

  function getToken() {
    return sessionStorage.getItem(KEYS.token) || localStorage.getItem(KEYS.token) || "";
  }

  function storeToken(token, remember) {
    sessionStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.token);
    if (!token) return;
    (remember ? localStorage : sessionStorage).setItem(KEYS.token, token);
  }

  function isDirty() {
    return localStorage.getItem(KEYS.dirty) === "1";
  }

  function setDirty(dirty) {
    if (dirty) localStorage.setItem(KEYS.dirty, "1");
    else localStorage.removeItem(KEYS.dirty);
    refreshButtonLabel();
  }

  function encodeBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let start = 0; start < bytes.length; start += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
    }
    return btoa(binary);
  }

  function decodeBase64Utf8(value) {
    const binary = atob(String(value || "").replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function githubHeaders(token = "") {
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": CONFIG.apiVersion
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function parseError(response) {
    try {
      const payload = await response.json();
      return payload?.message || `${response.status} ${response.statusText}`;
    } catch {
      return `${response.status} ${response.statusText}`;
    }
  }

  async function fetchCloudFile(token = "") {
    const response = await fetch(`${apiUrl}?ref=${encodeURIComponent(CONFIG.branch)}&t=${Date.now()}`, {
      method: "GET",
      headers: githubHeaders(token),
      cache: "no-store"
    });

    if (response.status === 404) {
      return { sha: null, updatedAt: null, locations: [] };
    }
    if (!response.ok) throw new Error(await parseError(response));

    const file = await response.json();
    const decoded = decodeBase64Utf8(file.content);
    const payload = JSON.parse(decoded);
    return {
      sha: file.sha || null,
      updatedAt: typeof payload?.updatedAt === "string" ? payload.updatedAt : null,
      locations: normaliseLocations(payload?.locations)
    };
  }

  async function putCloudFile(locations, token, attempt = 0) {
    if (!token) throw new Error("A GitHub token is required to update the shared locations file.");

    const current = await fetchCloudFile(token);
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      locations: normaliseLocations(locations)
    };
    const body = {
      message: "Update shared weather locations",
      branch: CONFIG.branch,
      content: encodeBase64Utf8(`${JSON.stringify(payload, null, 2)}\n`)
    };
    if (current.sha) body.sha = current.sha;

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (response.status === 409 && attempt < 1) {
      return putCloudFile(locations, token, attempt + 1);
    }
    if (!response.ok) throw new Error(await parseError(response));
    return payload;
  }

  function setStatus(message, state = "idle") {
    if (!ui) return;
    ui.status.textContent = message;
    ui.status.dataset.state = state;
    refreshButtonLabel();
  }

  function refreshButtonLabel() {
    if (!ui) return;
    if (syncInFlight) {
      ui.button.textContent = "GitHub sync…";
      ui.button.disabled = true;
      return;
    }
    ui.button.disabled = false;
    if (isDirty() && !getToken()) ui.button.textContent = "GitHub sync: setup";
    else if (isDirty()) ui.button.textContent = "GitHub sync: pending";
    else if (getToken()) ui.button.textContent = "GitHub sync ✓";
    else ui.button.textContent = "GitHub sync";
  }

  function showDialog() {
    ui.tokenInput.value = getToken();
    ui.remember.checked = Boolean(localStorage.getItem(KEYS.token));
    ui.disconnect.hidden = !getToken();
    ui.dialogStatus.textContent = isDirty()
      ? "This device has saved-location changes waiting to be uploaded."
      : "The shared GitHub file is currently the source of truth.";
    if (typeof ui.dialog.showModal === "function") ui.dialog.showModal();
    else ui.dialog.setAttribute("open", "");
  }

  function closeDialog() {
    if (typeof ui.dialog.close === "function") ui.dialog.close();
    else ui.dialog.removeAttribute("open");
  }

  function createUi() {
    const actions = document.querySelector(".locationActions");
    if (!actions || document.getElementById("githubSyncBtn")) return null;

    const style = document.createElement("style");
    style.textContent = `
      .githubSyncStatus { margin: -4px 2px 0; color: var(--muted-2); font-size: .78rem; line-height: 1.35; }
      .githubSyncStatus[data-state="ok"] { color: var(--accent-2); }
      .githubSyncStatus[data-state="warn"] { color: var(--warn); }
      .githubSyncStatus[data-state="error"] { color: var(--bad); }
      .githubSyncDialog { width: min(620px, calc(100% - 28px)); padding: 0; border: 1px solid var(--border-strong); border-radius: 22px; color: var(--text); background: var(--panel-strong); box-shadow: var(--shadow); }
      .githubSyncDialog::backdrop { background: rgba(0, 0, 0, .68); backdrop-filter: blur(5px); }
      .githubSyncDialog form { display: grid; gap: 14px; padding: 20px; }
      .githubSyncDialog h2, .githubSyncDialog p { margin: 0; }
      .githubSyncDialog .syncNote { color: var(--muted); line-height: 1.5; font-size: .9rem; }
      .githubSyncDialog .syncWarning { padding: 11px 12px; border: 1px solid rgba(251,191,36,.34); border-radius: 14px; background: rgba(251,191,36,.08); color: var(--text); line-height: 1.45; font-size: .86rem; }
      .githubSyncDialog .syncField { display: grid; gap: 6px; }
      .githubSyncDialog .syncField label { color: var(--muted); font-size: .78rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
      .githubSyncDialog .syncRemember { display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: .86rem; }
      .githubSyncDialog .syncRemember input { width: auto; min-height: auto; }
      .githubSyncDialog .syncActions { display: flex; flex-wrap: wrap; gap: 9px; }
      .githubSyncDialog .syncActions button { flex: 1 1 140px; }
      .githubSyncDialog .syncDanger { color: var(--bad); }
      body.sunMode .githubSyncDialog { color: var(--text); background: #fff; }
    `;
    document.head.appendChild(style);

    const button = document.createElement("button");
    button.id = "githubSyncBtn";
    button.type = "button";
    button.className = "secondary tiny";
    actions.appendChild(button);

    const status = document.createElement("p");
    status.id = "githubSyncStatus";
    status.className = "githubSyncStatus";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    actions.insertAdjacentElement("afterend", status);

    const dialog = document.createElement("dialog");
    dialog.className = "githubSyncDialog";
    dialog.innerHTML = `
      <form method="dialog">
        <h2>GitHub saved-location sync</h2>
        <p class="syncNote">All browsers can read the shared location list. A GitHub token is only needed on devices that add or remove locations.</p>
        <p class="syncWarning"><strong>Privacy:</strong> this repository is public, so synced place names and coordinates will be visible in <code>${CONFIG.path}</code> and its commit history. Do not sync a location you want to keep private.</p>
        <p class="syncNote"><a href="${tokenTemplateUrl}" target="_blank" rel="noreferrer">Create a fine-grained GitHub token</a>, select only <strong>${CONFIG.owner}/${CONFIG.repo}</strong>, and grant <strong>Contents: Read and write</strong>. Do not grant workflow or administration access.</p>
        <div class="syncField">
          <label for="githubSyncToken">Fine-grained token</label>
          <input id="githubSyncToken" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…">
        </div>
        <label class="syncRemember"><input id="githubSyncRemember" type="checkbox"> Remember the token on this device</label>
        <p class="syncNote" id="githubSyncDialogStatus"></p>
        <div class="syncActions">
          <button class="secondary" id="githubSyncCancel" type="button">Cancel</button>
          <button class="secondary" id="githubSyncPull" type="button">Replace with GitHub copy</button>
          <button id="githubSyncSave" type="button">Save token & sync</button>
        </div>
        <button class="secondary syncDanger" id="githubSyncDisconnect" type="button">Forget token on this device</button>
      </form>
    `;
    document.body.appendChild(dialog);

    ui = {
      actions,
      button,
      status,
      dialog,
      tokenInput: dialog.querySelector("#githubSyncToken"),
      remember: dialog.querySelector("#githubSyncRemember"),
      save: dialog.querySelector("#githubSyncSave"),
      pull: dialog.querySelector("#githubSyncPull"),
      cancel: dialog.querySelector("#githubSyncCancel"),
      disconnect: dialog.querySelector("#githubSyncDisconnect"),
      dialogStatus: dialog.querySelector("#githubSyncDialogStatus")
    };

    button.addEventListener("click", showDialog);
    ui.cancel.addEventListener("click", closeDialog);
    dialog.addEventListener("click", event => {
      if (event.target === dialog) closeDialog();
    });
    ui.disconnect.addEventListener("click", () => {
      storeToken("", false);
      ui.tokenInput.value = "";
      ui.disconnect.hidden = true;
      setStatus(isDirty() ? "Local changes are waiting for GitHub access." : "Shared locations will still download; saving is local-only until connected.", "warn");
      closeDialog();
    });
    ui.save.addEventListener("click", connectAndSync);
    ui.pull.addEventListener("click", forcePullFromGitHub);

    refreshButtonLabel();
    return ui;
  }

  function setBusy(busy) {
    syncInFlight = Boolean(busy);
    if (ui) {
      ui.save.disabled = syncInFlight;
      ui.pull.disabled = syncInFlight;
      ui.tokenInput.disabled = syncInFlight;
      ui.remember.disabled = syncInFlight;
    }
    refreshButtonLabel();
  }

  async function pushLocalLocations({ token = getToken(), closeOnSuccess = false } = {}) {
    if (!token) {
      setStatus("Locations are saved on this device only. Connect GitHub to upload them.", "warn");
      showDialog();
      return false;
    }

    setBusy(true);
    setStatus("Uploading saved locations to GitHub…");
    try {
      const locations = readLocalLocations();
      await putCloudFile(locations, token);
      setDirty(false);
      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
      lastLocalSnapshot = serialiseLocations(locations);
      setStatus("Saved locations are synced with GitHub.", "ok");
      if (closeOnSuccess) closeDialog();
      return true;
    } catch (error) {
      console.error("GitHub location sync upload failed", error);
      setStatus(`GitHub upload failed: ${error.message}`, "error");
      if (ui) ui.dialogStatus.textContent = `Upload failed: ${error.message}`;
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function connectAndSync() {
    const candidate = ui.tokenInput.value.trim() || getToken();
    if (!candidate) {
      ui.dialogStatus.textContent = "Paste a fine-grained token first.";
      ui.tokenInput.focus();
      return;
    }

    setBusy(true);
    ui.dialogStatus.textContent = "Checking GitHub access…";
    try {
      const cloud = await fetchCloudFile(candidate);
      storeToken(candidate, ui.remember.checked);
      ui.disconnect.hidden = false;

      const local = readLocalLocations();
      const shouldUpload = isDirty() || (!cloud.updatedAt && cloud.locations.length === 0 && local.length > 0);
      if (shouldUpload) {
        setBusy(false);
        await pushLocalLocations({ token: candidate, closeOnSuccess: true });
        return;
      }

      if (serialiseLocations(local) !== serialiseLocations(cloud.locations)) {
        writeLocalLocations(cloud.locations);
        setDirty(false);
        localStorage.setItem(KEYS.lastSync, new Date().toISOString());
        ui.dialogStatus.textContent = "GitHub connected. Reloading the shared locations…";
        closeDialog();
        location.reload();
        return;
      }

      setDirty(false);
      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
      setStatus("GitHub sync is connected and up to date.", "ok");
      closeDialog();
    } catch (error) {
      console.error("GitHub location sync connection failed", error);
      ui.dialogStatus.textContent = `Could not connect: ${error.message}`;
      setStatus(`GitHub sync needs attention: ${error.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function forcePullFromGitHub() {
    if (isDirty() && !window.confirm("Replace this device's unsynced saved locations with the current GitHub copy?")) return;

    setBusy(true);
    ui.dialogStatus.textContent = "Downloading the GitHub copy…";
    try {
      const cloud = await fetchCloudFile(getToken());
      writeLocalLocations(cloud.locations);
      setDirty(false);
      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
      closeDialog();
      location.reload();
    } catch (error) {
      console.error("GitHub location sync download failed", error);
      ui.dialogStatus.textContent = `Download failed: ${error.message}`;
      setStatus(`GitHub download failed: ${error.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function pullOnPageLoad() {
    if (isDirty()) {
      if (getToken()) {
        await pushLocalLocations();
      } else {
        setStatus("Local saved-location changes are waiting to be uploaded.", "warn");
      }
      return;
    }

    setBusy(true);
    setStatus("Checking GitHub for saved locations…");
    try {
      const cloud = await fetchCloudFile(getToken());
      const local = readLocalLocations();

      if (!cloud.updatedAt && cloud.locations.length === 0 && local.length > 0) {
        setDirty(true);
        if (getToken()) {
          setBusy(false);
          await pushLocalLocations();
        } else {
          setStatus("Existing saved locations are ready to upload. Open GitHub sync to connect.", "warn");
        }
        return;
      }

      if (serialiseLocations(local) !== serialiseLocations(cloud.locations)) {
        writeLocalLocations(cloud.locations);
        setDirty(false);
        localStorage.setItem(KEYS.lastSync, new Date().toISOString());
        setStatus("New shared locations downloaded. Reloading…", "ok");
        location.reload();
        return;
      }

      localStorage.setItem(KEYS.lastSync, new Date().toISOString());
      setStatus(getToken() ? "Saved locations are synced with GitHub." : "Shared saved locations loaded from GitHub.", "ok");
    } catch (error) {
      console.error("GitHub location sync download failed", error);
      setStatus(`Could not refresh shared locations: ${error.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  function watchFavouriteButton() {
    const favouriteButton = document.getElementById("favoriteBtn");
    if (!favouriteButton) return;

    favouriteButton.addEventListener("click", () => {
      window.setTimeout(async () => {
        const snapshot = serialiseLocations(readLocalLocations());
        if (snapshot === lastLocalSnapshot) return;
        lastLocalSnapshot = snapshot;
        setDirty(true);
        if (getToken()) await pushLocalLocations();
        else {
          setStatus("Location saved on this device. Connect GitHub to make it available everywhere.", "warn");
          showDialog();
        }
      }, 0);
    });
  }

  async function initialise() {
    if (!createUi()) return;
    watchFavouriteButton();
    await pullOnPageLoad();
  }

  initialise();
})();
