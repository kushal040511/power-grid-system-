CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE role_enum AS ENUM ('super_admin', 'admin', 'regional_manager', 'analyst', 'engineer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level_enum AS ENUM ('green', 'yellow', 'red');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  geojson_boundary JSONB,
  theft_score NUMERIC(5,2) DEFAULT 0,
  loss_percent NUMERIC(5,2) DEFAULT 0,
  transformer_risk NUMERIC(5,2) DEFAULT 0,
  carbon_score NUMERIC(5,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role role_enum NOT NULL DEFAULT 'analyst',
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transformers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  capacity NUMERIC(10,2),
  temperature NUMERIC(6,2),
  load_percent NUMERIC(6,2),
  health_index NUMERIC(5,2),
  risk_level risk_level_enum DEFAULT 'green'
);

CREATE TABLE IF NOT EXISTS smart_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  transformer_id UUID REFERENCES transformers(id) ON DELETE SET NULL,
  location_lat NUMERIC(10,6),
  location_lng NUMERIC(10,6),
  status TEXT DEFAULT 'active',
  installed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID REFERENCES smart_meters(id) ON DELETE CASCADE,
  voltage NUMERIC(10,3),
  current NUMERIC(10,3),
  power NUMERIC(10,3),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomaly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID REFERENCES smart_meters(id) ON DELETE CASCADE,
  anomaly_score NUMERIC(6,3),
  theft_probability NUMERIC(5,2),
  classification risk_level_enum,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  severity severity_enum NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executive_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  summary_text TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_region ON users(region_id);
CREATE INDEX IF NOT EXISTS idx_regions_updated ON regions(last_updated);
CREATE INDEX IF NOT EXISTS idx_transformers_region ON transformers(region_id);
CREATE INDEX IF NOT EXISTS idx_meters_region ON smart_meters(region_id);
CREATE INDEX IF NOT EXISTS idx_readings_meter_time ON readings(meter_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_meter_time ON anomaly_reports(meter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_region_time ON alerts(region_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
