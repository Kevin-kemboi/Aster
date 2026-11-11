-- AsterPath PostgreSQL foundation schema (draft; not connected in this demo)
-- Production migrations must be reviewed and applied in a managed PostgreSQL environment.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator','counsellor','manager')),
  mfa_enrolled_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE counsellor_profiles (
  staff_user_id UUID PRIMARY KEY REFERENCES staff_users(id),
  destination_skills TEXT[] NOT NULL DEFAULT '{}',
  active_load_cap INTEGER NOT NULL DEFAULT 20 CHECK (active_load_cap > 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  assignment_weight INTEGER NOT NULL DEFAULT 1 CHECK (assignment_weight > 0)
);

CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('Spain','Ireland','United Kingdom','Germany','Hungary','Netherlands')),
  city TEXT,
  campuses JSONB NOT NULL DEFAULT '[]',
  recognition_status TEXT NOT NULL DEFAULT 'unverified',
  record_status TEXT NOT NULL DEFAULT 'draft',
  source_id UUID,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  authority_type TEXT NOT NULL,
  domain TEXT NOT NULL,
  permitted_paths TEXT[] NOT NULL DEFAULT '{}',
  licence_status TEXT NOT NULL DEFAULT 'pending',
  terms_review_status TEXT NOT NULL DEFAULT 'pending',
  owner_staff_id UUID REFERENCES staff_users(id),
  refresh_frequency TEXT,
  source_status TEXT NOT NULL DEFAULT 'blocked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE institutions ADD CONSTRAINT institutions_source_fk
  FOREIGN KEY (source_id) REFERENCES data_sources(id);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  provider_course_id TEXT,
  course_name TEXT NOT NULL,
  award TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  study_level TEXT NOT NULL CHECK (study_level IN ('foundation','bachelors','masters','phd')),
  duration_months INTEGER,
  campus TEXT,
  delivery_mode TEXT,
  course_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE course_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  campus TEXT,
  start_date DATE,
  application_deadline DATE,
  international_status TEXT NOT NULL DEFAULT 'unknown',
  close_semantics TEXT,
  intake_status TEXT NOT NULL DEFAULT 'unverified',
  source_id UUID REFERENCES data_sources(id),
  last_verified_at TIMESTAMPTZ
);

CREATE TABLE tuition_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_intake_id UUID NOT NULL REFERENCES course_intakes(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  fee_period TEXT NOT NULL CHECK (fee_period IN ('annual','total','semester')),
  audience TEXT NOT NULL DEFAULT 'international',
  academic_year TEXT NOT NULL,
  mandatory_fees JSONB NOT NULL DEFAULT '[]',
  effective_from DATE,
  effective_to DATE,
  source_id UUID NOT NULL REFERENCES data_sources(id),
  last_verified_at TIMESTAMPTZ NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE admission_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_intake_id UUID NOT NULL REFERENCES course_intakes(id),
  requirement_type TEXT NOT NULL,
  requirement_value JSONB NOT NULL,
  qualification_system TEXT,
  effective_from DATE,
  effective_to DATE,
  source_id UUID NOT NULL REFERENCES data_sources(id),
  last_verified_at TIMESTAMPTZ NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency CHAR(3) NOT NULL,
  quote_currency CHAR(3) NOT NULL,
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  effective_at TIMESTAMPTZ NOT NULL,
  source_id UUID REFERENCES data_sources(id),
  approval_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  profile_original JSONB NOT NULL,
  profile_normalized JSONB NOT NULL,
  matcher_version TEXT NOT NULL,
  data_snapshot_version TEXT NOT NULL,
  funding_route TEXT NOT NULL,
  scholarship_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  financially_ready BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id UUID REFERENCES match_requests(id),
  reference_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  residence_country TEXT NOT NULL,
  preferred_channel TEXT NOT NULL,
  funding_route TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('New','Contacted','Qualified','Not financially ready','Scholarship seeker','Application started','Converted','Closed')),
  assigned_counsellor_id UUID REFERENCES staff_users(id),
  close_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  author_staff_id UUID NOT NULL REFERENCES staff_users(id),
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  consent_type TEXT NOT NULL CHECK (consent_type IN ('service_contact','marketing')),
  accepted BOOLEAN NOT NULL,
  notice_version TEXT NOT NULL,
  channel TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  actor_staff_id UUID REFERENCES staff_users(id),
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_staff_id UUID REFERENCES staff_users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX leads_status_created_idx ON leads(lifecycle_status, created_at DESC);
CREATE INDEX leads_assignee_created_idx ON leads(assigned_counsellor_id, created_at DESC);
CREATE INDEX courses_level_subject_idx ON courses(study_level, subject_code);
CREATE INDEX fees_course_verified_idx ON tuition_fees(course_intake_id, last_verified_at DESC);
