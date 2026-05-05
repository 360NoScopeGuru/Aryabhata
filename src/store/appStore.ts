import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Mode = 'chat' | 'code' | 'image'
export type Theme = 'cad' | 'orbit' | 'brutal' | 'liquid' | 'prism'
export type SamplingPreset = 'precise' | 'balanced' | 'creative' | 'forensic'

export interface MixingModel {
  id: string
  label: string
  initial: string
  provider: string
  context: string
  speed: string
  color: string
}

// All text models support both chat and code
export const MIXING_MODELS: MixingModel[] = [
  // ── META ────────────────────────────────────────────────────
  { id: 'meta/llama-3.2-3b-instruct',                       label: 'Llama 3.2 3B',         initial: 'L', provider: 'META',      context: '128K', speed: '450T/S', color: '#ddd6fe' },
  { id: 'meta/llama-3.1-8b-instruct',                       label: 'Llama 3.1 8B',         initial: 'L', provider: 'META',      context: '128K', speed: '320T/S', color: '#c4b5fd' },
  { id: 'meta/llama-3.2-11b-vision-instruct',               label: 'Llama 3.2 11B Vision', initial: 'L', provider: 'META',      context: '128K', speed: '180T/S', color: '#a78bfa' },
  { id: 'meta/llama-3.1-70b-instruct',                      label: 'Llama 3.1 70B',        initial: 'L', provider: 'META',      context: '128K', speed: '145T/S', color: '#8b5cf6' },
  { id: 'meta/llama-3.3-70b-instruct',                      label: 'Llama 3.3 70B',        initial: 'L', provider: 'META',      context: '128K', speed: '140T/S', color: '#7c3aed' },
  { id: 'meta/llama-3.2-90b-vision-instruct',               label: 'Llama 3.2 90B Vision', initial: 'L', provider: 'META',      context: '128K', speed: '60T/S',  color: '#6d28d9' },
  { id: 'meta/llama-3.1-405b-instruct',                     label: 'Llama 3.1 405B',       initial: 'L', provider: 'META',      context: '128K', speed: '89T/S',  color: '#5b21b6' },
  { id: 'meta/llama-4-scout-17b-16e-instruct',              label: 'Llama 4 Scout',        initial: 'L', provider: 'META',      context: '10M',  speed: '120T/S', color: '#4c1d95' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct',          label: 'Llama 4 Maverick',     initial: 'L', provider: 'META',      context: '1M',   speed: '85T/S',  color: '#3b0764' },

  // ── MISTRAL ─────────────────────────────────────────────────
  { id: 'mistralai/mistral-7b-instruct-v0.3',               label: 'Mistral 7B',           initial: 'M', provider: 'MISTRAL',   context: '32K',  speed: '250T/S', color: '#fed7aa' },
  { id: 'mistralai/mistral-nemo-12b-instruct',               label: 'Mistral Nemo 12B',     initial: 'M', provider: 'MISTRAL',   context: '128K', speed: '200T/S', color: '#fdba74' },
  { id: 'mistralai/mixtral-8x7b-instruct-v0.1',             label: 'Mixtral 8×7B',         initial: 'M', provider: 'MISTRAL',   context: '32K',  speed: '160T/S', color: '#fb923c' },
  { id: 'mistralai/codestral-22b-instruct-v0.1',            label: 'Codestral 22B',        initial: 'M', provider: 'MISTRAL',   context: '32K',  speed: '130T/S', color: '#f97316' },
  { id: 'mistralai/mixtral-8x22b-instruct-v0.1',            label: 'Mixtral 8×22B',        initial: 'M', provider: 'MISTRAL',   context: '64K',  speed: '100T/S', color: '#ea580c' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512',     label: 'Mistral 675B',         initial: 'M', provider: 'MISTRAL',   context: '128K', speed: '95T/S',  color: '#c2410c' },

  // ── GOOGLE ──────────────────────────────────────────────────
  { id: 'google/gemma-2-9b-it',                             label: 'Gemma 2 9B',           initial: 'G', provider: 'GOOGLE',    context: '8K',   speed: '230T/S', color: '#a5f3fc' },
  { id: 'google/codegemma-7b-it',                           label: 'CodeGemma 7B',         initial: 'G', provider: 'GOOGLE',    context: '8K',   speed: '220T/S', color: '#67e8f9' },
  { id: 'google/gemma-2-27b-it',                            label: 'Gemma 2 27B',          initial: 'G', provider: 'GOOGLE',    context: '8K',   speed: '120T/S', color: '#22d3ee' },
  { id: 'google/gemma-3-12b-it',                            label: 'Gemma 3 12B',          initial: 'G', provider: 'GOOGLE',    context: '128K', speed: '180T/S', color: '#06b6d4' },
  { id: 'google/gemma-3-27b-it',                            label: 'Gemma 3 27B',          initial: 'G', provider: 'GOOGLE',    context: '128K', speed: '110T/S', color: '#0891b2' },

  // ── MICROSOFT ───────────────────────────────────────────────
  { id: 'microsoft/phi-3-mini-128k-instruct',               label: 'Phi-3 Mini',           initial: 'Φ', provider: 'MICROSOFT', context: '128K', speed: '280T/S', color: '#99f6e4' },
  { id: 'microsoft/phi-3.5-mini-instruct',                  label: 'Phi-3.5 Mini',         initial: 'Φ', provider: 'MICROSOFT', context: '128K', speed: '270T/S', color: '#2dd4bf' },
  { id: 'microsoft/phi-3-medium-128k-instruct',             label: 'Phi-3 Medium',         initial: 'Φ', provider: 'MICROSOFT', context: '128K', speed: '160T/S', color: '#14b8a6' },
  { id: 'microsoft/phi-4',                                  label: 'Phi-4',                initial: 'Φ', provider: 'MICROSOFT', context: '16K',  speed: '150T/S', color: '#0d9488' },

  // ── QWEN ────────────────────────────────────────────────────
  { id: 'qwen/qwen2.5-7b-instruct',                         label: 'Qwen 2.5 7B',          initial: 'Q', provider: 'QWEN',      context: '32K',  speed: '260T/S', color: '#fef08a' },
  { id: 'qwen/qwen2.5-72b-instruct',                        label: 'Qwen 2.5 72B',         initial: 'Q', provider: 'QWEN',      context: '32K',  speed: '110T/S', color: '#fbbf24' },
  { id: 'qwen/qwq-32b',                                     label: 'QwQ 32B',              initial: 'Q', provider: 'QWEN',      context: '32K',  speed: '80T/S',  color: '#f59e0b' },

  // ── DEEPSEEK ────────────────────────────────────────────────
  { id: 'deepseek-ai/deepseek-r1-distill-qwen-7b',          label: 'DeepSeek R1 7B',       initial: 'D', provider: 'DEEPSEEK',  context: '32K',  speed: '200T/S', color: '#fca5a5' },
  { id: 'deepseek-ai/deepseek-r1-distill-llama-70b',        label: 'DeepSeek R1 70B',      initial: 'D', provider: 'DEEPSEEK',  context: '32K',  speed: '100T/S', color: '#f87171' },
  { id: 'deepseek-ai/deepseek-r1',                          label: 'DeepSeek R1',          initial: 'D', provider: 'DEEPSEEK',  context: '64K',  speed: '70T/S',  color: '#ef4444' },
  { id: 'deepseek-ai/deepseek-v3',                          label: 'DeepSeek V3',          initial: 'D', provider: 'DEEPSEEK',  context: '128K', speed: '90T/S',  color: '#dc2626' },

  // ── NVIDIA ──────────────────────────────────────────────────
  { id: 'nvidia/llama-3.1-nemotron-nano-8b-v1',             label: 'Nemotron Nano 8B',     initial: 'N', provider: 'NVIDIA',    context: '128K', speed: '280T/S', color: '#86efac' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct',           label: 'Nemotron 70B',         initial: 'N', provider: 'NVIDIA',    context: '128K', speed: '120T/S', color: '#4ade80' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1',           label: 'Nemotron Super 49B',   initial: 'N', provider: 'NVIDIA',    context: '128K', speed: '130T/S', color: '#22c55e' },

  // ── COHERE ──────────────────────────────────────────────────
  { id: 'cohere/command-r-08-2024',                         label: 'Command R',            initial: 'C', provider: 'COHERE',    context: '128K', speed: '140T/S', color: '#a5b4fc' },
  { id: 'cohere/command-r-plus-04-2024',                    label: 'Command R+',           initial: 'C', provider: 'COHERE',    context: '128K', speed: '90T/S',  color: '#818cf8' },

  // ── IBM ─────────────────────────────────────────────────────
  { id: 'ibm/granite-3.0-8b-instruct',                      label: 'Granite 3.0 8B',       initial: 'I', provider: 'IBM',       context: '4K',   speed: '250T/S', color: '#94a3b8' },
  { id: 'ibm/granite-34b-code-instruct',                    label: 'Granite 34B Code',     initial: 'I', provider: 'IBM',       context: '128K', speed: '100T/S', color: '#64748b' },
]

export const IMAGE_MODELS = [
  { id: 'black-forest-labs/flux.1-schnell',  label: 'FLUX.1 Schnell',  badge: 'Fast' },
  { id: 'black-forest-labs/flux.1-dev',      label: 'FLUX.1 Dev',      badge: 'HD'   },
]

export const SAMPLING_PRESETS: Record<SamplingPreset, { temperature: number; topP: number; topK: number }> = {
  precise:  { temperature: 0.1,  topP: 0.90, topK: 10  },
  balanced: { temperature: 0.7,  topP: 0.95, topK: 40  },
  creative: { temperature: 1.2,  topP: 0.98, topK: 100 },
  forensic: { temperature: 0.3,  topP: 0.92, topK: 20  },
}

export interface Conversation {
  id: string
  title: string
  mode: Mode
  model?: string
  forked_from?: string
  created_at: string
  updated_at: string
}

export interface ArenaEntry {
  model_id: string
  wins: number
  total_rounds: number
  win_rate: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  mode: Mode
  model?: string
  image_url?: string
  created_at: string
  blend?: boolean
  ttft?: number
  tpot?: number
  latency?: number
  outputTokens?: number
  cost?: number
  finishReason?: string
}

interface Telemetry {
  tpot: number
  ttft: number
  inputTokens: number
  outputTokens: number
  cost: number
  carbon: number
  spark: number[]
  streaming: boolean
}

interface AppState {
  mode: Mode
  theme: Theme
  autoRoute: boolean
  activeConversationId: string | null
  conversations: Conversation[]
  messages: Record<string, Message[]>

  // Model selection (1 = normal, 2-5 = blend mode)
  selectedModels: string[]

  // Image
  selectedImageModel: string
  imageWidth: number
  imageHeight: number
  imageSteps: number
  codeLanguage: string

  // Sampling
  samplingPreset: SamplingPreset
  temperature: number
  topP: number
  topK: number
  frequencyPenalty: number
  presencePenalty: number
  maxTokens: number

  // Live telemetry
  telemetry: Telemetry

  // System prompt + prompt library
  systemPrompt: string
  savedPrompts: { id: string; title: string; content: string }[]

  // Session meta
  sessionTokens: number
  projectName: string
  threadCount: number

  // Actions
  setMode: (m: Mode) => void
  setTheme: (t: Theme) => void
  setAutoRoute: (v: boolean) => void
  setActiveConversation: (id: string | null) => void
  setConversations: (c: Conversation[]) => void
  addConversation: (c: Conversation) => void
  removeConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  setMessages: (convId: string, msgs: Message[]) => void
  addMessage: (msg: Message) => void
  appendToLastMessage: (convId: string, delta: string) => void
  updateLastMessageTelemetry: (convId: string, fields: Partial<Message>) => void

  toggleModel: (id: string) => void
  setSelectedModels: (ids: string[]) => void

  setSelectedImageModel: (m: string) => void
  setImageSize: (w: number, h: number) => void
  setImageSteps: (n: number) => void
  setCodeLanguage: (l: string) => void

  setSamplingPreset: (p: SamplingPreset) => void
  setTemperature: (v: number) => void
  setTopP: (v: number) => void
  setTopK: (v: number) => void
  setFrequencyPenalty: (v: number) => void
  setPresencePenalty: (v: number) => void
  setMaxTokens: (v: number) => void

  updateTelemetry: (fields: Partial<Telemetry>) => void
  addSessionTokens: (n: number) => void
  setProjectName: (n: string) => void
  bumpThreadCount: () => void

  setSystemPrompt: (p: string) => void
  addPrompt: (p: { id: string; title: string; content: string }) => void
  removePrompt: (id: string) => void
  truncateMessagesFrom: (convId: string, index: number) => void
  updateMessageContent: (convId: string, msgId: string, content: string) => void
  clearMessages: (convId: string) => void

  // Arena
  arenaVotes: Record<string, string>
  leaderboard: ArenaEntry[]
  castVote: (key: string, modelId: string) => void
  setLeaderboard: (entries: ArenaEntry[]) => void
}

export function getActiveModel(selectedModels: string[]): string {
  return selectedModels[0] ?? MIXING_MODELS[0].id
}

export function isBlendMode(selectedModels: string[]): boolean {
  return selectedModels.length >= 2
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'chat',
      theme: 'cad',
      autoRoute: false,
      activeConversationId: null,
      conversations: [],
      messages: {},

      selectedModels: ['meta/llama-3.1-70b-instruct'],

      selectedImageModel: 'black-forest-labs/flux.1-dev',
      imageWidth: 1024,
      imageHeight: 1024,
      imageSteps: 35,
      codeLanguage: 'python',

      samplingPreset: 'balanced',
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      maxTokens: 4096,

      telemetry: {
        tpot: 0, ttft: 0, inputTokens: 0, outputTokens: 0,
        cost: 0, carbon: 0, spark: Array(20).fill(0), streaming: false,
      },

      systemPrompt: '',
      savedPrompts: [],
      sessionTokens: 0,
      projectName: 'Untitled Project',
      threadCount: 0,

      setMode: (m) => set({ mode: m }),
      setTheme: (t) => set({ theme: t }),
      setAutoRoute: (v) => set({ autoRoute: v }),
      setActiveConversation: (id) => set({ activeConversationId: id }),
      setConversations: (c) => set({ conversations: c }),
      addConversation: (c) => set((s) => ({ conversations: [c, ...s.conversations] })),
      removeConversation: (id) => set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
      })),
      updateConversationTitle: (id, title) => set((s) => ({
        conversations: s.conversations.map((c) => c.id === id ? { ...c, title } : c),
      })),
      setMessages: (convId, msgs) => set((s) => ({ messages: { ...s.messages, [convId]: msgs } })),
      addMessage: (msg) => set((s) => {
        const existing = s.messages[msg.conversation_id] || []
        return { messages: { ...s.messages, [msg.conversation_id]: [...existing, msg] } }
      }),
      appendToLastMessage: (convId, delta) => set((s) => {
        const msgs = [...(s.messages[convId] || [])]
        if (msgs.length === 0) return s
        const last = { ...msgs[msgs.length - 1] }
        last.content += delta
        msgs[msgs.length - 1] = last
        return { messages: { ...s.messages, [convId]: msgs } }
      }),
      updateLastMessageTelemetry: (convId, fields) => set((s) => {
        const msgs = [...(s.messages[convId] || [])]
        if (msgs.length === 0) return s
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...fields }
        return { messages: { ...s.messages, [convId]: msgs } }
      }),

      toggleModel: (id) => set((s) => {
        const already = s.selectedModels.includes(id)
        if (already) return { selectedModels: s.selectedModels.filter(m => m !== id) }
        if (s.selectedModels.length >= 5) return s
        return { selectedModels: [...s.selectedModels, id] }
      }),
      setSelectedModels: (ids) => set({ selectedModels: ids.slice(0, 5) }),

      setSelectedImageModel: (m) => set({ selectedImageModel: m }),
      setImageSize: (w, h) => set({ imageWidth: w, imageHeight: h }),
      setImageSteps: (n) => set({ imageSteps: n }),
      setCodeLanguage: (l) => set({ codeLanguage: l }),

      setSamplingPreset: (p) => set({
        samplingPreset: p,
        temperature: SAMPLING_PRESETS[p].temperature,
        topP: SAMPLING_PRESETS[p].topP,
        topK: SAMPLING_PRESETS[p].topK,
      }),
      setTemperature: (v) => set({ temperature: v, samplingPreset: 'balanced' }),
      setTopP: (v) => set({ topP: v }),
      setTopK: (v) => set({ topK: v }),
      setFrequencyPenalty: (v) => set({ frequencyPenalty: v }),
      setPresencePenalty: (v) => set({ presencePenalty: v }),
      setMaxTokens: (v) => set({ maxTokens: v }),

      updateTelemetry: (fields) => set((s) => ({
        telemetry: { ...s.telemetry, ...fields },
      })),
      addSessionTokens: (n) => set((s) => ({ sessionTokens: s.sessionTokens + n })),
      setProjectName: (n) => set({ projectName: n }),
      bumpThreadCount: () => set((s) => ({ threadCount: s.threadCount + 1 })),

      setSystemPrompt: (p) => set({ systemPrompt: p }),
      addPrompt: (p) => set((s) => ({ savedPrompts: [...s.savedPrompts, p] })),
      removePrompt: (id) => set((s) => ({ savedPrompts: s.savedPrompts.filter(p => p.id !== id) })),
      truncateMessagesFrom: (convId, index) => set((s) => ({
        messages: { ...s.messages, [convId]: (s.messages[convId] ?? []).slice(0, index) },
      })),
      updateMessageContent: (convId, msgId, content) => set((s) => ({
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] ?? []).map(m => m.id === msgId ? { ...m, content } : m),
        },
      })),
      clearMessages: (convId) => set((s) => ({
        messages: { ...s.messages, [convId]: [] },
      })),

      arenaVotes: {},
      leaderboard: [],
      castVote: (key, modelId) => set((s) => ({
        arenaVotes: { ...s.arenaVotes, [key]: modelId },
      })),
      setLeaderboard: (entries) => set({ leaderboard: entries }),
    }),
    {
      name: 'aryabhata-v3',
      partialize: (s) => ({
        theme: s.theme,
        autoRoute: s.autoRoute,
        selectedModels: s.selectedModels,
        selectedImageModel: s.selectedImageModel,
        imageWidth: s.imageWidth,
        imageHeight: s.imageHeight,
        imageSteps: s.imageSteps,
        codeLanguage: s.codeLanguage,
        samplingPreset: s.samplingPreset,
        temperature: s.temperature,
        topP: s.topP,
        topK: s.topK,
        frequencyPenalty: s.frequencyPenalty,
        presencePenalty: s.presencePenalty,
        maxTokens: s.maxTokens,
        projectName: s.projectName,
        systemPrompt: s.systemPrompt,
        savedPrompts: s.savedPrompts,
        arenaVotes: s.arenaVotes,
      }),
    }
  )
)
