"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createClinic,
  fetchClinicByDoctorId,
  fetchDoctorClinics,
  fetchDashboardMetrics,
  fetchFollowUps,
  fetchOnboarding,
  fetchRegisterRequests,
  fetchRxTemplates,
  fetchSupportRequests,
} from "@/lib/doctor-api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Clinic = {
  doc_user_id: number;
  doc_user_name: string | null;
  doc_user_mobileno: string | null;
  doc_user_status: string | null;
  doc_user_clinic: string | null;
  doc_user_md_id: string | null;
  doc_profile_name: string | null;
  doc_user_reg_datetime: string | null;
  doc_user_added_datetime?: string | null;
  doc_user_latitude?: string | null;
  doc_user_longitude?: string | null;
  clinic_details: string | null;
};

type SupportRequest = {
  sr_id: number;
  sr_md_id: string | null;
  sr_datetime: string | null;
  sr_sev: string | null;
  sr_text: string | null;
  sr_status: string | null;
};

type OnboardingRow = { md_status: string | null };
type FollowUp = { date_time: string | null; status: string | null };
type RegisterRequest = { request_date: string | null };
type RxTemplate = { rxt_md_id: string | null };
type DashboardMetricConfig = {
  metric_key: string;
  label: string;
  description: string | null;
  section?: string;
  display_order?: number;
  is_active?: number;
};

type StatusTab = "All" | string;
type WindowDays = 7 | 30 | 90;

const WINDOW_OPTIONS: WindowDays[] = [7, 30, 90];

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDate(value?: string | null): string {
  return parseDate(value)?.toLocaleString() ?? "Not recorded";
}

