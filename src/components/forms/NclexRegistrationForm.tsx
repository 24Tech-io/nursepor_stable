'use client';

import { useState } from 'react';
import type { NursingCandidateFormPayload } from '@/types/nursing-candidate';

const educationSections = [
  { key: 'gnm', label: 'GNM – General Nursing and Midwifery', programType: 'GNM' },
  { key: 'bsc', label: 'BSc Nursing', programType: 'BSc Nursing' },
  { key: 'postBasic', label: 'Post Basic BSc Nursing', programType: 'Post Basic BSc Nursing' },
  { key: 'msc', label: 'MSc Nursing', programType: 'MSc Nursing' },
  { key: 'plusTwo', label: 'Plus Two / 12th Grade', programType: 'Plus Two / 12th Grade' },
  { key: 'tenthGrade', label: '10th Grade / Secondary School', programType: '10th Grade / Secondary School' },
  { key: 'primaryHighSchool', label: 'Primary and High School (Grades 1–10)', programType: 'Primary & High School' },
] as const;

const createEducationEntry = (programType: string) => ({
  institutionName: '',
  address: '',
  programType,
  studyPeriod: '',
});

const createRegistrationEntry = () => ({
  councilName: '',
  registrationNumber: '',
  issuedDate: '',
  expiryDate: '',
  status: '',
});

const createExperienceEntry = () => ({
  employer: '',
  position: '',
  dates: '',
});

const createCanadaExperienceEntry = () => ({
  ...createExperienceEntry(),
  employmentType: '',
  hoursPerMonth: '',
});

const initialState: NursingCandidateFormPayload = {
  personalDetails: {
    firstName: '',
    lastName: '',
    collegeNameVariant: '',
    hasNameChange: 'No',
    maidenName: '',
    motherMaidenName: '',
    dateOfBirth: '',
    placeOfBirth: '',
    gender: 'Female',
    address: '',
    phoneNumber: '',
    email: '',
    firstLanguage: '',
  },
  educationDetails: {
    gnm: createEducationEntry('GNM'),
    bsc: createEducationEntry('BSc Nursing'),
    postBasic: createEducationEntry('Post Basic BSc Nursing'),
    msc: createEducationEntry('MSc Nursing'),
    plusTwo: createEducationEntry('Plus Two / 12th Grade'),
    tenthGrade: createEducationEntry('10th Grade / Secondary School'),
    primaryHighSchool: createEducationEntry('Primary & High School'),
  },
  registrationDetails: {
    hasDisciplinaryAction: 'No',
    entries: [createRegistrationEntry(), createRegistrationEntry(), createRegistrationEntry()],
  },
  employmentHistory: [createExperienceEntry(), createExperienceEntry(), createExperienceEntry()],
  canadaEmploymentHistory: [
    createCanadaExperienceEntry(),
    createCanadaExperienceEntry(),
    createCanadaExperienceEntry(),
  ],
  documentChecklistAcknowledged: false,
};

const personalFields = [
  { name: 'firstName', label: 'First name (as in passport)', required: true },
  { name: 'lastName', label: 'Last name (as in passport)', required: true },
  { name: 'collegeNameVariant', label: 'Name as in college documents (if different)', required: false },
  { name: 'maidenName', label: 'Maiden name (before marriage, if applicable)', required: false },
  { name: 'motherMaidenName', label: 'Mother’s maiden name', required: false },
  { name: 'dateOfBirth', label: 'Date of birth (DD/MM/YYYY)', required: true },
  { name: 'placeOfBirth', label: 'Place of birth (city, state, country)', required: true },
  { name: 'address', label: 'Current residential address (with postal code & country)', required: true, textarea: true },
  { name: 'phoneNumber', label: 'Phone number (with country code)', required: true },
  { name: 'email', label: 'Email ID', required: true },
  { name: 'firstLanguage', label: 'First language / mother tongue', required: true },
];

interface NclexRegistrationFormProps {
  variant?: 'inline' | 'modal';
}

