const configForm = document.getElementById("config-form");
const queueSelect = document.getElementById("queue_name");
const refreshButton = document.getElementById("refresh-button");
const statusEl = document.getElementById("status");
const configStateEl = document.getElementById("config-state");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.dataset.state = isError ? "error" : "idle";
}

function renderConfig(data) {
  queueSelect.innerHTML = "";

  (data.queues || []).forEach((queue) => {
    const option = document.createElement("option");
    option.value = queue;
    option.textContent = queue;

    if (queue === data.queue_name) {
      option.selected = true;
    }

    queueSelect.appendChild(option);
  });

  configStateEl.textContent = JSON.stringify(data, null, 2);
}

async function fetchConfig(method = "GET", payload = null) {
  const response = await fetch("/api/config", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : null,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  return result;
}

async function loadConfig() {
  setStatus("Loading queues...");

  try {
    const result = await fetchConfig();
    renderConfig(result);
    setStatus("Queues loaded.");
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
}

configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Saving queue...");

  try {
    const result = await fetchConfig("POST", { queue_name: queueSelect.value });
    renderConfig(result);
    setStatus("Queue saved.");
  } catch (error) {
    console.error(error);
    setStatus(error.message, true);
  }
});

refreshButton.addEventListener("click", loadConfig);

loadConfig();
