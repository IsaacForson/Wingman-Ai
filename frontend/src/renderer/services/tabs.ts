/**
 * Wingman AI - Chat tabs
 * Each tab is a backend conversation with its own history, mode and AI.
 * Whatever you ask (typed, voice, capture, screenshot) is answered in the open tab.
 */

import toast from 'react-hot-toast'
import { useAppStore, Answer, ChatTab, AIProvider, OperatingMode } from '../store/appStore'

const API = 'http://localhost:8765/api/conversations'

interface BackendConversation {
  id: string
  title: string | null
  mode: OperatingMode
  provider: AIProvider | null
  model: string | null
  created_at: string
}

interface BackendMessage {
  role: 'user' | 'assistant'
  content: string
  display?: string | null
  timestamp: string
}

const toTab = (c: BackendConversation): ChatTab => ({
  id: c.id,
  title: c.title || 'New chat',
  mode: c.mode || 'interview',
  provider: c.provider,
  model: c.model,
})

async function api<T>(url: string, method = 'GET'): Promise<T> {
  const res = await fetch(url, { method })
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status}`)
  return res.json()
}

// Backend stores user/assistant messages; the chat shows question+answer pairs
function toAnswers(conversationId: string, messages: BackendMessage[]): Answer[] {
  const answers: Answer[] = []
  for (const m of messages) {
    if (m.role === 'user') {
      answers.push({
        id: `${conversationId}-${answers.length}`,
        question: m.display || m.content,
        answer: '',
        isStreaming: false,
        timestamp: new Date(m.timestamp),
        source: 'manual',
        conversationId,
      })
    } else if (answers.length && !answers[answers.length - 1].answer) {
      answers[answers.length - 1].answer = m.content
    }
  }
  return answers.filter((a) => a.answer)
}

async function loadMessages(id: string) {
  const conv = await api<{ messages: BackendMessage[] }>(`${API}/${id}`)
  useAppStore.getState().setMessages(id, toAnswers(id, conv.messages))
}

/** Load tabs from the backend on connect; makes one if there are none */
export async function loadTabs() {
  try {
    const data = await api<{ conversations: (BackendConversation & { is_active: boolean })[]; active_id: string | null }>(API)
    // Oldest first, like browser tabs
    const convs = [...data.conversations].sort((a, b) => a.created_at.localeCompare(b.created_at))
    if (!convs.length) {
      await newTab()
      return
    }
    useAppStore.getState().setTabs(convs.map(toTab))
    const current = useAppStore.getState().activeConversationId
    const active = convs.find((c) => c.id === current) || convs.find((c) => c.id === data.active_id) || convs[convs.length - 1]
    await switchTab(active.id)
  } catch (err) {
    console.error('[Tabs] load failed', err)
  }
}

/** New tab: starts with the default AI and the current mode */
export async function newTab(mode?: OperatingMode) {
  try {
    const conv = await api<BackendConversation>(`${API}?mode=${mode || useAppStore.getState().mode}`, 'POST')
    const store = useAppStore.getState()
    store.setTabs([...store.tabs, toTab({ ...conv, title: null, created_at: '' })])
    store.setMessages(conv.id, [])
    await switchTab(conv.id)
  } catch (err) {
    toast.error('Could not open a new chat')
    console.error('[Tabs] new failed', err)
  }
}

export async function switchTab(id: string) {
  const store = useAppStore.getState()
  const tab = store.tabs.find((t) => t.id === id)
  store.setActiveConversationId(id)
  if (tab) store.setMode(tab.mode)
  try {
    // Voice and captures answer in the backend's active conversation, so keep it in step
    await api(`${API}/${id}/activate`, 'POST')
    if (!useAppStore.getState().messagesByConv[id]) await loadMessages(id)
  } catch (err) {
    console.error('[Tabs] switch failed', err)
  }
}

export async function closeTab(id: string) {
  const store = useAppStore.getState()
  const hasMessages = (store.messagesByConv[id] || []).length > 0
  if (hasMessages && !confirm('Close this chat? Its conversation will be deleted.')) return
  try {
    await api(`${API}/${id}`, 'DELETE')
  } catch (err) {
    console.error('[Tabs] close failed', err)
  }
  const index = store.tabs.findIndex((t) => t.id === id)
  const remaining = store.tabs.filter((t) => t.id !== id)
  const { [id]: _removed, ...rest } = store.messagesByConv
  useAppStore.setState({ tabs: remaining, messagesByConv: rest })
  if (store.activeConversationId === id) {
    const next = remaining[Math.min(index, remaining.length - 1)]
    if (next) await switchTab(next.id)
    else await newTab()
  }
}

/** Pick the AI for one tab (null = use the default from Settings) */
export async function setTabAI(id: string, provider: AIProvider, model: string) {
  try {
    await api(`${API}/${id}/ai?provider=${provider}&model=${encodeURIComponent(model)}`, 'POST')
    useAppStore.getState().updateTab(id, { provider, model })
    toast.success(`This chat now uses ${provider === 'groq' ? 'Groq' : 'NVIDIA'} · ${model.split('/').pop()}`)
  } catch (err) {
    toast.error('Could not change this chat’s AI')
    console.error('[Tabs] set AI failed', err)
  }
}

/** First question names the tab, like a chat app */
export function nameTabFromQuestion(id: string, question: string) {
  const tab = useAppStore.getState().tabs.find((t) => t.id === id)
  if (tab && tab.title === 'New chat') {
    useAppStore.getState().updateTab(id, { title: question.replace(/^📷 |^📄 /, '').slice(0, 40) })
  }
}

/** "Clear chat": start this tab over, keeping its mode and AI */
export async function clearTab(id: string) {
  const store = useAppStore.getState()
  const tab = store.tabs.find((t) => t.id === id)
  if (!tab) return
  try {
    const params = new URLSearchParams({ mode: tab.mode })
    if (tab.provider) params.set('provider', tab.provider)
    if (tab.model) params.set('model', tab.model)
    const conv = await api<BackendConversation>(`${API}?${params}`, 'POST')
    await api(`${API}/${id}`, 'DELETE')
    const fresh = { ...tab, id: conv.id, title: 'New chat' }
    const { [id]: _old, ...rest } = useAppStore.getState().messagesByConv
    useAppStore.setState({
      tabs: useAppStore.getState().tabs.map((t) => (t.id === id ? fresh : t)),
      messagesByConv: { ...rest, [conv.id]: [] },
    })
    await switchTab(conv.id)
  } catch (err) {
    toast.error('Could not clear this chat')
    console.error('[Tabs] clear failed', err)
  }
}
