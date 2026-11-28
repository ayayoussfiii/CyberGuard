
export const mockSummary = {
  total_predictions: 24580,
  total_alerts: 1284
}

export const mockMetrics = {
  accuracy: 0.968,
  precision: 0.954,
  recall: 0.982,
  f1_score: 0.968
}

export const mockDistribution = [
  { name: 'Normal', value: 19000 },
  { name: 'DDoS', value: 2800 },
  { name: 'Port Scan', value: 1600 },
  { name: 'Brute Force', value: 850 },
  { name: 'Other', value: 330 }
]


export const mockActivity = [
  { time: '15:00', timestamp: '2026-11-26T15:00:00', normal: 120, attacks: 12, attack_breakdown: { DDoS: 4, 'Port Scan': 3, 'Brute Force': 2, Other: 3 } },
  { time: '16:00', timestamp: '2026-11-26T16:00:00', normal: 185, attacks: 24, attack_breakdown: { DDoS: 8, 'Port Scan': 5, 'Brute Force': 4, Other: 7 } },
  { time: '17:00', timestamp: '2026-11-26T17:00:00', normal: 160, attacks: 18, attack_breakdown: { DDoS: 5, 'Port Scan': 4, 'Brute Force': 3, Other: 6 } },
  { time: '18:00', timestamp: '2026-11-26T18:00:00', normal: 230, attacks: 56, attack_breakdown: { DDoS: 18, 'Port Scan': 12, 'Brute Force': 10, Other: 16 } },
  { time: '19:00', timestamp: '2026-11-26T19:00:00', normal: 210, attacks: 32, attack_breakdown: { DDoS: 10, 'Port Scan': 7, 'Brute Force': 6, Other: 9 } },
  { time: '20:00', timestamp: '2026-11-26T20:00:00', normal: 280, attacks: 75, attack_breakdown: { DDoS: 24, 'Port Scan': 18, 'Brute Force': 13, Other: 20 } },
  { time: '21:00', timestamp: '2026-11-26T21:00:00', normal: 245, attacks: 42, attack_breakdown: { DDoS: 12, 'Port Scan': 10, 'Brute Force': 8, Other: 12 } },
  { time: '22:00', timestamp: '2026-11-26T22:00:00', normal: 310, attacks: 91, attack_breakdown: { DDoS: 30, 'Port Scan': 22, 'Brute Force': 16, Other: 23 } },
  { time: '23:00', timestamp: '2026-11-26T23:00:00', normal: 270, attacks: 48, attack_breakdown: { DDoS: 15, 'Port Scan': 12, 'Brute Force': 8, Other: 13 } },
]

export const mockRecentAlerts = [
  {
    id: 'ALT-001',
    type: 'DDoS',
    source_ip: '192.0.2.14',
    destination_ip: '198.51.100.10',
    protocol: 'TCP',
    severity: 'Critical',
    timestamp: '2026-11-26T22:42:00',
    confidence: 0.98,
    model_result: 'Malicious traffic detected',
  },
  {
    id: 'ALT-002',
    type: 'Port Scan',
    source_ip: '198.51.100.23',
    destination_ip: '203.0.113.8',
    protocol: 'TCP',
    severity: 'Medium',
    timestamp: '2026-11-26T22:38:00',
    confidence: 0.87,
    model_result: 'Reconnaissance pattern detected',
  },
  {
    id: 'ALT-003',
    type: 'Brute Force',
    source_ip: '203.0.113.45',
    destination_ip: '192.0.2.80',
    protocol: 'SSH',
    severity: 'High',
    timestamp: '2026-11-26T22:31:00',
    confidence: 0.93,
    model_result: 'Repeated authentication failures',
  },
  {
    id: 'ALT-004',
    type: 'DDoS',
    source_ip: '192.0.2.14',
    destination_ip: '198.51.100.10',
    protocol: 'UDP',
    severity: 'Critical',
    timestamp: '2026-11-26T22:20:00',
    confidence: 0.96,
    model_result: 'High-volume traffic anomaly',
  },
  {
    id: 'ALT-005',
    type: 'Malware C2',
    source_ip: '198.51.100.61',
    destination_ip: '203.0.113.19',
    protocol: 'DNS',
    severity: 'High',
    timestamp: '2026-11-26T22:12:00',
    confidence: 0.91,
    model_result: 'Suspicious command-and-control beacon',
  },
  {
    id: 'ALT-006',
    type: 'SQL Injection',
    source_ip: '203.0.113.72',
    destination_ip: '192.0.2.44',
    protocol: 'HTTP',
    severity: 'Medium',
    timestamp: '2026-11-26T21:58:00',
    confidence: 0.84,
    model_result: 'Application request anomaly',
  },
  {
    id: 'ALT-007',
    type: 'Port Scan',
    source_ip: '192.0.2.109',
    destination_ip: '198.51.100.32',
    protocol: 'TCP',
    severity: 'Low',
    timestamp: '2026-11-26T21:41:00',
    confidence: 0.76,
    model_result: 'Low-rate reconnaissance activity',
  },
  {
    id: 'ALT-008',
    type: 'Brute Force',
    source_ip: '203.0.113.45',
    destination_ip: '192.0.2.80',
    protocol: 'SSH',
    severity: 'Critical',
    timestamp: '2026-11-26T21:26:00',
    confidence: 0.99,
    model_result: 'Credential attack pattern detected',
  },
  {
    id: 'ALT-009',
    type: 'Suspicious DNS',
    source_ip: '198.51.100.201',
    destination_ip: '203.0.113.53',
    protocol: 'DNS',
    severity: 'Low',
    timestamp: '2026-11-26T21:07:00',
    confidence: 0.72,
    model_result: 'Unusual DNS request volume',
  },
  {
    id: 'ALT-010',
    type: 'DDoS',
    source_ip: '192.0.2.156',
    destination_ip: '198.51.100.10',
    protocol: 'UDP',
    severity: 'High',
    timestamp: '2026-11-26T20:52:00',
    confidence: 0.89,
    model_result: 'Traffic rate above learned baseline',
  },
]
