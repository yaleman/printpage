const DEFAULT_DRAFT = {
  name: "Default label",
  rows: [
    {
      text: "New label",
      level: "h2",
      bold: false,
      italic: false,
      alignment: "center",
    },
  ],
  border: {
    enabled: false,
    thickness_mm: 0.5,
    inset_mm: 1,
    radius_mm: 1.5,
  },
  width_mm: 62,
  height_mm: 29,
  is_continuous: false,
  cut_every: 1,
  quality: "BrQuality",
  quantity: 1,
};

const PREVIEW_DEBOUNCE_MS = 250;

const profilePicker = document.getElementById("profile-picker");
const newProfileButton = document.getElementById("new-profile-button");
const saveButton = document.getElementById("save-button");
const deleteButton = document.getElementById("delete-button");
const previewButton = document.getElementById("preview-button");
const printButton = document.getElementById("print-button");
const generalStatusEl = document.getElementById("general-status");
const previewStatusEl = document.getElementById("preview-status");
const previewHintEl = document.getElementById("preview-hint");
const previewFrame = document.getElementById("preview-frame");
const previewOverlay = document.getElementById("preview-overlay");
const previewOverlayText = document.getElementById("preview-overlay-text");
const previewMeta = document.getElementById("preview-meta");
const editorTitle = document.getElementById("editor-title");
const tabButtons = Array.from(document.querySelectorAll("[data-tab-button]"));
const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
const rowList = document.getElementById("row-list");
const addRowButton = document.getElementById("add-row-button");
const deleteRowButton = document.getElementById("delete-row-button");
const rowText = document.getElementById("row-text");
const rowMeta = document.getElementById("row-meta");
const continuousToggle = document.getElementById("is-continuous-toggle");
const continuousInput = document.getElementById("is_continuous");
const borderToggle = document.getElementById("border-enabled-toggle");
const borderInput = document.getElementById("border_enabled");
const borderFields = document.getElementById("border-fields");
const heightLabelText = document.getElementById("height-label-text");

let currentPdfBlobUrl = null;
let currentProfileId = null;
let currentState = null;
let currentTab = "profile";
let draftRows = structuredClone(DEFAULT_DRAFT.rows);
let activeRowIndex = 0;
let previewTimer = null;
let previewRequestToken = 0;
let previewController = null;

function setStatus(message, isError = false) {
  generalStatusEl.textContent = message;
  generalStatusEl.dataset.state = isError ? "error" : "idle";
}

function setPreviewStatus(message, isError = false) {
  previewStatusEl.textContent = message;
  previewStatusEl.dataset.state = isError ? "error" : "idle";
}

function setPreviewOverlay(message, isError = false, visible = true) {
  previewOverlayText.textContent = message;
  previewOverlay.dataset.state = isError ? "error" : "idle";
  previewOverlay.classList.toggle("hidden", !visible);
}

function updateTabState() {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tabButton === currentTab;
    button.dataset.state = isActive ? "on" : "off";
    button.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === currentTab;
    panel.classList.toggle("hidden", !isActive);
  });
}

function setToggleState(button, isActive) {
  button.dataset.state = isActive ? "on" : "off";
  button.setAttribute("aria-pressed", String(isActive));
}

function updateContinuousLabel() {
  heightLabelText.textContent = continuousInput.checked ? "Length (mm)" : "Height (mm)";
  setToggleState(continuousToggle, continuousInput.checked);
}

function updateBorderToggle() {
  setToggleState(borderToggle, borderInput.checked);
  borderFields.classList.toggle("opacity-50", !borderInput.checked);
}

function updatePreviewMeta(profile) {
  const width = Number(profile.width_mm || 0);
  const height = Number(profile.height_mm || 0);
  const quantity = Number(profile.quantity || 0);
  previewMeta.textContent = `${width || 0} x ${height || 0} mm / Qty ${quantity || 0}`;
}

function cloneRows(rows) {
  return (rows && rows.length ? rows : DEFAULT_DRAFT.rows).map((row) => ({ ...row }));
}

