import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { DoctorService } from "./doctor.service";

@Controller("doctor")
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get("clinics")
  async getClinics(
    @Query("status") status?: string,
    @Query("mdId") mdId?: string,
    @Query("mobile") mobile?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.doctorService.getClinics({ status, mdId, mobile, limit, offset });
  }

  @Get("clinics/:id")
  async getClinicById(@Param("id") id: string) {
    return this.doctorService.getClinicById(id);
  }

  @Post("clinics")
  async createClinic(
    @Body()
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
    return this.doctorService.createClinic(payload);
  }

  @Put("clinics/:id")
  async updateClinic(
    @Param("id") id: string,
    @Body()
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
    return this.doctorService.updateClinic(id, payload);
  }

  @Delete("clinics/:id")
  async deleteClinic(@Param("id") id: string) {
    return this.doctorService.deleteClinic(id);
  }

  @Get("clinic-profiles")
  async getClinicProfiles() {
    return this.doctorService.getClinicProfiles();
  }

  @Get("register-requests")
  async getRegisterRequests(@Query("status") status?: string) {
    return this.doctorService.getRegisterRequests(status);
  }

  @Get("support-requests")
  async getSupportRequests(
    @Query("status") status?: string,
    @Query("severity") severity?: string,
  ) {
    return this.doctorService.getSupportRequests({ status, severity });
  }

  @Get("dashboard-metrics")
  async getDashboardMetrics(@Query("section") section?: string) {
    return this.doctorService.getDashboardMetrics(section);
  }

  @Post("support-requests")
  async createSupportRequest(
    @Body()
    payload: {
      sr_md_id: string;
      sr_sev: string;
      sr_text: string;
      sr_status: string;
    },
  ) {
    return this.doctorService.createSupportRequest(payload);
  }

  @Put("support-requests/:id")
  async updateSupportRequest(
    @Param("id") id: string,
    @Body()
    payload: {
      sr_md_id: string;
      sr_sev: string;
      sr_text: string;
      sr_status: string;
    },
  ) {
    return this.doctorService.updateSupportRequest(id, payload);
  }

  @Delete("support-requests/:id")
  async deleteSupportRequest(@Param("id") id: string) {
    return this.doctorService.deleteSupportRequest(id);
  }

  @Get("onboarding")
  async getOnboarding(@Query("status") status?: string) {
    return this.doctorService.getOnboarding(status);
  }

  @Post("onboarding")
  async createOnboarding(
    @Body()
    payload: {
      md_id: string;
      md_name: string;
      md_type: string;
      md_status: string;
      notes_json?: string;
    },
  ) {
    return this.doctorService.createOnboarding(payload);
  }

  @Put("onboarding/:mdId")
  async updateOnboarding(
    @Param("mdId") mdId: string,
    @Body()
    payload: {
      md_name: string;
      md_type: string;
      md_status: string;
      notes_json?: string;
    },
  ) {
    return this.doctorService.updateOnboarding(mdId, payload);
  }

  @Delete("onboarding/:mdId")
  async deleteOnboarding(@Param("mdId") mdId: string) {
    return this.doctorService.deleteOnboarding(mdId);
  }

  @Get("rx-template/:mdId")
  async getRxTemplate(@Param("mdId") mdId: string) {
    return this.doctorService.getRxTemplate(mdId);
  }

  @Get("rx-templates")
  async getRxTemplates() {
    return this.doctorService.getRxTemplates();
  }

  @Post("rx-template")
  async upsertRxTemplate(
    @Body()
    payload: {
      rxt_md_id: string;
      rxt_speciality: string;
      rxt_template_json: string;
    },
  ) {
    return this.doctorService.upsertRxTemplate(payload);
  }

  @Delete("rx-template/:mdId")
  async deleteRxTemplate(@Param("mdId") mdId: string) {
    return this.doctorService.deleteRxTemplate(mdId);
  }

  @Get("followups")
  async getFollowUps(
    @Query("mdId") mdId?: string,
    @Query("status") status?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.doctorService.getFollowUps({ mdId, status, dateFrom, dateTo });
  }

  @Get("users")
  async getDoctorUsers(@Query("status") status?: string) {
    return this.doctorService.getDoctorUsers(status);
  }
}
