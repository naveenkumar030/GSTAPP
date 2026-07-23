import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Network, ArrowLeft, Shield, FileText, Lock, Eye,
  Database, AlertTriangle, Users, Mail, ChevronRight,
} from 'lucide-react';

const LAST_UPDATED = 'July 1, 2026';
const VERSION      = '2.4';

const SECTIONS = [
  {
    id: 'acceptance',
    icon: FileText,
    title: 'Acceptance of Terms',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    content: `By accessing or using GST ReconGraph ("Platform", "Service", "we", "us", or "our"), you confirm that you have read, understood, and agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree to these terms, you must not use our services.

These Terms constitute a legally binding agreement between you ("User", "Client", "you") and GST ReconGraph Technologies Pvt. Ltd., a company incorporated under the Companies Act, 2013, with its registered office in Mumbai, Maharashtra, India.

By registering, subscribing, or using any part of the Platform, you represent that:
• You are at least 18 years of age.
• You have the authority to bind your organization to these Terms.
• All information you provide is accurate and complete.
• Your use complies with all applicable laws and regulations, including the Goods and Services Tax Act, 2017.`,
  },
  {
    id: 'service',
    icon: Database,
    title: 'Description of Service',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    content: `GST ReconGraph is an enterprise-grade GST reconciliation, invoice mismatch analysis, and graph-based fraud detection platform designed for finance teams, chartered accountants, GST consultants, internal auditors, and tax compliance officers.

Core services provided include:
• Automated reconciliation of Purchase Register (PR) data against GSTR-2B filings.
• Invoice matching, discrepancy detection, and ITC risk scoring.
• Graph-based fraud detection using network analysis to identify circular trading, duplicate invoices, and suspicious entity clusters.
• Audit trail generation, compliance reporting, and case management for fraud investigations.
• Data upload, normalization, and structured storage for multi-period analysis.

The Platform is provided on a subscription basis ("SaaS"). Features and access levels vary by subscription tier as described in your Order Form or subscription agreement.`,
  },
  {
    id: 'data',
    icon: Lock,
    title: 'Data Usage & Privacy',
    color: 'text-green-600',
    bg: 'bg-green-50',
    content: `Your financial and tax data is treated with the highest level of confidentiality and security.

Data Processing:
• All data uploaded to the Platform (Purchase Registers, GSTR-2B JSON, GSTIN details, invoice records) is processed solely for the purpose of providing the reconciliation and fraud detection services you have subscribed to.
• We do not sell, share, or license your data to any third party for commercial purposes.
• Anonymized, aggregated, and non-identifiable statistical data may be used to improve our algorithms and platform performance.

Data Residency:
• All data is stored exclusively on servers located within India, compliant with applicable data localization requirements.
• We use AES-256 encryption at rest and TLS 1.3 in transit for all data.

Data Retention:
• Active subscription: Data retained for the duration of the subscription plus 90 days.
• Upon cancellation: Data is available for export for 30 days, then permanently deleted.
• You may request data deletion at any time by contacting bayyanaveen15@gmail.com.`,
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security & Compliance',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    content: `We maintain industry-leading security practices to protect your sensitive financial data.

Security Certifications & Practices:
• SOC 2 Type II certified infrastructure.
• ISO 27001 compliant information security management.
• Regular third-party penetration testing (bi-annual).
• Multi-factor authentication (MFA) enforced for all user accounts.
• Role-based access control (RBAC) with least-privilege principles.

Your Responsibilities:
• You are responsible for maintaining the confidentiality of your account credentials.
• You must promptly notify us of any unauthorized access or security breach at bayyanaveen15@gmail.com.
• You must not share your account credentials with unauthorized individuals.
• You are responsible for all activities that occur under your account.

Breach Notification:
In the event of a confirmed data breach affecting your organization's data, we will notify you within 72 hours of becoming aware of the breach, as required under applicable data protection laws.`,
  },
  {
    id: 'user-obligations',
    icon: Users,
    title: 'User Obligations & Prohibited Use',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    content: `By using the Platform, you agree to use it only for lawful purposes and in compliance with all applicable laws, including the GST Act, 2017, and the Information Technology Act, 2000.

You must NOT:
• Upload false, fraudulent, or fabricated invoice data.
• Use the Platform to facilitate tax evasion, circular trading fraud, or money laundering.
• Attempt to reverse-engineer, decompile, or extract our proprietary reconciliation algorithms.
• Share access credentials or API keys with unauthorized third parties.
• Scrape, crawl, or automate unauthorized data extraction from the Platform.
• Interfere with, disrupt, or attempt to breach the security of our servers or networks.
• Use the Platform to conduct or facilitate any activity that is illegal under Indian law.

Violations may result in immediate account suspension, termination, and/or legal action. We reserve the right to cooperate with law enforcement authorities and share relevant information in cases of suspected fraudulent or illegal activity.`,
  },
  {
    id: 'intellectual-property',
    icon: Eye,
    title: 'Intellectual Property',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    content: `All intellectual property rights in the Platform — including but not limited to the reconciliation algorithms, fraud detection models, graph analytics engine, user interface, documentation, trademarks, and trade names — are owned by or licensed to GST ReconGraph Technologies Pvt. Ltd.

Your Rights:
• Subject to your subscription, we grant you a limited, non-exclusive, non-transferable, revocable license to use the Platform for your internal business purposes.
• This license does not include the right to sublicense, resell, or create derivative works based on the Platform.

Your Data:
• You retain full ownership of all data you upload to the Platform.
• You grant us a limited license to process your data solely for providing the services.

Our IP:
• You may not copy, reproduce, distribute, or create derivative works from any part of our Platform without our prior written consent.`,
  },
  {
    id: 'liability',
    icon: AlertTriangle,
    title: 'Limitation of Liability & Disclaimers',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    content: `The Platform is provided "as is" and "as available" for informational and reconciliation assistance purposes.

Important Disclaimers:
• GST ReconGraph is a tool to assist in GST reconciliation and does not constitute professional tax, legal, or financial advice.
• Final tax filings, ITC claims, and compliance decisions remain the sole responsibility of your organization and your qualified tax professionals.
• We do not guarantee that reconciliation results are 100% accurate or free from errors.

Limitation of Liability:
To the maximum extent permitted by applicable law, GST ReconGraph Technologies Pvt. Ltd. shall not be liable for:
• Indirect, incidental, special, consequential, or punitive damages.
• Loss of profits, revenue, data, or business opportunities.
• Any damages arising from your reliance on reconciliation results for statutory filing purposes.

Our aggregate liability to you for any claim arising under these Terms shall not exceed the total fees paid by you to us in the 3 months preceding the claim.`,
  },
  {
    id: 'termination',
    icon: FileText,
    title: 'Termination & Suspension',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    content: `Termination by You:
You may cancel your subscription at any time through the Platform settings or by contacting bayyanaveen15@gmail.com. Cancellation takes effect at the end of your current billing period. No refunds are provided for unused portions of a billing period unless required by law.

Termination by Us:
We may suspend or terminate your account immediately, without notice, if:
• You breach any provision of these Terms.
• We are required to do so by law or court order.
• Your use of the Platform poses a risk to our security or other users.
• We reasonably suspect fraudulent or illegal activity.

Effect of Termination:
Upon termination, your right to use the Platform ceases immediately. We will provide a 30-day data export window after which your data will be permanently deleted.`,
  },
  {
    id: 'governing-law',
    icon: FileText,
    title: 'Governing Law & Dispute Resolution',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    content: `These Terms are governed by and construed in accordance with the laws of India.

Dispute Resolution Process:
1. Informal Resolution: In the event of any dispute, the parties agree to first attempt to resolve it informally by contacting bayyanaveen15@gmail.com.
2. Mediation: If informal resolution fails within 30 days, either party may initiate mediation through a mutually agreed mediator in Mumbai.
3. Arbitration: Unresolved disputes shall be settled by binding arbitration in accordance with the Arbitration and Conciliation Act, 1996, with a single arbitrator seated in Mumbai, Maharashtra.
4. Courts: Both parties submit to the exclusive jurisdiction of the courts in Mumbai, Maharashtra for any matter not subject to arbitration.

Class Action Waiver: You agree to resolve disputes only on an individual basis and waive any right to participate in a class action or collective proceeding.`,
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact Us',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    content: `If you have questions about these Terms, our Privacy Policy, or your data, please contact us:

Naveen Kumar
📞 6305996739
📧 bayyanaveen15@gmail.com`,
  },
];

export default function Terms() {
  const navigate    = useNavigate();
  const [activeId, setActiveId] = useState(null);

  const scroll = (id) => {
    setActiveId(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 h-14 flex items-center px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-md shadow-sm object-cover" />
              <span className="text-[13px] font-bold text-gray-900">GST ReconGraph</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"     className="text-[13px] font-semibold text-blue-600 hover:underline">Sign In</Link>
            <Link to="/register"  className="btn-primary text-[12px] py-1.5 px-3">Get Started</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
            <Shield size={12} />
            Legal Document
          </div>
          <h1 className="text-[36px] font-bold text-gray-900 tracking-tight leading-tight">
            Terms & Conditions
          </h1>
          <p className="text-[15px] text-gray-500 mt-2">
            Please read these terms carefully before using the GST ReconGraph platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <FileText size={13} className="text-gray-400" />
              Version {VERSION}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-[12px] text-gray-500">Last updated: {LAST_UPDATED}</span>
            <span className="text-gray-300">·</span>
            <span className="text-[12px] text-gray-500">Effective immediately</span>
            <button
              onClick={() => window.print()}
              className="ml-auto text-[12px] font-semibold text-blue-600 hover:underline"
            >
              Print / Download PDF →
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sticky sidebar ToC ── */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="hidden lg:block w-64 shrink-0"
          >
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-soft p-5 space-y-1">
              <p className="label-caps text-gray-400 mb-3">Table of Contents</p>
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => scroll(s.id)}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    activeId === s.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 font-mono w-4 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate">{s.title}</span>
                  {activeId === s.id && <ChevronRight size={12} className="shrink-0 ml-auto" />}
                </button>
              ))}
            </div>
          </motion.aside>

          {/* ── Main content ── */}
          <div className="flex-1 space-y-6">
            {/* Summary banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-amber-900">Important Summary</p>
                <p className="text-[13px] text-amber-800 mt-1 leading-relaxed">
                  By using GST ReconGraph, you agree to: (1) use the platform only for lawful GST compliance purposes,
                  (2) maintain confidentiality of your account credentials, (3) acknowledge that reconciliation results
                  are for informational purposes and final tax decisions remain your responsibility. Your data stays in India
                  and is never sold to third parties.
                </p>
              </div>
            </motion.div>

            {/* Sections */}
            {SECTIONS.map((section, i) => (
              <motion.div
                key={section.id}
                id={`section-${section.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.04 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-soft overflow-hidden scroll-mt-24"
              >
                {/* Section header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
                  <div className={`w-10 h-10 ${section.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <section.icon size={18} className={section.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</span>
                      <h2 className="text-[16px] font-bold text-gray-900">{section.title}</h2>
                    </div>
                  </div>
                </div>

                {/* Section body */}
                <div className="px-6 py-5">
                  <div className="text-[13px] text-gray-700 leading-[1.8] whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Acceptance footer */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="bg-[#0F172A] rounded-2xl p-8 text-center"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={22} className="text-white" />
              </div>
              <h3 className="text-[20px] font-bold text-white mb-2">
                Ready to get started?
              </h3>
              <p className="text-[13px] text-slate-400 mb-6 max-w-sm mx-auto">
                By creating an account, you confirm you have read and agree to these Terms & Conditions.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link to="/register" className="btn-primary">
                  Create Free Account
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-[13px] font-semibold rounded-xl border border-white/20 transition-all"
                >
                  Sign In
                </Link>
              </div>
              <p className="text-[11px] text-slate-600 mt-5">
                Questions? Email us at{' '}
                <a href="mailto:bayyanaveen15@gmail.com" className="text-slate-400 hover:text-white underline">
                  bayyanaveen15@gmail.com
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