export default function NclexRegistrationForm({ variant = 'inline' }: NclexRegistrationFormProps) {
  const [formState, setFormState] = useState<NursingCandidateFormPayload>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string; reference?: string } | null>(null);

  const handlePersonalChange = (field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        [field]: value,
      },
    }));
  };

  const handleEducationChange = (sectionKey: keyof typeof formState.educationDetails, field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      educationDetails: {
        ...prev.educationDetails,
        [sectionKey]: {
          ...prev.educationDetails[sectionKey],
          [field]: value,
        },
      },
    }));
  };

  const handleRegistrationChange = (index: number, field: string, value: string) => {
    setFormState((prev) => {
      const updated = [...prev.registrationDetails.entries];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        registrationDetails: {
          ...prev.registrationDetails,
          entries: updated,
        },
      };
    });
  };

  const handleEmploymentChange = (
    arrayKey: 'employmentHistory' | 'canadaEmploymentHistory',
    index: number,
    field: string,
    value: string
  ) => {
    setFormState((prev) => {
      const updated = [...prev[arrayKey]];
      (updated[index] as any)[field] = value;
      return {
        ...prev,
        [arrayKey]: updated,
      };
    });
  };

  const validateRequiredFields = () => {
    const missing = personalFields.filter((field) => field.required && !formState.personalDetails[field.name as keyof typeof formState.personalDetails]);
    if (missing.length > 0) {
      return `Please complete all required personal fields (${missing.map((f) => f.label).join(', ')})`;
    }
    if (!formState.documentChecklistAcknowledged) {
      return 'Please acknowledge the document submission requirements.';
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateRequiredFields();
    if (validationError) {
      setStatusMessage({ type: 'error', message: validationError });
      return;
    }
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/nursing-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to submit form');
      }

      setStatusMessage({
        type: 'success',
        message: 'Thank you! Your NCLEX-RN registration information has been received. Our team will contact you shortly.',
        reference: result.referenceNumber,
      });
      setFormState(initialState);
    } catch (error: any) {
      setStatusMessage({
        type: 'error',
        message: error?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerClasses =
    variant === 'inline'
      ? 'mt-20 bg-white rounded-3xl shadow-2xl border border-slate-100 p-8'
      : 'bg-white rounded-3xl shadow-2xl border border-slate-100 p-6';

  return (
    <section
      id={variant === 'inline' ? 'nclex-registration' : undefined}
      className={`${containerClasses} relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.2),_transparent_50%)]" />
        <div className="absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-transparent blur-3xl" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-20" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {variant === 'inline' && (
          <div className="text-center mb-10 relative z-10">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-indigo-200 font-semibold mb-3">
              <span className="w-10 h-px bg-indigo-400/60" />
              NCLEX-RN PROTOCOL
              <span className="w-10 h-px bg-indigo-400/60" />
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              NursePro Academy — Quantum Registration Matrix
            </h2>
            <p className="text-lg text-indigo-100">
              Provide accurate information as seen on official records. Fields may be marked “N/A” if they do not apply.
            </p>
          </div>
        )}

        {statusMessage && (
          <div
            className={`mb-8 p-4 rounded-2xl border relative z-10 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
                : 'bg-rose-500/15 border-rose-400/60 text-rose-200'
            }`}
          >
            <p className="font-semibold tracking-wide">{statusMessage.message}</p>
            {statusMessage.reference && (
              <p className="text-sm mt-1 text-emerald-100">
                Reference Number: <span className="font-mono">{statusMessage.reference}</span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
          {/* Section 1 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12 12 0 0112 21a12 12 0 01-6.16-10.422L12 14z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 1: Personal / Identity Details</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {personalFields.map((field) => (
                <div key={field.name} className={field.textarea ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                      {field.label}
                    </span>
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.textarea ? (
                    <textarea
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                      rows={3}
                      value={formState.personalDetails[field.name as keyof typeof formState.personalDetails] as string}
                      onChange={(e) => handlePersonalChange(field.name, e.target.value)}
                      placeholder="Enter details exactly as on official documents"
                    />
                  ) : (
                    <input
                      type={field.name === 'email' ? 'email' : 'text'}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                      value={formState.personalDetails[field.name as keyof typeof formState.personalDetails] as string}
                      onChange={(e) => handlePersonalChange(field.name, e.target.value)}
                      placeholder="Enter details exactly as on official documents"
                    />
                  )}
                </div>
              ))}

              <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2 tracking-wide uppercase">Any name change</label>
                <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/80 p-3"
                  value={formState.personalDetails.hasNameChange}
                  onChange={(e) => handlePersonalChange('hasNameChange', e.target.value)}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2 tracking-wide uppercase">Gender</label>
                <select
                className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/80 p-3"
                  value={formState.personalDetails.gender}
                  onChange={(e) => handlePersonalChange('gender', e.target.value)}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 2: Education Details</h3>
            </div>
            <p className="text-sm text-indigo-200 mb-4">Fill in the programs that apply to you. Use “N/A” if not applicable.</p>
            <div className="space-y-6">
              {educationSections.map((section) => (
                <div key={section.key} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 animate-pulse" />
                    {section.label}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                      placeholder="College / School name"
                      value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].institutionName}
                      onChange={(e) => handleEducationChange(section.key as keyof typeof formState.educationDetails, 'institutionName', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                      placeholder="Program / Degree type"
                      value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].programType}
                      onChange={(e) => handleEducationChange(section.key as keyof typeof formState.educationDetails, 'programType', e.target.value)}
                    />
                    <textarea
                      className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                      rows={2}
                      placeholder="Full address (with postal code and country)"
                      value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].address}
                      onChange={(e) => handleEducationChange(section.key as keyof typeof formState.educationDetails, 'address', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                      placeholder="Dates studied (From – To)"
                      value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].studyPeriod}
                      onChange={(e) => handleEducationChange(section.key as keyof typeof formState.educationDetails, 'studyPeriod', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

  {/* Section 3 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 3: Registration / License Details</h3>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Have you ever been suspended, dismissed, or faced disciplinary action by any nursing council?
              </label>
              <select
                className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                value={formState.registrationDetails.hasDisciplinaryAction}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    registrationDetails: { ...prev.registrationDetails, hasDisciplinaryAction: e.target.value as 'Yes' | 'No' },
                  }))
                }
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="space-y-6">
              {formState.registrationDetails.entries.map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xs tracking-[0.4em] text-indigo-300">NR-{index + 1}</span>
                    Nursing Registration {index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                      placeholder="Council or licensing body name"
                      value={entry.councilName}
                      onChange={(e) => handleRegistrationChange(index, 'councilName', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                      placeholder="Registration number"
                      value={entry.registrationNumber}
                      onChange={(e) => handleRegistrationChange(index, 'registrationNumber', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                      placeholder="Date issued"
                      value={entry.issuedDate}
                      onChange={(e) => handleRegistrationChange(index, 'issuedDate', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                      placeholder="Expiry / renewal date"
                      value={entry.expiryDate}
                      onChange={(e) => handleRegistrationChange(index, 'expiryDate', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                      placeholder="Current status (Active / Expired)"
                      value={entry.status}
                      onChange={(e) => handleRegistrationChange(index, 'status', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 4: Employment History – USA & Australia</h3>
            </div>
            <p className="text-sm text-cyan-100 mb-4">Provide the most recent nursing roles relevant for NCLEX-RN verification.</p>
            <div className="space-y-6">
              {formState.employmentHistory.map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-slate-900/60 to-emerald-900/20 backdrop-blur">
                  <h4 className="text-lg font-semibold text-white mb-4">Nursing Experience {index + 1}</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                      placeholder="Employer / hospital name"
                      value={entry.employer}
                      onChange={(e) => handleEmploymentChange('employmentHistory', index, 'employer', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                      placeholder="Job title / position"
                      value={entry.position}
                      onChange={(e) => handleEmploymentChange('employmentHistory', index, 'position', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                      placeholder="Dates (Joined – Left)"
                      value={entry.dates}
                      onChange={(e) => handleEmploymentChange('employmentHistory', index, 'dates', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 5: Employment Details – Canada</h3>
            </div>
            <p className="text-sm text-sky-100 mb-4">Include hospitals, clinics, or community health agencies (last 5 years).</p>
            <div className="space-y-6">
              {formState.canadaEmploymentHistory.map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-blue-900/40 to-violet-900/30 backdrop-blur">
                  <h4 className="text-lg font-semibold text-white mb-4">Canada Nursing Experience {index + 1}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                      placeholder="Employer / hospital name"
                      value={entry.employer}
                      onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'employer', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                      placeholder="Job title / position"
                      value={entry.position}
                      onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'position', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                      placeholder="Dates (Joined – Left)"
                      value={entry.dates}
                      onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'dates', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                      placeholder="Full-time or part-time"
                      value={entry.employmentType}
                      onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'employmentType', e.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                      placeholder="Approx. total hours per month"
                      value={entry.hoursPerMonth}
                      onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'hoursPerMonth', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Document Submission Checklist
            </h4>
            <p className="text-sm text-indigo-100">
              Email colour copies of the following to <span className="font-semibold text-white">nurses@nurseproacademy.ca</span>:
            </p>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-indigo-100 list-disc list-inside">
              <li>All nursing mark lists and transcripts</li>
              <li>All nursing registration/licence documents</li>
              <li>Affidavit for any name change (if applicable)</li>
              <li>10th and Plus Two certificates</li>
              <li>Passport</li>
            </ul>
            <label className="flex items-start space-x-3 text-sm text-slate-100">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-indigo-400/70 bg-transparent text-indigo-400 focus:ring-indigo-500/70"
                checked={formState.documentChecklistAcknowledged}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    documentChecklistAcknowledged: e.target.checked,
                  }))
                }
              />
              <span>I confirm I will email the required documents to the NursePro Academy team.</span>
            </label>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-indigo-100">
              Need help? Contact{' '}
              <a href="mailto:nurses@nurseproacademy.ca" className="text-white font-semibold">
                nurses@nurseproacademy.ca
              </a>
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-500 text-white px-8 py-3 rounded-2xl font-semibold shadow-[0_0_35px_rgba(139,92,246,0.6)] hover:scale-[1.01] transition disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Registration Form'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

