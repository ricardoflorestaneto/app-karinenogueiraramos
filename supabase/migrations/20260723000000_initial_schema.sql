-- Migration for Consultório Dra. Karine Nogueira Ramos
-- Schema creation for Patients, Appointments, Clinical Records, and Doctor Profile

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    rg TEXT,
    birth_date TEXT,
    age INTEGER,
    social_name TEXT,
    gender TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT,
    instagram TEXT,
    facebook TEXT,
    address TEXT,
    cep TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    registration_date TEXT,
    marital_status TEXT,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    last_visit TEXT,
    avatar_url TEXT,
    initials TEXT,
    allergies JSONB DEFAULT '[]'::jsonb,
    medical_history JSONB DEFAULT '[]'::jsonb,
    convenio_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 45,
    procedure TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmado',
    notes TEXT,
    value NUMERIC(10, 2) DEFAULT 0.00,
    convenio_id INTEGER,
    convenio_name TEXT,
    paciente_nao_cadastrado BOOLEAN DEFAULT false,
    nome_paciente_nao_cadastrado TEXT,
    telefone_paciente_nao_cadastrado TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clinical Records Table
CREATE TABLE IF NOT EXISTS public.clinical_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    dentist_name TEXT NOT NULL,
    procedure_done TEXT NOT NULL,
    tooth_number INTEGER,
    clinical_notes TEXT NOT NULL,
    prescriptions JSONB DEFAULT '[]'::jsonb,
    cost NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Doctor Profile Table
CREATE TABLE IF NOT EXISTS public.doctor_profile (
    id TEXT PRIMARY KEY DEFAULT 'main_doctor',
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    cro TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    clinic_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profile ENABLE ROW LEVEL SECURITY;

-- Create public access policies for anon/authenticated roles (or customize based on requirements)
CREATE POLICY "Allow public read and write on patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on clinical_records" ON public.clinical_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on doctor_profile" ON public.doctor_profile FOR ALL USING (true) WITH CHECK (true);

-- Insert initial doctor profile
INSERT INTO public.doctor_profile (id, name, role, cro, email, phone, clinic_name, avatar_url)
VALUES (
    'main_doctor',
    'Dra. Karine Nogueira Ramos',
    'Cirurgiã-Dentista • Especialista em Ortodontia & Estética',
    'CRO-SP 148.921',
    'contato@drakarineramos.com.br',
    '(11) 98888-7777',
    'Consultório Odontológico Dra. Karine Ramos',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300'
) ON CONFLICT (id) DO NOTHING;
