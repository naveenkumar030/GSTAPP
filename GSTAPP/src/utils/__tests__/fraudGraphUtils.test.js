import { describe, it, expect } from 'vitest';
import { getRiskLevel, getNodeDescription, processFraudGraphData } from '../fraudGraphUtils';

describe('fraudGraphUtils', () => {
  describe('getRiskLevel', () => {
    it('returns High for scores > 80', () => {
      expect(getRiskLevel(81)).toBe('High');
      expect(getRiskLevel(100)).toBe('High');
    });

    it('returns Medium for scores > 50 and <= 80', () => {
      expect(getRiskLevel(51)).toBe('Medium');
      expect(getRiskLevel(80)).toBe('Medium');
    });

    it('returns Low for scores <= 50', () => {
      expect(getRiskLevel(0)).toBe('Low');
      expect(getRiskLevel(50)).toBe('Low');
    });

    it('returns null for nullish input', () => {
      expect(getRiskLevel(null)).toBeNull();
      expect(getRiskLevel(undefined)).toBeNull();
    });
  });

  describe('getNodeDescription', () => {
    it('returns correct description for Company node', () => {
      const node = { label: 'Company', id: 'C1', name: 'Acme', state: 'Delhi', gstin: '27ABCDE1234F1Z5', invoiceCount: 5, taxAmount: '₹5,000' };
      const desc = getNodeDescription(node);
      expect(desc).toContain('Central taxpayer profile for Acme');
      expect(desc).toContain('27ABCDE1234F1Z5');
      expect(desc).toContain('Delhi');
    });

    it('returns correct description for HighRisk node', () => {
      const node = { label: 'HighRisk', id: 'HR1', name: 'Fraudsters Inc', riskScore: 90, fraudType: 'Circular Trading', invoiceCount: 1, taxDiff: '₹10,000' };
      const desc = getNodeDescription(node);
      expect(desc).toContain('High-risk entity Fraudsters Inc');
      expect(desc).toContain('risk score of 90/100');
      expect(desc).toContain('Circular Trading');
      expect(desc).toContain('₹10,000');
    });

    it('returns correct description for Duplicate Invoice node', () => {
      const node = { label: 'Invoice', id: 'I1', name: 'INV-123', status: 'Duplicate' };
      const desc = getNodeDescription(node);
      expect(desc).toContain('Suspicious invoice INV-123');
      expect(desc).toContain('DUPLICATE');
    });

    it('returns fallback description for unknown node', () => {
      const node = { label: 'UnknownType', id: 'U1', name: 'Something', riskScore: 20 };
      const desc = getNodeDescription(node);
      expect(desc).toContain('Unclassified network node Something');
    });
  });

  describe('processFraudGraphData', () => {
    it('handles empty or invalid raw data gracefully', () => {
      expect(processFraudGraphData(null)).toEqual({ nodes: [], links: [] });
      expect(processFraudGraphData({})).toEqual({ nodes: [], links: [] });
    });

    it('filters out low risk nodes that are not connected by suspicious links', () => {
      const raw = {
        nodes: [
          { id: 'N1', riskScore: 40 }, // Low risk
          { id: 'N2', riskScore: 40 }, // Low risk
        ],
        links: [
          { source: 'N1', target: 'N2', type: 'CONNECTED_TO' } // Safe link
        ]
      };
      const result = processFraudGraphData(raw);
      expect(result.nodes.length).toBe(0);
      expect(result.links.length).toBe(0);
    });

    it('keeps high risk nodes and their connected invoices', () => {
      const raw = {
        nodes: [
          { id: 'HR1', riskScore: 90, label: 'HighRisk' },
          { id: 'INV1', riskScore: 10, label: 'Invoice' },
          { id: 'SAFE', riskScore: 10, label: 'Supplier' },
        ],
        links: [
          { source: 'HR1', target: 'INV1', type: 'ISSUED' },
          { source: 'SAFE', target: 'INV1', type: 'ISSUED' } // This link might be dropped if SAFE is not connected to fraud, wait.
        ]
      };
      const result = processFraudGraphData(raw);
      expect(result.nodes.map(n => n.id).sort()).toEqual(['HR1', 'INV1', 'SAFE']);
      expect(result.links.length).toBe(2);
      
      // Check neighbors
      const hrNode = result.nodes.find(n => n.id === 'HR1');
      expect(hrNode.neighbors.has('INV1')).toBe(true);
    });

    it('keeps nodes connected by fraud link types', () => {
      const raw = {
        nodes: [
          { id: 'A', riskScore: 10 },
          { id: 'B', riskScore: 20 },
        ],
        links: [
          { source: 'A', target: 'B', type: 'CIRCULAR_TRADING' }
        ]
      };
      const result = processFraudGraphData(raw);
      expect(result.nodes.length).toBe(2);
      expect(result.links.length).toBe(1);
    });
  });
});
