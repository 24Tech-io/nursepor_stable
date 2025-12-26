'use client';

import { useState, type FormEvent, type HTMLInputTypeAttribute } from 'react';
import type {
  DateRange,
  NursingCandidateFormPayload,
  NursingEducationEntry,
  NclexExamAttempt,
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

const programTypeSuggestions = [
  'GNM',
  'BSc Nursing',
  'Post Basic BSc Nursing',
  'MSc Nursing',
  'Diploma in Nursing',
]

const employmentTypeOptions: Array<
  NursingCandidateFormPayload['canadaEmploymentHistory'][number]['employmentType']
> = ['Full-time', 'Part-time', 'Casual', 'Contract'];

const registrationStatusOptions: Array<
  NursingCandidateFormPayload['registrationDetails']['entries'][number]['status']
> = ['Active', 'Pending', 'Inactive', 'Expired', 'Suspended'];

const createEducationEntry = (): NursingEducationEntry => ({
  institutionName: '',
  address: '',
  programType: '',
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

const createNclexAttempt = (): NclexExamAttempt => ({
  examDate: '',
  country: '',
  province: '',
  result: '',
});

const initialState: NursingCandidateFormPayload = {
  targetCountry: 'Canada',
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
  educationDetails: [createEducationEntry()],
  registrationDetails: {
    hasDisciplinaryAction: 'No',
    entries: [createRegistrationEntry()],
  },
  employmentHistory: [createExperienceEntry()],
  canadaEmploymentHistory: [createCanadaExperienceEntry()],
  nclexHistory: {
    hasTakenBefore: 'No',
    attempts: [],
  },
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

  const updateForm = (updater: (prev: NursingCandidateFormPayload) => NursingCandidateFormPayload) => {
    setFormState(updater);
  };

  const handlePersonalChange = (field: keyof NursingCandidateFormPayload['personalDetails'], value: string) => {
    updateForm((prev) => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [field]: value },
    }));
  };

  // Education Helpers
  const addEducation = () => {
    updateForm((prev) => ({
      ...prev,
      educationDetails: [...prev.educationDetails, createEducationEntry()],
    }));
  };

  const removeEducation = (index: number) => {
    updateForm((prev) => ({
      ...prev,
      educationDetails: prev.educationDetails.filter((_, i) => i !== index),
    }));
  };

  const updateEducation = (index: number, field: keyof NursingEducationEntry, value: any) => {
    updateForm((prev) => {
      const updated = [...prev.educationDetails];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, educationDetails: updated };
    });
  };

  // Registration Helpers
  const addRegistration = () => {
    updateForm((prev) => ({
      ...prev,
      registrationDetails: {
        ...prev.registrationDetails,
        entries: [...prev.registrationDetails.entries, createRegistrationEntry()],
      },
    }));
  };

  const removeRegistration = (index: number) => {
    updateForm((prev) => ({
      ...prev,
      registrationDetails: {
        ...prev.registrationDetails,
        entries: prev.registrationDetails.entries.filter((_, i) => i !== index),
      },
    }));
  };

  const updateRegistration = (index: number, field: string, value: string) => {
    updateForm((prev) => {
      const updated = [...prev.registrationDetails.entries];
      updated[index] = { ...updated[index], [field]: value } as any;
      return {
        ...prev,
        registrationDetails: { ...prev.registrationDetails, entries: updated },
      };
    });
  };

  // Experience Helpers
  const getExperienceArrayKey = () => (formState.targetCountry === 'Canada' ? 'canadaEmploymentHistory' : 'employmentHistory');

  const addExperience = () => {
    const key = getExperienceArrayKey();
    const newEntry = key === 'canadaEmploymentHistory' ? createCanadaExperienceEntry() : createExperienceEntry();
    updateForm((prev) => ({
      ...prev,
      [key]: [...(prev[key] as any), newEntry],
    }));
  };

  const removeExperience = (index: number) => {
    const key = getExperienceArrayKey();
    updateForm((prev) => ({
      ...prev,
      [key]: (prev[key] as any[]).filter((_, i) => i !== index),
    }));
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const key = getExperienceArrayKey();
    updateForm((prev) => {
      const updated = [...(prev[key] as any[])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [key]: updated };
    });
  };

  // NCLEX History Helpers
  const addNclexAttempt = () => {
    updateForm((prev) => ({
      ...prev,
      nclexHistory: {
        ...prev.nclexHistory,
        attempts: [...prev.nclexHistory.attempts, createNclexAttempt()],
      }
    }));
  }

  const removeNclexAttempt = (index: number) => {
    updateForm((prev) => ({
      ...prev,
      nclexHistory: {
        ...prev.nclexHistory,
        attempts: prev.nclexHistory.attempts.filter((_, i) => i !== index),
      }
    }));
  }

  const updateNclexAttempt = (index: number, field: keyof NclexExamAttempt, value: string) => {
    updateForm((prev) => {
      const updated = [...prev.nclexHistory.attempts];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        nclexHistory: {
          ...prev.nclexHistory,
          attempts: updated
        }
      }
    })
  }


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
      setFormState(initialState);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="relative z-10 mb-8 flex justify-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 flex gap-2 border border-white/20">
            {(['Canada', 'USA', 'Australia'] as const).map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => updateForm(prev => ({ ...prev, targetCountry: country }))}
                className={`px-6 py-2 rounded-xl transition-all duration-300 font-semibold ${formState.targetCountry === country
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                    : 'text-indigo-100 hover:bg-white/5'
                  }`}
              >
                {country}
              </button>
            ))}
          </div>
        </div>

        {variant === 'inline' && (
          <div className="text-center mb-10 relative z-10">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-indigo-200 font-semibold mb-3">
              <span className="w-10 h-px bg-indigo-400/60" />
              NCLEX-RN PROTOCOL for {formState.targetCountry.toUpperCase()}
              <span className="w-10 h-px bg-indigo-400/60" />
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Registration Information Form for {formState.targetCountry}
            </h2>
          </div>
        )}

        {variant === 'page' && (
          <div className="text-center mb-8 relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Registration Information Form for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">{formState.targetCountry}</span>
            </h2>
          </div>
        )}

        {statusMessage && (
          <div
            className={`mb-8 p-4 rounded-2xl border relative z-10 ${statusMessage.type === 'success'
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${formState.personalDetails.hasNameChange === option
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${formState.personalDetails.gender === option
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
            <p className="text-sm text-indigo-200 mb-4">Add all your nursing qualifications (Diploma, B.Sc, M.Sc, etc.) and school information.</p>
            <div className="space-y-6">
              {formState.educationDetails.map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur shadow-[0_0_20px_rgba(79,70,229,0.3)] relative">
                  {formState.educationDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="absolute top-4 right-4 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 px-2 py-1 rounded-lg transition"
                    >
                      Remove
                    </button>
                  )}
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 animate-pulse" />
                    Nursing Institution {index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">College Name</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3 w-full"
                        placeholder="Institution Name"
                        list="institution-suggestions"
                        value={entry.institutionName}
                        onChange={(e) => updateEducation(index, 'institutionName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">Qualification</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3 w-full"
                        placeholder="Degree / Program"
                        list="program-suggestions"
                        value={entry.programType}
                        onChange={(e) => updateEducation(index, 'programType', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">Full address</label>
                      <textarea
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3 resize-none min-h-[80px] w-full"
                        rows={2}
                        placeholder="Address with postal code"
                        value={entry.address}
                        onChange={(e) => updateEducation(index, 'address', e.target.value)}
                      />
                    </div>
                    {/* Calendar Dates */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">From</label>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3 w-full"
                          value={entry.studyPeriod.from}
                          onChange={(e) => updateEducation(index, 'studyPeriod', { ...entry.studyPeriod, from: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-indigo-200">To</label>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-fuchsia-400/60 focus:border-fuchsia-400/60 p-3 w-full"
                          value={entry.studyPeriod.to}
                          onChange={(e) => updateEducation(index, 'studyPeriod', { ...entry.studyPeriod, to: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addEducation}
                className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-indigo-300 hover:bg-white/5 hover:border-indigo-400/50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add another Nursing Institution
              </button>
            </div>
            <datalist id="institution-suggestions">
              {institutionSuggestions.map((institution) => (
                <option key={institution} value={institution} />
              ))}
            </datalist>
            <datalist id="program-suggestions">
              {programTypeSuggestions.map((prog) => (
                <option key={prog} value={prog} />
              ))}
            </datalist>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${formState.registrationDetails.hasDisciplinaryAction === option
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
                        updateForm((prev) => ({
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
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur relative">
                  {formState.registrationDetails.entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRegistration(index)}
                      className="absolute top-4 right-4 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 px-2 py-1 rounded-lg transition"
                    >
                      Remove
                    </button>
                  )}
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
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3 w-full"
                        placeholder="Council name"
                        list="council-suggestions"
                        value={entry.councilName}
                        onChange={(e) => updateRegistration(index, 'councilName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">Registration Number</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3 w-full"
                        placeholder="Reg #"
                        value={entry.registrationNumber}
                        onChange={(e) => updateRegistration(index, 'registrationNumber', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">
                        Date issued
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3 w-full"
                        value={entry.issuedDate}
                        onChange={(e) => updateRegistration(index, 'issuedDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">
                        Expiry / renewal date
                      </label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3 w-full"
                        value={entry.expiryDate}
                        onChange={(e) => updateRegistration(index, 'expiryDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-orange-200">Current status</label>
                      <select
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 p-3 w-full"
                        value={entry.status}
                        onChange={(e) => updateRegistration(index, 'status', e.target.value)}
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
              <button
                type="button"
                onClick={addRegistration}
                className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-orange-300 hover:bg-white/5 hover:border-orange-400/50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add another Nursing Registration
              </button>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 4: Employment / Experience Details</h3>
            </div>
            <p className="text-sm text-indigo-200 mb-4">Past 5 years history.</p>
            <div className="space-y-6">
              {(formState.targetCountry === 'Canada' ? formState.canadaEmploymentHistory : formState.employmentHistory).map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur relative">
                  {((formState.targetCountry === 'Canada' ? formState.canadaEmploymentHistory : formState.employmentHistory) as any).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="absolute top-4 right-4 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 px-2 py-1 rounded-lg transition"
                    >
                      Remove
                    </button>
                  )}
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xs tracking-[0.4em] text-teal-300">EXP-{index + 1}</span>
                    Nursing Experience {index + 1}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Employer Name */}
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">Employer / Hospital</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3 w-full"
                        list="employer-suggestions"
                        placeholder="Hospital or Org Name"
                        value={entry.employer}
                        onChange={(e) => updateExperience(index, 'employer', e.target.value)}
                      />
                    </div>

                    {/* Job Title (Common) - Though requested differently for various countries, usually needed for all. Will keep common. */}
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">Job Title / Position</label>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3 w-full"
                        placeholder="e.g. Staff Nurse"
                        value={entry.position}
                        onChange={(e) => updateExperience(index, 'position', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">Joined</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3 w-full"
                        value={entry.dates.from}
                        onChange={(e) => updateExperience(index, 'dates', { ...entry.dates, from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">Left (or blank if Present)</label>
                      <input
                        type="date"
                        className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3 w-full"
                        value={entry.dates.to}
                        onChange={(e) => updateExperience(index, 'dates', { ...entry.dates, to: e.target.value })}
                      />
                    </div>

                    {/* Canada Specific Fields */}
                    {formState.targetCountry === 'Canada' && (
                      <>
                        <div className="space-y-2">
                          <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">Employment Type</label>
                          <select
                            className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3 w-full"
                            value={(entry as any).employmentType}
                            onChange={(e) => updateExperience(index, 'employmentType', e.target.value)}
                          >
                            <option value="">Select Type</option>
                            {employmentTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs uppercase tracking-[0.3em] text-teal-200">Hours Per Month</label>
                          <input
                            type="number"
                            className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400/60 focus:border-teal-400/60 p-3 w-full"
                            placeholder="Approx. Total Hours"
                            value={(entry as any).hoursPerMonth}
                            onChange={(e) => updateExperience(index, 'hoursPerMonth', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addExperience}
                className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-teal-300 hover:bg-white/5 hover:border-teal-400/50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add another Experience
              </button>
            </div>
            <datalist id="employer-suggestions">
              {employerSuggestions.map((emp) => (
                <option key={emp} value={emp} />
              ))}
            </datalist>
          </div>
          )}

          {/* Section 5: NCLEX History - NEW */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/40">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white">Section 5: NCLEX-RN Exam History</h3>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Have you written the NCLEX-RN exam before?
              </label>
              <div className="flex flex-wrap gap-4">
                {['No', 'Yes'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border cursor-pointer ${formState.nclexHistory.hasTakenBefore === option
                        ? 'border-violet-400 bg-violet-500/20 text-white'
                        : 'border-white/10 text-slate-200'
                      }`}
                  >
                    <input
                      type="radio"
                      name="nclex-taken"
                      value={option}
                      className="text-violet-400 focus:ring-violet-500"
                      checked={formState.nclexHistory.hasTakenBefore === option}
                      onChange={(e) => updateForm(prev => ({ ...prev, nclexHistory: { ...prev.nclexHistory, hasTakenBefore: e.target.value as 'Yes' | 'No' } }))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {formState.nclexHistory.hasTakenBefore === 'Yes' && (
              <div className="space-y-6">
                {formState.nclexHistory.attempts.map((attempt, index) => (
                  <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 backdrop-blur relative">
                    {formState.nclexHistory.attempts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNclexAttempt(index)}
                        className="absolute top-4 right-4 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 px-2 py-1 rounded-lg transition"
                      >
                        Remove
                      </button>
                    )}
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span className="text-xs tracking-[0.4em] text-violet-300">ATTEMPT-{index + 1}</span>
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">Exam Date</label>
                        <input
                          type="date"
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3 w-full"
                          value={attempt.examDate}
                          onChange={(e) => updateNclexAttempt(index, 'examDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">Country</label>
                        <input
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3 w-full"
                          placeholder="e.g. USA"
                          list="country-suggestions"
                          value={attempt.country}
                          onChange={(e) => updateNclexAttempt(index, 'country', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">Province / State</label>
                        <input
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3 w-full"
                          placeholder="e.g. New York"
                          value={attempt.province}
                          onChange={(e) => updateNclexAttempt(index, 'province', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.3em] text-violet-200">Result</label>
                        <select
                          className="rounded-2xl border border-white/10 bg-slate-900/40 text-white focus:ring-2 focus:ring-violet-400/60 focus:border-violet-400/60 p-3 w-full"
                          value={attempt.result}
                          onChange={(e) => updateNclexAttempt(index, 'result', e.target.value)}
                        >
                          <option value="">Select Result</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addNclexAttempt}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-violet-300 hover:bg-white/5 hover:border-violet-400/50 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add another Attempt
                </button>
              </div>
            )}

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

          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
            <h4 className="text-white font-semibold mb-3">Document Submission Requirements</h4>
            <p className="text-slate-300 text-sm mb-4">
              Please email clear color photocopies of the following to <span className="text-indigo-300 select-all font-mono">nurses@nurseproacademy.ca</span>:
            </p>
            <ul className="list-disc list-inside text-slate-400 text-sm space-y-1 mb-6">
              <li>All nursing mark lists & transcripts</li>
              <li>Nursing registration / license documents</li>
              <li>Affidavit for name change (if applicable)</li>
              <li>10th and Plus Two certificates</li>
              <li>Passport (Color Copy)</li>
            </ul>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative pt-1">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={formState.documentChecklistAcknowledged}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      documentChecklistAcknowledged: e.target.checked,
                    }))
                  }
                />
                <div className="w-6 h-6 rounded-md border-2 border-slate-500 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors" />
                <svg
                  className="absolute top-1 left-0 w-6 h-6 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-slate-300 text-sm group-hover:text-slate-200 transition">
                I acknowledge the document submission requirements and certify that the information provided above is true and accurate.
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-6 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`
                px-8 py-4 rounded-2xl font-bold text-lg tracking-wide shadow-2xl transition-all duration-300
                ${isSubmitting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]'
                }
              `}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
