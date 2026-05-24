import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '../api/client'
import FileExplorer from '../components/FileExplorer'
import AuditReport from '../components/AuditReport'
import ChatWindow from '../components/ChatWindow'

export default function Dashboard() {
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>AI Legal Auditor</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <FileExplorer
            selectedContract={selectedContract}
            onSelectContract={setSelectedContract}
            onReportReady={setReport}
          />
        </aside>

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
    width: '280px',
    borderRight: '1px solid #e2e8f0',
    background: '#fff',
    overflowY: 'auto',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: '24px',
    gap: '24px',
  },
}
