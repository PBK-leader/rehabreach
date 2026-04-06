-- RehabReach Database Schema
-- Run this in the Supabase SQL editor to create all tables.

create extension if not exists "uuid-ossp";

-- Users (nurses, doctors, family)
create table if not exists users (
  id     uuid primary key default uuid_generate_v4(),
  email  text unique not null,
  role   text check (role in ('nurse', 'doctor', 'family')) not null
);

-- Patients
create table if not exists patients (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null,
  phone                text not null,
  date_of_birth        date,
  discharge_date       date,
  cardiac_condition    text check (cardiac_condition in ('cabg', 'mi', 'stent', 'valve', 'heart_failure')),
  language             text default 'en' check (language in ('en', 'hi')),
  nurse_id             uuid references users(id),
  family_email         text,
  family_phone         text,
  heart_rate_threshold int default 100,
  call_start_hour      int default 8 check (call_start_hour between 7 and 12),
  timezone             text default 'UTC',
  created_at           timestamptz default now()
);

-- Recovery plans
create table if not exists recovery_plans (
  id          uuid primary key default uuid_generate_v4(),
  patient_id  uuid references patients(id) on delete cascade,
  created_at  timestamptz default now(),
  notes       text,
  phase       int check (phase in (3, 4))
);

-- Tasks
create table if not exists tasks (
  id               uuid primary key default uuid_generate_v4(),
  plan_id          uuid references recovery_plans(id) on delete cascade,
  task_name        text not null,
  task_type        text check (task_type in ('medication', 'exercise', 'symptom_check', 'diet', 'vitals')),
  frequency        text check (frequency in ('daily', 'twice_daily', 'as_needed')),
  is_alert_trigger boolean default false,
  threshold_value  text,
  call_slot        text check (call_slot in ('morning', 'medication', 'exercise', 'evening'))
);

-- Call logs
create table if not exists call_logs (
  id                  uuid primary key default uuid_generate_v4(),
  patient_id          uuid references patients(id) on delete cascade,
  call_type           text check (call_type in ('morning', 'medication', 'exercise', 'evening')),
  call_slot_scheduled timestamptz,
  called_at           timestamptz,
  status              text check (status in ('initiated', 'completed', 'no_answer', 'missed', 'alert_fired')),
  language            text check (language in ('en', 'hi')),
  transcript          text,
  parsed_results      jsonb,
  severity_flag       text default 'normal' check (severity_flag in ('normal', 'watch', 'urgent')),
  retry_of            uuid references call_logs(id)
);

-- Indexes for dashboard queries
create index if not exists idx_call_logs_patient_id on call_logs(patient_id);
create index if not exists idx_call_logs_called_at on call_logs(called_at desc);
create index if not exists idx_call_logs_status on call_logs(status);
create index if not exists idx_tasks_plan_slot on tasks(plan_id, call_slot);