function ensureActiveRow() {
  if (!draftRows.length) {
    draftRows = cloneRows(DEFAULT_DRAFT.rows);
  }

  if (activeRowIndex >= draftRows.length) {
    activeRowIndex = draftRows.length - 1;
  }

  if (activeRowIndex < 0) {
    activeRowIndex = 0;
  }
}

function rowSummary(row, index) {
  const snippet = (row.text || "").trim().replace(/\s+/g, " ");
  return snippet ? snippet.slice(0, 42) : `Row ${index + 1}`;
}

function syncActiveRowFromEditor() {
  ensureActiveRow();

  const row = draftRows[activeRowIndex];
  if (!row) {
    return;
  }

  row.text = rowText.value;
  row.level =
    document.querySelector("[data-row-level][data-state='on']")?.dataset.rowLevel || "normal";
  row.alignment =
    document.querySelector("[data-row-alignment][data-state='on']")?.dataset.rowAlignment ||
    "left";
  row.bold = document.getElementById("row-bold-button").dataset.state === "on";
  row.italic = document.getElementById("row-italic-button").dataset.state === "on";
}

function renderRowList() {
  rowList.innerHTML = "";

  draftRows.forEach((row, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.active = index === activeRowIndex ? "true" : "false";
    button.className =
      "flex w-full flex-col rounded-lg border px-3 py-2 text-left transition " +
      "data-[active=true]:border-stone-900 data-[active=true]:bg-stone-900 " +
      "data-[active=true]:text-white data-[active=false]:border-stone-200 " +
      "data-[active=false]:bg-stone-50 data-[active=false]:text-stone-700 " +
      "data-[active=false]:hover:border-stone-400 data-[active=false]:hover:bg-white";
    button.innerHTML = `
      <span class="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">Row ${
        index + 1
      }</span>
      <span class="mt-1 line-clamp-2 text-sm font-medium">${rowSummary(row, index)}</span>
    `;
    button.addEventListener("click", () => {
      syncActiveRowFromEditor();
      activeRowIndex = index;
      renderRowsUI();
    });
    rowList.appendChild(button);
  });
}

function setSingleChoice(buttons, activeValue, attributeName) {
  buttons.forEach((button) => {
    const isActive = button.dataset[attributeName] === activeValue;
    button.dataset.state = isActive ? "on" : "off";
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderRowsUI() {
  ensureActiveRow();
  renderRowList();

  const row = draftRows[activeRowIndex];
  rowText.value = row.text ?? "";
  setSingleChoice(
    Array.from(document.querySelectorAll("[data-row-level]")),
    row.level || "normal",
    "rowLevel",
  );
  setSingleChoice(
    Array.from(document.querySelectorAll("[data-row-alignment]")),
    row.alignment || "left",
    "rowAlignment",
  );
  setToggleState(document.getElementById("row-bold-button"), Boolean(row.bold));
  setToggleState(document.getElementById("row-italic-button"), Boolean(row.italic));
  deleteRowButton.disabled = draftRows.length === 1;
  rowMeta.textContent = `${draftRows.length} row${draftRows.length === 1 ? "" : "s"} on label`;
}

function getRowsPayload() {
  syncActiveRowFromEditor();
  return draftRows.map((row) => ({
    text: row.text,
    level: row.level,
    alignment: row.alignment,
    bold: Boolean(row.bold),
    italic: Boolean(row.italic),
  }));
}

function getPayload() {
  const payload = {
    name: document.getElementById("name").value.trim(),
    rows: getRowsPayload(),
    border: {
      enabled: borderInput.checked,
      thickness_mm: Number(document.getElementById("border_thickness_mm").value),
      inset_mm: Number(document.getElementById("border_inset_mm").value),
      radius_mm: Number(document.getElementById("border_radius_mm").value),
    },
    width_mm: Number(document.getElementById("width_mm").value),
    height_mm: Number(document.getElementById("height_mm").value),
    is_continuous: continuousInput.checked,
    cut_every: Number(document.getElementById("cut_every").value),
    quality: document.getElementById("quality").value,
    quantity: Number(document.getElementById("quantity").value),
  };

  updatePreviewMeta(payload);
  return payload;
}

function fillForm(profile) {
  document.getElementById("name").value = profile.name ?? "";
  document.getElementById("width_mm").value = profile.width_mm;
  document.getElementById("height_mm").value = profile.height_mm;
  document.getElementById("quality").value = profile.quality;
  document.getElementById("cut_every").value = profile.cut_every;
  document.getElementById("quantity").value = profile.quantity;
  document.getElementById("border_thickness_mm").value = profile.border?.thickness_mm ?? 0.5;
  document.getElementById("border_inset_mm").value = profile.border?.inset_mm ?? 1;
  document.getElementById("border_radius_mm").value = profile.border?.radius_mm ?? 1.5;

  continuousInput.checked = Boolean(profile.is_continuous);
  borderInput.checked = Boolean(profile.border?.enabled);
  updateContinuousLabel();
  updateBorderToggle();

  draftRows = cloneRows(profile.rows);
  activeRowIndex = 0;
  renderRowsUI();
  updatePreviewMeta(profile);
  deleteButton.disabled = !currentProfileId;
  editorTitle.textContent = currentProfileId ? "Editing saved profile" : "Editing new profile";
}

function renderProfilePicker(state) {
  profilePicker.innerHTML = "";

  state.profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    if (profile.id === state.selected_profile_id) {
      option.selected = true;
    }
    profilePicker.appendChild(option);
  });
}

function selectedProfileFromState(state) {
  return state.profiles.find((profile) => profile.id === state.selected_profile_id) || state.profiles[0];
}

function renderState(state) {
  currentState = state;
  renderProfilePicker(state);

  const selectedProfile = selectedProfileFromState(state);
  currentProfileId = selectedProfile ? selectedProfile.id : null;

  if (selectedProfile) {
    fillForm(selectedProfile);
  }
}

function startNewProfile() {
  currentProfileId = null;
  fillForm(DEFAULT_DRAFT);
  setStatus("Drafting a new profile.");
  previewPdf({ immediate: true });
}

async function postJson(url, method, payload = null) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : null,
  });

  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(typeof result === "string" ? result : JSON.stringify(result, null, 2));
  }

  return result;
}

