import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '../api/client'
import FileExplorer from '../components/FileExplorer'
import AuditReport from '../components/AuditReport'
import ChatWindow from '../components/ChatWindow'

const MIN_WIDTH = 200
const MAX_WIDTH = 520

export default function Dashboard() {
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [sidebarWidth, setSidebarWidth] = useState(380)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  const onMouseDown = useCallback((e) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setSidebarWidth(next)
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>AI Legal Auditor</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      <div style={styles.body}>
        <aside style={{ ...styles.sidebar, width: sidebarWidth }}>
          <FileExplorer
            selectedContract={selectedContract}
            onSelectContract={setSelectedContract}
            onReportReady={setReport}
          />
        </aside>

        <div
          onMouseDown={onMouseDown}
          style={styles.resizeHandle}
          title="Drag to resize"
        />

        <main style={styles.main}>
          <AuditReport report={report} />
          <ChatWindow report={report} />
        </main>
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    height: '56px',
    background: '#1e293b',
    color: '#fff',
    flexShrink: 0,
  },
  logo: {
    fontWeight: 700,
    fontSize: '16px',
    letterSpacing: '0.5px',
  },
  logoutBtn: {
    padding: '6px 14px',
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '4px',
    fontSize: '13px',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    background: '#fff',
    overflowY: 'auto',
    flexShrink: 0,
  },
  resizeHandle: {
    width: '5px',
    flexShrink: 0,
    cursor: 'col-resize',
    background: '#e2e8f0',
    transition: 'background 0.15s',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: '24px',
    gap: '24px',
    minWidth: 0,
  },
}
