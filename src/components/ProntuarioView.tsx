import React, { useState } from 'react';
import { Patient, ToothCondition, ClinicalRecordEntry, ToothProcedureType, DoctorProfile } from '../types';
import { generateDefaultTeeth } from '../mockData';
import { calculateDetailedAge } from '../lib/supabase';

interface ProntuarioViewProps {
  patient: Patient;
  clinicalRecords: ClinicalRecordEntry[];
  onAddRecord: (entry: Omit<ClinicalRecordEntry, 'id'>) => void;
  onBack: () => void;
  backLabel?: string;
  onEditPatient: (patient: Patient) => void;
  doctor?: DoctorProfile;
}

function formatBirthDate(dateStr?: string): string {
  if (!dateStr) return 'Não informada';
  const clean = dateStr.split('T')[0];
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}/${m}/${y}`;
    }
  }
  return clean;
}

function calculateAge(dateString?: string): number | null {
  if (!dateString) return null;
  const clean = dateString.split('T')[0];
  let birth: Date;
  if (clean.includes('-')) {
    const [y, m, d] = clean.split('-').map(Number);
    birth = new Date(y, m - 1, d);
  } else if (clean.includes('/')) {
    const [d, m, y] = clean.split('/').map(Number);
    birth = new Date(y, m - 1, d);
  } else {
    birth = new Date(clean);
  }
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export const ProntuarioView: React.FC<ProntuarioViewProps> = ({
  patient,
  clinicalRecords,
  onAddRecord,
  onBack,
  backLabel,
  onEditPatient,
  doctor,
}) => {
  const [activeTab, setActiveTab] = useState<'odontogram' | 'history' | 'prescription'>('odontogram');
  const [teeth, setTeeth] = useState<ToothCondition[]>(generateDefaultTeeth());
  const [selectedTooth, setSelectedTooth] = useState<ToothCondition | null>(null);

  // New Record Modal State
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [newProcedure, setNewProcedure] = useState('Profilaxia e Limpeza Ultrassônica');
  const [newToothNum, setNewToothNum] = useState<number | undefined>(undefined);
  const [newNotes, setNewNotes] = useState('');
  const [newCost, setNewCost] = useState(250);

  // Prescription Generator State
  const [prescriptionType, setPrescriptionType] = useState<'normal' | 'especial'>('normal');
  const [prescMedication, setPrescMedication] = useState('Amoxicilina 500mg');
  const [prescDosage, setPrescDosage] = useState('Tomar 1 comprimido de 8 em 8 horas por 7 dias.');
  const [prescNotes, setPrescNotes] = useState('Em caso de dor forte, tomar Paracetamol 750mg.');
  const [prescriptionPrinted, setPrescriptionPrinted] = useState(false);  // Centralized print handler for prescription
  const handlePrint = () => {
    setPrescriptionPrinted(true);

    const clinicName = doctor?.clinicName || 'Dra. Karine Nogueira Ramos - Odontologia Especializada';
    const doctorName = doctor?.name || 'Dra. Karine Nogueira Ramos';
    const doctorCro = doctor?.cro || 'CRO-SP 148.921';
    const doctorRole = doctor?.role || 'Cirurgiã-Dentista • Especialista em Ortodontia e Estética';
    const doctorPhone = doctor?.phone || '(11) 98888-7777';
    const doctorEmail = doctor?.email || 'karine@consultorio.com';
    const doctorAddressStr = doctor?.address
      ? `${doctor.address}${doctor.complement ? `, ${doctor.complement}` : ''}${doctor.neighborhood ? ` - ${doctor.neighborhood}` : ''}${doctor.city ? ` - ${doctor.city}/${doctor.state || 'SP'}` : ''}${doctor.cep ? ` • CEP: ${doctor.cep}` : ''}`
      : 'Av. Paulista, 1500 - São Paulo/SP';

    const doctorCity = doctor?.city || 'São Paulo';
    const doctorState = doctor?.state || 'SP';
    const dateFormatted = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const locationDateStr = `${doctorCity} - ${doctorState}, ${dateFormatted}`;

    const birthDateStr = formatBirthDate(patient.birthDate);
    const calculatedAge = patient.age || (patient.birthDate ? calculateAge(patient.birthDate) : null);
    const ageDisplayStr = calculatedAge !== null && calculatedAge !== undefined ? `${calculatedAge} anos` : 'Não informada';

    const patientAddressStr = patient.address
      ? `${patient.address}${patient.complement ? `, ${patient.complement}` : ''}${patient.neighborhood ? ` - ${patient.neighborhood}` : ''}${patient.city ? ` - ${patient.city}/${patient.state || 'SP'}` : ''}`
      : (patient.city ? `${patient.city}/${patient.state || 'SP'}` : 'Não informado');

    let printHtml = '';

    if (prescriptionType === 'especial') {
      const renderViaHtml = (mainVia: string, subVia: string) => `
  <div style="width: 48.5%; border: 2px solid #000; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: #fff; height: 100%;">
    <div style="display: flex; flex-direction: column; flex: 1; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px;">
        <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; text-align: center; flex: 1;">RECEITUÁRIO CONTROLE ESPECIAL</div>
        <div style="text-align: right; font-size: 10px; font-weight: bold; line-height: 1.2;">
          <div>${mainVia}</div>
          <div style="font-size: 8.5px; color: #555; font-weight: normal;">${subVia}</div>
        </div>
      </div>

      <div style="border: 1.5px solid #000; padding: 8px 10px; margin-bottom: 8px; font-size: 10.5px; line-height: 1.4; background: #fafafa;">
        <div style="font-weight: bold; text-align: center; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 6px; text-transform: uppercase;">IDENTIFICAÇÃO DO EMITENTE</div>
        <div style="margin-bottom: 3px;"><b>NOME COMPLETO:</b> ${doctorName}</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span><b>CRO:</b> ${doctorCro}</span>
          <span><b>UF:</b> ${doctorState}</span>
        </div>
        <div style="margin-bottom: 3px;"><b>ENDEREÇO E TEL:</b> ${doctorAddressStr} • ${doctorPhone}</div>
        <div style="display: flex; justify-content: space-between;">
          <span><b>CIDADE:</b> ${doctorCity}</span>
          <span><b>UF:</b> ${doctorState}</span>
        </div>
      </div>

      <div style="font-size: 11px; margin-bottom: 8px; line-height: 1.5;">
        <div><b>PACIENTE:</b> <span style="text-transform: uppercase; font-weight: bold;">${patient.name}</span></div>
        <div style="margin-top: 3px;"><b>ENDEREÇO:</b> ${patientAddressStr}</div>
      </div>

      <div style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 10px 6px; flex: 1; display: flex; flex-direction: column; font-size: 11px; line-height: 1.5; min-height: 180px;">
        <div style="font-weight: bold; font-size: 10.5px; text-transform: uppercase; margin-bottom: 6px; color: #000;">PRESCRIÇÃO:</div>
        <div style="font-weight: bold; font-size: 13.5px; margin-bottom: 8px; color: #000;">${prescMedication || 'Nenhum medicamento informado'}</div>
        <div style="font-size: 11.5px; white-space: pre-line; color: #111;">${prescDosage || 'Conforme orientação profissional.'}</div>
        ${prescNotes ? `<div style="margin-top: auto; font-style: italic; font-size: 10.5px; color: #333; border-top: 1px dotted #777; padding-top: 6px;">Obs: ${prescNotes}</div>` : ''}
      </div>
    </div>

    <div style="display: flex; gap: 8px; font-size: 9px; line-height: 1.4; height: 135px;">
      <div style="width: 50%; border: 1.5px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px; font-size: 9.5px; text-transform: uppercase;">IDENTIFICAÇÃO DO COMPRADOR</div>
        <div style="display: flex; flex-direction: column; justify-content: space-around; flex: 1;">
          <div>NOME: <span style="border-bottom: 1px dotted #444; display: inline-block; width: 72%;"></span></div>
          <div style="display: flex; justify-content: space-between;">
            <span>IDENT: <span style="border-bottom: 1px dotted #444; display: inline-block; width: 35px;"></span></span>
            <span>ÓRG. EMISSOR: <span style="border-bottom: 1px dotted #444; display: inline-block; width: 30px;"></span></span>
          </div>
          <div>END: <span style="border-bottom: 1px dotted #444; display: inline-block; width: 78%;"></span></div>
          <div style="display: flex; justify-content: space-between;">
            <span>CIDADE: <span style="border-bottom: 1px dotted #444; display: inline-block; width: 50px;"></span></span>
            <span>UF: <span style="border-bottom: 1px dotted #444; display: inline-block; width: 25px;"></span></span>
          </div>
          <div>TELEFONE: <span style="border-bottom: 1px dotted #444; display: inline-block; width: 68%;"></span></div>
        </div>
      </div>

      <div style="width: 50%; border: 1.5px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px; font-size: 9.5px; text-transform: uppercase;">IDENTIFICAÇÃO DO FORNECEDOR</div>
        <div style="margin-top: auto; font-size: 8.5px; font-weight: bold; border-top: 1px solid #000; padding-top: 6px;">
          ASSINATURA DO FARMACÊUTICO
          <div style="margin-top: 8px; font-size: 9px;">DATA: _____ / _____ / ________</div>
        </div>
      </div>
    </div>
  </div>`;

      printHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Receituario_Especial_${patient.name.replace(/\s+/g, '_')}</title>
  <style>
    @page { size: A4 landscape; margin: 5mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f4f6f9; font-family: system-ui, -apple-system, Arial, sans-serif; color: #000; }
    .no-print-bar { background: #006194; color: #fff; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: system-ui, -apple-system, sans-serif; }
    .bar-info { display: flex; align-items: center; gap: 12px; }
    .bar-title { font-size: 15px; font-weight: 700; letter-spacing: 0.3px; }
    .bar-sub { font-size: 12px; opacity: 0.9; }
    .btn-print { background: #00a86b; color: #ffffff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); transition: all 0.2s ease; }
    .btn-print:hover { background: #008f5a; transform: translateY(-1px); }
    .preview-canvas { padding: 20px; display: flex; justify-content: center; }
    .landscape-container { display: flex; flex-direction: row; justify-content: space-between; gap: 12px; width: 287mm; height: 195mm; background: #fff; padding: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-radius: 4px; box-sizing: border-box; }

    @media print {
      @page { size: A4 landscape; margin: 5mm; }
      .no-print-bar { display: none !important; }
      .preview-canvas { padding: 0 !important; }
      body { background: #fff !important; padding: 0 !important; margin: 0 !important; height: 198mm !important; overflow: hidden !important; }
      .landscape-container { box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; height: 195mm !important; max-height: 195mm !important; width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div class="bar-info">
      <span style="font-size: 20px;">📄</span>
      <div>
        <div class="bar-title">Pré-visualização do Receituário de Controle Especial</div>
        <div class="bar-sub">Formato A4 Paisagem — 2 Vias (1ª Via Farmácia / 2ª Via Paciente)</div>
      </div>
    </div>
    <button class="btn-print" onclick="window.print()">
      <span>🖨️</span> IMPRIMIR RECEITUÁRIO ESPECIAL (A4 PAISAGEM)
    </button>
  </div>
  <div class="preview-canvas">
    <div class="landscape-container">
      ${renderViaHtml('1ª VIA FARMÁCIA', '2ª VIA PACIENTE')}
      ${renderViaHtml('2ª VIA PACIENTE', '1ª VIA FARMÁCIA')}
    </div>
  </div>
</body>
</html>`;
    } else {
      printHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Receituario_${patient.name.replace(/\s+/g, '_')}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f4f6f9; font-family: system-ui, -apple-system, Arial, sans-serif; color: #111c2d; }
    .no-print-bar { background: #006194; color: #fff; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: system-ui, -apple-system, sans-serif; }
    .bar-info { display: flex; align-items: center; gap: 12px; }
    .bar-title { font-size: 15px; font-weight: 700; }
    .bar-sub { font-size: 12px; opacity: 0.9; }
    .btn-print { background: #00a86b; color: #ffffff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); transition: all 0.2s ease; }
    .btn-print:hover { background: #008f5a; transform: translateY(-1px); }
    .preview-canvas { padding: 20px; display: flex; justify-content: center; }
    .page-container { width: 190mm; max-width: 100%; min-height: 250mm; background: #fff; padding: 24px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); display: flex; flex-direction: column; justify-content: space-between; border-radius: 4px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #006194; padding-bottom: 10px; margin-bottom: 14px; }
    .clinic { font-size: 19px; font-weight: bold; color: #006194; text-transform: uppercase; margin-bottom: 3px; }
    .doctor { font-size: 13px; font-weight: bold; color: #111c2d; }
    .role { font-size: 11px; color: #3f4850; }
    .contact { font-size: 10.5px; color: #707881; margin-top: 3px; }
    .doc-title { font-size: 16px; font-weight: 800; color: #006194; font-style: italic; display: flex; justify-content: space-between; align-items: center; margin: 14px 0; }
    .patient-box { background: #f9f9ff; border: 1px solid #d8e3fb; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; margin-bottom: 16px; }
    .content-box { border: 2px solid rgba(0, 97, 148, 0.25); border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #fff; }
    .section-label { font-size: 10.5px; font-weight: bold; color: #006194; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
    .med-title { font-size: 15px; font-weight: bold; color: #111c2d; background: #f0f3ff; padding: 8px 12px; border-left: 4px solid #006194; border-radius: 5px; margin-bottom: 12px; }
    .posology { font-size: 13.5px; color: #3f4850; line-height: 1.5; white-space: pre-line; margin-bottom: 12px; }
    .notes-box { font-size: 11.5px; color: #006c49; background: rgba(230, 244, 234, 0.7); border: 1px solid rgba(0, 108, 73, 0.3); padding: 8px 12px; border-radius: 5px; font-style: italic; }
    .footer { text-align: center; margin-top: 20px; }
    .date-str { text-align: right; font-size: 11.5px; color: #3f4850; margin-bottom: 24px; }
    .signature-line { width: 240px; border-top: 2px solid #111c2d; margin: 0 auto 5px auto; }

    @media print {
      @page { size: A4 portrait; margin: 8mm 10mm; }
      html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
      .no-print-bar { display: none !important; }
      .preview-canvas { padding: 0 !important; display: block !important; }
      .page-container { box-shadow: none !important; width: 100% !important; min-height: auto !important; height: auto !important; padding: 0 !important; margin: 0 !important; page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div class="bar-info">
      <span style="font-size: 20px;">📄</span>
      <div>
        <div class="bar-title">Pré-visualização do Receituário Odontológico</div>
        <div class="bar-sub">Formato A4 Retrato — Via do Paciente</div>
      </div>
    </div>
    <button class="btn-print" onclick="window.print()">
      <span>🖨️</span> IMPRIMIR RECEITUÁRIO (A4)
    </button>
  </div>
  <div class="preview-canvas">
    <div class="page-container">
      <div>
        <div class="header">
          <div class="clinic">${clinicName}</div>
          <div class="doctor">${doctorName} • ${doctorCro}</div>
          <div class="role">${doctorRole}</div>
          <div class="contact">${doctorAddressStr} • Fone/WhatsApp: ${doctorPhone} • Email: ${doctorEmail}</div>
        </div>
        <div class="doc-title">
          <span>Rx / RECEITUÁRIO ODONTOLÓGICO</span>
          <span style="font-size: 12px; font-weight: normal; color: #707881; font-style: normal; border: 1px solid #d8e3fb; padding: 2px 10px; border-radius: 12px; background: #f0f3ff;">Via do Paciente</span>
        </div>
        <div class="patient-box">
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
            <div><strong style="color: #006194;">PACIENTE:</strong> <strong>${patient.name.toUpperCase()}</strong></div>
            <div><strong style="color: #006194;">DATA:</strong> <strong>${new Date().toLocaleDateString('pt-BR')}</strong></div>
          </div>
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; color: #3f4850;">
            <div><strong>CPF:</strong> ${patient.cpf || 'Não informado'}</div>
            <div><strong>DATA DE NASCIMENTO:</strong> ${birthDateStr}</div>
            <div><strong>IDADE:</strong> ${ageDisplayStr}</div>
          </div>
        </div>
        <div class="content-box">
          <span class="section-label">[1] Prescrição / Medicamento:</span>
          <div class="med-title">${prescMedication || 'Nenhum medicamento informado'}</div>
          <span class="section-label">[2] Posologia e Modo de Uso:</span>
          <div class="posology">${prescDosage || 'Conforme orientação profissional.'}</div>
          ${prescNotes ? `<span class="section-label" style="color: #006c49;">[3] Recomendações Adicionais:</span><div class="notes-box">${prescNotes}</div>` : ''}
        </div>
      </div>
      <div>
        <div class="date-str">${locationDateStr}</div>
        <div class="footer">
          <div class="signature-line"></div>
          <div style="font-weight: bold; font-size: 14px;">${doctorName}</div>
          <div style="font-size: 12px; color: #006194;">${doctorCro} • Cirurgiã-Dentista</div>
          <div style="font-size: 10px; color: #707881; margin-top: 3px;">Assinatura e Carimbo Profissional</div>
          <div style="font-size: 9px; color: #707881; margin-top: 20px; border-top: 1px solid #e7eeff; padding-top: 8px;">
            Este documento é um receituário odontológico válido em todo o território nacional • Gerado via Clinical Precision
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
    }

    try {
      const win = window.open('', '_blank', prescriptionType === 'especial' ? 'width=1100,height=750,scrollbars=yes,resizable=yes' : 'width=900,height=850,scrollbars=yes,resizable=yes');
      if (win) {
        win.document.write(printHtml);
        win.document.close();
        win.focus();
      } else {
        // Fallback if popup blocked
        window.print();
      }
    } catch (e) {
      console.error('Error opening print window:', e);
      window.print();
    }
  };

  const doctorName = doctor?.name || 'Dra. Karine Nogueira Ramos';
  const doctorCro = doctor?.cro || 'CRO-SP 148.921';
  const doctorCity = doctor?.city || 'São Paulo';
  const doctorState = doctor?.state || 'SP';
  const doctorPhone = doctor?.phone || '(11) 98888-7777';
  const doctorAddressStr = doctor?.address
    ? `${doctor.address}${doctor.complement ? `, ${doctor.complement}` : ''}${doctor.neighborhood ? ` - ${doctor.neighborhood}` : ''}`
    : 'Av. Paulista, 1500';

  const patientAddressStr = patient.address
    ? `${patient.address}${patient.complement ? `, ${patient.complement}` : ''}${patient.neighborhood ? ` - ${patient.neighborhood}` : ''}${patient.city ? ` - ${patient.city}/${patient.state || 'SP'}` : ''}`
    : (patient.city ? `${patient.city}/${patient.state || 'SP'}` : 'Não informado');

  const renderEspecialViaJsx = (mainVia: string, subVia: string) => (
    <div className="flex-1 border-2 border-black p-3 flex flex-col justify-between bg-white text-black font-sans text-[11px] leading-tight min-h-[600px] box-border">
      <div className="flex flex-col flex-1 mb-2">
        <div className="flex justify-between items-start border-b-2 border-black pb-1.5 mb-2">
          <div className="flex-1 text-center font-bold text-[11px] uppercase tracking-wide pr-1">
            RECEITUÁRIO CONTROLE ESPECIAL
          </div>
          <div className="text-right text-[9.5px] font-bold leading-tight uppercase">
            <div className="text-black font-extrabold">{mainVia}</div>
            <div className="text-gray-500 font-normal text-[8px]">{subVia}</div>
          </div>
        </div>

        <div className="border border-black p-2 mb-2 bg-gray-50/80 text-[10px]">
          <div className="font-bold text-center text-[9px] border-b border-black pb-0.5 mb-1 uppercase tracking-wider">
            IDENTIFICAÇÃO DO EMITENTE
          </div>
          <div className="space-y-0.5">
            <div><span className="font-bold">NOME COMPLETO:</span> {doctorName}</div>
            <div className="flex justify-between">
              <span><span className="font-bold">CRO:</span> {doctorCro}</span>
              <span><span className="font-bold">UF:</span> {doctorState}</span>
            </div>
            <div><span className="font-bold">ENDEREÇO E TEL:</span> {doctorAddressStr} • {doctorPhone}</div>
            <div className="flex justify-between">
              <span><span className="font-bold">CIDADE:</span> {doctorCity}</span>
              <span><span className="font-bold">UF:</span> {doctorState}</span>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 mb-2 text-[10px]">
          <div>
            <span className="font-bold">PACIENTE:</span> <span className="uppercase font-semibold">{patient.name}</span>
          </div>
          <div>
            <span className="font-bold">ENDEREÇO:</span> <span>{patientAddressStr}</span>
          </div>
        </div>

        <div className="border-t-2 border-b-2 border-black py-2.5 my-1.5 flex-1 flex flex-col min-h-[180px]">
          <span className="font-bold block text-[9.5px] uppercase text-gray-700 mb-1">PRESCRIÇÃO:</span>
          <div className="font-bold text-[12px] text-black pl-0.5 mb-1.5">
            {prescMedication || 'Nenhum medicamento informado'}
          </div>
          <div className="text-[10.5px] text-gray-800 leading-snug pl-0.5 whitespace-pre-line">
            {prescDosage || 'Conforme orientação profissional.'}
          </div>
          {prescNotes && (
            <div className="text-[9.5px] text-gray-700 italic pl-0.5 pt-1 mt-auto border-t border-gray-300">
              Obs: {prescNotes}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[8.5px] leading-tight h-[130px]">
        <div className="border border-black p-1.5 flex flex-col justify-between">
          <div className="font-bold text-center border-b border-black pb-0.5 mb-1 text-[8.5px] uppercase">
            IDENTIFICAÇÃO DO COMPRADOR
          </div>
          <div className="flex flex-col justify-around flex-1 space-y-0.5">
            <div>NOME: <span className="border-b border-dotted border-gray-600 inline-block w-[70%]"></span></div>
            <div className="flex justify-between">
              <span>IDENT: <span className="border-b border-dotted border-gray-600 inline-block w-[28px]"></span></span>
              <span>ÓRG: <span className="border-b border-dotted border-gray-600 inline-block w-[22px]"></span></span>
            </div>
            <div>END: <span className="border-b border-dotted border-gray-600 inline-block w-[75%]"></span></div>
            <div className="flex justify-between">
              <span>CIDADE: <span className="border-b border-dotted border-gray-600 inline-block w-[40px]"></span></span>
              <span>UF: <span className="border-b border-dotted border-gray-600 inline-block w-[18px]"></span></span>
            </div>
            <div>TEL: <span className="border-b border-dotted border-gray-600 inline-block w-[65%]"></span></div>
          </div>
        </div>

        <div className="border border-black p-1.5 flex flex-col justify-between">
          <div className="font-bold text-center border-b border-black pb-0.5 mb-1 text-[8.5px] uppercase">
            IDENTIFICAÇÃO DO FORNECEDOR
          </div>
          <div className="mt-auto text-[8px] font-bold border-t border-black pt-1">
            ASSINATURA DO FARMACÊUTICO
            <div className="mt-2">DATA: ___ / ___ / ______</div>
          </div>
        </div>
      </div>
    </div>
  );

  const patientRecords = clinicalRecords.filter((r) => r.patientId === patient.id);

  // Tooth status colors
  const getToothColor = (status: ToothCondition['status']) => {
    switch (status) {
      case 'Saudável':
        return 'bg-[#6cf8bb]/40 border-[#006c49] text-[#005236]';
      case 'Em Tratamento':
        return 'bg-[#ffdad6] border-[#ba1a1a] text-[#93000a]';
      case 'Tratado':
        return 'bg-[#cce5ff] border-[#006194] text-[#004b73]';
      case 'Ausente':
        return 'bg-[#bfc7d2]/40 border-[#707881] text-[#707881]';
      case 'Atenção':
        return 'bg-amber-100 border-amber-600 text-amber-900';
      default:
        return 'bg-[#f0f3ff] border-[#bfc7d2] text-[#3f4850]';
    }
  };

  const handleToothUpdate = (updatedTooth: ToothCondition) => {
    setTeeth((prev) =>
      prev.map((t) => (t.toothNumber === updatedTooth.toothNumber ? updatedTooth : t))
    );

    // Also record in clinical history if procedure added
    if (updatedTooth.procedure && updatedTooth.procedure !== 'Nenhum') {
      onAddRecord({
        patientId: patient.id,
        date: new Date().toISOString().split('T')[0],
        dentistName: 'Dra. Karine Ramos',
        procedureDone: `${updatedTooth.procedure} - Dente ${updatedTooth.toothNumber}`,
        toothNumber: updatedTooth.toothNumber,
        clinicalNotes: updatedTooth.notes || `Procedimento registrado no Odontograma.`,
        cost: 300,
      });
    }

    setSelectedTooth(null);
  };

  const handleAddRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRecord({
      patientId: patient.id,
      date: new Date().toISOString().split('T')[0],
      dentistName: 'Dra. Karine Ramos',
      procedureDone: newProcedure,
      toothNumber: newToothNum,
      clinicalNotes: newNotes,
      cost: newCost,
    });
    setShowAddRecordModal(false);
    setNewNotes('');
  };

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto w-full space-y-6 pb-24">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[#e7eeff] text-[#3f4850] hover:text-[#006194] rounded-full transition-colors flex items-center gap-2 text-sm font-medium cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>{backLabel || 'Voltar à Lista de Pacientes'}</span>
        </button>

        <button
          onClick={() => onEditPatient(patient)}
          className="px-4 py-2 bg-[#e7eeff] text-[#006194] hover:bg-[#d8e3fb] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">edit</span>
          <span>Editar Cadastro</span>
        </button>
      </div>

      {/* Patient Profile Card Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#007bb9] text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
            {patient.initials}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-[#111c2d]">{patient.name}</h2>
              {patient.active ? (
                <span className="px-3 py-0.5 rounded-full bg-[#6cf8bb]/40 text-[#00714d] text-xs font-semibold">
                  Paciente Ativo
                </span>
              ) : (
                <span className="px-3 py-0.5 rounded-full bg-[#d8e3fb] text-[#3f4850] text-xs font-semibold">
                  Inativo
                </span>
              )}
              <span className="px-3 py-0.5 rounded-full bg-[#e7eeff] text-[#006194] text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Convênio: {patient.convenioName || 'Particular'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#3f4850] mt-2 flex-wrap">
              <span>
                <strong>CPF:</strong> {patient.cpf}
              </span>
              <span>•</span>
              <span>
                <strong>Idade:</strong> {patient.birthDate ? calculateDetailedAge(patient.birthDate).formatted : `${patient.age || 0} anos`}
              </span>
              <span>•</span>
              <span>
                <strong>Cidade:</strong> {patient.city}-{patient.state}
              </span>
              <span>•</span>
              <span>
                <strong>Última Visita:</strong> {patient.lastVisit}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <a
            href={`https://web.whatsapp.com/send?phone=55${(patient.whatsapp || patient.phone || '').replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 md:flex-none px-4 py-2.5 bg-[#006c49] text-white hover:bg-[#005236] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Allergies / Medical Warning Ribbon if any */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="p-4 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-xl text-[#93000a] text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">warning</span>
          <span>
            <strong>ALERTA MÉDICO DE ALERGIAS:</strong> Paciente possui sensibilidade a:{' '}
            <strong>{patient.allergies.join(', ')}</strong>.
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#e7eeff] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('odontogram')}
          className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'odontogram'
              ? 'border-[#006194] text-[#006194]'
              : 'border-transparent text-[#707881] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dentistry</span>
          <span>Odontograma Eletrônico</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#006194] text-[#006194]'
              : 'border-transparent text-[#707881] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">history_edu</span>
          <span>Histórico & Evolução ({patientRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prescription')}
          className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'prescription'
              ? 'border-[#006194] text-[#006194]'
              : 'border-transparent text-[#707881] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">prescriptions</span>
          <span>Gerador de Receituário</span>
        </button>
      </div>

      {/* Tab 1: Interactive Odontogram */}
      {activeTab === 'odontogram' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-lg text-[#111c2d]">Mapa Dentário (Odontograma)</h3>
              <p className="text-xs text-[#3f4850]">
                Clique em qualquer dente para registrar diagnóstico ou procedimento realizado.
              </p>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#6cf8bb] border border-[#006c49]"></span>
                Saudável
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#ffdad6] border border-[#ba1a1a]"></span>
                Em Tratamento
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-[#cce5ff] border border-[#006194]"></span>
                Tratado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-200 border border-amber-600"></span>
                Atenção
              </span>
            </div>
          </div>

          {/* Teeth Chart */}
          <div className="p-4 bg-[#f0f3ff] rounded-2xl border border-[#d8e3fb] space-y-6">
            {/* Superior Teeth */}
            <div>
              <p className="text-xs font-semibold text-[#006194] uppercase tracking-wider mb-2 text-center">
                Arcada Superior (Quadrante 1 e 2)
              </p>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-2 justify-center">
                {teeth.slice(0, 16).map((t) => (
                  <button
                    key={t.toothNumber}
                    onClick={() => setSelectedTooth(t)}
                    className={`p-2 rounded-xl border-2 flex flex-col items-center transition-all hover:scale-105 cursor-pointer ${getToothColor(
                      t.status
                    )}`}
                  >
                    <span className="text-[10px] font-bold">#{t.toothNumber}</span>
                    <span className="material-symbols-outlined text-[20px] my-1">
                      {t.procedure === 'Canal'
                        ? 'vital_signs'
                        : t.procedure === 'Extração'
                        ? 'disabled_by_default'
                        : 'dentistry'}
                    </span>
                    <span className="text-[9px] font-medium truncate max-w-[40px]">
                      {t.status.slice(0, 5)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#bfc7d2]/40" />

            {/* Inferior Teeth */}
            <div>
              <p className="text-xs font-semibold text-[#006194] uppercase tracking-wider mb-2 text-center">
                Arcada Inferior (Quadrante 3 e 4)
              </p>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-2 justify-center">
                {teeth.slice(16, 32).map((t) => (
                  <button
                    key={t.toothNumber}
                    onClick={() => setSelectedTooth(t)}
                    className={`p-2 rounded-xl border-2 flex flex-col items-center transition-all hover:scale-105 cursor-pointer ${getToothColor(
                      t.status
                    )}`}
                  >
                    <span className="text-[10px] font-bold">#{t.toothNumber}</span>
                    <span className="material-symbols-outlined text-[20px] my-1">
                      {t.procedure === 'Canal'
                        ? 'vital_signs'
                        : t.procedure === 'Extração'
                        ? 'disabled_by_default'
                        : 'dentistry'}
                    </span>
                    <span className="text-[9px] font-medium truncate max-w-[40px]">
                      {t.status.slice(0, 5)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Clinical Records History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-[#111c2d]">
              Evolução Clínica & Consultas Realizadas
            </h3>
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="px-4 py-2 bg-[#006194] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-[#004b73] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Registrar Nova Consulta</span>
            </button>
          </div>

          {patientRecords.length === 0 ? (
            <div className="py-12 text-center text-[#707881]">
              <span className="material-symbols-outlined text-[48px] block mb-2 opacity-40">
                assignment
              </span>
              Nenhum registro clínico adicionado ainda. Clique em "Registrar Nova Consulta".
            </div>
          ) : (
            <div className="space-y-4">
              {patientRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-4 bg-[#f0f3ff] rounded-2xl border border-[#d8e3fb] space-y-2"
                >
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#006194]">
                        medical_services
                      </span>
                      <span className="font-bold text-sm text-[#111c2d]">
                        {record.procedureDone}
                      </span>
                      {record.toothNumber && (
                        <span className="px-2 py-0.5 rounded-full bg-[#cce5ff] text-[#006194] text-xs font-semibold">
                          Dente #{record.toothNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#707881] font-mono">{record.date}</span>
                  </div>

                  <p className="text-xs text-[#3f4850] leading-relaxed">{record.clinicalNotes}</p>

                  {record.prescriptions && record.prescriptions.length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded-lg border border-[#e7eeff] text-xs text-[#006c49]">
                      <strong>Prescrição Medicamentosa:</strong> {record.prescriptions.join('; ')}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#bfc7d2]/30 flex justify-between items-center text-xs text-[#707881]">
                    <span>Profissional: {record.dentistName}</span>
                    {record.cost && (
                      <span className="font-bold text-[#006194]">
                        Valor: R$ {record.cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Prescription Generator */}
      {activeTab === 'prescription' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e7eeff] grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-lg text-[#111c2d] mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006194]">prescriptions</span>
                Gerador de Receituário Odontológico
              </h3>
              <p className="text-xs text-[#3f4850]">
                Preencha os campos abaixo ou selecione uma prescrição padrão para gerar o receituário oficial no formato A4.
              </p>
            </div>

            {/* Presets Quick Buttons */}
            <div className="p-3.5 bg-[#f0f3ff] rounded-xl border border-[#d8e3fb] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-[#006194] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  Modelos de Prescrição Frequentes:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPrescMedication('');
                    setPrescDosage('');
                    setPrescNotes('');
                  }}
                  className="text-xs font-bold text-[#ba1a1a] bg-white hover:bg-[#ffecece0] px-2.5 py-1 rounded-lg border border-[#ffb4ab] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Limpar todos os campos da prescrição"
                >
                  <span className="material-symbols-outlined text-[15px]">backspace</span>
                  Modelo em Branco
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrescMedication('');
                    setPrescDosage('');
                    setPrescNotes('');
                  }}
                  className="px-2.5 py-1.5 bg-[#fff0f0] hover:bg-[#ffe0e0] border border-[#ffb3b3] text-[#ba1a1a] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">draft</span>
                  Em Branco (Limpo)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrescMedication('Amoxicilina 500mg');
                    setPrescDosage('Tomar 1 cápsula de 8 em 8 horas durante 7 dias.');
                    setPrescNotes('Ingerir com água após as refeições. Não interromper o tratamento antes do período determinado.');
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#e7eeff] border border-[#bfc7d2] text-[#111c2d] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Amoxicilina 500mg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrescMedication('Ibuprofeno 600mg');
                    setPrescDosage('Tomar 1 comprimido de 8 em 8 horas durante 3 a 5 dias em caso de dor ou edema.');
                    setPrescNotes('Usar preferencialmente após se alimentar. Em caso de dor persistente, contatar a clínica.');
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#e7eeff] border border-[#bfc7d2] text-[#111c2d] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Ibuprofeno 600mg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrescMedication('Dipirona Monoidratada 500mg');
                    setPrescDosage('Tomar 1 comprimido de 6 em 6 horas se houver dor ou febre.');
                    setPrescNotes('Uso sintomático para alívio do desconforto pós-procedimento.');
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#e7eeff] border border-[#bfc7d2] text-[#111c2d] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Dipirona 500mg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrescMedication('Nimesulida 100mg');
                    setPrescDosage('Tomar 1 comprimido de 12 em 12 horas por 3 a 5 dias.');
                    setPrescNotes('Tomar juntamente ou após uma refeição.');
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#e7eeff] border border-[#bfc7d2] text-[#111c2d] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Nimesulida 100mg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrescMedication('Dexametasona 4mg');
                    setPrescDosage('Tomar 1 comprimido 1 hora antes do procedimento cirúrgico.');
                    setPrescNotes('Medicação pré-operatória anti-inflamatória.');
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#e7eeff] border border-[#bfc7d2] text-[#111c2d] rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Dexametasona 4mg
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePrint();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1.5">
                  Tipo de Receituário
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrescriptionType('normal')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      prescriptionType === 'normal'
                        ? 'bg-[#006194] text-white border-[#006194] shadow-xs'
                        : 'bg-[#f0f3ff] text-[#3f4850] border-[#d8e3fb] hover:bg-[#e7eeff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    Receituário Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrescriptionType('especial')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      prescriptionType === 'especial'
                        ? 'bg-[#006194] text-white border-[#006194] shadow-xs'
                        : 'bg-[#f0f3ff] text-[#3f4850] border-[#d8e3fb] hover:bg-[#e7eeff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Controle Especial
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-[#3f4850]">
                    Medicamento / Fármaco (Prescrição)
                  </label>
                  {(prescMedication || prescDosage || prescNotes) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrescMedication('');
                        setPrescDosage('');
                        setPrescNotes('');
                      }}
                      className="text-[11px] font-semibold text-[#ba1a1a] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[13px]">clear_all</span>
                      Limpar todos os campos
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={prescMedication}
                  onChange={(e) => setPrescMedication(e.target.value)}
                  placeholder="Ex: Amoxicilina 500mg (21 comprimidos) ou Deixe em Branco"
                  className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] rounded-xl text-sm text-[#111c2d] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Posologia / Modo de Uso
                </label>
                <textarea
                  rows={3}
                  value={prescDosage}
                  onChange={(e) => setPrescDosage(e.target.value)}
                  placeholder="Ex: Tomar 1 comprimido via oral de 8 em 8 horas durante 7 dias."
                  className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] rounded-xl text-sm text-[#111c2d]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Instruções & Cuidados Adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={prescNotes}
                  onChange={(e) => setPrescNotes(e.target.value)}
                  placeholder="Ex: Recomendações pós-operatórias, dieta leve, evitar sol..."
                  className="w-full p-3 bg-[#f0f3ff] border border-[#bfc7d2] focus:border-[#006194] rounded-xl text-sm text-[#111c2d]"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#006194] hover:bg-[#004b73] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px]">print</span>
                  {prescriptionType === 'especial'
                    ? 'Gerar Pré-visualização e Imprimir Receituário Especial (A4)'
                    : 'Imprimir Receituário Odontológico (A4)'}
                </button>
              </div>
            </form>
          </div>

          {/* Printable Prescription Sheet Element formatted for A4 */}
          <div className="flex flex-col items-center w-full">
            <p className="text-xs font-semibold text-[#707881] mb-2 flex items-center gap-1 self-start">
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              Pré-visualização do Documento A4 {prescriptionType === 'especial' ? '(Paisagem - 2 Vias)' : '(Retrato)'}:
            </p>

            <div
              id="printable-receituario"
              className={
                prescriptionType === 'especial'
                  ? 'w-full bg-white p-3 rounded-2xl border-2 border-[#006194]/30 shadow-lg font-sans text-xs flex flex-row gap-3 min-h-[540px] overflow-x-auto'
                  : 'w-full bg-white p-8 rounded-2xl border-2 border-[#d8e3fb] shadow-lg font-serif text-sm leading-relaxed space-y-6 relative min-h-[580px] flex flex-col justify-between'
              }
            >
              {prescriptionType === 'especial' ? (
                <>
                  {renderEspecialViaJsx('1ª VIA FARMÁCIA', '2ª VIA PACIENTE')}
                  {renderEspecialViaJsx('2ª VIA PACIENTE', '1ª VIA FARMÁCIA')}
                </>
              ) : (
                <>
                  {/* Header Section */}
                  <div className="space-y-4">
                    <div className="text-center border-b-2 border-[#006194] pb-5 space-y-1">
                      <div className="flex justify-center items-center gap-2 text-[#006194] mb-1">
                        <span className="material-symbols-outlined text-[28px]">dentistry</span>
                        <h4 className="font-bold text-lg uppercase tracking-wide">
                          {doctor?.clinicName || 'Dra. Karine Nogueira Ramos - Odontologia Especializada'}
                        </h4>
                      </div>
                      <p className="font-sans text-xs font-bold text-[#111c2d]">
                        {doctor?.name || 'Dra. Karine Nogueira Ramos'} • <span className="text-[#006194]">{doctor?.cro || 'CRO-SP 148.921'}</span>
                      </p>
                      <p className="font-sans text-[11px] text-[#3f4850]">
                        {doctor?.role || 'Cirurgiã-Dentista • Especialista em Ortodontia e Estética'}
                      </p>
                      <p className="font-sans text-[10px] text-[#707881]">
                        {doctor?.address
                          ? `${doctor.address}${doctor.complement ? `, ${doctor.complement}` : ''}${doctor.neighborhood ? ` - ${doctor.neighborhood}` : ''}${doctor.city ? ` - ${doctor.city}/${doctor.state || 'SP'}` : ''}${doctor.cep ? ` • CEP: ${doctor.cep}` : ''}`
                          : 'Av. Paulista, 1500 - São Paulo/SP'}{' '}
                        • Fone/WhatsApp: {doctor?.phone || '(11) 98888-7777'} • Email: {doctor?.email || 'karine@consultorio.com'}
                      </p>
                    </div>

                    {/* Prescription Title Ribbon */}
                    <div className="flex justify-between items-center py-1">
                      <span className="font-sans text-xl font-extrabold text-[#006194] italic tracking-wider">
                        Rx / RECEITUÁRIO
                      </span>
                      <span className="font-sans text-xs font-semibold text-[#707881] bg-[#f0f3ff] px-3 py-1 rounded-full border border-[#d8e3fb]">
                        Via do Paciente
                      </span>
                    </div>

                    {/* Patient Information Section */}
                    <div className="p-4 bg-[#f9f9ff] rounded-xl border border-[#d8e3fb] font-sans text-xs space-y-1.5">
                      <div className="flex justify-between flex-wrap gap-2">
                        <p>
                          <strong className="text-[#006194]">PACIENTE:</strong> <span className="font-semibold text-[#111c2d] uppercase">{patient.name}</span>
                        </p>
                        <p>
                          <strong className="text-[#006194]">DATA:</strong> <span className="font-semibold text-[#111c2d]">{new Date().toLocaleDateString('pt-BR')}</span>
                        </p>
                      </div>
                      <div className="flex justify-between flex-wrap gap-2 text-[#3f4850]">
                        <p>
                          <strong>CPF:</strong> {patient.cpf || 'Não informado'}
                        </p>
                        <p>
                          <strong>DATA DE NASCIMENTO:</strong> {formatBirthDate(patient.birthDate)}
                        </p>
                        <p>
                          <strong>IDADE:</strong> {patient.age || (patient.birthDate ? calculateAge(patient.birthDate) : null) !== null ? `${patient.age || calculateAge(patient.birthDate)} anos` : 'Não informada'}
                        </p>
                      </div>
                    </div>

                    {/* Medication & Posology Main Content Block */}
                    <div className="p-6 bg-white rounded-xl border-2 border-[#006194]/20 space-y-4 my-4 shadow-xs">
                      <div>
                        <span className="font-sans text-[10px] font-bold text-[#006194] uppercase tracking-wider block mb-1">
                          [1] Prescrição / Medicamento:
                        </span>
                        <p className="font-sans font-bold text-base text-[#111c2d] bg-[#f0f3ff] p-2.5 rounded-lg border-l-4 border-[#006194]">
                          {prescMedication || 'Nenhum medicamento informado'}
                        </p>
                      </div>

                      <div>
                        <span className="font-sans text-[10px] font-bold text-[#006194] uppercase tracking-wider block mb-1">
                          [2] Posologia e Modo de Uso:
                        </span>
                        <p className="font-sans text-sm text-[#3f4850] leading-relaxed whitespace-pre-line pl-1">
                          {prescDosage || 'Conforme orientação profissional.'}
                        </p>
                      </div>

                      {prescNotes && (
                        <div className="pt-2 border-t border-[#e7eeff]">
                          <span className="font-sans text-[10px] font-bold text-[#006c49] uppercase tracking-wider block mb-1">
                            [3] Recomendações e Instruções Adicionais:
                          </span>
                          <p className="font-sans text-xs text-[#006c49] italic bg-[#e6f4ea]/60 p-2.5 rounded-lg border border-[#006c49]/20">
                            {prescNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signature and Legal Notice Footer */}
                  <div className="pt-8 space-y-6">
                    <div className="text-right font-sans text-xs text-[#3f4850]">
                      {doctor?.city || 'São Paulo'} - {doctor?.state || 'SP'}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>

                    <div className="text-center space-y-1">
                      <div className="w-64 border-t-2 border-[#111c2d] mx-auto pt-1" />
                      <p className="font-sans font-bold text-sm text-[#111c2d]">
                        {doctor?.name || 'Dra. Karine Nogueira Ramos'}
                      </p>
                      <p className="font-sans text-xs font-semibold text-[#006194]">
                        {doctor?.cro || 'CRO-SP 148.921'} • Cirurgiã-Dentista
                      </p>
                      <p className="font-sans text-[10px] text-[#707881]">
                        Assinatura e Carimbo Profissional
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#e7eeff] text-center font-sans text-[9px] text-[#707881]">
                      Este documento é um receituário odontológico válido em todo o território nacional • Gerado via Clinical Precision
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tooth Procedure Modal */}
      {selectedTooth && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e7eeff]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e7eeff]">
              <h3 className="font-bold text-lg text-[#111c2d]">
                Dente #{selectedTooth.toothNumber} - Registro
              </h3>
              <button
                onClick={() => setSelectedTooth(null)}
                className="p-1 text-[#707881] hover:text-[#111c2d]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleToothUpdate(selectedTooth);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Status do Dente
                </label>
                <select
                  value={selectedTooth.status}
                  onChange={(e) =>
                    setSelectedTooth({
                      ...selectedTooth,
                      status: e.target.value as ToothCondition['status'],
                    })
                  }
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                >
                  <option value="Saudável">Saudável</option>
                  <option value="Em Tratamento">Em Tratamento</option>
                  <option value="Tratado">Tratado</option>
                  <option value="Atenção">Atenção</option>
                  <option value="Ausente">Ausente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Procedimento
                </label>
                <select
                  value={selectedTooth.procedure || 'Nenhum'}
                  onChange={(e) =>
                    setSelectedTooth({
                      ...selectedTooth,
                      procedure: e.target.value as ToothProcedureType,
                    })
                  }
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                >
                  <option value="Nenhum">Nenhum</option>
                  <option value="Restauração">Restauração em Resina</option>
                  <option value="Canal">Tratamento de Canal</option>
                  <option value="Extração">Extração</option>
                  <option value="Limpeza">Limpeza / Profilaxia</option>
                  <option value="Coroa">Coroa de Porcelana</option>
                  <option value="Implante">Implante Dental</option>
                  <option value="Aparelho">Aparelho / Alinhador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Observações Diagnósticas
                </label>
                <textarea
                  rows={3}
                  value={selectedTooth.notes || ''}
                  onChange={(e) =>
                    setSelectedTooth({
                      ...selectedTooth,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Alergias, canal obturado, resina cor A2..."
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTooth(null)}
                  className="w-1/2 py-2.5 border border-[#bfc7d2] rounded-xl text-sm font-medium text-[#3f4850] hover:bg-[#f0f3ff]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#006194] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#004b73]"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Consultation Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e7eeff]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#e7eeff]">
              <h3 className="font-bold text-lg text-[#111c2d]">Registrar Atendimento</h3>
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="p-1 text-[#707881] hover:text-[#111c2d]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddRecordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Procedimento
                </label>
                <input
                  type="text"
                  required
                  value={newProcedure}
                  onChange={(e) => setNewProcedure(e.target.value)}
                  placeholder="Ex: Profilaxia e Limpeza"
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Dente Envolvido (Opcional)
                </label>
                <input
                  type="number"
                  value={newToothNum || ''}
                  onChange={(e) =>
                    setNewToothNum(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="Ex: 16"
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Anotações Clínicas
                </label>
                <textarea
                  rows={3}
                  required
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Resumo do atendimento realizado..."
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3f4850] mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#f0f3ff] border border-[#bfc7d2] rounded-xl text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="w-1/2 py-2.5 border border-[#bfc7d2] rounded-xl text-sm font-medium text-[#3f4850] hover:bg-[#f0f3ff]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-[#006194] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#004b73]"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
