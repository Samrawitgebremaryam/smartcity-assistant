import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Copy,
  FileText,
  Image,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import MarkdownContent from '../components/chat/MarkdownContent'
import axios, { API_BASE, SUPPORTED_DOCUMENT_EXTENSIONS, authHeaders, extractApiError } from '../lib/api'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedChat, setSelectedChat] = useState(null)
  const [historySearch, setHistorySearch] = useState('')
  const [showHistorySearch, setShowHistorySearch] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [messageMenuId, setMessageMenuId] = useState(null)
  const [toast, setToast] = useState('')
  const { user, logout, chatHistory, upsertHistory, deleteFromHistory } = useAuth()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const createId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  const createConversationTitle = (question) => {
    const normalized = question.replace(/\s+/g, ' ').trim()
    return normalized.length > 48 ? `${normalized.slice(0, 48).trim()}...` : normalized
  }

  const saveConversation = (conversationId, question, nextMessages) => {
    upsertHistory({
      id: conversationId,
      title: chatHistory.find((chat) => chat.id === conversationId)?.title || createConversationTitle(question || 'New attachment'),
      messages: nextMessages,
    })
  }

  const buildUserMessageContent = (question, activeAttachment) => {
    const trimmedQuestion = question.trim()
    if (!activeAttachment) return trimmedQuestion
    if (trimmedQuestion) return `${trimmedQuestion}\n\nAttached: ${activeAttachment.file.name}`
    return `Attached: ${activeAttachment.file.name}`
  }

  const uploadDocumentAttachment = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', 'en')

    const uploadResponse = await axios.post('/documents/upload', formData, {
      headers: authHeaders(user.token),
    })

    await axios.post(
      '/documents/ingest',
      { document_id: uploadResponse.data.document_id, force: true },
      { headers: authHeaders(user.token) },
    )

    return uploadResponse.data
  }

  const handleAttachmentPick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.type.startsWith('image/')) {
      setAttachment({ file, kind: 'image' })
      setToast('Image attached')
      return
    }

    const suffix = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
    if (SUPPORTED_DOCUMENT_EXTENSIONS.includes(suffix)) {
      setAttachment({ file, kind: 'document' })
      setToast('Document attached')
      return
    }

    setToast(`Unsupported file type. Use ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')} or an image.`)
  }

  const sendMessage = async (event, preset) => {
    event?.preventDefault()
    const question = (preset ?? input).trim()
    const activeAttachment = preset ? null : attachment
    if ((!question && !activeAttachment) || loading) return
    if (!preset) {
      setInput('')
      setAttachment(null)
    }

    const conversationId = selectedChat || createId()
    const normalizedQuestion = question || activeAttachment?.file.name || 'Attachment'
    const userMessage = {
      id: createId(),
      role: 'user',
      content: buildUserMessageContent(question, activeAttachment),
      attachmentName: activeAttachment?.file.name || null,
    }
    const assistantMessageId = createId()
    let placeholderInserted = false

    if (!selectedChat) setSelectedChat(conversationId)

    try {
      if (activeAttachment?.kind === 'image') {
        const assistantMessage = {
          id: createId(),
          role: 'assistant',
          content: "I can't analyze image attachments yet. Please describe the picture in text, or upload a text, JSON, CSV, Markdown, or HTML document instead.",
          streaming: false,
          suggestedQuestions: [
            'Where do I register a business?',
            'How do I pay my electricity bill?',
            'What documents are needed for marriage registration?',
          ],
          responseKind: 'missing_data',
          searchSuggestions: [],
          sources: [],
        }
        const nextMessages = [...messages, userMessage, assistantMessage]
        setMessages(nextMessages)
        saveConversation(conversationId, normalizedQuestion, nextMessages)
        setToast('Image attached, but image analysis is not supported yet')
        return
      }

      let uploadedDocument = null
      if (activeAttachment?.kind === 'document') {
        setLoading(true)
        uploadedDocument = await uploadDocumentAttachment(activeAttachment.file)
        setToast(`${activeAttachment.file.name} added to the assistant`)

        if (!question) {
          const assistantMessage = {
            id: createId(),
            role: 'assistant',
            content: `I added "${uploadedDocument.title}" to the assistant knowledge base. You can now ask questions about that document.`,
            streaming: false,
            suggestedQuestions: [
              `Summarize ${uploadedDocument.title}`,
              `What are the key requirements in ${uploadedDocument.title}?`,
              `What should I know from ${uploadedDocument.title}?`,
            ],
            responseKind: 'answer',
            searchSuggestions: [],
            sources: [{ title: uploadedDocument.title }],
          }
          const nextMessages = [...messages, userMessage, assistantMessage]
          setMessages(nextMessages)
          saveConversation(conversationId, normalizedQuestion, nextMessages)
          return
        }
      }

      const assistantPlaceholder = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        streaming: true,
        sources: uploadedDocument ? [{ title: uploadedDocument.title }] : [],
        confidence: 0,
        searchSuggestions: [],
      }

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder])
      placeholderInserted = true
      setLoading(true)
      abortControllerRef.current = new AbortController()

      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(user.token) },
        body: JSON.stringify({ question, language: 'en' }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok || !response.body) throw new Error(`Chat request failed with status ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullAnswer = ''
      let responseMeta = {
        answer: '',
        queryId: null,
        sources: [],
        searchSuggestions: [],
        suggestedQuestions: [],
        responseKind: 'answer',
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'content') {
              fullAnswer += data.content
              setMessages((prev) => prev.map((message) => (
                message.id === assistantMessageId
                  ? { ...message, content: fullAnswer, streaming: true }
                  : message
              )))
            } else if (data.type === 'meta') {
              responseMeta = {
                answer: data.answer || '',
                queryId: data.query_id || null,
                sources: data.sources || [],
                searchSuggestions: data.search_suggestions || [],
                suggestedQuestions: data.suggested_questions || [],
                responseKind: data.response_kind || 'answer',
              }
            } else if (data.type === 'error') {
              throw new Error(data.error)
            }
          } catch {
            continue
          }
        }
      }

      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullAnswer.trim() || responseMeta.answer || "I don't have sufficient data to answer that.",
        streaming: false,
        query_id: responseMeta.queryId,
        sources: responseMeta.sources,
        confidence: 0.6,
        searchSuggestions: responseMeta.searchSuggestions,
        suggestedQuestions: responseMeta.suggestedQuestions,
        responseKind: responseMeta.responseKind,
      }

      setMessages((prev) => {
        const updated = prev.map((message) => (message.id === assistantMessageId ? assistantMessage : message))
        saveConversation(conversationId, normalizedQuestion, updated)
        return updated
      })
    } catch (error) {
      if (!placeholderInserted) {
        const assistantErrorMessage = {
          id: createId(),
          role: 'assistant',
          content: extractApiError(error, 'Sorry, I could not process that attachment.'),
          error: true,
          streaming: false,
          sources: [],
          searchSuggestions: [],
          suggestedQuestions: [],
        }
        const nextMessages = [...messages, userMessage, assistantErrorMessage]
        setMessages(nextMessages)
        saveConversation(conversationId, normalizedQuestion, nextMessages)
        return
      }

      setMessages((prev) => {
        const updated = prev.map((message) => (
          message.id === assistantMessageId
            ? { ...message, content: extractApiError(error, 'Sorry, I encountered an error.'), error: true, streaming: false }
            : message
        ))
        saveConversation(conversationId, normalizedQuestion, updated)
        return updated
      })
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const regenerateMessage = async (index) => {
    if (index < 1) return
    const prevUserMessage = messages[index - 1]
    if (prevUserMessage?.role !== 'user') return

    const question = prevUserMessage.content
    setMessages((prev) => prev.slice(0, index))
    await sendMessage(null, question)
  }

  const loadChat = (chat) => {
    setSelectedChat(chat.id)
    setMessages(chat.messages || [])
  }

  const newChat = () => {
    setSelectedChat(null)
    setMessages([])
  }

  const handleDeleteChat = (chatId) => {
    deleteFromHistory(chatId)
    if (selectedChat === chatId) newChat()
  }

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
    setToast('Copied to clipboard')
  }

  const shareCurrentChat = async () => {
    const activeChat = chatHistory.find((chat) => chat.id === selectedChat)
    const text = activeChat
      ? `${activeChat.title}\n\n${activeChat.messages.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`).join('\n\n')}`
      : 'SmartCity Assistant conversation'

    try {
      if (navigator.share) await navigator.share({ title: activeChat?.title || 'SmartCity chat', text })
      else await navigator.clipboard.writeText(text)
      setToast('Chat shared')
    } catch {
      setToast('Share cancelled')
    }
  }

  const shareMessage = async (content) => {
    try {
      if (navigator.share) await navigator.share({ title: 'SmartCity answer', text: content })
      else await navigator.clipboard.writeText(content)
      setToast('Message shared')
    } catch {
      setToast('Share cancelled')
    }
  }

  const sendFeedback = async (message, rating) => {
    if (!message.query_id) {
      setToast('Feedback is not available for this answer yet')
      return
    }

    try {
      await axios.post('/feedback', { query_id: message.query_id, rating }, { headers: authHeaders(user.token) })
      setToast(rating === 'positive' ? 'Marked helpful' : 'Marked not helpful')
    } catch (error) {
      setToast(extractApiError(error, 'Could not save feedback'))
    }
  }

  const clearCurrentChat = () => {
    if (selectedChat) deleteFromHistory(selectedChat)
    setHeaderMenuOpen(false)
    newChat()
  }

  const handleMessageMenuAction = async (message, action) => {
    setMessageMenuId(null)
    if (action === 'copy') return copyMessage(message.content)
    if (action === 'share') return shareMessage(message.content)
    if (action === 'details') {
      if (message.sources?.length) setToast(`Sources: ${message.sources.map((source) => source.title).join(', ')}`)
      else setToast('No extra details for this message')
    }
  }

  const filteredHistory = chatHistory.filter((chat) => chat.title.toLowerCase().includes(historySearch.toLowerCase().trim()))

  return (
    <div className="flex h-screen bg-[#000000] text-white">
      <aside className={`${sidebarOpen ? 'w-[268px]' : 'w-0'} flex flex-col overflow-hidden bg-[#171717] transition-all duration-300`}>
        <div className="flex items-center px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-[1.05rem] font-semibold tracking-tight text-white">SmartCity</div>
          </div>
        </div>

        <div className="space-y-1 px-3">
          <button onClick={newChat} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] text-white transition hover:bg-white/5">
            <Plus className="h-5 w-5" />
            New chat
          </button>
          <button onClick={() => setShowHistorySearch((value) => !value)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[14px] text-white transition hover:bg-white/5">
            <Search className="h-5 w-5" />
            Search chats
          </button>
        </div>

        {showHistorySearch && (
          <div className="px-3 pt-3">
            <input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-xl bg-[#2a2a2a] px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
        )}

        <div className="mt-8 flex-1 overflow-y-auto px-3">
          <div className="mb-3 px-2 text-[12px] font-medium uppercase tracking-[0.08em] text-white/70">Recents</div>
          <div className="space-y-1">
            {filteredHistory.length === 0 ? (
              <p className="px-2 text-sm text-zinc-500">No chats yet</p>
            ) : (
              filteredHistory.slice(0, 20).map((chat) => (
                <div
                  key={chat.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] transition ${
                    selectedChat === chat.id
                      ? 'bg-[#2a2a2a] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {selectedChat === chat.id && (
                    <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-white/80" />
                  )}
                  <button onClick={() => loadChat(chat)} className="flex-1 truncate text-left">{chat.title}</button>
                  <button onClick={() => handleDeleteChat(chat.id)} className="opacity-0 transition group-hover:opacity-100 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-white/8 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white">
              {(user.name || user.email || 'S').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-white">{user.name || 'SmartCity user'}</div>
              <div className="truncate text-xs text-zinc-500">{user.email}</div>
            </div>
            <button onClick={() => { logout(); navigate('/') }} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col bg-[#000000]">
        <header className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-md p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-white">
            <button onClick={shareCurrentChat} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-white/5">
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <div className="relative">
              <button onClick={() => setHeaderMenuOpen((value) => !value)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {headerMenuOpen && (
                <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-xl bg-[#242424] p-2 shadow-2xl">
                  <button onClick={newChat} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                    <Plus className="h-4 w-4" />
                    New chat
                  </button>
                  <button onClick={clearCurrentChat} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                    <Trash2 className="h-4 w-4" />
                    Clear current chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-10 text-center">
                <h1 className="text-[1.7rem] font-semibold tracking-tight text-white">How can I help?</h1>
                <p className="mt-3 text-sm text-zinc-500">Ask about city services, permits, utilities, transport, or public information.</p>
              </div>
              <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
                {['How do I register my business?', 'Pay electricity bill', 'Report broken streetlight', 'Bus routes to Mercato'].map((prompt) => (
                  <button key={prompt} onClick={(e) => sendMessage(e, prompt)} className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-left text-sm text-zinc-200 transition hover:bg-white/[0.06]">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-14">
              {messages.map((message, index) => (
                <div key={message.id || index} className={`${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
                  {message.role === 'assistant' ? (
                    <div className="group flex max-w-[48rem] gap-4">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="pt-0.5">
                        {message.streaming ? (
                          <div className="flex items-center gap-2 py-2">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                            <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 [animation-delay:120ms]" />
                            <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 [animation-delay:240ms]" />
                          </div>
                        ) : message.error ? (
                          <p className="max-w-3xl text-[15px] leading-8 text-red-400">{message.content}</p>
                        ) : (
                          <>
                            <div className="max-w-3xl">
                              <MarkdownContent content={message.content} />
                            </div>
                            <div className="mt-4 flex items-center gap-1 text-zinc-400">
                              <button onClick={() => copyMessage(message.content)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <Copy className="h-4 w-4" />
                              </button>
                              <button onClick={() => sendFeedback(message, 'positive')} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <ThumbsUp className="h-4 w-4" />
                              </button>
                              <button onClick={() => sendFeedback(message, 'negative')} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <ThumbsDown className="h-4 w-4" />
                              </button>
                              <button onClick={() => shareMessage(message.content)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                <Share2 className="h-4 w-4" />
                              </button>
                              {index > 0 && index === messages.length - 1 && (
                                <button onClick={() => regenerateMessage(index)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                              <div className="relative">
                                <button onClick={() => setMessageMenuId((current) => current === message.id ? null : message.id)} className="rounded-md p-2 transition hover:bg-white/5 hover:text-white">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {messageMenuId === message.id && (
                                  <div className="absolute right-0 top-10 z-20 min-w-[150px] rounded-xl bg-[#1f1f1f] p-2 shadow-2xl">
                                    <button onClick={() => handleMessageMenuAction(message, 'copy')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                                      <Copy className="h-4 w-4" />
                                      Copy text
                                    </button>
                                    <button onClick={() => handleMessageMenuAction(message, 'share')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                                      <Share2 className="h-4 w-4" />
                                      Share
                                    </button>
                                    <button onClick={() => handleMessageMenuAction(message, 'details')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-white/5">
                                      <Bell className="h-4 w-4" />
                                      Details
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {message.sources?.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {message.sources.map((source, i) => (
                                  <span key={i} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
                                    {source.title}
                                  </span>
                                ))}
                              </div>
                            )}
                            {message.suggestedQuestions?.length > 0 && (
                              <div className="mt-5 flex flex-wrap gap-2">
                                {message.suggestedQuestions.map((suggestion, i) => (
                                  <button
                                    key={`${suggestion}-${i}`}
                                    type="button"
                                    onClick={(e) => sendMessage(e, suggestion)}
                                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.08]"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                            {message.searchSuggestions?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.searchSuggestions.map((item, i) => (
                                  <a
                                    key={`${item.label}-${i}`}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.08]"
                                  >
                                    {item.label}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="max-w-[34rem] whitespace-pre-wrap rounded-[22px] bg-[#1f1f1f] px-5 py-3 text-[15px] leading-7 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                        {message.content}
                      </div>
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4">
          <div className="mx-auto max-w-4xl">
            <form onSubmit={sendMessage} className="rounded-[28px] bg-[#1f1f1f] px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json,.csv,.html,.htm,image/*"
                onChange={handleAttachmentPick}
                className="hidden"
              />
              {attachment && (
                <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-zinc-200">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white">
                      {attachment.kind === 'image' ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{attachment.file.name}</div>
                      <div className="text-xs text-zinc-500">
                        {attachment.kind === 'image' ? 'Image attached. Analysis is not available yet.' : 'Document will be added to the assistant before your next message.'}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setAttachment(null)} className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
                  <Plus className="h-5 w-5" />
                </button>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything" className="flex-1 bg-transparent py-2 text-[15px] text-white placeholder-zinc-500 focus:outline-none" disabled={loading} />
                <div className="hidden items-center gap-2 text-sm text-zinc-400 md:flex">
                  <span>Instant</span>
                </div>
                <button type="submit" disabled={(!input.trim() && !attachment) || loading} className="rounded-full bg-white p-3 text-black transition hover:bg-zinc-200 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
            <p className="mt-3 text-center text-xs text-zinc-500">SmartCity can make mistakes. Check important information carefully.</p>
          </div>
        </div>

        {toast && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#2a2a2a] px-4 py-2 text-sm text-white shadow-2xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
