import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

type QueryValue = string | number;

@Injectable()
export class DoctorService {
  constructor(private readonly dataSource: DataSource) {}

  private parseLimit(value?: string, fallback = 50): number {
    const parsed = Number.parseInt(value ?? `${fallback}`, 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(parsed, 1), 500);
  }

  private parseOffset(value?: string): number {
    const parsed = Number.parseInt(value ?? "0", 10);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(parsed, 0);
  }

  async getClinics(filters: {
    status?: string;
    mdId?: string;
    mobile?: string;
    limit?: string;
    offset?: string;
  }) {
    const params: QueryValue[] = [];
    const where: string[] = [];

    if (filters.status?.trim()) {
      where.push("doc_user_status = ?");
      params.push(filters.status.trim());
    }
    if (filters.mdId?.trim()) {
      where.push("doc_user_md_id = ?");
      params.push(filters.mdId.trim());
    }
    if (filters.mobile?.trim()) {
      where.push("doc_user_mobileno = ?");
      params.push(filters.mobile.trim());
    }

    const limit = this.parseLimit(filters.limit, 50);
    const offset = this.parseOffset(filters.offset);

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await this.dataSource.query(
      `
      SELECT
        doc_user_id,
        doc_user_device_id,
        doc_user_mobileno,
        doc_user_name,
        doc_user_added_datetime,
        doc_user_reg_datetime,
        doc_user_longitude,
        doc_user_latitude,
        doc_user_status,
        doc_user_clinic,
        doc_user_md_id,
        doc_mci_reg,
        doc_profile_name,
        clinic_details
      FROM rmds_clinics
      ${whereSql}
      ORDER BY doc_user_id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    return rows;
  }

  async getClinicById(docUserId: string) {
    const rows = await this.dataSource.query(
      `
      SELECT *
      FROM rmds_clinics
      WHERE doc_user_id = ?
      `,
      [docUserId],
    );
    return rows[0] ?? null;
  }

  async getClinicProfiles() {
    return this.dataSource.query(
      `
      SELECT
        id,
        profile_name,
        future_booking_days,
        video_config_json,
        rx_template
      FROM rmds_clinic_profile
      ORDER BY profile_name ASC
      `,
    );
  }

  async getRegisterRequests(status?: string) {
    const where = status?.trim() ? "WHERE status = ?" : "";
    const params = status?.trim() ? [status.trim()] : [];
    return this.dataSource.query(
      `
      SELECT
        md_id,
        md_name,
        md_mobile,
        request_date,
        last_accessed_date,
        last_accessed_device,
        last_accessed_ip,
        last_accessed_city,
        status
      FROM rmds_register_requests
      ${where}
      ORDER BY request_date DESC
      `,
      params,
    );
  }

  async getSupportRequests(filters: { status?: string; severity?: string }) {
    const params: QueryValue[] = [];
    const where: string[] = [];

    if (filters.status?.trim()) {
      where.push("sr_status = ?");
      params.push(filters.status.trim());
    }
    if (filters.severity?.trim()) {
      where.push("sr_sev = ?");
      params.push(filters.severity.trim());
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    return this.dataSource.query(
      `
      SELECT
        sr_id,
        sr_md_id,
        sr_datetime,
        sr_sev,
        sr_text,
        sr_status
      FROM rmds_support_request
      ${whereSql}
      ORDER BY sr_id DESC
      `,
      params,
    );
  }

  async getDashboardMetrics(section?: string) {
    const selectedSection = section?.trim() || "operations_pulse";

    try {
      return await this.dataSource.query(
        `
        SELECT
          metric_key,
          label,
          description,
          section,
          display_order,
          is_active
        FROM rmds_dashboard_metric_config
        WHERE section = ? AND is_active = 1
        ORDER BY display_order ASC, metric_key ASC
        `,
        [selectedSection],
      );
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      const isMissingTable =
        dbError.code === "ER_NO_SUCH_TABLE" ||
        dbError.message?.toLowerCase().includes("doesn't exist");

      if (!isMissingTable) {
        throw error;
      }

      // Backward-compatible fallback for environments where config table is not created yet.
      if (selectedSection === "operations_pulse") {
        return [
          {
            metric_key: "open_support",
            label: "Open support tickets",
            description: "Current open support requests",
            section: "operations_pulse",
            display_order: 1,
            is_active: 1,
          },
          {
            metric_key: "critical_support",
            label: "Critical support",
            description: "High or critical unresolved tickets",
            section: "operations_pulse",
            display_order: 2,
            is_active: 1,
          },
          {
            metric_key: "pending_onboarding",
            label: "Pending onboarding",
            description: "Doctors waiting for onboarding completion",
            section: "operations_pulse",
            display_order: 3,
            is_active: 1,
          },
          {
            metric_key: "due_today_followups",
            label: "Followups due today",
            description: "Followup tasks scheduled for today",
            section: "operations_pulse",
            display_order: 4,
            is_active: 1,
          },
          {
            metric_key: "new_register_requests",
            label: "New register requests",
            description: "Requests created in selected time window",
            section: "operations_pulse",
            display_order: 5,
            is_active: 1,
          },
        ];
      }

      return [];
    }
  }

  async getOnboarding(status?: string) {
    const where = status?.trim() ? "WHERE md_status = ?" : "";
    const params = status?.trim() ? [status.trim()] : [];
    return this.dataSource.query(
      `
      SELECT
        md_id,
        md_name,
        md_type,
        added_date,
        md_status,
        last_updated,
        notes_json
      FROM rmds_onboarding
      ${where}
      ORDER BY last_updated DESC
      `,
      params,
    );
  }

  async getRxTemplate(mdId: string) {
    const rows = await this.dataSource.query(
      `
      SELECT
        rxt_md_id,
        rxt_speciality,
        rxt_template_json
      FROM rmds_rx_template
      WHERE rxt_md_id = ?
      `,
      [mdId],
    );
    return rows[0] ?? null;
  }

  async getRxTemplates() {
    return this.dataSource.query(
      `
      SELECT
        rxt_md_id,
        rxt_speciality,
        rxt_template_json
      FROM rmds_rx_template
      ORDER BY rxt_md_id ASC
      `,
    );
  }

  async getFollowUps(filters: {
    mdId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const params: QueryValue[] = [];
    const where: string[] = [];

    if (filters.mdId?.trim()) {
      where.push("md_id = ?");
      params.push(filters.mdId.trim());
    }
    if (filters.status?.trim()) {
      where.push("status = ?");
      params.push(filters.status.trim());
    }
    if (filters.dateFrom?.trim()) {
      where.push("date_time >= ?");
      params.push(filters.dateFrom.trim());
    }
    if (filters.dateTo?.trim()) {
      where.push("date_time <= ?");
      params.push(filters.dateTo.trim());
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    return this.dataSource.query(
      `
      SELECT
        obf_id,
        md_id,
        date_time,
        note,
        status
      FROM rmds_ob_followup
      ${whereSql}
      ORDER BY obf_id DESC
      `,
      params,
    );
  }

  async getDoctorUsers(status?: string) {
    const where = status?.trim() ? "WHERE doc_user_status = ?" : "";
    const params = status?.trim() ? [status.trim()] : [];
    return this.dataSource.query(
      `
      SELECT
        doc_user_id,
        doc_user_device_id,
        doc_user_mobileno,
        doc_user_name,
        doc_user_added_datetime,
        doc_user_reg_datetime,
        doc_user_longitude,
        doc_user_latitude,
        doc_user_status,
        doc_user_clinic,
        doc_user_md_id,
        doc_video_config_name
      FROM doc_user_data
      ${where}
      ORDER BY doc_user_id DESC
      `,
      params,
    );
  }

  async createClinic(payload: {
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
    const toNullable = (value?: string) => {
      const normalized = value?.trim();
      return normalized ? normalized : null;
    };
    const toRequiredDeviceId = (value?: string) => {
      const normalized = value?.trim();
      if (normalized) {
        return normalized;
      }
      const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      return `WEB-${Date.now()}-${randomSuffix}`;
    };

    const mobile = payload.doc_user_mobileno?.trim() ?? "";
    const name = payload.doc_user_name?.trim() ?? "";
    const status = payload.doc_user_status?.trim() ?? "Pending";
    const deviceId = toRequiredDeviceId(payload.doc_user_device_id);
    const mdId = toNullable(payload.doc_user_md_id);
    const profileName = toNullable(payload.doc_profile_name);
    const clinic = toNullable(payload.doc_user_clinic);
    const mciReg = toNullable(payload.doc_mci_reg);

    let result: { insertId?: number } | null = null;
    try {
      result = await this.dataSource.query(
        `
        INSERT INTO rmds_clinics (
          doc_user_device_id,
          doc_user_mobileno,
          doc_user_name,
          doc_user_added_datetime,
          doc_user_reg_datetime,
          doc_user_longitude,
          doc_user_latitude,
          doc_user_status,
          doc_user_clinic,
          doc_user_md_id,
          doc_profile_name,
          doc_mci_reg,
          clinic_details
        )
        VALUES (?, ?, ?, COALESCE(?, NOW()), COALESCE(?, NOW()), ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          deviceId,
          mobile,
          name,
          toNullable(payload.doc_user_added_datetime),
          toNullable(payload.doc_user_reg_datetime),
          toNullable(payload.doc_user_longitude),
          toNullable(payload.doc_user_latitude),
          status,
          clinic,
          mdId,
          profileName,
          mciReg,
          toNullable(payload.clinic_details),
        ],
      );
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      const isUnknownColumn =
        dbError.code === "ER_BAD_FIELD_ERROR" ||
        dbError.message?.toLowerCase().includes("unknown column");

      if (!isUnknownColumn) {
        throw error;
      }

      // Fallback for older schemas that don't have recently added optional columns.
      result = await this.dataSource.query(
        `
        INSERT INTO rmds_clinics (
          doc_user_name,
          doc_user_mobileno,
          doc_user_status,
          doc_user_md_id,
          doc_profile_name,
          doc_user_clinic,
          doc_mci_reg,
          doc_user_added_datetime,
          doc_user_reg_datetime
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [name, mobile, status, mdId, profileName, clinic, mciReg],
      );
    }
    return {
      success: true,
      insertId: result?.insertId ?? null,
    };
  }

  async updateClinic(
    docUserId: string,
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
    const toRequiredDeviceId = (value?: string) => {
      const normalized = value?.trim();
      if (normalized) {
        return normalized;
      }
      const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      return `WEB-${Date.now()}-${randomSuffix}`;
    };

    const result = await this.dataSource.query(
      `
      UPDATE rmds_clinics
      SET
        doc_user_device_id = ?,
        doc_user_mobileno = ?,
        doc_user_name = ?,
        doc_user_added_datetime = COALESCE(?, doc_user_added_datetime),
        doc_user_reg_datetime = COALESCE(?, doc_user_reg_datetime),
        doc_user_longitude = ?,
        doc_user_latitude = ?,
        doc_user_status = ?,
        doc_user_clinic = ?,
        doc_user_md_id = ?,
        doc_profile_name = ?,
        doc_mci_reg = ?,
        clinic_details = ?
      WHERE doc_user_id = ?
      `,
      [
        toRequiredDeviceId(payload.doc_user_device_id),
        payload.doc_user_mobileno?.trim() ?? "",
        payload.doc_user_name?.trim() ?? "",
        payload.doc_user_added_datetime?.trim() ?? null,
        payload.doc_user_reg_datetime?.trim() ?? null,
        payload.doc_user_longitude?.trim() ?? null,
        payload.doc_user_latitude?.trim() ?? null,
        payload.doc_user_status?.trim() ?? "Pending",
        payload.doc_user_clinic?.trim() ?? null,
        payload.doc_user_md_id?.trim() ?? null,
        payload.doc_profile_name?.trim() ?? null,
        payload.doc_mci_reg?.trim() ?? null,
        payload.clinic_details?.trim() ?? null,
        docUserId,
      ],
    );
    return {
      success: true,
      affectedRows: result?.affectedRows ?? 0,
    };
  }

  async deleteClinic(docUserId: string) {
    const result = await this.dataSource.query(
      `
      DELETE FROM rmds_clinics
      WHERE doc_user_id = ?
      `,
      [docUserId],
    );
    return {
      success: true,
      affectedRows: result?.affectedRows ?? 0,
    };
  }

  async createSupportRequest(payload: {
    sr_md_id: string;
    sr_sev: string;
    sr_text: string;
    sr_status: string;
  }) {
    const result = await this.dataSource.query(
      `
      INSERT INTO rmds_support_request (
        sr_md_id,
        sr_datetime,
        sr_sev,
        sr_text,
        sr_status
      )
      VALUES (?, NOW(), ?, ?, ?)
      `,
      [
        payload.sr_md_id?.trim() ?? "",
        payload.sr_sev?.trim() ?? "Minor",
        payload.sr_text?.trim() ?? "",
        payload.sr_status?.trim() ?? "Open",
      ],
    );
    return {
      success: true,
      insertId: result?.insertId ?? null,
    };
  }

  async updateSupportRequest(
    srId: string,
    payload: {
      sr_md_id: string;
      sr_sev: string;
      sr_text: string;
      sr_status: string;
    },
  ) {
    const result = await this.dataSource.query(
      `
      UPDATE rmds_support_request
      SET
        sr_md_id = ?,
        sr_sev = ?,
        sr_text = ?,
        sr_status = ?
      WHERE sr_id = ?
      `,
      [
        payload.sr_md_id?.trim() ?? "",
        payload.sr_sev?.trim() ?? "Minor",
        payload.sr_text?.trim() ?? "",
        payload.sr_status?.trim() ?? "Open",
        srId,
      ],
    );
    return {
      success: true,
      affectedRows: result?.affectedRows ?? 0,
    };
  }

  async deleteSupportRequest(srId: string) {
    const result = await this.dataSource.query(
      `
      DELETE FROM rmds_support_request
      WHERE sr_id = ?
      `,
      [srId],
    );
    return {
      success: true,
      affectedRows: result?.affectedRows ?? 0,
    };
  }

  async createOnboarding(payload: {
    md_id: string;
    md_name: string;
    md_type: string;
    md_status: string;
    notes_json?: string;
  }) {
    await this.dataSource.query(
      `
      INSERT INTO rmds_onboarding (
        md_id,
        md_name,
        md_type,
        added_date,
        md_status,
        last_updated,
        notes_json
      )
      VALUES (?, ?, ?, CURDATE(), ?, NOW(), ?)
      `,
      [
        payload.md_id?.trim() ?? "",
        payload.md_name?.trim() ?? "",
        payload.md_type?.trim() ?? "",
        payload.md_status?.trim() ?? "",
        payload.notes_json?.trim() ?? null,
      ],
    );
    return { success: true };
  }

  async updateOnboarding(
    mdId: string,
    payload: {
      md_name: string;
      md_type: string;
      md_status: string;
      notes_json?: string;
    },
  ) {
    const result = await this.dataSource.query(
      `
      UPDATE rmds_onboarding
      SET
        md_name = ?,
        md_type = ?,
        md_status = ?,
        notes_json = ?,
        last_updated = NOW()
      WHERE md_id = ?
      `,
      [
        payload.md_name?.trim() ?? "",
        payload.md_type?.trim() ?? "",
        payload.md_status?.trim() ?? "",
        payload.notes_json?.trim() ?? null,
        mdId,
      ],
    );
    return {
      success: true,
      affectedRows: result?.affectedRows ?? 0,
    };
  }

  async deleteOnboarding(mdId: string) {
    const result = await this.dataSource.query(
      `
      DELETE FROM rmds_onboarding
      WHERE md_id = ?
      `,
      [mdId],
    );
    return {
      success: true,
      affectedRows: result?.affectedRows ?? 0,
    };
  }

  async upsertRxTemplate(payload: {
    rxt_md_id: string;
    rxt_speciality: string;
    rxt_template_json: string;
  }) {
    await this.dataSource.query(
      `
      INSERT INTO rmds_rx_template (
        rxt_md_id,
        rxt_speciality,
        rxt_template_json
      )
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rxt_speciality = VALUES(rxt_speciality),
        rxt_template_json = VALUES(rxt_template_json)
      `,
      [
        payload.rxt_md_id?.trim() ?? "",
        payload.rxt_speciality?.trim() ?? "",
        payload.rxt_template_json?.trim() ?? "",
      ],
    );
    return { success: true };
  }

  async deleteRxTemplate(mdId: string) {
    const result = await this.dataSource.query(
      `
      DELETE FROM rmds_rx_template
      WHERE rxt_md_id = ?
      `,
      [mdId],
    );
    return {
      success: true,
      affectedRows: result?.affectedRows ?? 0,
    };
  }
}
