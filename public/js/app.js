const STEP_LABELS = {
  collect_name: "Nome",
  collect_birth_date: "Data de nascimento",
  collect_weight_loss_reason: "Motivo",
  qualified: "Qualificado",
  rejected: "Rejeitado",
};

const STEP_ORDER = [
  "collect_name",
  "collect_birth_date",
  "collect_weight_loss_reason",
  "qualified",
];

const STATUS_MESSAGES = {
  qualified: "Lead qualificado com sucesso!",
  rejected: "Lead nao atende aos criterios.",
  expired: "Sessao expirada por inatividade.",
};

const dom = {
  messages: () => document.getElementById("messages"),
  input: () => document.getElementById("messageInput"),
  sendBtn: () => document.getElementById("sendBtn"),
  typingWrap: () => document.getElementById("typingWrap"),
  inputArea: () => document.getElementById("inputArea"),
  phoneInput: () => document.getElementById("phoneInput"),
  statusBadge: () => document.getElementById("statusBadge"),
  funnelStepName: () => document.getElementById("funnelStepName"),
};

function getPhone() {
  return dom.phoneInput().value.trim();
}

// ── Messages ──

function addMessage(content, role, statusClass) {
  const container = dom.messages();
  const div = document.createElement("div");
  div.className = "message " + role;
  if (statusClass) div.classList.add(statusClass);
  div.textContent = content;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping(visible) {
  dom.typingWrap().classList.toggle("active", visible);
  if (visible) {
    const el = dom.messages();
    el.scrollTop = el.scrollHeight;
  }
}

// ── Input state ──

function setInputEnabled(enabled) {
  dom.sendBtn().disabled = !enabled;
  dom.inputArea().classList.toggle("disabled", !enabled);
}

// ── Variables ──

function setVar(id, value) {
  const el = document.getElementById(id);
  if (value) {
    el.textContent = value;
    el.classList.add("filled");
  } else {
    el.textContent = "\u2014";
    el.classList.remove("filled");
  }
}

function updateVariables(variables) {
  setVar("varName", variables.name);
  setVar("varBirthDate", variables.birthDate);
  setVar("varReason", variables.weightLossReason);
}

// ── Status Badge ──

function updateStatusBadge(status) {
  const badge = dom.statusBadge();
  badge.textContent = status;
  badge.className = "badge " + status;
}

// ── Funnel Stepper ──

function updateFunnel(funnelStep) {
  const currentIdx = STEP_ORDER.indexOf(funnelStep);
  const isRejected = funnelStep === "rejected";

  dom.funnelStepName().textContent =
    STEP_LABELS[funnelStep] || funnelStep;

  document.querySelectorAll(".funnel-step").forEach(function (el) {
    const step = el.dataset.step;
    const idx = STEP_ORDER.indexOf(step);
    el.className = "funnel-step";

    if (isRejected) {
      if (idx < 3) el.classList.add("done");
      if (step === "qualified") {
        el.classList.add("rejected-step");
        el.querySelector(".step-final-label").textContent = "Rejeitado";
      }
    } else {
      if (idx < currentIdx) el.classList.add("done");
      else if (step === funnelStep) el.classList.add("current");

      if (step === "qualified") {
        const label = el.querySelector(".step-final-label");
        label.textContent =
          funnelStep === "qualified" ? "Qualificado" : "Resultado";
      }
    }
  });
}

// ── Terminal state handling ──

function handleTerminalStatus(status) {
  const message = STATUS_MESSAGES[status];
  if (!message) return;

  addMessage(message, "system", "status-" + status);
  setInputEnabled(false);
}

function isTerminalStatus(status) {
  return status === "qualified" || status === "rejected" || status === "expired";
}

// ── Conversation update ──

function updateConversation(conversation) {
  if (!conversation) return;

  updateStatusBadge(conversation.status);
  updateFunnel(conversation.funnelStep);
  updateVariables(conversation.variables || {});

  if (isTerminalStatus(conversation.status)) {
    handleTerminalStatus(conversation.status);
  }
}

// ── API ──

async function sendMessage() {
  const input = dom.input();
  const content = input.value.trim();
  if (!content) return;

  const phone = getPhone();
  if (!phone) return;

  input.value = "";
  addMessage(content, "user");
  showTyping(true);
  dom.sendBtn().disabled = true;

  try {
    const res = await fetch(
      "/conversations/" + encodeURIComponent(phone) + "/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );

    const data = await res.json();
    showTyping(false);

    if (data.content) addMessage(data.content, "assistant");
    if (data.conversation) updateConversation(data.conversation);
  } catch {
    showTyping(false);
    addMessage("Erro ao conectar com o servidor.", "system");
  } finally {
    if (!dom.inputArea().classList.contains("disabled")) {
      dom.sendBtn().disabled = false;
    }
    input.focus();
  }
}

function newConversation() {
  const container = dom.messages();
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const systemMsg = document.createElement("div");
  systemMsg.className = "message system";
  systemMsg.textContent = "Envie uma mensagem para iniciar";
  container.appendChild(systemMsg);

  updateStatusBadge("active");
  dom.funnelStepName().textContent = "Nome";
  updateVariables({});
  setInputEnabled(true);

  document.querySelectorAll(".funnel-step").forEach(function (el, i) {
    el.className = i === 0 ? "funnel-step current" : "funnel-step";
    if (el.dataset.step === "qualified") {
      el.querySelector(".step-final-label").textContent = "Resultado";
    }
  });
}

// ── Init ──

document.getElementById("messageInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
