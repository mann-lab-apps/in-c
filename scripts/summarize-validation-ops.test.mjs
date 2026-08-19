import { describe, expect, it } from 'vitest'

import {
  csvRecords,
  parseCsv,
  scorecardCsv,
  summarizeValidationOpsFromTables
} from './summarize-validation-ops.mjs'

describe('validation ops summarizer', () => {
  it('parses quoted CSV cells', () => {
    expect(parseCsv('name,note\nA,"hello, ""world"""\n')).toEqual([
      ['name', 'note'],
      ['A', 'hello, "world"']
    ])
  })

  it('maps CSV rows to records and drops blank rows', () => {
    expect(csvRecords('code,value\nA,yes\n,\n')).toEqual([
      { code: 'A', value: 'yes' }
    ])
  })

  it('summarizes interview, dispatch, and paid-intent signals', () => {
    const metrics = summarizeValidationOpsFromTables({
      suppliers: [
        {
          supplier_code: 'S-001',
          would_register_again: 'yes',
          wtp_range: '10000_30000'
        },
        {
          supplier_code: 'S-002',
          would_register_again: 'conditional',
          wtp_range: '0'
        },
        {
          supplier_code: 'S-003',
          would_register_again: 'yes',
          wtp_range: 'unknown'
        }
      ],
      demand: [
        {
          demand_code: 'D-001',
          push_acceptance: 'yes',
          keep_receiving_intent: 'conditional'
        },
        {
          demand_code: 'D-002',
          push_acceptance: 'conditional',
          keep_receiving_intent: 'yes'
        }
      ],
      channelAudits: [
        { audit_code: 'A-001', observed_gap: 'yes' },
        { audit_code: 'A-002', observed_gap: 'partial' }
      ],
      opportunities: [
        { opportunity_code: 'O-001', type: 'concert' },
        { opportunity_code: 'O-002', type: 'lesson' }
      ],
      participants: [{ participant_code: 'M-001' }],
      dispatches: [
        {
          date_sent: '2026-08-19',
          opportunity_code: 'O-001',
          clicked: 'yes',
          saved: 'no',
          shared: 'no',
          inquired: 'no',
          continue_request: 'yes',
          negative_reaction: 'none'
        },
        {
          date_sent: '2026-08-20',
          opportunity_code: 'O-002',
          clicked: 'no',
          saved: 'yes',
          shared: 'no',
          inquired: 'no',
          continue_request: 'no',
          negative_reaction: 'none'
        }
      ]
    })
    const byMetric = Object.fromEntries(
      metrics.map((metric) => [metric.metric, metric])
    )

    expect(byMetric.supplier_register_intent.actual).toBe('3')
    expect(byMetric.supplier_register_intent.status).toBe('pass')
    expect(byMetric.supplier_paid_intent.actual).toBe('1')
    expect(byMetric.supplier_paid_intent.status).toBe('pass')
    expect(byMetric.channel_gap_observed.actual).toBe('2')
    expect(byMetric.channel_gap_observed.status).toBe('weak')
    expect(byMetric.weak_action_count.actual).toBe('2')
    expect(byMetric.weak_action_count.status).toBe('pass')
    expect(byMetric.cross_type_interest_graph.actual).toBe('yes')
    expect(byMetric.cross_type_interest_graph.status).toBe('pass')
  })

  it('writes scorecard-compatible CSV', () => {
    const csv = scorecardCsv([
      {
        metric: 'm',
        source_file: 'source.csv',
        count_rule: 'rule',
        threshold: '1',
        actual: '1',
        status: 'pass',
        evidence_notes: 'ok'
      }
    ])

    expect(csv).toContain('metric,source_file,count_rule')
    expect(csv).toContain('m,source.csv,rule,1,1,pass,ok')
  })
})
