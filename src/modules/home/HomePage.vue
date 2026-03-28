<template>
  <div class="flex items-center justify-center text-primary m-4">
    <h2 class="text-lg font-bold p-4">Mudar cor</h2>
    <Toogle />
  </div>
  <div class="static">
    <button class="floating-btn" @click="openModal">
      <img
        class="absolute bottom-4 right-4 h-10 w-10 rounded-full"
        src="../../assets/images/pito-avatar.png"
        alt="Pito Avatar"
      />
    </button>
  </div>

  <Modal
    ref="chatModal"
    title="Chat"
    boxClass="w-[calc(100vw)] min-w-0 max-h-[75%] md:max-w-md md:w-[calc(100vw-2rem)]"
    @close="closeModal"
  >
    <template #content>
      <div class="space-y-3 pb-26 max-h-[46vh] overflow-y-auto pr-1">
        <div class="text-xs" :class="apiOnline ? 'text-success' : 'text-error'">
          {{ apiOnline ? "API online" : "API offline" }}
        </div>

        <div
          v-for="message in messages"
          :key="message.id"
          class="chat"
          :class="message.role === 'user' ? 'chat-end' : 'chat-start'"
        >
          <div class="chat-bubble" :class="message.role === 'user' ? 'chat-bubble-primary' : ''">
            <template v-if="message.role === 'assistant'">
              <div class="chat-rich-text" v-html="renderAssistantMessage(message.text)" />
            </template>
            <template v-else>
              {{ message.text }}
            </template>
          </div>
          <div class="chat-footer opacity-50">{{ formatFooterTime(message.createdAt) }}</div>
        </div>

        <div v-if="isLoading" class="chat chat-start">
          <div class="chat-bubble">
            <span class="loading loading-dots loading-sm" />
          </div>
        </div>
      </div>
      <div class="absolute bottom-2 left-2 right-2">
        <div class="flex gap-2 mb-2 overflow-x-auto">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            class="btn btn-sm btn-outline shrink-0"
            :disabled="isLoading"
            @click="sendMessage(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>

        <div class="flex gap-2">
          <input
            v-model="inputMessage"
            type="text"
            placeholder="Pergunte algo para o Pito"
            class="input input-bordered w-full"
            :disabled="isLoading"
            @keydown.enter.prevent="sendMessage()"
          />
          <button class="btn btn-primary" :disabled="isLoading || !canSend" @click="sendMessage()">
            Enviar
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Toogle from "../../components/Toogle.vue";
import Modal from "../chat/ChatView.vue";
import { ApiError, healthCheck, predict } from "../chat/chatApi";
import { computed, ref } from "vue";

const chatModal = ref<InstanceType<typeof Modal> | null>(null);
const inputMessage = ref("");
const isLoading = ref(false);
const apiOnline = ref(false);

const suggestions = [
  "O que voce faz?",
  "Quais previsoes voce consegue gerar?",
  "Me explique sua resposta de forma simples",
];

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

const messages = ref<ChatMessage[]>([
  {
    id: 1,
    role: "assistant",
    text: "Oi! Eu sou o Pito. Me mande uma pergunta para eu consultar o agente.",
    createdAt: new Date().toISOString(),
  },
]);

const canSend = computed(() => inputMessage.value.trim().length >= 3);

let messageId = 1;

