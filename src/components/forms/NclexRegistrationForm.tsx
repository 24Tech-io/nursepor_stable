'use client';

import { useState, type FormEvent, type HTMLInputTypeAttribute } from 'react';
import type {
  DateRange,
  NursingCandidateFormPayload,
  NursingEducationEntry,
} from '@/types/nursing-candidate';

const languageOptions = [
  'English',
  'Hindi',
  'Malayalam',
  'Tamil',
  'Telugu',
  'Kannada',
  'Marathi',
  'Gujarati',
  'Tagalog',
  'Spanish',
  'Arabic',
  'French',
];

const countrySuggestions = [
  'India',
  'Philippines',
  'United Arab Emirates',
  'Qatar',
  'Saudi Arabia',
  'Canada',
  'United States',
  'Australia',
  'United Kingdom',
  'New Zealand',
  'South Africa',
];

const councilSuggestions = [
  'Indian Nursing Council',
  'Kerala Nurses and Midwives Council',
  'Tamil Nadu Nurses and Midwives Council',
  'Maharashtra Nursing Council',
  'Nursing and Midwifery Council (UK)',
  'College of Nurses of Ontario',
  'British Columbia College of Nurses and Midwives',
  'Philippine Board of Nursing',
];

const institutionSuggestions = [
  'Government College of Nursing',
  'Christian Medical College, Vellore',
  'AIIMS College of Nursing',
  'Rajiv Gandhi College of Nursing',
  'Nightingale Institute of Nursing',
  'Manipal College of Nursing',
  'Aster College of Nursing',
];

const employerSuggestions = [
  'Apollo Hospitals',
  'Fortis Healthcare',
  'Aster DM Healthcare',
  'Narayana Health',
  'Max Healthcare',
  'Cleveland Clinic Abu Dhabi',
  'Mount Sinai Hospital',
  'NHS Foundation Trust',
];

const jobRoleSuggestions = [
  'Registered Nurse',
  'Staff Nurse',
  'Charge Nurse',
  'Nurse Supervisor',
  'Nurse Educator',
  'Clinical Nurse Specialist',
  'ICU Nurse',
  'Pediatric Nurse',
];

const employmentTypeOptions: Array<NursingCandidateFormPayload['canadaEmploymentHistory'][number]['employmentType']> = [
  'Full-time',
  'Part-time',
  'Casual',
  'Contract',
];

const registrationStatusOptions: Array<
  NursingCandidateFormPayload['registrationDetails']['entries'][number]['status']
> = ['Active', 'Pending', 'Inactive', 'Expired', 'Suspended'];

const educationSections = [
  { key: 'gnm', label: 'GNM – General Nursing and Midwifery', programType: 'GNM' },
  { key: 'bsc', label: 'BSc Nursing', programType: 'BSc Nursing' },
  { key: 'postBasic', label: 'Post Basic BSc Nursing', programType: 'Post Basic BSc Nursing' },
  { key: 'msc', label: 'MSc Nursing', programType: 'MSc Nursing' },
  { key: 'plusTwo', label: 'Plus Two / 12th Grade', programType: 'Plus Two / 12th Grade' },
  { key: 'tenthGrade', label: '10th Grade / Secondary School', programType: '10th Grade / Secondary School' },
  { key: 'primaryHighSchool', label: 'Primary and High School (Grades 1–10)', programType: 'Primary & High School' },
] as const;

const programOptions = Array.from(
  new Set<string>([
    ...educationSections.map((section) => section.programType),
    'Diploma in Nursing',
    'Bridge Program',
    'Other',
  ])
);

