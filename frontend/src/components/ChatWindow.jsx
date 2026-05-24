import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'react-toastify'
import client from '../api/client'

export default function ChatWindow({ report }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages([])
  }, [report])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!report) {
    return (
      <div style={styles.placeholder}>
        <p>Run an audit first before using the chat.</p>
      </div>
    )
  }

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await client.post('/api/v1/chat', {
        message: text,
        audit_context: JSON.stringify(report),
        history: messages,
      })
      setMessages([...nextMessages, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Chat request failed'
      toast.error(msg)
      setMessages(nextMessages)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Contract Chat</h3>

      <div style={styles.messageList}>
        {messages.length === 0 && (
          <p style={styles.empty}>
            Ask a question or request a fix — e.g. "Rewrite clause 3 to comply with the payment policy."
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ ...styles.bubble, ...(m.role === 'user' ? styles.userBubble : styles.assistantBubble) }}>
            <span style={styles.roleLabel}>{m.role === 'user' ? 'You' : 'Assistant'}</span>
            <p style={styles.msgText}>{m.content}</p>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
            <span style={styles.roleLabel}>Assistant</span>
            <p style={{ ...styles.msgText, color: '#94a3b8' }}>Thinking…</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={styles.inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this contract…"
          disabled={loading}
          style={styles.input}
        />
        <button type="submit" disabled={!input.trim() || loading} style={styles.sendBtn}>
          Send
        </button>
      </form>
    </div>
  )
}

const styles = {
  placeholder: {
    padding: '32px',
    background: '#fff',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: '14px',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    height: '420px',
  },
  title: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px',
    fontWeight: 700,
    color: '#1e293b',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  empty: {
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: '20px',
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: '8px',
    maxWidth: '85%',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  userBubble: {
    background: '#eff6ff',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    alignSelf: 'flex-start',
  },
  roleLabel: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#94a3b8',
  },
  msgText: {
    fontSize: '13px',
    color: '#1e293b',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #e2e8f0',
  },
  input: {
    flex: 1,
    padding: '9px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    padding: '9px 18px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 600,
  },
}
