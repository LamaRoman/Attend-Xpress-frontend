'use client';

import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
// ─── Types (matches API response exactly) ─────────────────────────────────────

type Payslip = {
    organization: {
        name: string;
        address: string | null;
    };
    employee: {
        firstName: string;
        lastName: string;
        employeeId: string;
        email: string;
    };
    period: {
        bsYear: number;
        bsMonth: number;
        totalDaysInMonth: number;
        workingDaysInMonth: number;
    };
    attendance: {
        daysPresent: number;
        daysAbsent: number;
    };
    earnings: {
        basicSalary: number;
        allowancesTotal?: number;
        allowancesBreakdown?: { label: string; amount: number; type?: string }[];
        oneTimePayment?: number;
        dearnessAllowance: number;
        transportAllowance: number;
        medicalAllowance: number;
        otherAllowances: number;
        overtimeHours: number;
        overtimePay: number;
        grossSalary: number;
        dashainBonus: number;
    };
    deductions: {
        employeeSsf: number;
        employerPf: number;
        advanceDeduction: number;
        tds: number;
        absenceDeduction: number;
        citDeduction: number;
    };
    netSalary: number;
    employment: {
        isMarried: boolean;
        status: string;
    };
    bank: {
        bankName: string | null;
        bankAccountNumber: string | null;
    };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BS_MONTHS = [
    "Baisakh", "Jestha", "Ashadh", "Shrawan",
    "Bhadra", "Ashwin", "Kartik", "Mangsir",
    "Poush", "Magh", "Falgun", "Chaitra",
];

function fmt(n: number): string {
    return `Rs. ${n.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getInitials(first: string, last: string): string {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

// Map raw deduction keys → human-readable labels
const DEDUCTION_LABELS: Record<keyof Payslip["deductions"], string> = {
    employeeSsf: "Employee SSF",
    employerPf: "Employer PF",
    advanceDeduction: "Advance Deduction",
    tds: "TDS",
    absenceDeduction: "Absence Deduction",
    citDeduction: "CIT Deduction",
};

// Build earnings rows. New records carry a dynamic allowancesBreakdown
// (recurring + pro-rata + one-time); legacy records fall back to the old fixed
// columns + dashain + one-time. See PAYROLL-ALLOWANCES-NOTES.md.
function earningRows(e: Payslip["earnings"]) {
    const rows: { label: string; amount: number }[] = [
        { label: "Basic Salary", amount: e.basicSalary },
    ];
    if (e.allowancesBreakdown && e.allowancesBreakdown.length > 0) {
        for (const b of e.allowancesBreakdown) rows.push({ label: b.label, amount: b.amount });
    } else {
        rows.push({ label: "Dearness Allowance", amount: e.dearnessAllowance });
        rows.push({ label: "Transport Allowance", amount: e.transportAllowance });
        rows.push({ label: "Medical Allowance", amount: e.medicalAllowance });
        rows.push({ label: "Other Allowances", amount: e.otherAllowances });
        rows.push({ label: "Dashain Bonus", amount: e.dashainBonus });
        if (e.oneTimePayment) rows.push({ label: "One-time Payment", amount: e.oneTimePayment });
    }
    rows.push({
        label: e.overtimeHours ? `Overtime Pay (${e.overtimeHours} hrs)` : "Overtime Pay",
        amount: e.overtimePay,
    });
    return rows.filter((r) => r.amount !== 0);
}

function deductionRows(d: Payslip["deductions"]) {
    return (Object.keys(DEDUCTION_LABELS) as Array<keyof Payslip["deductions"]>)
        .filter((k) => d[k] !== 0)
        .map((k) => ({ label: DEDUCTION_LABELS[k], amount: d[k] }));
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function AttCard({ value, label, color = "#1f2937" }: { value: number | string; label: string; color?: string }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", backgroundColor: "#f9fafb",
            border: "1px solid #f3f4f6", borderRadius: "12px",
            padding: "14px 6px", textAlign: "center",
        }}>
            <span style={{ fontFamily: "monospace", fontSize: "22px", fontWeight: 600, lineHeight: 1, color, marginBottom: "4px" }}>
                {value}
            </span>
            <span style={{ fontSize: "10px", color: "#9ca3af", lineHeight: 1.3, marginTop: "4px" }}>{label}</span>
        </div>
    );
}

function SalaryRow({ label, amount, red = false }: { label: string; amount: number; red?: boolean }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid #f3f4f6", gap: "12px" }}>
            <span style={{ fontSize: "13px", color: "#6b7280", flex: 1, lineHeight: 1.4 }}>{label}</span>
            <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap", color: red ? "#ef4444" : "#111827" }}>
                {fmt(amount)}
            </span>
        </div>
    );
}

function Subtotal({ label, amount }: { label: string; amount: number }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", backgroundColor: "#f3f4f6", borderRadius: "8px", padding: "10px 12px" }}>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>{label}</span>
            <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "#111827" }}>{fmt(amount)}</span>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#9ca3af", fontWeight: 500, margin: "0 0 6px" }}>
            {children}
        </p>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden border border-gray-200 animate-pulse">
                <div style={{ height: "120px", backgroundColor: "#d1d5db" }} />
                <div style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {[100, 60, 80, 60, 120, 64].map((h, i) => (
                        <div key={i} style={{ height: `${h}px`, backgroundColor: "#f3f4f6", borderRadius: "8px" }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PayslipPage() {
    const { uuid } = useParams();
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [payslip, setPayslip] = useState<Payslip | null>(null);
    const [loading, setLoading] = useState(true);

    // Auth guard — this page shows salary data, so it must never render to an
    // unauthenticated visitor. Logged-out → login; non-admin/accountant roles
    // → home. The API also enforces this (admin/accountant + same org), so this
    // is defense-in-depth + a clean redirect instead of an empty page.
    const ALLOWED = ["ORG_ADMIN", "BRANCH_ADMIN", "ORG_ACCOUNTANT"];
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace(`/login?redirect=/payroll/payslip/${uuid}`);
        } else if (!ALLOWED.includes(user.role)) {
            router.replace("/");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user, uuid]);

    useEffect(() => {
        if (!uuid || authLoading || !user || !ALLOWED.includes(user.role)) return;
        (async () => {
            try {
                setLoading(true);
                const res = await api.get(`/api/v1/payroll/payslip/${uuid}`);
                setPayslip(res.data as Payslip);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuid, authLoading, user]);

    if (authLoading || (!user && typeof window !== "undefined")) return <Skeleton />;
    if (user && !ALLOWED.includes(user.role)) return <Skeleton />;
    if (loading) return <Skeleton />;

    if (!payslip) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "40px", textAlign: "center" }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
                    <p style={{ fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Payslip not found</p>
                    <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>The requested payslip could not be loaded.</p>
                </div>
            </div>
        );
    }

    const fullName = `${payslip.employee.firstName} ${payslip.employee.lastName}`;
    const initials = getInitials(payslip.employee.firstName, payslip.employee.lastName);
    const monthName = BS_MONTHS[(payslip.period.bsMonth - 1) % 12];
    const payPeriod = `${monthName} ${payslip.period.bsYear}`;
    const isDraft = payslip.employment.status === "DRAFT";

    const eRows = earningRows(payslip.earnings);
    const dRows = deductionRows(payslip.deductions);
    const totalDeductions = dRows.reduce((s, r) => s + r.amount, 0);

    return (
        <>
            <style>{`
        @media print {
          @page { margin: 12mm 14mm; size: A4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .slip-card { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-width: 100% !important; }
        }
      `}</style>

            <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px" }}>

                {/* Print button */}
                <div className="no-print" style={{ width: "100%", maxWidth: "680px", display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
                    <button
                        onClick={() => window.print()}
                        style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#4b5563", border: "1px solid #d1d5db", backgroundColor: "white", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" }}
                    >
                        <PrintIcon /> Print / Save PDF
                    </button>
                </div>

                {/* ── Card ─────────────────────────────────────────────────────── */}
                <div
                    className="slip-card"
                    style={{ width: "100%", maxWidth: "680px", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", position: "relative" }}
                >
                    {/* DRAFT watermark */}
                    {isDraft && (
                        <div aria-hidden style={{ pointerEvents: "none", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 0, overflow: "hidden" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "96px", fontWeight: 700, color: "rgba(239,68,68,0.055)", letterSpacing: "0.25em", userSelect: "none", whiteSpace: "nowrap", transform: "rotate(-28deg)" }}>
                                DRAFT
                            </span>
                        </div>
                    )}

                    {/* ── Header ───────────────────────────────────────────────── */}
                    <div style={{ backgroundColor: "#0F2435", padding: "24px 28px 20px", position: "relative", zIndex: 1 }}>
                        <h1 style={{ fontSize: "20px", fontWeight: 600, color: "white", margin: "0 0 2px", letterSpacing: "0.3px" }}>
                            {payslip.organization.name}
                        </h1>
                        {payslip.organization.address && (
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", margin: "0 0 20px" }}>
                                {payslip.organization.address}
                            </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
                                    Salary Slip
                                </span>
                                {isDraft && (
                                    <span style={{ fontFamily: "monospace", fontSize: "10px", letterSpacing: "0.15em", border: "1px solid rgba(251,191,36,0.4)", color: "rgba(252,211,77,0.85)", backgroundColor: "rgba(120,53,15,0.25)", borderRadius: "4px", padding: "2px 8px" }}>
                                        DRAFT
                                    </span>
                                )}
                            </div>
                            <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>
                                {payslip.employee.employeeId}
                            </span>
                        </div>
                    </div>

                    {/* ── Body ─────────────────────────────────────────────────── */}
                    <div style={{ padding: "24px 28px", position: "relative", zIndex: 1 }}>

                        {/* Employee + Period row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", paddingBottom: "20px", marginBottom: "20px", borderBottom: "1px solid #f3f4f6" }}>
                            <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#eff6ff", border: "1px solid #dbeafe", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb", fontWeight: 600, fontSize: "14px", flexShrink: 0 }}>
                                    {initials}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.3 }}>{fullName}</p>
                                    <p style={{ color: "#3b82f6", fontSize: "13px", margin: "2px 0 0" }}>{payslip.employee.email}</p>
                                    <p style={{ color: "#9ca3af", fontSize: "12px", margin: "2px 0 0" }}>
                                        {payslip.employment.isMarried ? "Married" : "Unmarried"}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <Label>Pay Period</Label>
                                <p style={{ fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{payPeriod}</p>
                                <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
                                    {payslip.period.workingDaysInMonth} working / {payslip.period.totalDaysInMonth} total days
                                </p>
                            </div>
                        </div>

                        {/* Attendance. Holidays are paid days off baked into the
                            salary, so they're omitted (no pay impact). */}
                        <div style={{ marginBottom: "24px" }}>
                            <Label>Attendance</Label>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                                <AttCard value={payslip.period.workingDaysInMonth} label="Working Days" />
                                <AttCard value={payslip.attendance.daysPresent} label="Present" color="#059669" />
                                <AttCard value={payslip.attendance.daysAbsent} label="Absent" color="#dc2626" />
                            </div>
                        </div>

                        {/* Earnings & Deductions */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", marginBottom: "24px" }}>
                            {/* Earnings */}
                            <div>
                                <Label>Earnings</Label>
                                {eRows.map((r) => <SalaryRow key={r.label} label={r.label} amount={r.amount} />)}
                                <Subtotal label="Gross Salary" amount={payslip.earnings.grossSalary} />
                            </div>

                            {/* Deductions */}
                            <div>
                                <Label>Deductions</Label>
                                {dRows.length > 0
                                    ? dRows.map((r) => <SalaryRow key={r.label} label={r.label} amount={r.amount} red />)
                                    : <p style={{ fontSize: "13px", color: "#9ca3af", padding: "8px 0", margin: 0 }}>No deductions</p>
                                }
                                <Subtotal label="Total Deductions" amount={totalDeductions} />
                            </div>
                        </div>

                        {/* Net Salary */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0F2435", borderRadius: "12px", padding: "18px 24px", marginBottom: "20px" }}>
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 500 }}>
                                Net Salary Payable
                            </span>
                            <span style={{ color: "white", fontSize: "28px", fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.5px" }}>
                                {fmt(payslip.netSalary)}
                            </span>
                        </div>

                        {/* Bank Details */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid #f3f4f6", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <BankIcon />
                            </div>
                            <div>
                                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: 0 }}>
                                    {payslip.bank.bankName ?? <span style={{ color: "#9ca3af", fontWeight: 400 }}>No bank on file</span>}
                                </p>
                                <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#9ca3af", letterSpacing: "0.5px", margin: "2px 0 0" }}>
                                    {payslip.bank.bankAccountNumber ? `Acc: ${payslip.bank.bankAccountNumber}` : "Account number not provided"}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ textAlign: "center", fontSize: "11px", color: "#9ca3af", paddingTop: "16px", borderTop: "1px solid #f3f4f6", lineHeight: 1.6 }}>
                            This is a computer-generated payslip and does not require a signature.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PrintIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
            <rect x="6" y="14" width="12" height="8" rx="1" />
        </svg>
    );
}

function BankIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11" />
        </svg>
    );
}