const createEducationEntry = (programType: string) => ({
  institutionName: '',
  address: '',
  programType,
  studyPeriod: { from: '', to: '' },
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
  dates: { from: '', to: '' },
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

type PersonalFieldConfig = {
  name: keyof NursingCandidateFormPayload['personalDetails'];
  label: string;
  required?: boolean;
  component?: 'input' | 'textarea' | 'select';
  inputType?: HTMLInputTypeAttribute;
  placeholder?: string;
  listId?: string;
  options?: string[];
  autoComplete?: string;
};

const personalFields: PersonalFieldConfig[] = [
  {
    name: 'firstName',
    label: 'First name (as in passport)',
    required: true,
    component: 'input',
    inputType: 'text',
    autoComplete: 'given-name',
  },
  {
    name: 'lastName',
    label: 'Last name (as in passport)',
    required: true,
    component: 'input',
    inputType: 'text',
    autoComplete: 'family-name',
  },
  {
    name: 'collegeNameVariant',
    label: 'Name as in college documents (if different)',
    component: 'input',
  },
  {
    name: 'maidenName',
    label: 'Maiden name (before marriage, if applicable)',
    component: 'input',
  },
  {
    name: 'motherMaidenName',
    label: 'Mother’s maiden name',
    component: 'input',
  },
  {
    name: 'dateOfBirth',
    label: 'Date of birth',
    required: true,
    component: 'input',
    inputType: 'date',
  },
  {
    name: 'placeOfBirth',
    label: 'Place of birth (city, country)',
    required: true,
    component: 'input',
    listId: 'country-suggestions',
  },
  {
    name: 'address',
    label: 'Current residential address (with postal code & country)',
    required: true,
    component: 'textarea',
  },
  {
    name: 'phoneNumber',
    label: 'Phone number (with country code)',
    required: true,
    component: 'input',
    inputType: 'tel',
    autoComplete: 'tel',
  },
  {
    name: 'email',
    label: 'Email ID',
    required: true,
    component: 'input',
    inputType: 'email',
    autoComplete: 'email',
  },
  {
    name: 'firstLanguage',
    label: 'First language / mother tongue',
    required: true,
    component: 'select',
    options: languageOptions,
  },
];

interface NclexRegistrationFormProps {
  variant?: 'inline' | 'modal' | 'page';
}

export default function NclexRegistrationForm({ variant = 'inline' }: NclexRegistrationFormProps) {
  const [formState, setFormState] = useState<NursingCandidateFormPayload>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string; reference?: string } | null>(null);

  const handlePersonalChange = (field: keyof NursingCandidateFormPayload['personalDetails'], value: string) => {
    setFormState((prev: NursingCandidateFormPayload) => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        [field]: value,
      },
    }));
  };

  const handleEducationChange = (
    sectionKey: keyof typeof formState.educationDetails,
    field: keyof NursingEducationEntry,
    value: string | DateRange
  ) => {
    setFormState((prev: NursingCandidateFormPayload) => ({
      ...prev,
      educationDetails: {
        ...prev.educationDetails,
        [sectionKey]: {
          ...prev.educationDetails[sectionKey],
          [field]: value as NursingEducationEntry[keyof NursingEducationEntry],
        },
      },
    }));
  };

  const handleEducationDateChange = (
    sectionKey: keyof typeof formState.educationDetails,
    boundary: keyof DateRange,
    value: string
  ) => {
    const existing = formState.educationDetails[sectionKey].studyPeriod;
    handleEducationChange(sectionKey, 'studyPeriod', {
      ...existing,
      [boundary]: value,
    });
  };

  const handleRegistrationChange = (
    index: number,
    field: keyof NursingCandidateFormPayload['registrationDetails']['entries'][number],
    value: string
  ) => {
    setFormState((prev: NursingCandidateFormPayload) => {
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
    setFormState((prev: NursingCandidateFormPayload) => {
      const updated = [...prev[arrayKey]];
      const entry = { ...updated[index], [field]: value } as (typeof updated)[number];
      updated[index] = entry;
      return {
        ...prev,
        [arrayKey]: updated,
      };
    });
  };

  const handleEmploymentDateChange = (
    arrayKey: 'employmentHistory' | 'canadaEmploymentHistory',
    index: number,
    boundary: keyof DateRange,
    value: string
  ) => {
    setFormState((prev: NursingCandidateFormPayload) => {
      const updated = [...prev[arrayKey]];
      const entry = updated[index];
      updated[index] = {
        ...entry,
        dates: {
          ...entry.dates,
          [boundary]: value,
        },
      };
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    variant === 'modal'
      ? 'bg-white rounded-3xl shadow-2xl border border-slate-100 p-6'
      : variant === 'page'
        ? 'bg-white rounded-3xl shadow-2xl border border-slate-100 p-10'
        : 'mt-20 bg-white rounded-3xl shadow-2xl border border-slate-100 p-8';

  return (
    <section id={variant !== 'modal' ? 'nclex-registration' : undefined} className={`${containerClasses} relative overflow-hidden`}>
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
              {personalFields.map((field) => {
                const value = formState.personalDetails[field.name];
                const isTextarea = field.component === 'textarea';
                const isSelect = field.component === 'select';
                const placeholder = field.placeholder ?? 'Enter details exactly as on official documents';
                return (
                  <div key={field.name} className={isTextarea ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                        {field.label}
                      </span>
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {isSelect ? (
                      <select
                        className="w-full rounded-2xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                        value={value}
                        onChange={(e) => handlePersonalChange(field.name, e.target.value)}
                      >
                        <option value="">Select an option</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : isTextarea ? (
                      <textarea
                        className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur resize-none min-h-[140px]"
                        rows={4}
                        value={value}
                        onChange={(e) => handlePersonalChange(field.name, e.target.value)}
                        placeholder={placeholder}
                      />
                    ) : (
                      <input
                        type={field.inputType || 'text'}
                        list={field.listId}
                        autoComplete={field.autoComplete}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                        value={value}
                        onChange={(e) => handlePersonalChange(field.name, e.target.value)}
                        placeholder={placeholder}
                      />
                    )}
                  </div>
                );
              })}

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-400 mb-3 tracking-wide uppercase">Any name change</label>
                <div className="flex flex-wrap gap-4">
                  {['Yes', 'No'].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${
                        formState.personalDetails.hasNameChange === option
                          ? 'border-indigo-400 bg-indigo-500/20 text-white'
                          : 'border-white/10 text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="has-name-change"
                        className="text-indigo-400 focus:ring-indigo-500"
                        value={option}
                        checked={formState.personalDetails.hasNameChange === option}
                        onChange={(e) => handlePersonalChange('hasNameChange', e.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-400 mb-3 tracking-wide uppercase">Gender</label>
                <div className="flex flex-wrap gap-4">
                  {['Female', 'Male', 'Other'].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${
                        formState.personalDetails.gender === option
                          ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white'
                          : 'border-white/10 text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        className="text-fuchsia-400 focus:ring-fuchsia-500"
                        value={option}
                        checked={formState.personalDetails.gender === option}
                        onChange={(e) => handlePersonalChange('gender', e.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <datalist id="country-suggestions">
              {countrySuggestions.map((country) => (
                <option key={country} value={country} />
              ))}
            </datalist>
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
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">Institution</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                        placeholder="College / School name"
                        list="institution-suggestions"
                        value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].institutionName}
                        onChange={(e) => handleEducationChange(section.key as keyof typeof formState.educationDetails, 'institutionName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">Program / Degree type</label>
                      <select
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                        value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].programType}
                        onChange={(e) => handleEducationChange(section.key as keyof typeof formState.educationDetails, 'programType', e.target.value)}
                      >
                        {programOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">Full address</label>
                      <textarea
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3 resize-none min-h-[110px]"
                        rows={3}
                        placeholder="Full address (with postal code and country)"
                        value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].address}
                        onChange={(e) => handleEducationChange(section.key as keyof typeof formState.educationDetails, 'address', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">Study period — from</label>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                          value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].studyPeriod.from}
                          onChange={(e) =>
                            handleEducationDateChange(section.key as keyof typeof formState.educationDetails, 'from', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">Study period — to</label>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                          value={formState.educationDetails[section.key as keyof typeof formState.educationDetails].studyPeriod.to}
                          onChange={(e) =>
                            handleEducationDateChange(section.key as keyof typeof formState.educationDetails, 'to', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <datalist id="institution-suggestions">
              {institutionSuggestions.map((institution) => (
                <option key={institution} value={institution} />
              ))}
            </datalist>
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
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Have you ever been suspended, dismissed, or faced disciplinary action by any nursing council?
              </label>
              <div className="flex flex-wrap gap-4">
                {['No', 'Yes'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${
                      formState.registrationDetails.hasDisciplinaryAction === option
                        ? 'border-amber-400 bg-amber-500/20 text-white'
                        : 'border-white/10 text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="disciplinary-action"
                      value={option}
                      className="text-amber-400 focus:ring-amber-500"
                      checked={formState.registrationDetails.hasDisciplinaryAction === option}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          registrationDetails: {
                            ...prev.registrationDetails,
                            hasDisciplinaryAction: e.target.value as 'Yes' | 'No',
                          },
                        }))
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              {formState.registrationDetails.entries.map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xs tracking-[0.4em] text-indigo-300">NR-{index + 1}</span>
                    Nursing Registration {index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">Council / Licensing body</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                        placeholder="Council or licensing body name"
                        list="council-suggestions"
                        value={entry.councilName}
                        onChange={(e) => handleRegistrationChange(index, 'councilName', e.target.value)}
                      />
                    </div>
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                      placeholder="Registration number"
                      value={entry.registrationNumber}
                      onChange={(e) => handleRegistrationChange(index, 'registrationNumber', e.target.value)}
                    />
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">Date issued</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                        value={entry.issuedDate}
                        onChange={(e) => handleRegistrationChange(index, 'issuedDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">Expiry / renewal date</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                        value={entry.expiryDate}
                        onChange={(e) => handleRegistrationChange(index, 'expiryDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">Current status</label>
                      <select
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                        value={entry.status}
                        onChange={(e) => handleRegistrationChange(index, 'status', e.target.value)}
                      >
                        <option value="">Select status</option>
                        {registrationStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <datalist id="council-suggestions">
              {councilSuggestions.map((council) => (
                <option key={council} value={council} />
              ))}
            </datalist>
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
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200">Employer / hospital</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                        placeholder="Employer / hospital name"
                        list="employer-suggestions"
                        value={entry.employer}
                        onChange={(e) => handleEmploymentChange('employmentHistory', index, 'employer', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200">Job title / position</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                        placeholder="Job title / position"
                        list="job-role-suggestions"
                        value={entry.position}
                        onChange={(e) => handleEmploymentChange('employmentHistory', index, 'position', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200">Start date</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                        value={entry.dates.from}
                        onChange={(e) => handleEmploymentDateChange('employmentHistory', index, 'from', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200">End date</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                        value={entry.dates.to}
                        onChange={(e) => handleEmploymentDateChange('employmentHistory', index, 'to', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <datalist id="employer-suggestions">
              {employerSuggestions.map((employer) => (
                <option key={employer} value={employer} />
              ))}
            </datalist>
            <datalist id="job-role-suggestions">
              {jobRoleSuggestions.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
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
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">Employer / hospital</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        placeholder="Employer / hospital name"
                        list="employer-suggestions"
                        value={entry.employer}
                        onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'employer', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">Job title / position</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        placeholder="Job title / position"
                        list="job-role-suggestions"
                        value={entry.position}
                        onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'position', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">Start date</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        value={entry.dates.from}
                        onChange={(e) => handleEmploymentDateChange('canadaEmploymentHistory', index, 'from', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">End date</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        value={entry.dates.to}
                        onChange={(e) => handleEmploymentDateChange('canadaEmploymentHistory', index, 'to', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">Employment type</label>
                      <div className="flex flex-wrap gap-3">
                        {employmentTypeOptions.map((option) => (
                          <label
                            key={option}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${
                              entry.employmentType === option
                                ? 'border-sky-400 bg-sky-500/20 text-white'
                                : 'border-white/10 text-slate-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`employment-type-${index}`}
                              value={option}
                              className="text-sky-400 focus:ring-sky-500"
                              checked={entry.employmentType === option}
                              onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'employmentType', e.target.value)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">Approx. hours per month</label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        placeholder="e.g. 160"
                        value={entry.hoursPerMonth}
                        onChange={(e) => handleEmploymentChange('canadaEmploymentHistory', index, 'hoursPerMonth', e.target.value)}
                      />
                    </div>
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

