CREATE DATABASE IF NOT EXISTS reachmyd_doctor;
USE reachmyd_doctor;

CREATE TABLE IF NOT EXISTS rmds_clinics (
  doc_user_id INT AUTO_INCREMENT PRIMARY KEY,
  doc_user_device_id VARCHAR(400),
  doc_user_mobileno VARCHAR(11),
  doc_user_name VARCHAR(30),
  doc_user_added_datetime DATETIME,
  doc_user_reg_datetime DATETIME,
  doc_user_longitude VARCHAR(20),
  doc_user_latitude VARCHAR(20),
  doc_user_status ENUM('Registered','Expired','Pending','Blocked','Submitted'),
  doc_user_clinic TEXT,
  doc_user_md_id VARCHAR(20),
  doc_mci_reg VARCHAR(20),
  doc_profile_name VARCHAR(100),
  clinic_details TEXT,
  INDEX idx_clinics_md_id (doc_user_md_id),
  INDEX idx_clinics_status (doc_user_status),
  INDEX idx_clinics_mobile (doc_user_mobileno)
);

CREATE TABLE IF NOT EXISTS rmds_clinic_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_name VARCHAR(100),
  future_booking_days INT,
  video_config_json TEXT,
  rx_template TEXT
);

CREATE TABLE IF NOT EXISTS rmds_register_requests (
  md_id VARCHAR(20) PRIMARY KEY,
  md_name VARCHAR(200),
  md_mobile VARCHAR(15),
  request_date DATETIME,
  last_accessed_date DATETIME,
  last_accessed_device VARCHAR(300),
  last_accessed_ip VARCHAR(20),
  last_accessed_city VARCHAR(200),
  status ENUM('Unknown','Download','Edit Details','Remove Listing','Onboarded'),
  INDEX idx_register_requests_status (status),
  INDEX idx_register_requests_mobile (md_mobile)
);

CREATE TABLE IF NOT EXISTS rmds_support_request (
  sr_id INT AUTO_INCREMENT PRIMARY KEY,
  sr_md_id VARCHAR(20),
  sr_datetime DATETIME,
  sr_sev ENUM('Minor','Major','Critical',''),
  sr_text TEXT,
  sr_status ENUM('Open','In Progress','Closed',''),
  INDEX idx_support_md_id (sr_md_id),
  INDEX idx_support_status (sr_status),
  INDEX idx_support_sev (sr_sev)
);

CREATE TABLE IF NOT EXISTS rmds_onboarding (
  md_id VARCHAR(20) PRIMARY KEY,
  md_name VARCHAR(200),
  md_type VARCHAR(20),
  added_date DATE,
  md_status VARCHAR(50),
  last_updated DATETIME,
  notes_json TEXT,
  INDEX idx_onboarding_status (md_status)
);

CREATE TABLE IF NOT EXISTS rmds_rx_template (
  rxt_md_id VARCHAR(15) PRIMARY KEY,
  rxt_speciality VARCHAR(100),
  rxt_template_json TEXT
);

CREATE TABLE IF NOT EXISTS rmds_ob_followup (
  obf_id INT AUTO_INCREMENT PRIMARY KEY,
  md_id VARCHAR(20),
  date_time DATETIME,
  note VARCHAR(200),
  status VARCHAR(20),
  INDEX idx_followup_md_id (md_id),
  INDEX idx_followup_status (status),
  INDEX idx_followup_date (date_time)
);

CREATE TABLE IF NOT EXISTS rmds_dashboard_metric_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_key VARCHAR(100) NOT NULL,
  label VARCHAR(150) NOT NULL,
  description VARCHAR(255) NULL,
  section VARCHAR(100) NOT NULL DEFAULT 'operations_pulse',
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_metric_section_key (section, metric_key),
  INDEX idx_metric_section_active (section, is_active)
);

INSERT INTO rmds_dashboard_metric_config (
  metric_key,
  label,
  description,
  section,
  display_order,
  is_active
)
VALUES
  ('open_support', 'Open support tickets', 'Current open support requests', 'operations_pulse', 1, 1),
  ('critical_support', 'Critical support', 'High or critical unresolved tickets', 'operations_pulse', 2, 1),
  ('pending_onboarding', 'Pending onboarding', 'Doctors waiting for onboarding completion', 'operations_pulse', 3, 1),
  ('due_today_followups', 'Followups due today', 'Followup tasks scheduled for today', 'operations_pulse', 4, 1),
  ('new_register_requests', 'New register requests', 'Requests created in selected time window', 'operations_pulse', 5, 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  description = VALUES(description),
  display_order = VALUES(display_order),
  is_active = VALUES(is_active);

CREATE TABLE IF NOT EXISTS doc_user_data (
  doc_user_id INT AUTO_INCREMENT PRIMARY KEY,
  doc_user_device_id VARCHAR(40),
  doc_user_mobileno VARCHAR(11),
  doc_user_name VARCHAR(30),
  doc_user_added_datetime DATETIME,
  doc_user_reg_datetime DATETIME,
  doc_user_longitude VARCHAR(20),
  doc_user_latitude VARCHAR(20),
  doc_user_status ENUM('Installed','Registered'),
  doc_user_clinic TEXT,
  doc_user_md_id VARCHAR(20),
  doc_video_config_name VARCHAR(100),
  INDEX idx_doc_users_md_id (doc_user_md_id),
  INDEX idx_doc_users_status (doc_user_status)
);
