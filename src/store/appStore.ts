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
  {
    id: 'meta/llama-3.1-70b-instruct',
    label: 'Llama 3.1 70B',
    initial: 'L',
    provider: 'META',
    context: '128K',
    speed: '145T/S',
    color: '#a78bfa',
  },
  {
    id: 'meta/llama-3.1-405b-instruct',
    label: 'Llama 3.1 405B',
    initial: 'L',
    provider: 'META',
    context: '128K',
    speed: '89T/S',
    color: '#818cf8',
  },
  {
    id: 'mistralai/mistral-large-3-675b-instruct-2512',
    label: 'Mistral 675B',
    initial: 'M',
    provider: 'MISTRAL',
    context: '128K',
    speed: '95T/S',
    color: '#fb923c',
  },
  {
    id: 'meta/llama-3.1-8b-instruct',
    label: 'Llama 3.1 8B',
    initial: 'L',
    provider: 'META',
    context: '128K',
    speed: '320T/S',
    color: '#34d399',
  },
]

export const IMAGE_MODELS = [
  { id: 'black-forest-labs/flux.1-dev', label: 'FLUX 1 Dev', badge: 'HD' },
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
        if (already) {
          // Always keep at least 1
          if (s.selectedModels.length === 1) return s
          return { selectedModels: s.selectedModels.filter(m => m !== id) }
        }
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
      }),
    }
  )
)
