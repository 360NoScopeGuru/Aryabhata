import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Mode = 'chat' | 'code' | 'image'
export type Theme = 'cad' | 'orbit' | 'brutal' | 'liquid' | 'prism'
export type RoutingMode = 'blend' | 'cascade' | 'moe' | 'boss'
export type SamplingPreset = 'precise' | 'balanced' | 'creative' | 'forensic'

export interface MixingModel {
  id: string
  label: string
  initial: string
  provider: string
  context: string
  speed: string
  color: string
  modes: Mode[]
}

export const MIXING_MODELS: MixingModel[] = [
  {
    id: 'meta/llama-3.1-70b-instruct',
    label: 'Llama 3.1 70B',
    initial: 'L',
    provider: 'META',
    context: '128K',
    speed: '145T/S',
    color: '#a78bfa',
    modes: ['chat'],
  },
  {
    id: 'meta/llama-3.1-405b-instruct',
    label: 'Llama 3.1 405B',
    initial: 'L',
    provider: 'META',
    context: '128K',
    speed: '89T/S',
    color: '#818cf8',
    modes: ['code'],
  },
  {
    id: 'mistralai/mistral-large-3-675b-instruct-2512',
    label: 'Mistral 675B',
    initial: 'M',
    provider: 'MISTRAL',
    context: '128K',
    speed: '95T/S',
    color: '#fb923c',
    modes: ['chat', 'code'],
  },
  {
    id: 'meta/llama-3.1-8b-instruct',
    label: 'Llama 3.1 8B',
    initial: 'L',
    provider: 'META',
    context: '128K',
    speed: '320T/S',
    color: '#34d399',
    modes: ['chat'],
  },
]

export const IMAGE_MODELS = [
  { id: 'black-forest-labs/flux.1-dev', label: 'FLUX 1 Dev', badge: 'HD' },
]

// Keep these for compatibility with CodeMode / ImageMode selectors
export const CHAT_MODELS = MIXING_MODELS.filter(m => m.modes.includes('chat')).map(m => ({
  id: m.id, label: m.label, badge: m.provider,
}))
export const CODE_MODELS = MIXING_MODELS.filter(m => m.modes.includes('code')).map(m => ({
  id: m.id, label: m.label, badge: m.provider,
}))

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
  created_at: string
  updated_at: string
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
  // telemetry (assistant messages only)
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

  // Mixing console
  modelWeights: Record<string, number>
  routingMode: RoutingMode

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

  setModelWeight: (modelId: string, weight: number) => void
  setRoutingMode: (m: RoutingMode) => void

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
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  'meta/llama-3.1-70b-instruct': 100,
  'meta/llama-3.1-405b-instruct': 100,
  'mistralai/mistral-large-3-675b-instruct-2512': 0,
  'meta/llama-3.1-8b-instruct': 0,
  'black-forest-labs/flux.1-dev': 100,
}

export function getActiveModel(weights: Record<string, number>, mode: Mode): string {
  const modeModels = MIXING_MODELS.filter(m => m.modes.includes(mode))
  if (modeModels.length === 0) return MIXING_MODELS[0].id
  return modeModels.reduce((best, m) =>
    (weights[m.id] ?? 0) > (weights[best.id] ?? 0) ? m : best
  ).id
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

      modelWeights: DEFAULT_WEIGHTS,
      routingMode: 'blend',

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

      setModelWeight: (modelId, weight) => set((s) => ({
        modelWeights: { ...s.modelWeights, [modelId]: weight },
      })),
      setRoutingMode: (m) => set({ routingMode: m }),

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
    }),
    {
      name: 'aryabhata-v2',
      partialize: (s) => ({
        theme: s.theme,
        autoRoute: s.autoRoute,
        modelWeights: s.modelWeights,
        routingMode: s.routingMode,
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
      }),
    }
  )
)
