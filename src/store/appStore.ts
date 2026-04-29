import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Mode = 'chat' | 'code' | 'image'

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
}

export const CHAT_MODELS = [
  { id: 'meta/llama-3.1-70b-instruct',                    label: 'Llama 3.1 70B',    badge: 'Best' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512',   label: 'Mistral 675B',     badge: 'Pro' },
  { id: 'meta/llama-3.1-8b-instruct',                     label: 'Llama 3.1 8B',     badge: 'Fast' },
]

export const CODE_MODELS = [
  { id: 'meta/llama-3.1-405b-instruct',            label: 'Llama 3.1 405B', badge: 'Best' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512', label: 'Mistral 675B',  badge: 'Pro' },
]

export const IMAGE_MODELS = [
  { id: 'black-forest-labs/flux.1-dev', label: 'FLUX 1 Dev', badge: 'HD' },
]

interface AppState {
  mode: Mode
  autoRoute: boolean
  sidebarOpen: boolean
  activeConversationId: string | null
  conversations: Conversation[]
  messages: Record<string, Message[]>
  selectedChatModel: string
  selectedCodeModel: string
  selectedImageModel: string
  codeLanguage: string
  imageWidth: number
  imageHeight: number
  imageSteps: number
  sessionTokens: number
  theme: string
  font: string

  setMode: (m: Mode) => void
  setAutoRoute: (v: boolean) => void
  setSidebarOpen: (v: boolean) => void
  setTheme: (t: string) => void
  setFont: (f: string) => void
  setActiveConversation: (id: string | null) => void
  setConversations: (c: Conversation[]) => void
  addConversation: (c: Conversation) => void
  removeConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  setMessages: (convId: string, msgs: Message[]) => void
  addMessage: (msg: Message) => void
  appendToLastMessage: (convId: string, delta: string) => void
  setSelectedChatModel: (m: string) => void
  setSelectedCodeModel: (m: string) => void
  setSelectedImageModel: (m: string) => void
  setCodeLanguage: (l: string) => void
  setImageSize: (w: number, h: number) => void
  setImageSteps: (n: number) => void
  addSessionTokens: (n: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'chat',
      autoRoute: false,
      sidebarOpen: true,
      activeConversationId: null,
      conversations: [],
      messages: {},
      selectedChatModel: CHAT_MODELS[0].id,
      selectedCodeModel: CODE_MODELS[0].id,
      selectedImageModel: IMAGE_MODELS[0].id,
      codeLanguage: 'python',
      imageWidth: 1024,
      imageHeight: 1024,
      imageSteps: 35,
      sessionTokens: 0,
      theme: 'astronomical',
      font: 'system',

      setMode: (m) => set({ mode: m }),
      setTheme: (t) => set({ theme: t }),
      setFont: (f) => set({ font: f }),
      setAutoRoute: (v) => set({ autoRoute: v }),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
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
      setSelectedChatModel: (m) => set({ selectedChatModel: m }),
      setSelectedCodeModel: (m) => set({ selectedCodeModel: m }),
      setSelectedImageModel: (m) => set({ selectedImageModel: m }),
      setCodeLanguage: (l) => set({ codeLanguage: l }),
      setImageSize: (w, h) => set({ imageWidth: w, imageHeight: h }),
      setImageSteps: (n) => set({ imageSteps: n }),
      addSessionTokens: (n) => set((s) => ({ sessionTokens: s.sessionTokens + n })),
    }),
    {
      name: 'nvidia-studio',
      partialize: (s) => ({
        autoRoute: s.autoRoute,
        sidebarOpen: s.sidebarOpen,
        selectedChatModel: s.selectedChatModel,
        selectedCodeModel: s.selectedCodeModel,
        selectedImageModel: s.selectedImageModel,
        codeLanguage: s.codeLanguage,
        imageWidth: s.imageWidth,
        imageHeight: s.imageHeight,
        imageSteps: s.imageSteps,
        theme: s.theme,
        font: s.font,
      }),
    }
  )
)
