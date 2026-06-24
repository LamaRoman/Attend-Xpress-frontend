// Central metadata for plan-gated features. One source of truth for the
// "locked → upgrade" UI (locked nav items, upgrade strips, lock screens).
//
// Keys are the short feature names used across the app — both the client
// `features.*` flags (auth-context) and the nav `featureKey` strings in the
// layouts. A couple of nav keys are aliases of a canonical feature
// (liveTracking → fieldTracking, holidaySync → holidays); ALIAS normalises
// them so every lookup resolves to one metadata entry.
//
// The Upgrade CTA always points at the billing/plan page — that's where the
// org admin sees the real, current plan options, so we don't hardcode tier
// names here (super admin can re-compose plans, which would make any baked-in
// "available on X" claim drift).

import {
  QrCode,
  ScanLine,
  Table2,
  Building2,
  Navigation,
  Route,
  FileText,
  CalendarDays,
  CreditCard,
  Calendar,
  GitPullRequestArrow,
  Upload,
  Bell,
  ShieldCheck,
  PencilRuler,
  type LucideIcon,
} from 'lucide-react'

export const UPGRADE_HREF = '/admin/billing'

export interface FeatureMeta {
  labelEn: string
  labelNp: string
  blurbEn: string
  blurbNp: string
  icon: LucideIcon
}

// Canonical metadata, keyed by short feature name.
export const FEATURE_META: Record<string, FeatureMeta> = {
  staticQR: {
    labelEn: 'QR attendance',
    labelNp: 'QR उपस्थिति',
    blurbEn: 'Let staff clock in by scanning a workplace QR code.',
    blurbNp: 'कर्मचारीहरूलाई कार्यस्थलको QR कोड स्क्यान गरेर हाजिर गर्न दिनुहोस्।',
    icon: QrCode,
  },
  rotatingQR: {
    labelEn: 'Rotating QR',
    labelNp: 'घुम्ने QR',
    blurbEn: 'Anti-buddy-punch QR codes that refresh on a timer.',
    blurbNp: 'टाइमरमा रिफ्रेस हुने, अर्काको हाजिरी रोक्ने QR कोड।',
    icon: ScanLine,
  },
  roster: {
    labelEn: 'Roster management',
    labelNp: 'रोस्टर व्यवस्थापन',
    blurbEn: 'Plan shifts and assign working schedules to your team.',
    blurbNp: 'सिफ्ट योजना बनाउनुहोस् र कर्मचारीलाई कार्यतालिका तोक्नुहोस्।',
    icon: Table2,
  },
  multiBranch: {
    labelEn: 'Multi-branch',
    labelNp: 'बहु-शाखा',
    blurbEn: 'Run multiple branches, each with its own geofence and admins.',
    blurbNp: 'धेरै शाखा सञ्चालन गर्नुहोस्, प्रत्येकको आफ्नै जियोफेन्स र प्रशासक।',
    icon: Building2,
  },
  fieldTracking: {
    labelEn: 'Field staff tracking',
    labelNp: 'फिल्ड ट्र्याकिङ',
    blurbEn: 'See live location of field staff while they are on the clock.',
    blurbNp: 'फिल्ड कर्मचारीको हाजिर अवधिभर लाइभ स्थान हेर्नुहोस्।',
    icon: Navigation,
  },
  routeReplay: {
    labelEn: 'Route replay',
    labelNp: 'मार्ग रिप्ले',
    blurbEn: 'Replay the full route a field employee travelled during a shift.',
    blurbNp: 'फिल्ड कर्मचारीले सिफ्टभरि हिँडेको पूरा मार्ग रिप्ले गर्नुहोस्।',
    icon: Route,
  },
  reports: {
    labelEn: 'Reports & exports',
    labelNp: 'प्रतिवेदन र निर्यात',
    blurbEn: 'Generate attendance and payroll reports and export the data.',
    blurbNp: 'उपस्थिति र तलबको प्रतिवेदन बनाउनुहोस् र डाटा निर्यात गर्नुहोस्।',
    icon: FileText,
  },
  leave: {
    labelEn: 'Leave management',
    labelNp: 'बिदा व्यवस्थापन',
    blurbEn: 'Let staff request leave and managers approve it in one place.',
    blurbNp: 'कर्मचारीले बिदा माग्ने र प्रबन्धकले स्वीकृत गर्ने — एकै ठाउँमा।',
    icon: CalendarDays,
  },
  payroll: {
    labelEn: 'Payroll',
    labelNp: 'तलब',
    blurbEn: 'Calculate salaries, deductions and generate payslips.',
    blurbNp: 'तलब र कटौती गणना गर्नुहोस् र पेस्लिप बनाउनुहोस्।',
    icon: CreditCard,
  },
  payrollWorkflow: {
    labelEn: 'Payroll approval workflow',
    labelNp: 'तलब स्वीकृति प्रक्रिया',
    blurbEn: 'Route payroll through Process → Approve → Mark paid with sign-off.',
    blurbNp: 'तलबलाई प्रोसेस → स्वीकृत → भुक्तानी प्रक्रियामा लैजानुहोस्।',
    icon: GitPullRequestArrow,
  },
  holidays: {
    labelEn: 'Holiday management',
    labelNp: 'बिदा व्यवस्थापन',
    blurbEn: 'Maintain your holiday calendar and sync it to attendance.',
    blurbNp: 'बिदाको पात्रो राख्नुहोस् र उपस्थितिसँग मिलाउनुहोस्।',
    icon: Calendar,
  },
  documentUpload: {
    labelEn: 'Document upload',
    labelNp: 'कागजात अपलोड',
    blurbEn: 'Attach contracts, IDs and other files to employee records.',
    blurbNp: 'कर्मचारीको रेकर्डमा करार, परिचयपत्र र अन्य फाइल जोड्नुहोस्।',
    icon: Upload,
  },
  notifications: {
    labelEn: 'Notifications & alerts',
    labelNp: 'सूचना र अलर्ट',
    blurbEn: 'Real-time alerts for attendance, leave and payroll events.',
    blurbNp: 'उपस्थिति, बिदा र तलबका घटनाका लागि रियल-टाइम अलर्ट।',
    icon: Bell,
  },
  auditLog: {
    labelEn: 'Audit log',
    labelNp: 'अडिट लग',
    blurbEn: 'A full history of who changed what, and when.',
    blurbNp: 'कसले, कहिले, के परिवर्तन गर्‍यो भन्ने पूरा इतिहास।',
    icon: ShieldCheck,
  },
  manualCorrection: {
    labelEn: 'Manual correction',
    labelNp: 'म्यानुअल सुधार',
    blurbEn: 'Fix incorrect clock-ins and adjust attendance by hand.',
    blurbNp: 'गलत हाजिरी सच्याउनुहोस् र उपस्थिति हातैले मिलाउनुहोस्।',
    icon: PencilRuler,
  },
}

// Nav uses a couple of legacy feature-key strings that map onto a canonical
// metadata entry.
const ALIAS: Record<string, string> = {
  liveTracking: 'fieldTracking',
  holidaySync: 'holidays',
}

/** Resolve metadata for a feature key or nav featureKey (handles aliases). */
export function featureMeta(key: string): FeatureMeta | undefined {
  return FEATURE_META[ALIAS[key] ?? key]
}
