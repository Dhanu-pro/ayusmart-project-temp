const BASE_URL = "http://localhost:3000";

function buildHeaders(hasJsonBody = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function buildFetchError(res: Response, label: string): Promise<Error> {
  const text = (await res.text()).trim();
  if (!text) {
    return new Error(`${label} (${res.status})`);
  }

  try {
    const parsed = JSON.parse(text) as { message?: string | string[] };
    const message = Array.isArray(parsed.message)
      ? parsed.message.join(", ")
      : parsed.message;
    if (message) {
      return new Error(`${label} (${res.status}): ${message}`);
    }
  } catch {
    // Non-JSON response body, return raw text below.
  }

  return new Error(`${label} (${res.status}): ${text}`);
}

export async function fetchDoctorClinics(
  status?: string,
  limit = 100,
  offset = 0,
) {
  const params = new URLSearchParams();
  params.set("limit", `${limit}`);
  params.set("offset", `${offset}`);
  if (status) {
    params.set("status", status);
  }

  const res = await fetch(`${BASE_URL}/doctor/clinics?${params.toString()}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch clinics");
  }
  return res.json();
}

export async function fetchClinicByDoctorId(mdId: string) {
  const params = new URLSearchParams();
  params.set("mdId", mdId);
  params.set("limit", "1");
  params.set("offset", "0");

  const res = await fetch(`${BASE_URL}/doctor/clinics?${params.toString()}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch clinic by doctor id");
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

export async function fetchDoctorUsers(status?: string) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }

  const res = await fetch(`${BASE_URL}/doctor/users?${params.toString()}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch doctor users");
  }
  return res.json();
}

export async function fetchClinicProfiles() {
  const res = await fetch(`${BASE_URL}/doctor/clinic-profiles`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch clinic profiles");
  }
  return res.json();
}

export async function fetchRegisterRequests(status?: string) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }

  const res = await fetch(
    `${BASE_URL}/doctor/register-requests?${params.toString()}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch register requests");
  }
  return res.json();
}

export async function fetchSupportRequests(
  status?: string,
  severity?: string,
) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (severity) {
    params.set("severity", severity);
  }

  const res = await fetch(
    `${BASE_URL}/doctor/support-requests?${params.toString()}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch support requests");
  }
  return res.json();
}

export async function fetchDashboardMetrics(section = "operations_pulse") {
  const params = new URLSearchParams();
  if (section) {
    params.set("section", section);
  }

  const res = await fetch(
    `${BASE_URL}/doctor/dashboard-metrics?${params.toString()}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch dashboard metrics");
  }
  return res.json();
}

export async function fetchOnboarding(status?: string) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }

  const res = await fetch(`${BASE_URL}/doctor/onboarding?${params.toString()}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch onboarding");
  }
  return res.json();
}

export async function fetchFollowUps(
  mdId?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const params = new URLSearchParams();
  if (mdId) {
    params.set("mdId", mdId);
  }
  if (status) {
    params.set("status", status);
  }
  if (dateFrom) {
    params.set("dateFrom", dateFrom);
  }
  if (dateTo) {
    params.set("dateTo", dateTo);
  }

  const query = params.toString();
  const res = await fetch(
    `${BASE_URL}/doctor/followups${query ? `?${query}` : ""}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch followups");
  }
  return res.json();
}

export async function fetchRxTemplates() {
  const res = await fetch(`${BASE_URL}/doctor/rx-templates`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw await buildFetchError(res, "Failed to fetch rx templates");
  }
  return res.json();
}

async function request(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: Record<string, unknown>,
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export function createClinic(payload: {
  doc_user_device_id?: string;
  doc_user_mobileno: string;
  doc_user_name: string;
  doc_user_added_datetime?: string;
  doc_user_reg_datetime?: string;
  doc_user_longitude?: string;
  doc_user_latitude?: string;
  doc_user_status: string;
  doc_user_clinic?: string;
  doc_user_md_id?: string;
  doc_profile_name?: string;
  doc_mci_reg?: string;
  clinic_details?: string;
}) {
  return request("/doctor/clinics", "POST", payload);
}

export function updateClinic(
  id: number,
  payload: {
    doc_user_device_id?: string;
    doc_user_mobileno: string;
    doc_user_name: string;
    doc_user_added_datetime?: string;
    doc_user_reg_datetime?: string;
    doc_user_longitude?: string;
    doc_user_latitude?: string;
    doc_user_status: string;
    doc_user_clinic?: string;
    doc_user_md_id?: string;
    doc_profile_name?: string;
    doc_mci_reg?: string;
    clinic_details?: string;
  },
) {
  return request(`/doctor/clinics/${id}`, "PUT", payload);
}

export function deleteClinic(id: number) {
  return request(`/doctor/clinics/${id}`, "DELETE");
}

export function createSupportRequest(payload: {
  sr_md_id: string;
  sr_sev: string;
  sr_text: string;
  sr_status: string;
}) {
  return request("/doctor/support-requests", "POST", payload);
}

export function updateSupportRequest(
  id: number,
  payload: {
    sr_md_id: string;
    sr_sev: string;
    sr_text: string;
    sr_status: string;
  },
) {
  return request(`/doctor/support-requests/${id}`, "PUT", payload);
}

export function deleteSupportRequest(id: number) {
  return request(`/doctor/support-requests/${id}`, "DELETE");
}

export function createOnboarding(payload: {
  md_id: string;
  md_name: string;
  md_type: string;
  md_status: string;
  notes_json?: string;
}) {
  return request("/doctor/onboarding", "POST", payload);
}

export function updateOnboarding(
  mdId: string,
  payload: {
    md_name: string;
    md_type: string;
    md_status: string;
    notes_json?: string;
  },
) {
  return request(`/doctor/onboarding/${mdId}`, "PUT", payload);
}

export function deleteOnboarding(mdId: string) {
  return request(`/doctor/onboarding/${mdId}`, "DELETE");
}

export function upsertRxTemplate(payload: {
  rxt_md_id: string;
  rxt_speciality: string;
  rxt_template_json: string;
}) {
  return request("/doctor/rx-template", "POST", payload);
}

export function deleteRxTemplate(mdId: string) {
  return request(`/doctor/rx-template/${mdId}`, "DELETE");
}
