import React from 'react'

const SEVERITY_COLOR = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#2563eb',
}

export default function AuditReport({ report }) {
  if (!report) {
    return (
      <div style={styles.placeholder}>
        <p>No audit report yet. Select a contract and run a compliance audit.</p>
      </div>
    )
  }

  const isPassing = report.overall_result === 'PASS'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.contractName}>{report.contract_name}</h2>
          <p style={styles.subtitle}>Compliance Audit Report</p>
        </div>
        <span style={{ ...styles.badge, background: isPassing ? '#dcfce7' : '#fee2e2', color: isPassing ? '#166534' : '#991b1b' }}>
          {report.overall_result}
        </span>
      </div>

      {report.violations && report.violations.length > 0 && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Violations ({report.violations.length})</h3>
          {report.violations.map((v, i) => (
            <div key={i} style={styles.violationCard}>
              <div style={styles.violationHeader}>
                <span style={styles.clause}>{v.clause}</span>
                <span style={{ ...styles.severity, color: SEVERITY_COLOR[v.severity?.toLowerCase()] || '#333' }}>
                  {v.severity}
                </span>
              </div>
              <p style={styles.policyRule}>{v.policy_rule}</p>
              {v.description && <p style={styles.description}>{v.description}</p>}
            </div>
          ))}
        </section>
      )}

      {report.warnings && report.warnings.length > 0 && (
        <section style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, color: '#d97706' }}>Warnings ({report.warnings.length})</h3>
          {report.warnings.map((w, i) => (
            <div key={i} style={{ ...styles.violationCard, borderLeft: '3px solid #f59e0b' }}>
              <p style={styles.description}>{typeof w === 'string' ? w : w.description || JSON.stringify(w)}</p>
            </div>
          ))}
        </section>
      )}

      {report.compliant_clauses && report.compliant_clauses.length > 0 && (
        <section style={styles.section}>
          <h3 style={{ ...styles.sectionTitle, color: '#16a34a' }}>Compliant Clauses ({report.compliant_clauses.length})</h3>
          <ul style={styles.compliantList}>
            {report.compliant_clauses.map((c, i) => (
              <li key={i} style={styles.compliantItem}>
                {typeof c === 'string' ? c : c.clause || JSON.stringify(c)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.summary && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Summary</h3>
          <p style={styles.summary}>{report.summary}</p>
        </section>
      )}
    </div>
  )
}

const styles = {
  placeholder: {
    padding: '40px',
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
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contractName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 700,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    color: '#dc2626',
  },
  violationCard: {
    padding: '12px 14px',
    background: '#fef2f2',
    borderLeft: '3px solid #dc2626',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  violationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clause: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1e293b',
  },
  severity: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  policyRule: {
    fontSize: '13px',
    color: '#475569',
    fontStyle: 'italic',
  },
  description: {
    fontSize: '13px',
    color: '#64748b',
  },
  compliantList: {
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  compliantItem: {
    fontSize: '13px',
    color: '#166534',
  },
  summary: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
  },
}
