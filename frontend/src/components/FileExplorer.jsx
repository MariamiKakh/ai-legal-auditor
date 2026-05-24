import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import client from '../api/client'

export default function FileExplorer({ selectedContract, onSelectContract, onReportReady }) {
  const [files, setFiles] = useState({ contracts: [], policies: [] })
  const [loading, setLoading] = useState(false)
  const [auditing, setAuditing] = useState(false)

  useEffect(() => {
    fetchFiles()
  }, [])

  async function fetchFiles() {
    setLoading(true)
    try {
      const res = await client.get('/api/v1/files')
      setFiles(res.data)
    } catch (err) {
      toast.error('Could not load files')
    } finally {
      setLoading(false)
    }
  }

  async function runAudit() {
    if (!selectedContract) return
    setAuditing(true)
    try {
      const res = await client.post('/api/v1/audit/analyze', {
        contract_name: selectedContract,
      })
      onReportReady(res.data)
      toast.success('Audit complete')
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Audit failed'
      toast.error(msg)
    } finally {
      setAuditing(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Contracts</h3>
        {loading ? (
          <p style={styles.empty}>Loading…</p>
        ) : files.contracts.length === 0 ? (
          <p style={styles.empty}>No contracts found</p>
        ) : (
          <ul style={styles.list}>
            {files.contracts.map((name) => (
              <li
                key={name}
                onClick={() => onSelectContract(name)}
                style={{
                  ...styles.item,
                  ...(selectedContract === name ? styles.itemSelected : {}),
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Policies</h3>
        {loading ? (
          <p style={styles.empty}>Loading…</p>
        ) : files.policies.length === 0 ? (
          <p style={styles.empty}>No policies found</p>
        ) : (
          <ul style={styles.list}>
            {files.policies.map((name) => (
              <li key={name} style={{ ...styles.item, cursor: 'default', color: '#64748b' }}>
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={styles.footer}>
        <button
          onClick={runAudit}
          disabled={!selectedContract || auditing}
          style={{
            ...styles.auditBtn,
            ...(!selectedContract || auditing ? styles.auditBtnDisabled : {}),
          }}
        >
          {auditing ? (
            <span>Running audit…</span>
          ) : (
            'Run Compliance Audit'
          )}
        </button>
        {!selectedContract && (
          <p style={styles.hint}>Select a contract above to enable</p>
        )}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  list: {
    listStyle: 'none',
  },
  item: {
    padding: '8px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#1e293b',
    transition: 'background 0.1s',
  },
  itemSelected: {
    background: '#eff6ff',
    color: '#2563eb',
    fontWeight: 600,
  },
  empty: {
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  auditBtn: {
    width: '100%',
    padding: '10px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
  },
  auditBtnDisabled: {
    background: '#cbd5e1',
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
  },
}
