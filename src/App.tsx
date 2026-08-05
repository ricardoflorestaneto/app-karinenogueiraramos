import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Patient,
  Appointment,
  ClinicalRecordEntry,
  DoctorProfile,
} from './types';
import {
  initialPatients,
  initialAppointments,
  initialClinicalRecords,
  initialDoctorProfile,
  DEFAULT_DOCTOR_PHOTO_URL,
} from './mockData';

import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PatientsView } from './components/PatientsView';
import { PatientFormView } from './components/PatientFormView';
import { ProntuarioView } from './components/ProntuarioView';
import { AppointmentsView } from './components/AppointmentsView';
import { SettingsView } from './components/SettingsView';
import { ConveniosView } from './components/ConveniosView';
import { ProcedimentosView } from './components/ProcedimentosView';
import { SupabaseErrorModal } from './components/SupabaseErrorModal';

import {
  getSupabase, getIsSupabaseConfigured, fetchSupabaseData, mapPatientToDb, mapAppointmentToDb, mapClinicalRecordToDb, notifySupabaseDatabaseError, } from './lib/supabase';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('dra_karine_auth');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('patients');
  const [previousTab, setPreviousTab] = useState<ActiveTab>('patients');
  const [searchQuery, setSearchQuery] = useState('');

  // Doctor state
  const [doctor, setDoctor] = useState<DoctorProfile>(() => {
    const saved = localStorage.getItem('dra_karine_doctor');
    return saved ? JSON.parse(saved) : initialDoctorProfile;
  });

  // Patients state
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('dra_karine_patients');
    return saved ? JSON.parse(saved) : initialPatients;
  });

  // Selected patient for edit/prontuario
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newAppointmentPatient, setNewAppointmentPatient] = useState<Patient | null>(null);

  // Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('dra_karine_appointments');
    return saved ? JSON.parse(saved) : initialAppointments;
  });

  // Clinical records state
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecordEntry[]>(() => {
    const saved = localStorage.getItem('dra_karine_records');
    return saved ? JSON.parse(saved) : initialClinicalRecords;
  });

  // Initial load from Supabase if configured
  useEffect(() => {
    if (getIsSupabaseConfigured() && getSupabase()) {
      fetchSupabaseData().then((data) => {
        if (data) {
          if (data.patients !== null) setPatients(data.patients);
          if (data.appointments !== null) setAppointments(data.appointments);
          if (data.records !== null) setClinicalRecords(data.records);
          if (data.doctor) setDoctor(data.doctor);
        }
      });
    }
  }, []);

  // Persist state updates to localStorage
  useEffect(() => {
    localStorage.setItem('dra_karine_auth', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('dra_karine_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('dra_karine_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('dra_karine_records', JSON.stringify(clinicalRecords));
  }, [clinicalRecords]);

  useEffect(() => {
    localStorage.setItem('dra_karine_doctor', JSON.stringify(doctor));
  }, [doctor]);

  // Handlers
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setActiveTab('patients');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setActiveTab('new-patient');
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setActiveTab('edit-patient');
  };

  const handleViewProntuario = (patient: Patient) => {
    setSelectedPatient(patient);
    setPreviousTab(activeTab);
    setActiveTab('prontuario');
  };

  const handleNewAppointmentFromPatient = (patient: Patient) => {
    setNewAppointmentPatient(patient);
    setPreviousTab(activeTab);
    setActiveTab('appointments');
  };

  const handleSavePatient = async (patientData: Omit<Patient, 'id'> & { id?: string }) => {
    let savedPatient: Patient;
    if (patientData.id) {
      savedPatient = { ...patientData, id: patientData.id } as Patient;
    } else {
      const newId = crypto.randomUUID();
      savedPatient = { ...patientData, id: newId } as Patient;
    }

    if (getIsSupabaseConfigured() && getSupabase()) {
      const opName = patientData.id ? 'Alteração de Paciente' : 'Inclusão de Paciente';
      const { error } = await getSupabase().from('patients').upsert(mapPatientToDb(savedPatient));
      if (error) {
        notifySupabaseDatabaseError(opName, error);
        return; // Interrupt operation on DB error
      }
    }

    if (patientData.id) {
      setPatients((prev) =>
        prev.map((p) => (p.id === patientData.id ? savedPatient : p))
      );
    } else {
      setPatients((prev) => [savedPatient, ...prev]);
    }

    setActiveTab('patients');
  };

  const handleDeletePatient = async (id: string) => {
    if (getIsSupabaseConfigured() && getSupabase()) {
      const { error } = await getSupabase().from('patients').delete().eq('id', id);
      if (error) {
        notifySupabaseDatabaseError('Exclusão de Paciente', error);
        return; // Interrupt operation on DB error
      }
    }

    setPatients((prev) => prev.filter((p) => p.id !== id));
    setAppointments((prev) => prev.filter((a) => a.patientId !== id));

    if (selectedPatient?.id === id) {
      setSelectedPatient(null);
      setActiveTab('patients');
    }
  };

  const handleAddAppointment = async (newApp: Omit<Appointment, 'id'>) => {
    const id = crypto.randomUUID();
    const fullApp: Appointment = { ...newApp, id };

    if (getIsSupabaseConfigured() && getSupabase()) {
      const { error } = await getSupabase().from('appointments').insert(mapAppointmentToDb(fullApp));
      if (error) {
        notifySupabaseDatabaseError('Inclusão de Agendamento', error);
        return; // Interrupt operation on DB error
      }
    }

    setAppointments((prev) => [fullApp, ...prev]);
  };

  const handleUpdateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
    if (getIsSupabaseConfigured() && getSupabase()) {
      const { error } = await getSupabase().from('appointments').update({ status: newStatus }).eq('id', id);
      if (error) {
        notifySupabaseDatabaseError('Atualização de Status da Consulta', error);
        return; // Interrupt operation on DB error
      }
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const handleUpdateAppointment = async (updatedApp: Appointment) => {
    if (getIsSupabaseConfigured() && getSupabase()) {
      const { error } = await getSupabase().from('appointments').upsert(mapAppointmentToDb(updatedApp));
      if (error) {
        notifySupabaseDatabaseError('Alteração de Agendamento', error);
        return; // Interrupt operation on DB error
      }
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
    );
  };

  const handleDeleteAppointment = async (id: string) => {
    if (getIsSupabaseConfigured() && getSupabase()) {
      const { error } = await getSupabase().from('appointments').delete().eq('id', id);
      if (error) {
        notifySupabaseDatabaseError('Exclusão de Agendamento', error);
        return; // Interrupt operation on DB error
      }
    }

    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddClinicalRecord = async (newEntry: Omit<ClinicalRecordEntry, 'id'>) => {
    const id = crypto.randomUUID();
    const fullRecord: ClinicalRecordEntry = { ...newEntry, id };

    if (getIsSupabaseConfigured() && getSupabase()) {
      const { error } = await getSupabase().from('clinical_records').insert(mapClinicalRecordToDb(fullRecord));
      if (error) {
        notifySupabaseDatabaseError('Inclusão de Prontuário Clínico', error);
        return; // Interrupt operation on DB error
      }
    }

    setClinicalRecords((prev) => [fullRecord, ...prev]);
  };

  const handleSaveDoctor = async (updatedDoc: DoctorProfile) => {
    const photoUrl = (updatedDoc.profile_picture_url || updatedDoc.avatarUrl || '').trim() || DEFAULT_DOCTOR_PHOTO_URL;

    if (getIsSupabaseConfigured() && getSupabase()) {
      const { error } = await getSupabase().from('doctor_profile').upsert({
        id: 'main_doctor',
        name: updatedDoc.name,
        role: updatedDoc.role,
        cro: updatedDoc.cro,
        email: updatedDoc.email,
        phone: updatedDoc.phone,
        clinic_name: updatedDoc.clinicName,
        avatar_url: photoUrl,
        profile_picture_url: photoUrl,
        address: updatedDoc.address || '',
        cep: updatedDoc.cep || '',
        complement: updatedDoc.complement || '',
        neighborhood: updatedDoc.neighborhood || '',
        city: updatedDoc.city || '',
        state: updatedDoc.state || '',
      });
      if (error) {
        notifySupabaseDatabaseError('Alteração do Perfil Médico', error);
        return; // Interrupt operation on DB error
      }
    }

    setDoctor({
      ...updatedDoc,
      avatarUrl: photoUrl,
      profile_picture_url: photoUrl,
    });
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar
        doctor={doctor}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        patientCount={patients.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Header
          doctor={doctor}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNavigateToSettings={() => setActiveTab('settings')}
        />

        <main className="flex-1">
          {(activeTab === 'patients' || activeTab === 'dashboard') && (
            <PatientsView
              patients={patients}
              searchQuery={searchQuery}
              onNewPatient={handleNewPatient}
              onEditPatient={handleEditPatient}
              onViewProntuario={handleViewProntuario}
              onDeletePatient={handleDeletePatient}
              onNewAppointment={handleNewAppointmentFromPatient}
            />
          )}

          {activeTab === 'new-patient' && (
            <PatientFormView
              initialPatient={null}
              onSave={handleSavePatient}
              onCancel={() => setActiveTab('patients')}
            />
          )}

          {activeTab === 'edit-patient' && selectedPatient && (
            <PatientFormView
              initialPatient={selectedPatient}
              onSave={handleSavePatient}
              onCancel={() => setActiveTab('patients')}
            />
          )}

          {activeTab === 'prontuario' && selectedPatient && (
            <ProntuarioView
              patient={selectedPatient}
              clinicalRecords={clinicalRecords}
              onAddRecord={handleAddClinicalRecord}
              onBack={() => setActiveTab(previousTab || 'patients')}
              backLabel={previousTab === 'appointments' ? 'Voltar para Agenda de Consultas' : 'Voltar à Lista de Pacientes'}
              onEditPatient={handleEditPatient}
              doctor={doctor}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsView
              appointments={appointments}
              patients={patients}
              onAddAppointment={handleAddAppointment}
              onUpdateAppointment={handleUpdateAppointment}
              onDeleteAppointment={handleDeleteAppointment}
              onUpdateStatus={handleUpdateAppointmentStatus}
              initialNewAppointmentPatient={newAppointmentPatient}
              onCloseNewAppointment={(saved) => {
                if (newAppointmentPatient) {
                  setNewAppointmentPatient(null);
                  if (!saved) {
                    setActiveTab(previousTab);
                  }
                }
              }}
              onViewPatientRecord={(patientId) => {
                const target = patients.find((p) => p.id === patientId);
                if (target) {
                  setSelectedPatient(target);
                  setPreviousTab('appointments');
                  setActiveTab('prontuario');
                }
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              doctor={doctor}
              onSaveDoctor={handleSaveDoctor}
            />
          )}

          {activeTab === 'convenios' && (
            <ConveniosView />
          )}

          {activeTab === 'procedimentos' && (
            <ProcedimentosView />
          )}
        </main>

        <footer className="mt-auto py-4 px-8 text-center border-t border-[#e7eeff] text-xs text-[#707881]">
          © {new Date().getFullYear()} {doctor.clinicName || doctor.name || 'Consultório Dra. Karine Nogueira Ramos'} • Todos os direitos reservados • v2.4.0 Clinical Precision
        </footer>
      </div>

      {/* Global Supabase Error Modal */}
      <SupabaseErrorModal />
    </div>
  );
}