function statusClass(status?: string | null): string {
  const v = (status ?? "").toLowerCase();
  if (v.includes("registered")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v.includes("pending") || v.includes("submitted")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (v.includes("blocked") || v.includes("expired")) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function normalizeStatus(value?: string | null): string {
  const raw = (value ?? "").trim();
  return raw || "Unknown";
}

function csvCell(value: string | number | null | undefined): string {
  const safe = `${value ?? ""}`.replace(/"/g, '""');
  return `"${safe}"`;
}

function buildRegistrationsSeries(clinics: Clinic[], windowDays: number) {
  const now = new Date();
  const days = Array.from({ length: windowDays }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (windowDays - i - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const map = new Map<string, number>();
  for (const day of days) {
    map.set(day.toDateString(), 0);
  }

  for (const clinic of clinics) {
    const dt = parseDate(clinic.doc_user_reg_datetime ?? clinic.doc_user_added_datetime ?? null);
    if (!dt) continue;
    dt.setHours(0, 0, 0, 0);
    const key = dt.toDateString();
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }

  return days.map((day) => ({
    label: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: map.get(day.toDateString()) ?? 0,
  }));
}

export default function ClinicsDashboard() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [onboardingRows, setOnboardingRows] = useState<OnboardingRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [registerRequests, setRegisterRequests] = useState<RegisterRequest[]>([]);
  const [rxTemplates, setRxTemplates] = useState<RxTemplate[]>([]);
  const [pulseMetricConfig, setPulseMetricConfig] = useState<DashboardMetricConfig[]>([]);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSavedClinic, setLastSavedClinic] = useState<Clinic | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const [windowDays, setWindowDays] = useState<WindowDays>(30);

  const [registrationForm, setRegistrationForm] = useState({
    doc_user_name: "",
    doc_user_mobileno: "",
    doc_user_status: "Pending",
    doc_user_clinic: "",
    doc_user_md_id: "",
    doc_profile_name: "",
    doc_mci_reg: "",
    doc_user_longitude: "",
    doc_user_latitude: "",
    clinic_details: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b, c, d, e, f, g] = await Promise.all([
        fetchDoctorClinics("", 500, 0),
        fetchSupportRequests(),
        fetchOnboarding(),
        fetchFollowUps(),
        fetchRegisterRequests(),
        fetchRxTemplates(),
        fetchDashboardMetrics("operations_pulse"),
      ]);
      setClinics(Array.isArray(a) ? (a as Clinic[]) : []);
      setSupportRequests(Array.isArray(b) ? (b as SupportRequest[]) : []);
      setOnboardingRows(Array.isArray(c) ? (c as OnboardingRow[]) : []);
      setFollowUps(Array.isArray(d) ? (d as FollowUp[]) : []);
      setRegisterRequests(Array.isArray(e) ? (e as RegisterRequest[]) : []);
      setRxTemplates(Array.isArray(f) ? (f as RxTemplate[]) : []);
      setPulseMetricConfig(Array.isArray(g) ? (g as DashboardMetricConfig[]) : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);
  const analytics = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - windowDays);
    const previous = new Date(start);
    previous.setDate(start.getDate() - windowDays);

    const statusCounts = clinics.reduce<Record<string, number>>((acc, clinic) => {
      const status = normalizeStatus(clinic.doc_user_status);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    const dates = clinics
      .map((x) => parseDate(x.doc_user_reg_datetime ?? x.doc_user_added_datetime ?? null))
      .filter((x): x is Date => x !== null);
    const currentRegs = dates.filter((d) => d >= start).length;
    const prevRegs = dates.filter((d) => d >= previous && d < start).length;
    const growth =
      prevRegs > 0 ? Math.round(((currentRegs - prevRegs) / prevRegs) * 100) : currentRegs > 0 ? 100 : 0;

    const openSupport = supportRequests.filter((x) => (x.sr_status ?? "").toLowerCase() !== "closed").length;
    const criticalSupport = supportRequests.filter((x) => {
      const sev = (x.sr_sev ?? "").toLowerCase();
      return (x.sr_status ?? "").toLowerCase() !== "closed" && (sev.includes("critical") || sev.includes("high"));
    }).length;
    const pendingOnboarding = onboardingRows.filter((x) => {
      const s = (x.md_status ?? "").toLowerCase();
      return s.includes("pending") || s.includes("progress") || s.includes("await");
    }).length;
    const dueToday = followUps.filter((x) => parseDate(x.date_time)?.toDateString() === now.toDateString()).length;
    const overdue = followUps.filter((x) => {
      const dt = parseDate(x.date_time);
      const s = (x.status ?? "").toLowerCase();
      return Boolean(dt && dt < now && !s.includes("done") && !s.includes("closed") && !s.includes("complete"));
    }).length;
    const requests = registerRequests.filter((x) => {
      const dt = parseDate(x.request_date);
      return Boolean(dt && dt >= start);
    }).length;

    const clinicMdIds = new Set(clinics.map((x) => x.doc_user_md_id?.trim()).filter(Boolean));
    const templateMdIds = new Set(rxTemplates.map((x) => x.rxt_md_id?.trim()).filter(Boolean));
    const templateCoverage = clinicMdIds.size > 0 ? Math.round((templateMdIds.size / clinicMdIds.size) * 100) : 0;

    return {
      total: clinics.length,
      statusCounts,
      currentRegs,
      growth,
      openSupport,
      criticalSupport,
      pendingOnboarding,
      dueToday,
      overdue,
      requests,
      templateCoverage,
    };
  }, [clinics, followUps, onboardingRows, registerRequests, rxTemplates, supportRequests, windowDays]);

  const clinicStatuses = useMemo(() => {
    return Object.entries(analytics.statusCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([status]) => status);
  }, [analytics.statusCounts]);

  const clinicStatusTabs = useMemo<StatusTab[]>(() => ["All", ...clinicStatuses], [clinicStatuses]);

  const formStatusOptions = useMemo(() => {
    const options = new Set(clinicStatuses);
    options.add(registrationForm.doc_user_status || "Pending");
    options.add("Pending");
    return Array.from(options);
  }, [clinicStatuses, registrationForm.doc_user_status]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clinics.filter((x) => {
      const statusOk =
        activeTab === "All" || normalizeStatus(x.doc_user_status).toLowerCase() === activeTab.toLowerCase();
      if (!statusOk) return false;
      if (!q) return true;
      return [x.doc_user_name, x.doc_user_mobileno, x.doc_user_clinic, x.doc_user_md_id, x.doc_profile_name]
        .map((v) => (v ?? "").toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [activeTab, clinics, search]);

  const trendSeries = useMemo(() => buildRegistrationsSeries(clinics, windowDays), [clinics, windowDays]);
  const trendMax = useMemo(() => Math.max(...trendSeries.map((x) => x.value), 1), [trendSeries]);
  const trendPolyline = useMemo(() => {
    if (trendSeries.length <= 1) return "0,100";
    return trendSeries
      .map((point, index) => {
        const x = (index / (trendSeries.length - 1)) * 100;
        const y = 100 - (point.value / trendMax) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [trendMax, trendSeries]);

  const statusBreakdown = useMemo(() => {
    const colors = ["bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-rose-500", "bg-slate-500", "bg-indigo-500"];
    return clinicStatuses.map((status, index) => ({
      label: status,
      value: analytics.statusCounts[status] ?? 0,
      color: colors[index % colors.length],
    }));
  }, [analytics.statusCounts, clinicStatuses]);

  const operationsPulseRows = useMemo(() => {
    const metricValueByKey: Record<string, number> = {
      open_support: analytics.openSupport,
      critical_support: analytics.criticalSupport,
      pending_onboarding: analytics.pendingOnboarding,
      due_today_followups: analytics.dueToday,
      new_register_requests: analytics.requests,
    };

    const metricToneByKey: Record<string, string> = {
      open_support: "border-slate-200 bg-white text-slate-700",
      critical_support: "border-rose-200 bg-rose-50 text-rose-700",
      pending_onboarding: "border-amber-200 bg-amber-50 text-amber-700",
      due_today_followups: "border-cyan-200 bg-cyan-50 text-cyan-700",
      new_register_requests: "border-indigo-200 bg-indigo-50 text-indigo-700",
    };

    const configRows = pulseMetricConfig.filter((row) => row.metric_key in metricValueByKey);
    if (configRows.length > 0) {
      return configRows.map((row) => ({
        key: row.metric_key,
        label: row.label || row.metric_key,
        value: metricValueByKey[row.metric_key] ?? 0,
        tone: metricToneByKey[row.metric_key] ?? "border-slate-200 bg-white text-slate-700",
      }));
    }

    return [
      { key: "open_support", label: "Open support tickets", value: analytics.openSupport, tone: metricToneByKey.open_support },
      { key: "critical_support", label: "Critical support", value: analytics.criticalSupport, tone: metricToneByKey.critical_support },
      { key: "pending_onboarding", label: "Pending onboarding", value: analytics.pendingOnboarding, tone: metricToneByKey.pending_onboarding },
      { key: "due_today_followups", label: "Followups due today", value: analytics.dueToday, tone: metricToneByKey.due_today_followups },
      { key: "new_register_requests", label: "New register requests", value: analytics.requests, tone: metricToneByKey.new_register_requests },
    ];
  }, [
    analytics.criticalSupport,
    analytics.dueToday,
    analytics.openSupport,
    analytics.pendingOnboarding,
    analytics.requests,
    pulseMetricConfig,
  ]);

  const saveRegistration = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const mdId = registrationForm.doc_user_md_id.trim();
      await createClinic(registrationForm);
      if (mdId) setLastSavedClinic((await fetchClinicByDoctorId(mdId)) as Clinic | null);
      await loadData();
      setMessage("Clinic registration created successfully");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const exportFilteredCsv = () => {
    if (visible.length === 0) {
      setError("No filtered records to export.");
      return;
    }

    const header = [
      "doc_user_id",
      "doc_user_name",
      "doc_user_mobileno",
      "doc_user_clinic",
      "doc_user_md_id",
      "doc_profile_name",
      "doc_user_status",
      "registered_on",
    ];

    const rows = visible.map((item) => [
      csvCell(item.doc_user_id),
      csvCell(item.doc_user_name),
      csvCell(item.doc_user_mobileno),
      csvCell(item.doc_user_clinic),
      csvCell(item.doc_user_md_id),
      csvCell(item.doc_profile_name),
      csvCell(item.doc_user_status),
      csvCell(formatDate(item.doc_user_reg_datetime ?? item.doc_user_added_datetime ?? null)),
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clinics_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportFilteredPdf = () => {
    if (visible.length === 0) {
      setError("No filtered records to export.");
      return;
    }

    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) {
      setError("Popup blocked. Please allow popups for PDF export.");
      return;
    }

    const rows = visible
      .map(
        (item) => `<tr>
          <td>${item.doc_user_id}</td>
          <td>${item.doc_user_name ?? "-"}</td>
          <td>${item.doc_user_mobileno ?? "-"}</td>
          <td>${item.doc_user_clinic ?? "-"}</td>
          <td>${item.doc_user_md_id ?? "-"}</td>
          <td>${item.doc_profile_name ?? "-"}</td>
          <td>${item.doc_user_status ?? "-"}</td>
          <td>${formatDate(item.doc_user_reg_datetime ?? item.doc_user_added_datetime ?? null)}</td>
        </tr>`,
      )
      .join("");
    popup.document.write(`
      <html>
        <head>
          <title>Clinics Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Clinic Records Export</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Doctor</th><th>Mobile</th><th>Clinic</th>
                <th>Doctor ID</th><th>Profile</th><th>Status</th><th>Registered On</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#dff5f8_0%,_#eff8ff_45%,_#fff7ed_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="border-0 bg-[linear-gradient(120deg,_#0f172a_0%,_#0b3a4d_45%,_#1f3d1f_100%)] text-white">
          <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/90">Clinic Command Center</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Operations dashboard with live backend analytics</h1>
              <p className="mt-2 text-sm text-slate-200">Built from clinics, support, onboarding, followup, requests, and Rx template tables.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 p-3">
              <Select value={String(windowDays)} className="h-9 border-white/30 bg-white/10 text-white" onChange={(e) => setWindowDays(Number(e.target.value) as WindowDays)}>
                {WINDOW_OPTIONS.map((days) => (
                  <option key={days} value={days} className="text-slate-900">Last {days} days</option>
                ))}
              </Select>
              <Button variant="secondary" className="h-9" onClick={() => void loadData()} disabled={loading}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-600/10 to-indigo-600/20"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Clinics</p><p className="mt-2 text-3xl font-semibold">{analytics.total}</p><p className="mt-1 text-sm text-slate-600">{analytics.currentRegs} new in window</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/20"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Growth</p><p className="mt-2 text-3xl font-semibold">{analytics.growth >= 0 ? "+" : ""}{analytics.growth}%</p><p className="mt-1 text-sm text-slate-600">vs previous window</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/20"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operational Risks</p><p className="mt-2 text-3xl font-semibold">{analytics.overdue + analytics.criticalSupport}</p><p className="mt-1 text-sm text-slate-600">{analytics.overdue} overdue followups</p></CardContent></Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-lime-500/20"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Template Coverage</p><p className="mt-2 text-3xl font-semibold">{analytics.templateCoverage}%</p><p className="mt-1 text-sm text-slate-600">MD IDs with Rx template</p></CardContent></Card>
        </section>

        {loading && <Alert className="border-blue-200 bg-blue-50 text-blue-700"><AlertDescription>Loading clinic analytics...</AlertDescription></Alert>}
        {message && <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700"><AlertDescription>{message}</AlertDescription></Alert>}
        {error && <Alert className="border-rose-200 bg-rose-50 text-rose-700"><AlertDescription>{error}</AlertDescription></Alert>}

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-xl">Registration Trend</CardTitle><CardDescription>Daily clinics added in selected window</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-600"><span>Peak: {trendMax}</span><span>{windowDays} day window</span></div>
                <svg viewBox="0 0 100 100" className="h-44 w-full"><polyline fill="none" stroke="#0f766e" strokeWidth="2" points={trendPolyline} vectorEffect="non-scaling-stroke" /></svg>
                <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                  <span>{trendSeries[0]?.label ?? "-"}</span>
                  <span>{trendSeries[Math.floor(trendSeries.length / 2)]?.label ?? "-"}</span>
                  <span>{trendSeries[trendSeries.length - 1]?.label ?? "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-xl">Status Distribution</CardTitle><CardDescription>Current clinic status load</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {statusBreakdown.map((row) => {
                const pct = analytics.total > 0 ? Math.round((row.value / analytics.total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span className="text-slate-700">{row.label}</span><span className="text-slate-500">{row.value} ({pct}%)</span></div>
                    <div className="h-2 w-full rounded-full bg-slate-200"><div className={cn("h-full rounded-full", row.color)} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Clinic Pipeline</CardTitle>
              <CardDescription>Dynamic status snapshot from backend values</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {statusBreakdown.length === 0 && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No statuses found.</div>
              )}
              {statusBreakdown.map((row) => (
                <div key={row.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{row.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{row.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Operations Pulse</CardTitle>
              <CardDescription>Labels and order from dashboard metric config</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {operationsPulseRows.map((row) => (
                <div key={row.key} className={cn("flex items-center justify-between rounded-lg border p-3", row.tone)}>
                  <p className="text-sm">{row.label}</p>
                  <p className="text-xl font-semibold">{row.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
        {lastSavedClinic && (
          <Card className="border-emerald-200 bg-emerald-50/70">
            <CardHeader><CardTitle className="text-lg text-emerald-900">Last Saved Record</CardTitle><CardDescription className="text-emerald-800">Record verified after save</CardDescription></CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
              <p><span className="text-slate-600">ID:</span> {lastSavedClinic.doc_user_id}</p>
              <p><span className="text-slate-600">Doctor:</span> {lastSavedClinic.doc_user_name ?? "-"}</p>
              <p><span className="text-slate-600">Mobile:</span> {lastSavedClinic.doc_user_mobileno ?? "-"}</p>
              <p><span className="text-slate-600">Clinic:</span> {lastSavedClinic.doc_user_clinic ?? "-"}</p>
              <p><span className="text-slate-600">Doctor ID:</span> {lastSavedClinic.doc_user_md_id ?? "-"}</p>
              <p className="flex items-center gap-2"><span className="text-slate-600">Status:</span><Badge className={cn("border", statusClass(lastSavedClinic.doc_user_status))}>{lastSavedClinic.doc_user_status ?? "Unknown"}</Badge></p>
              <p><span className="text-slate-600">Registered On:</span> {formatDate(lastSavedClinic.doc_user_reg_datetime ?? lastSavedClinic.doc_user_added_datetime ?? null)}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-xl">New Clinic Registration</CardTitle><CardDescription>Save directly in backend</CardDescription></CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <Input placeholder="Doctor Name" value={registrationForm.doc_user_name} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_user_name: e.target.value })} />
              <Input placeholder="Mobile Number" value={registrationForm.doc_user_mobileno} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_user_mobileno: e.target.value })} />
              <Input placeholder="Clinic Name" value={registrationForm.doc_user_clinic} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_user_clinic: e.target.value })} />
              <Input placeholder="Doctor ID" value={registrationForm.doc_user_md_id} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_user_md_id: e.target.value })} />
              <Input placeholder="Profile Name" value={registrationForm.doc_profile_name} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_profile_name: e.target.value })} />
              <Select
                value={registrationForm.doc_user_status}
                onChange={(e) => setRegistrationForm({ ...registrationForm, doc_user_status: e.target.value })}
              >
                {formStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Input placeholder="MCI Registration" value={registrationForm.doc_mci_reg} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_mci_reg: e.target.value })} />
              <Input placeholder="Latitude" value={registrationForm.doc_user_latitude} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_user_latitude: e.target.value })} />
              <Input placeholder="Longitude" value={registrationForm.doc_user_longitude} onChange={(e) => setRegistrationForm({ ...registrationForm, doc_user_longitude: e.target.value })} />
              <Textarea className="md:col-span-2 lg:col-span-3" placeholder="Clinic Details" value={registrationForm.clinic_details} onChange={(e) => setRegistrationForm({ ...registrationForm, clinic_details: e.target.value })} />
            </div>
            <Button className="mt-3" disabled={busy} onClick={() => void saveRegistration()}>Save Registration</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-xl">Clinic Records Explorer</CardTitle>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Input className="w-full sm:w-80" placeholder="Search name, mobile, clinic, doctor ID" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button type="button" variant="outline" onClick={exportFilteredCsv}>Export CSV</Button>
              <Button type="button" variant="outline" onClick={exportFilteredPdf}>Export PDF</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {clinicStatusTabs.map((tab) => (
                <Button key={tab} type="button" variant={activeTab === tab ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setActiveTab(tab)}>{tab}</Button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.length === 0 && <div className="text-sm text-slate-500">No records in this view.</div>}
              {visible.map((item) => (
                <Card key={item.doc_user_id} className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold">ID: {item.doc_user_id}</p><Badge className={cn("border", statusClass(item.doc_user_status))}>{item.doc_user_status ?? "Unknown"}</Badge></div>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p><span className="text-slate-500">Doctor Name:</span> {item.doc_user_name ?? "-"}</p>
                      <p><span className="text-slate-500">Mobile:</span> {item.doc_user_mobileno ?? "-"}</p>
                      <p><span className="text-slate-500">Clinic:</span> {item.doc_user_clinic ?? "-"}</p>
                      <p><span className="text-slate-500">Doctor ID:</span> {item.doc_user_md_id ?? "-"}</p>
                      <p><span className="text-slate-500">Profile:</span> {item.doc_profile_name ?? "-"}</p>
                      <p><span className="text-slate-500">Registered On:</span> {formatDate(item.doc_user_reg_datetime ?? item.doc_user_added_datetime ?? null)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