function createMessage(role: ChatMessage["role"], text: string, createdAt?: string): ChatMessage {
  messageId += 1;

  return {
    id: messageId,
    role,
    text,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

function formatFooterTime(isoDate: string): string {
  const date = new Date(isoDate);

  return Number.isNaN(date.getTime())
    ? "agora"
    : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeAssistantText(text: string): string {
  return text
    .replace(/\s+###\s+/g, "\n\n### ")
    .replace(/\s+-\s+\*\*/g, "\n- **")
    .replace(/\|\s+\|/g, "|\n|")
    .replace(/\s+✔\s+/g, "\n\n✔ ")
    .replace(/\s+\*\*Valor esperado:\*\*/g, "\n**Valor esperado:**")
    .replace(/\s+\*\*Justificativa:\*\*/g, "\n**Justificativa:**")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell, index, arr) => !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === ""));
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*[:\-\s|]+\|?\s*$/.test(line);
}

function renderMarkdownLike(text: string): string {
  const lines = normalizeAssistantText(text).split("\n");
  const html: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";

    if (!line) {
      continue;
    }

    if (line.startsWith("### ")) {
      html.push(`<h3>${renderInline(line.slice(4).trim())}</h3>`);
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i]?.trim().startsWith("- ") ?? false)) {
        const item = (lines[i] ?? "").trim().slice(2).trim();
        items.push(`<li>${renderInline(item)}</li>`);
        i += 1;
      }
      i -= 1;
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (line.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1]?.trim() ?? "")) {
      const headerCells = parseTableRow(line);
      const thead = `<thead><tr>${headerCells.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>`;

      i += 2;
      const bodyRows: string[] = [];
      while (i < lines.length) {
        const rowLine = lines[i]?.trim() ?? "";
        if (!rowLine.startsWith("|")) {
          i -= 1;
          break;
        }

        const cells = parseTableRow(rowLine);
        bodyRows.push(`<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`);
        i += 1;
      }

      html.push(`<table>${thead}<tbody>${bodyRows.join("")}</tbody></table>`);
      continue;
    }

    html.push(`<p>${renderInline(line)}</p>`);
  }

  return html.join("");
}

function renderAssistantMessage(text: string): string {
  return renderMarkdownLike(text);
}

async function refreshHealth() {
  try {
    const health = await healthCheck();
    apiOnline.value = health.status === "ok";
  } catch {
    apiOnline.value = false;
  }
}

async function sendMessage(suggestedQuestion?: string) {
  const nextQuestion = (suggestedQuestion ?? inputMessage.value).trim();

  if (nextQuestion.length < 3 || isLoading.value) {
    return;
  }

  inputMessage.value = "";
  isLoading.value = true;

  messages.value.push(createMessage("user", nextQuestion));

  try {
    const response = await predict({ query: nextQuestion });
    messages.value.push(createMessage("assistant", response.response, response.created_at));
    apiOnline.value = true;
  } catch (error) {
    const errorText = error instanceof Error ? error.message : "Erro desconhecido";

    let isApiOnline = false;
    try {
      const health = await healthCheck();
      isApiOnline = health.status === "ok";
    } catch {
      isApiOnline = false;
    }

    apiOnline.value = isApiOnline;

    const guidance =
      error instanceof ApiError && isApiOnline
        ? "A API esta online, mas ocorreu um erro no processamento da resposta."
        : "Nao consegui conectar na API agora.";

    messages.value.push(
      createMessage(
        "assistant",
        `${guidance} Detalhe: ${errorText}`,
      ),
    );
  } finally {
    isLoading.value = false;
  }
}

const openModal = () => {
  chatModal.value?.openModal();
  void refreshHealth();
};

const closeModal = () => {
  chatModal.value?.closeModal();
};
</script>

<style scoped>
.chat-rich-text :deep(h3) {
  margin: 0.6rem 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 700;
}

.chat-rich-text :deep(p) {
  margin: 0.25rem 0;
  line-height: 1.4;
}

.chat-rich-text :deep(ul) {
  margin: 0.25rem 0 0.4rem;
  padding-left: 1rem;
  list-style-type: disc;
}

.chat-rich-text :deep(li) {
  margin: 0.2rem 0;
}

.chat-rich-text :deep(table) {
  width: 100%;
  margin-top: 0.5rem;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.chat-rich-text :deep(th),
.chat-rich-text :deep(td) {
  border: 1px solid color-mix(in oklab, var(--color-base-content) 16%, transparent);
  padding: 0.3rem 0.4rem;
  text-align: left;
  vertical-align: top;
}

.chat-rich-text :deep(th) {
  font-weight: 700;
  background: color-mix(in oklab, var(--color-base-content) 9%, transparent);
}

.chat-rich-text :deep(strong) {
  font-weight: 700;
}

.chat-rich-text :deep(code) {
  border-radius: 0.35rem;
  padding: 0.05rem 0.28rem;
  font-size: 0.75rem;
  background: color-mix(in oklab, var(--color-base-content) 10%, transparent);
}
</style>
