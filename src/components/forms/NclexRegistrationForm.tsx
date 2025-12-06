'use client';

import { useState, type FormEvent, type HTMLInputTypeAttribute } from 'react';
import type {
  DateRange,
  NursingCandidateFormPayload,
  NursingEducationEntry,
  StructuredAddress,
  NclexExamAttempt,
  OtherSchoolEntry,
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

const employmentTypeOptions: Array<
  NursingCandidateFormPayload['canadaEmploymentHistory'][number]['employmentType']
> = ['Full-time', 'Part-time', 'Casual', 'Contract'];

const registrationStatusOptions: Array<
  NursingCandidateFormPayload['registrationDetails']['entries'][number]['status']
> = ['Active', 'Pending', 'Inactive', 'Expired', 'Suspended'];

const educationSections = [
  { key: 'gnm', label: 'GNM – General Nursing and Midwifery', programType: 'GNM' },
  { key: 'bsc', label: 'BSc Nursing', programType: 'BSc Nursing' },
  { key: 'postBasic', label: 'Post Basic BSc Nursing', programType: 'Post Basic BSc Nursing' },
  { key: 'msc', label: 'MSc Nursing', programType: 'MSc Nursing' },
  { key: 'plusTwo', label: 'Plus Two / 12th Grade', programType: 'Plus Two / 12th Grade' },
  {
    key: 'tenthGrade',
    label: '10th Grade / Secondary School',
    programType: '10th Grade / Secondary School',
  },
  {
    key: 'primaryHighSchool',
    label: 'Primary and High School (Grades 1–10)',
    programType: 'Primary & High School',
  },
] as const;

const programOptions = Array.from(
  new Set<string>([
    ...educationSections.map((section) => section.programType),
    'Diploma in Nursing',
    'Bridge Program',
    'Other',
  ])
);

const createStructuredAddress = (): StructuredAddress => ({
  addressLine: '',
  city: '',
  postalCode: '',
  country: '',
});

const createEducationEntry = (programType: string) => ({
  institutionName: '',
  address: createStructuredAddress(),
  programType,
  studyPeriod: { from: '', to: '' },
  languageOfInstruction: '',
  isCollegeOperational: '',
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

const createNclexAttempt = (attemptNumber: number): NclexExamAttempt => ({
  examDate: '',
  country: '',
  province: '',
  state: '',
  result: '',
  attemptNumber,
});

const createOtherSchoolEntry = (): OtherSchoolEntry => ({
  gradeStudied: '',
  institutionName: '',
  address: createStructuredAddress(),
  studyPeriod: { from: '', to: '' },
});

const initialState: NursingCandidateFormPayload = {
  country: 'Canada',
  personalDetails: {
    firstName: '',
    lastName: '',
    collegeNameVariant: '',
    hasNameChange: 'No',
    nameChangeDetails: '',
    needsAffidavit: false,
    maidenName: '',
    motherMaidenName: '',
    dateOfBirth: '',
    placeOfBirth: '',
    gender: 'Female',
    address: createStructuredAddress(),
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
  nclexExamHistory: {
    hasWrittenExam: 'No',
    attempts: [],
  },
  employmentHistory: [createExperienceEntry(), createExperienceEntry(), createExperienceEntry()],
  canadaEmploymentHistory: [
    createCanadaExperienceEntry(),
    createCanadaExperienceEntry(),
    createCanadaExperienceEntry(),
  ],
  otherSchools: [],
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
  const [selectedCountry, setSelectedCountry] = useState<'USA' | 'Canada' | 'Australia'>('Canada');
  const [canadianImmigrationApplied, setCanadianImmigrationApplied] = useState<'Yes' | 'No' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    message: string;
    reference?: string;
  } | null>(null);

  const handlePersonalChange = (
    field: keyof NursingCandidateFormPayload['personalDetails'],
    value: string | boolean | StructuredAddress
  ) => {
    setFormState((prev: NursingCandidateFormPayload) => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        [field]: value,
      },
    }));
  };

  const handleAddressChange = (
    addressType: 'personal' | 'education' | 'otherSchool',
    sectionKey?: keyof typeof formState.educationDetails | number,
    field: keyof StructuredAddress = 'addressLine',
    value: string = ''
  ) => {
    if (addressType === 'personal') {
      setFormState((prev) => ({
        ...prev,
        personalDetails: {
          ...prev.personalDetails,
          address: {
            ...prev.personalDetails.address,
            [field]: value,
          },
        },
      }));
    } else if (addressType === 'education' && sectionKey !== undefined) {
      setFormState((prev) => ({
        ...prev,
        educationDetails: {
          ...prev.educationDetails,
          [sectionKey]: {
            ...prev.educationDetails[sectionKey as keyof typeof prev.educationDetails],
            address: {
              ...prev.educationDetails[sectionKey as keyof typeof prev.educationDetails].address,
              [field]: value,
            },
          },
        },
      }));
    } else if (addressType === 'otherSchool' && typeof sectionKey === 'number') {
      setFormState((prev) => {
        const updated = [...prev.otherSchools];
        updated[sectionKey] = {
          ...updated[sectionKey],
          address: {
            ...updated[sectionKey].address,
            [field]: value,
          },
        };
        return { ...prev, otherSchools: updated };
      });
    }
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

  const handleNclexExamChange = (field: 'hasWrittenExam', value: 'Yes' | 'No') => {
    setFormState((prev) => ({
      ...prev,
      nclexExamHistory: {
        ...prev.nclexExamHistory,
        [field]: value,
        attempts: value === 'No' ? [] : (prev.nclexExamHistory.attempts.length === 0 ? [createNclexAttempt(1)] : prev.nclexExamHistory.attempts),
      },
    }));
  };

  const handleNclexAttemptChange = (
    index: number,
    field: keyof NclexExamAttempt,
    value: string
  ) => {
    setFormState((prev) => {
      const updated = [...prev.nclexExamHistory.attempts];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        nclexExamHistory: {
          ...prev.nclexExamHistory,
          attempts: updated,
        },
      };
    });
  };

  const addNclexAttempt = () => {
    setFormState((prev) => ({
      ...prev,
      nclexExamHistory: {
        ...prev.nclexExamHistory,
        attempts: [...prev.nclexExamHistory.attempts, createNclexAttempt(prev.nclexExamHistory.attempts.length + 1)],
      },
    }));
  };

  const removeNclexAttempt = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      nclexExamHistory: {
        ...prev.nclexExamHistory,
        attempts: prev.nclexExamHistory.attempts.filter((_, i) => i !== index).map((attempt, i) => ({
          ...attempt,
          attemptNumber: i + 1,
        })),
      },
    }));
  };

  const handleOtherSchoolChange = (
    index: number,
    field: keyof OtherSchoolEntry,
    value: string | DateRange
  ) => {
    setFormState((prev) => {
      const updated = [...prev.otherSchools];
      updated[index] = {
        ...updated[index],
        [field]: value as OtherSchoolEntry[keyof OtherSchoolEntry],
      };
      return { ...prev, otherSchools: updated };
    });
  };

  const handleOtherSchoolDateChange = (
    index: number,
    boundary: keyof DateRange,
    value: string
  ) => {
    setFormState((prev) => {
      const updated = [...prev.otherSchools];
      updated[index] = {
        ...updated[index],
        studyPeriod: {
          ...updated[index].studyPeriod,
          [boundary]: value,
        },
      };
      return { ...prev, otherSchools: updated };
    });
  };

  const addOtherSchool = () => {
    setFormState((prev) => ({
      ...prev,
      otherSchools: [...prev.otherSchools, createOtherSchoolEntry()],
    }));
  };

  const removeOtherSchool = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      otherSchools: prev.otherSchools.filter((_, i) => i !== index),
    }));
  };

  const validateRequiredFields = () => {
    const missing = personalFields.filter(
      (field) =>
        field.required &&
        !formState.personalDetails[field.name as keyof typeof formState.personalDetails]
    );
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
      const submissionData = {
        ...formState,
        country: selectedCountry,
        canadianImmigrationApplied: selectedCountry === 'Canada' ? canadianImmigrationApplied : undefined,
      };
      
      const response = await fetch('/api/nursing-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to submit form');
      }

      setStatusMessage({
        type: 'success',
        message:
          'Thank you! Your NCLEX-RN registration information has been received. Our team will contact you shortly.',
        reference: result.referenceNumber,
      });
      // Reset form to initial state
      setFormState({
        ...initialState,
        country: 'Canada',
      });
      setSelectedCountry('Canada');
      setCanadianImmigrationApplied('');
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
    <section
      id={variant !== 'modal' ? 'nclex-registration' : undefined}
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
              Provide accurate information as seen on official records. Fields may be marked “N/A”
              if they do not apply.
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
          {/* Country Selector */}
          <div className="border border-white/20 rounded-2xl p-6 bg-gradient-to-br from-slate-900/80 to-indigo-900/40 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Registration Country</h3>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Select the country for which you are registering <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  const country = e.target.value as 'USA' | 'Canada' | 'Australia';
                  setSelectedCountry(country);
                  setFormState((prev) => ({ ...prev, country }));
                  // Reset Canadian immigration question if not Canada
                  if (country !== 'Canada') {
                    setCanadianImmigrationApplied('');
                  }
                }}
                className="w-full rounded-2xl border border-white/20 bg-slate-900/60 text-white focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3 backdrop-blur"
                required
              >
                <option value="Canada">Canada</option>
                <option value="USA">United States (USA)</option>
                <option value="Australia">Australia</option>
              </select>
              <p className="text-xs text-slate-400 mt-2">
                The form will automatically adjust based on your selected country's requirements.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l9-5-9-5-9 5 9 5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l6.16-3.422A12 12 0 0112 21a12 12 0 01-6.16-10.422L12 14z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">
                Section 1: Personal / Identity Details
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {personalFields.map((field) => {
                const value = formState.personalDetails[field.name];
                const isTextarea = field.component === 'textarea';
                const isSelect = field.component === 'select';
                const placeholder =
                  field.placeholder ?? 'Enter details exactly as on official documents';
                return (
                  <div key={field.name} className={isTextarea ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
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
                <label className="block text-sm font-semibold text-slate-400 mb-3 tracking-wide uppercase">
                  Any name change
                </label>
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
                {formState.personalDetails.hasNameChange === 'Yes' && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">
                        <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                          If Yes – what's the name
                        </span>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                        placeholder="Enter the name as it appears on documents"
                        value={formState.personalDetails.nameChangeDetails || ''}
                        onChange={(e) => handlePersonalChange('nameChangeDetails', e.target.value)}
                        required
                      />
                    </div>
                    <label className="flex items-start space-x-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 rounded border-indigo-400/70 bg-transparent text-indigo-400 focus:ring-indigo-500/70"
                        checked={formState.personalDetails.needsAffidavit}
                        onChange={(e) => handlePersonalChange('needsAffidavit', e.target.checked)}
                      />
                      <span>
                        I understand that I need to provide an affidavit for this name change
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Structured Address Fields */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                    Current Residential Address
                  </span>
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-300 mb-1">Address Line</label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                      placeholder="Street address, apartment, suite, etc."
                      value={formState.personalDetails.address.addressLine}
                      onChange={(e) => handleAddressChange('personal', undefined, 'addressLine', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">City</label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                      placeholder="City"
                      value={formState.personalDetails.address.city}
                      onChange={(e) => handleAddressChange('personal', undefined, 'city', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Postal Code / PIN</label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                      placeholder="Postal code or PIN"
                      value={formState.personalDetails.address.postalCode}
                      onChange={(e) => handleAddressChange('personal', undefined, 'postalCode', e.target.value)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-300 mb-1">Country</label>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 p-3 backdrop-blur"
                      value={formState.personalDetails.address.country}
                      onChange={(e) => handleAddressChange('personal', undefined, 'country', e.target.value)}
                      required
                    >
                      <option value="">Select Country</option>
                      {countrySuggestions.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-400 mb-3 tracking-wide uppercase">
                  Gender
                </label>
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
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 2: Education Details</h3>
            </div>
            <p className="text-sm text-indigo-200 mb-4">
              Fill in the programs that apply to you. Use “N/A” if not applicable.
            </p>
            <div className="space-y-6">
              {educationSections.map((section) => (
                <div
                  key={section.key}
                  className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                >
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 animate-pulse" />
                    {section.label}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">
                        Institution
                      </label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                        placeholder="College / School name"
                        list="institution-suggestions"
                        value={
                          formState.educationDetails[
                            section.key as keyof typeof formState.educationDetails
                          ].institutionName
                        }
                        onChange={(e) =>
                          handleEducationChange(
                            section.key as keyof typeof formState.educationDetails,
                            'institutionName',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">
                        Program / Degree type
                      </label>
                      <select
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                        value={
                          formState.educationDetails[
                            section.key as keyof typeof formState.educationDetails
                          ].programType
                        }
                        onChange={(e) =>
                          handleEducationChange(
                            section.key as keyof typeof formState.educationDetails,
                            'programType',
                            e.target.value
                          )
                        }
                      >
                        {programOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">
                        Address
                      </label>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                            placeholder="Address line"
                            value={
                              formState.educationDetails[
                                section.key as keyof typeof formState.educationDetails
                              ].address.addressLine
                            }
                            onChange={(e) =>
                              handleAddressChange(
                                'education',
                                section.key as keyof typeof formState.educationDetails,
                                'addressLine',
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                            placeholder="City"
                            value={
                              formState.educationDetails[
                                section.key as keyof typeof formState.educationDetails
                              ].address.city
                            }
                            onChange={(e) =>
                              handleAddressChange(
                                'education',
                                section.key as keyof typeof formState.educationDetails,
                                'city',
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                            placeholder="Postal Code / PIN"
                            value={
                              formState.educationDetails[
                                section.key as keyof typeof formState.educationDetails
                              ].address.postalCode
                            }
                            onChange={(e) =>
                              handleAddressChange(
                                'education',
                                section.key as keyof typeof formState.educationDetails,
                                'postalCode',
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <select
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                            value={
                              formState.educationDetails[
                                section.key as keyof typeof formState.educationDetails
                              ].address.country
                            }
                            onChange={(e) =>
                              handleAddressChange(
                                'education',
                                section.key as keyof typeof formState.educationDetails,
                                'country',
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select Country</option>
                            {countrySuggestions.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">
                          Language of instruction
                        </label>
                        <select
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                          value={
                            formState.educationDetails[
                              section.key as keyof typeof formState.educationDetails
                            ].languageOfInstruction || ''
                          }
                          onChange={(e) =>
                            handleEducationChange(
                              section.key as keyof typeof formState.educationDetails,
                              'languageOfInstruction',
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select language</option>
                          {languageOptions.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">
                          Is the college still operational?
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {['Yes', 'No'].map((option) => (
                            <label
                              key={option}
                              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${
                                formState.educationDetails[
                                  section.key as keyof typeof formState.educationDetails
                                ].isCollegeOperational === option
                                  ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white'
                                  : 'border-white/10 text-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`college-operational-${section.key}`}
                                value={option}
                                className="text-fuchsia-400 focus:ring-fuchsia-500"
                                checked={
                                  formState.educationDetails[
                                    section.key as keyof typeof formState.educationDetails
                                  ].isCollegeOperational === option
                                }
                                onChange={(e) =>
                                  handleEducationChange(
                                    section.key as keyof typeof formState.educationDetails,
                                    'isCollegeOperational',
                                    e.target.value
                                  )
                                }
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">
                          Study period — from
                        </label>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                          value={
                            formState.educationDetails[
                              section.key as keyof typeof formState.educationDetails
                            ].studyPeriod.from
                          }
                          onChange={(e) =>
                            handleEducationDateChange(
                              section.key as keyof typeof formState.educationDetails,
                              'from',
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">
                          Study period — to
                        </label>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3"
                          value={
                            formState.educationDetails[
                              section.key as keyof typeof formState.educationDetails
                            ].studyPeriod.to
                          }
                          onChange={(e) =>
                            handleEducationDateChange(
                              section.key as keyof typeof formState.educationDetails,
                              'to',
                              e.target.value
                            )
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

          {/* Other Schools Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Other Schools</h3>
            </div>
            <p className="text-sm text-teal-100 mb-4">
              Add any additional schools or educational institutions not covered above.
            </p>
            <div className="space-y-6">
              {formState.otherSchools.map((school, index) => (
                <div
                  key={index}
                  className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-teal-900/40 to-cyan-900/30 backdrop-blur"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Other School {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeOtherSchool(index)}
                      className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">
                        Grade Studied
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                        placeholder="e.g., Grade 8, Grade 9, etc."
                        value={school.gradeStudied}
                        onChange={(e) => handleOtherSchoolChange(index, 'gradeStudied', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">
                        Institution Name
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                        placeholder="School name"
                        value={school.institutionName}
                        onChange={(e) => handleOtherSchoolChange(index, 'institutionName', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">
                        Address
                      </label>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                            placeholder="Address line"
                            value={school.address.addressLine}
                            onChange={(e) => handleAddressChange('otherSchool', index, 'addressLine', e.target.value)}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                            placeholder="City"
                            value={school.address.city}
                            onChange={(e) => handleAddressChange('otherSchool', index, 'city', e.target.value)}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                            placeholder="Postal Code / PIN"
                            value={school.address.postalCode}
                            onChange={(e) => handleAddressChange('otherSchool', index, 'postalCode', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <select
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                            value={school.address.country}
                            onChange={(e) => handleAddressChange('otherSchool', index, 'country', e.target.value)}
                          >
                            <option value="">Select Country</option>
                            {countrySuggestions.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">
                        Study Period — From
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                        value={school.studyPeriod.from}
                        onChange={(e) => handleOtherSchoolDateChange(index, 'from', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">
                        Study Period — To
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3"
                        value={school.studyPeriod.to}
                        onChange={(e) => handleOtherSchoolDateChange(index, 'to', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addOtherSchool}
                className="w-full py-2 border border-teal-500/50 text-teal-400 font-bold rounded-lg hover:bg-teal-500/10 transition"
              >
                + Add Other School
              </button>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">
                Section 3: Registration / License Details
              </h3>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Have you ever been suspended, dismissed, or faced disciplinary action by any nursing
                council?
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
                <div
                  key={index}
                  className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur"
                >
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xs tracking-[0.4em] text-indigo-300">NR-{index + 1}</span>
                    Nursing Registration {index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">
                        Council / Licensing body
                      </label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                        placeholder="Council or licensing body name"
                        list="council-suggestions"
                        value={entry.councilName}
                        onChange={(e) =>
                          handleRegistrationChange(index, 'councilName', e.target.value)
                        }
                      />
                    </div>
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                      placeholder="Registration number"
                      value={entry.registrationNumber}
                      onChange={(e) =>
                        handleRegistrationChange(index, 'registrationNumber', e.target.value)
                      }
                    />
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">
                        Date issued
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                        value={entry.issuedDate}
                        onChange={(e) =>
                          handleRegistrationChange(index, 'issuedDate', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">
                        Expiry / renewal date
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3"
                        value={entry.expiryDate}
                        onChange={(e) =>
                          handleRegistrationChange(index, 'expiryDate', e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">
                        Current status
                      </label>
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

          {/* NCLEX-RN Exam History Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">NCLEX-RN Exam History</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Have you ever written the NCLEX-RN exam before? <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  {['Yes', 'No'].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${
                        formState.nclexExamHistory.hasWrittenExam === option
                          ? 'border-violet-400 bg-violet-500/20 text-white'
                          : 'border-white/10 text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="has-written-nclex"
                        className="text-violet-400 focus:ring-violet-500"
                        value={option}
                        checked={formState.nclexExamHistory.hasWrittenExam === option}
                        onChange={(e) => handleNclexExamChange('hasWrittenExam', e.target.value as 'Yes' | 'No')}
                        required
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formState.nclexExamHistory.hasWrittenExam === 'Yes' && (
                <div className="space-y-6">
                  {formState.nclexExamHistory.attempts.map((attempt, index) => (
                    <div
                      key={index}
                      className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-violet-900/40 to-purple-900/30 backdrop-blur"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white">
                          Attempt {attempt.attemptNumber}
                        </h4>
                        {formState.nclexExamHistory.attempts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeNclexAttempt(index)}
                            className="px-3 py-1 text-xs text-red-400 hover:text-red-300 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">
                            Exam Date <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="date"
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3"
                            value={attempt.examDate}
                            onChange={(e) => handleNclexAttemptChange(index, 'examDate', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">
                            Country <span className="text-red-400">*</span>
                          </label>
                          <select
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3"
                            value={attempt.country}
                            onChange={(e) => handleNclexAttemptChange(index, 'country', e.target.value)}
                            required
                          >
                            <option value="">Select Country</option>
                            {countrySuggestions.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(selectedCountry === 'Canada' || attempt.country === 'Canada') && (
                          <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">
                              Province
                            </label>
                            <input
                              type="text"
                              className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3"
                              placeholder="Province"
                              value={attempt.province || ''}
                              onChange={(e) => handleNclexAttemptChange(index, 'province', e.target.value)}
                            />
                          </div>
                        )}
                        {(selectedCountry === 'USA' || attempt.country === 'United States') && (
                          <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">
                              State
                            </label>
                            <input
                              type="text"
                              className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3"
                              placeholder="State"
                              value={attempt.state || ''}
                              onChange={(e) => handleNclexAttemptChange(index, 'state', e.target.value)}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">
                            Result
                          </label>
                          <select
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3"
                            value={attempt.result || ''}
                            onChange={(e) => handleNclexAttemptChange(index, 'result', e.target.value)}
                          >
                            <option value="">Select Result</option>
                            <option value="Pass">Pass</option>
                            <option value="Fail">Fail</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addNclexAttempt}
                    className="w-full py-2 border border-violet-500/50 text-violet-400 font-bold rounded-lg hover:bg-violet-500/10 transition"
                  >
                    + Add Another Attempt
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 4 - USA & Australia Employment */}
          {(selectedCountry === 'USA' || selectedCountry === 'Australia') && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">
                Section 4: Employment History – {selectedCountry === 'USA' ? 'USA' : 'Australia'}
              </h3>
            </div>
            <p className="text-sm text-cyan-100 mb-4">
              Provide the most recent nursing roles relevant for NCLEX-RN verification.
            </p>
            <div className="space-y-6">
              {formState.employmentHistory.map((entry, index) => (
                <div
                  key={index}
                  className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-slate-900/60 to-emerald-900/20 backdrop-blur"
                >
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Nursing Experience {index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200">
                        Employer / hospital
                      </label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                        placeholder="Employer / hospital name"
                        list="employer-suggestions"
                        value={entry.employer}
                        onChange={(e) =>
                          handleEmploymentChange(
                            'employmentHistory',
                            index,
                            'employer',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200">
                        Start date
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                        value={entry.dates.from}
                        onChange={(e) =>
                          handleEmploymentDateChange(
                            'employmentHistory',
                            index,
                            'from',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200">
                        End date (or "Present")
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 p-3"
                        value={entry.dates.to}
                        onChange={(e) =>
                          handleEmploymentDateChange(
                            'employmentHistory',
                            index,
                            'to',
                            e.target.value
                          )
                        }
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
          )}

          {/* Section 5 - Canada Employment */}
          {selectedCountry === 'Canada' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">
                Section 5: Employment Details – Canada
              </h3>
            </div>
            <p className="text-sm text-sky-100 mb-4">
              Include hospitals, clinics, or community health agencies (last 5 years).
            </p>
            <div className="space-y-6">
              {formState.canadaEmploymentHistory.map((entry, index) => (
                <div
                  key={index}
                  className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-blue-900/40 to-violet-900/30 backdrop-blur"
                >
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Canada Nursing Experience {index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">
                        Employer / hospital
                      </label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        placeholder="Employer / hospital name"
                        list="employer-suggestions"
                        value={entry.employer}
                        onChange={(e) =>
                          handleEmploymentChange(
                            'canadaEmploymentHistory',
                            index,
                            'employer',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">
                        Job title / position
                      </label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        placeholder="Job title / position"
                        list="job-role-suggestions"
                        value={entry.position}
                        onChange={(e) =>
                          handleEmploymentChange(
                            'canadaEmploymentHistory',
                            index,
                            'position',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">
                        Start date
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        value={entry.dates.from}
                        onChange={(e) =>
                          handleEmploymentDateChange(
                            'canadaEmploymentHistory',
                            index,
                            'from',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">
                        End date
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        value={entry.dates.to}
                        onChange={(e) =>
                          handleEmploymentDateChange(
                            'canadaEmploymentHistory',
                            index,
                            'to',
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">
                        Employment type
                      </label>
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
                              onChange={(e) =>
                                handleEmploymentChange(
                                  'canadaEmploymentHistory',
                                  index,
                                  'employmentType',
                                  e.target.value
                                )
                              }
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-sky-200">
                        Approx. hours per month
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60 p-3"
                        placeholder="e.g. 160"
                        value={entry.hoursPerMonth}
                        onChange={(e) =>
                          handleEmploymentChange(
                            'canadaEmploymentHistory',
                            index,
                            'hoursPerMonth',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Canadian Immigration Question - Only for Canada */}
          {selectedCountry === 'Canada' && (
          <div className="border border-white/20 rounded-2xl p-6 bg-gradient-to-br from-slate-900/80 to-teal-900/40 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/40">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">
                Canadian Immigration Status
              </h3>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Have you applied for Canadian Immigration? <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {['Yes', 'No'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${
                      canadianImmigrationApplied === option
                        ? 'border-teal-400 bg-teal-500/20 text-white'
                        : 'border-white/10 text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="canadian-immigration"
                      className="text-teal-400 focus:ring-teal-500"
                      value={option}
                      checked={canadianImmigrationApplied === option}
                      onChange={(e) => setCanadianImmigrationApplied(e.target.value as 'Yes' | 'No')}
                      required
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Document Submission Checklist
            </h4>
            <p className="text-sm text-indigo-100">
              Email colour copies of the following to{' '}
              <span className="font-semibold text-white">nurses@nurseproacademy.ca</span>:
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
              <span>
                I confirm I will email the required documents to the NursePro Academy team.
              </span>
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