function cancelPreviewTimer() {
  if (previewTimer) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
  }
}

function schedulePreview() {
  cancelPreviewTimer();
  previewHintEl.textContent = "Auto-preview queued";
  previewTimer = window.setTimeout(() => {
    previewPdf();
  }, PREVIEW_DEBOUNCE_MS);
}

async function previewPdf({ immediate = false } = {}) {
  cancelPreviewTimer();

  const payload = getPayload();
  const token = ++previewRequestToken;

  if (previewController) {
    previewController.abort();
  }

  previewController = new AbortController();
  previewHintEl.textContent = immediate ? "Manual refresh" : "Auto-preview";
  setPreviewStatus("Updating preview...");
  setPreviewOverlay("Rendering preview...", false, true);

  try {
    const response = await fetch("/labels.pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: previewController.signal,
    });

    if (!response.ok) {
      throw new Error(`Preview failed: ${response.status} ${await response.text()}`);
    }

    const blob = await response.blob();
    if (token !== previewRequestToken) {
      return;
    }

    if (currentPdfBlobUrl) {
      URL.revokeObjectURL(currentPdfBlobUrl);
    }

    currentPdfBlobUrl = URL.createObjectURL(blob);
    previewFrame.src = currentPdfBlobUrl;
    previewFrame.classList.remove("invisible");
    setPreviewStatus("Preview synced.");
    setPreviewOverlay("", false, false);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    if (token !== previewRequestToken) {
      return;
    }

    console.error(error);
    setPreviewStatus("Preview failed.", true);
    setPreviewOverlay(error.message, true, true);
  }
}

async function saveProfile() {
  setStatus("Saving profile...");

  try {
    const method = currentProfileId ? "PUT" : "POST";
    const url = currentProfileId ? `/api/profiles/${encodeURIComponent(currentProfileId)}` : "/api/profiles";
    const state = await postJson(url, method, getPayload());
    renderState(state);
    setStatus("Profile saved.");
    await previewPdf({ immediate: true });
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

async function deleteProfile() {
  if (!currentProfileId) {
    setStatus("Draft profile is not saved yet.", true);
    return;
  }

  setStatus("Deleting profile...");

  try {
    const state = await postJson(`/api/profiles/${encodeURIComponent(currentProfileId)}`, "DELETE");
    renderState(state);
    setStatus("Profile deleted.");
    await previewPdf({ immediate: true });
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

async function selectProfile(profileId) {
  setStatus("Loading profile...");

  try {
    const state = await postJson(`/api/profiles/${encodeURIComponent(profileId)}/select`, "POST");
    renderState(state);
    setStatus("Profile loaded.");
    await previewPdf({ immediate: true });
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

async function printLabel() {
  setStatus("Applying printer settings and sending job...");

  try {
    const result = await postJson("/print", "POST", getPayload());
    setStatus(`Print submitted: ${result.stdout || result.queue}`);
  } catch (error) {
    console.error(error);
    setStatus(`Print failed: ${error.message}`, true);
  }
}

function bindSingleChoiceButtons(selector, targetProperty, datasetProperty) {
  Array.from(document.querySelectorAll(selector)).forEach((button) => {
    button.addEventListener("click", () => {
      syncActiveRowFromEditor();
      draftRows[activeRowIndex][targetProperty] = button.dataset[datasetProperty];
      renderRowsUI();
      schedulePreview();
    });
  });
}

function bindToggleButton(buttonId, propertyName) {
  const button = document.getElementById(buttonId);
  button.addEventListener("click", () => {
    syncActiveRowFromEditor();
    draftRows[activeRowIndex][propertyName] = !draftRows[activeRowIndex][propertyName];
    renderRowsUI();
    schedulePreview();
  });
}

Array.from(document.querySelectorAll("[data-tab-button]")).forEach((button) => {
  button.addEventListener("click", () => {
    currentTab = button.dataset.tabButton;
    updateTabState();
  });
});

newProfileButton.addEventListener("click", startNewProfile);
saveButton.addEventListener("click", saveProfile);
deleteButton.addEventListener("click", deleteProfile);
previewButton.addEventListener("click", () => previewPdf({ immediate: true }));
printButton.addEventListener("click", printLabel);
profilePicker.addEventListener("change", async () => {
  if (profilePicker.value) {
    await selectProfile(profilePicker.value);
  }
});

continuousToggle.addEventListener("click", () => {
  continuousInput.checked = !continuousInput.checked;
  updateContinuousLabel();
  schedulePreview();
});

borderToggle.addEventListener("click", () => {
  borderInput.checked = !borderInput.checked;
  updateBorderToggle();
  schedulePreview();
});

Array.from(document.querySelectorAll("[data-autopreview]")).forEach((input) => {
  const eventName = input.tagName === "SELECT" ? "change" : "input";
  input.addEventListener(eventName, schedulePreview);
});

addRowButton.addEventListener("click", () => {
  syncActiveRowFromEditor();
  draftRows.push({
    text: "",
    level: "normal",
    bold: false,
    italic: false,
    alignment: "left",
  });
  activeRowIndex = draftRows.length - 1;
  renderRowsUI();
  schedulePreview();
});

deleteRowButton.addEventListener("click", () => {
  if (draftRows.length === 1) {
    return;
  }

  syncActiveRowFromEditor();
  draftRows.splice(activeRowIndex, 1);
  activeRowIndex = Math.max(0, activeRowIndex - 1);
  renderRowsUI();
  schedulePreview();
});

rowText.addEventListener("input", () => {
  syncActiveRowFromEditor();
  renderRowList();
  schedulePreview();
});

bindSingleChoiceButtons("[data-row-level]", "level", "rowLevel");
bindSingleChoiceButtons("[data-row-alignment]", "alignment", "rowAlignment");
bindToggleButton("row-bold-button", "bold");
bindToggleButton("row-italic-button", "italic");

updateTabState();
setStatus("Loading label profiles...");
setPreviewStatus("Waiting for preview...");
setPreviewOverlay("Loading profile...");

postJson("/api/state", "GET")
  .then((state) => {
    renderState(state);
    setStatus("Profiles loaded.");
    return previewPdf({ immediate: true });
  })
  .catch((error) => {
    console.error(error);
    setStatus(error.message, true);
    setPreviewStatus("Preview unavailable.", true);
    setPreviewOverlay(error.message, true, true);
  });
