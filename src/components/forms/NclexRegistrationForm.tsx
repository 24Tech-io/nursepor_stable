'use client';

import { useState, type FormEvent, type HTMLInputTypeAttribute } from 'react';
import type {
  DateRange,
  NursingCandidateFormPayload,
  NursingEducationEntry,
  NclexExamAttempt,
  SchoolEntry,
  OtherSchoolEntry
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

const employmentTypeOptions: string[] = ['Full-time', 'Part-time', 'Casual', 'Contract'];

const registrationStatusOptions: string[] = ['Active', 'Pending', 'Inactive', 'Expired', 'Suspended'];

const createStructuredAddress = () => ({
  addressLine: '',
  city: '',
  postalCode: '',
  country: '',
});

const createEducationEntry = (): NursingEducationEntry => ({
  institutionName: '',
  address: createStructuredAddress(),
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

const createNclexAttempt = (attemptNumber = 1): NclexExamAttempt => ({
  examDate: '',
  country: '',
  province: '',
  result: '',
  attemptNumber,
});

const createSchoolEntry = (): SchoolEntry => ({
  institutionName: '',
  address: createStructuredAddress(),
  studyPeriod: { from: '', to: '' },
});

const createOtherSchoolEntry = (): SchoolEntry => ({
  ...createSchoolEntry(),
  gradeStudied: '',
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
  schoolDetails: {
    class10: createSchoolEntry(),
    class12: createSchoolEntry(),
    otherSchools: [],
  },
  educationDetails: [createEducationEntry()],
  registrationDetails: {
    hasDisciplinaryAction: 'No',
    entries: [createRegistrationEntry()],
  },
  employmentHistory: [createExperienceEntry()],
  canadaEmploymentHistory: [createCanadaExperienceEntry()],
  nclexExamHistory: {
    hasWrittenExam: 'No',
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

  const handleAddressChange = (field: 'addressLine' | 'city' | 'postalCode' | 'country', value: string) => {
    updateForm((prev) => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        address: { ...prev.personalDetails.address, [field]: value }
      }
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

  const updateEducationAddress = (index: number, field: string, value: string) => {
    updateForm((prev) => {
      const updated = [...prev.educationDetails];
      updated[index] = {
        ...updated[index],
        address: { ...updated[index].address, [field]: value }
      };
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

  // School Details Helpers
  const updateSchoolAddress = (section: 'class10' | 'class12' | 'other', index: number | null, field: string, value: string) => {
    setFormState((prev) => {
      if (section === 'other' && index !== null) {
        const updated = [...prev.schoolDetails.otherSchools];
        updated[index] = {
          ...updated[index],
          address: { ...updated[index].address, [field]: value }
        };
        return { ...prev, schoolDetails: { ...prev.schoolDetails, otherSchools: updated } };
      } else if (section !== 'other') {
        const key = section as 'class10' | 'class12';
        return {
          ...prev,
          schoolDetails: {
            ...prev.schoolDetails,
            [key]: {
              ...prev.schoolDetails[key],
              address: { ...prev.schoolDetails[key].address, [field]: value }
            }
          }
        };
      }
      return prev;
    });
  };

  const updateSchoolDetails = (section: 'class10' | 'class12', field: keyof SchoolEntry | string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      schoolDetails: {
        ...prev.schoolDetails,
        [section]: {
          ...prev.schoolDetails[section],
          [field]: value
        }
      }
    }));
  }

  const addOtherSchool = () => {
    setFormState((prev) => ({
      ...prev,
      schoolDetails: {
        ...prev.schoolDetails,
        otherSchools: [...prev.schoolDetails.otherSchools, createOtherSchoolEntry()],
      }
    }));
  };

  const removeOtherSchool = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      schoolDetails: {
        ...prev.schoolDetails,
        otherSchools: prev.schoolDetails.otherSchools.filter((_, i) => i !== index),
      }
    }));
  };

  const updateOtherSchool = (index: number, field: keyof (SchoolEntry & { gradeStudied: string }), value: any) => {
    setFormState((prev) => {
      const updated = [...prev.schoolDetails.otherSchools];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        schoolDetails: { ...prev.schoolDetails, otherSchools: updated }
      };
    });
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
        canadianImmigrationApplied: formState.targetCountry === 'Canada' ? canadianImmigrationApplied : undefined,
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
      setCanadianImmigrationApplied('');
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

  // Helper to render address fields
  const renderAddressFields = (
    address: { addressLine: string; city: string; postalCode: string; country: string },
    onChange: (field: string, value: string) => void
  ) => (
    <div className="grid grid-cols-2 gap-3 mt-3">
      <input
        className="col-span-2 rounded-xl border border-white/10 bg-slate-900/40 text-white p-2.5 text-sm"
        placeholder="Address Line"
        value={address.addressLine}
        onChange={(e) => onChange('addressLine', e.target.value)}
      />
      <input
        className="rounded-xl border border-white/10 bg-slate-900/40 text-white p-2.5 text-sm"
        placeholder="City"
        value={address.city}
        onChange={(e) => onChange('city', e.target.value)}
      />
      <input
        className="rounded-xl border border-white/10 bg-slate-900/40 text-white p-2.5 text-sm"
        placeholder="Postal Code"
        value={address.postalCode}
        onChange={(e) => onChange('postalCode', e.target.value)}
      />
      <select
        className="col-span-2 rounded-xl border border-white/10 bg-slate-900/40 text-white p-2.5 text-sm"
        value={address.country}
        onChange={(e) => onChange('country', e.target.value)}
      >
        <option value="">Select Country</option>
        {countrySuggestions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );

  return (
    <section
      id={variant !== 'modal' ? 'nclex-registration' : undefined}
      className={`${containerClasses} relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.2),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-20" />
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
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Registration Information Form for {formState.targetCountry}
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
            <p className="font-semibold">{statusMessage.message}</p>
            {statusMessage.reference && (
              <p className="text-sm mt-1">Ref: {statusMessage.reference}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12 relative z-10">

          {/* Section 1: Personal Details */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6">Personal / Identity Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {personalFields.filter(f => f.name !== 'address').map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">{field.label}</label>
                  {field.component === 'select' ? (
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white p-3"
                      value={formState.personalDetails[field.name] as string}
                      onChange={(e) => handlePersonalChange(field.name, e.target.value)}
                    >
                      <option value="">Select</option>
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.inputType || 'text'}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 text-white p-3"
                      value={formState.personalDetails[field.name] as string}
                      onChange={(e) => handlePersonalChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-200 mb-2">Current residential address</label>
                {renderAddressFields(formState.personalDetails.address, handleAddressChange)}
              </div>
            </div>
          </div>

          {/* Section: School Information */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6">School Information (Primary & High School)</h3>
            <div className="space-y-6">
              {/* 12th Grade */}
              <div className="border border-white/10 rounded-2xl p-5 bg-white/5">
                <h4 className="text-lg font-semibold text-white mb-4">Plus Two / 12th Grade</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase text-slate-300">School Name</label>
                    <input
                      className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                      value={formState.schoolDetails.class12.institutionName}
                      onChange={(e) => updateSchoolDetails('class12', 'institutionName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-slate-300">Dates Studied (From - To)</label>
                    <div className="flex gap-2 mt-1">
                      <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                        value={formState.schoolDetails.class12.studyPeriod.from}
                        onChange={(e) => updateSchoolDetails('class12', 'studyPeriod', { ...formState.schoolDetails.class12.studyPeriod, from: e.target.value })}
                      />
                      <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                        value={formState.schoolDetails.class12.studyPeriod.to}
                        onChange={(e) => updateSchoolDetails('class12', 'studyPeriod', { ...formState.schoolDetails.class12.studyPeriod, to: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase text-slate-300">Address</label>
                    {renderAddressFields(formState.schoolDetails.class12.address, (f, v) => updateSchoolAddress('class12', null, f, v))}
                  </div>
                </div>
              </div>

              {/* 10th Grade */}
              <div className="border border-white/10 rounded-2xl p-5 bg-white/5">
                <h4 className="text-lg font-semibold text-white mb-4">10th Grade</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase text-slate-300">School Name</label>
                    <input
                      className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                      value={formState.schoolDetails.class10.institutionName}
                      onChange={(e) => updateSchoolDetails('class10', 'institutionName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-slate-300">Dates Studied (From - To)</label>
                    <div className="flex gap-2 mt-1">
                      <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                        value={formState.schoolDetails.class10.studyPeriod.from}
                        onChange={(e) => updateSchoolDetails('class10', 'studyPeriod', { ...formState.schoolDetails.class10.studyPeriod, from: e.target.value })}
                      />
                      <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                        value={formState.schoolDetails.class10.studyPeriod.to}
                        onChange={(e) => updateSchoolDetails('class10', 'studyPeriod', { ...formState.schoolDetails.class10.studyPeriod, to: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase text-slate-300">Address</label>
                    {renderAddressFields(formState.schoolDetails.class10.address, (f, v) => updateSchoolAddress('class10', null, f, v))}
                  </div>
                </div>
              </div>

              {/* Other Schools */}
              {formState.schoolDetails.otherSchools.map((school, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 relative">
                  <button
                    type="button"
                    onClick={() => removeOtherSchool(index)}
                    className="absolute top-4 right-4 text-xs text-rose-300 hover:bg-rose-500/20 px-2 py-1 rounded-lg"
                  >
                    Remove
                  </button>
                  <h4 className="text-lg font-semibold text-white mb-4">Other School {index + 1}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase text-slate-300">Grade Studied</label>
                      <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={school.gradeStudied} onChange={(e) => updateOtherSchool(index, 'gradeStudied', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">School Name</label>
                      <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={school.institutionName} onChange={(e) => updateOtherSchool(index, 'institutionName', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-slate-300">Address</label>
                      {renderAddressFields(school.address, (f, v) => updateSchoolAddress('other', index, f, v))}
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-slate-300">Dates Studied</label>
                      <div className="flex gap-2 mt-1">
                        <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                          value={school.studyPeriod.from}
                          onChange={(e) => updateOtherSchool(index, 'studyPeriod', { ...school.studyPeriod, from: e.target.value })}
                        />
                        <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                          value={school.studyPeriod.to}
                          onChange={(e) => updateOtherSchool(index, 'studyPeriod', { ...school.studyPeriod, to: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" onClick={addOtherSchool} className="w-full py-3 border border-dashed border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition flex justify-center items-center gap-2">
                <span>+ Add Another School</span>
              </button>
            </div>
          </div>

          {/* Section 2: Nursing Institution Details */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6">Nursing Institution Details</h3>
            <div className="space-y-6">
              {formState.educationDetails.map((edu, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 relative">
                  {formState.educationDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="absolute top-4 right-4 text-xs text-rose-300 hover:bg-rose-500/20 px-2 py-1 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                  <h4 className="text-lg font-semibold text-white mb-4">Institution {index + 1}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-slate-300">College Name</label>
                      <input
                        className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        list="institution-suggestions"
                        value={edu.institutionName}
                        onChange={(e) => updateEducation(index, 'institutionName', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-slate-300">Address</label>
                      {renderAddressFields(edu.address, (f, v) => updateEducationAddress(index, f, v))}
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Qualification</label>
                      <input
                        className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        list="program-suggestions"
                        value={edu.programType}
                        onChange={(e) => updateEducation(index, 'programType', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Language of Instruction</label>
                      <input
                        className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={edu.languageOfInstruction}
                        onChange={(e) => updateEducation(index, 'languageOfInstruction', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Is College Operational?</label>
                      <select
                        className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={edu.isCollegeOperational}
                        onChange={(e) => updateEducation(index, 'isCollegeOperational', e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Duration (From - To)</label>
                      <div className="flex gap-2 mt-1">
                        <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                          value={edu.studyPeriod.from}
                          onChange={(e) => updateEducation(index, 'studyPeriod', { ...edu.studyPeriod, from: e.target.value })}
                        />
                        <input type="date" className="w-1/2 rounded-xl bg-slate-900/40 border border-white/10 text-white p-2"
                          value={edu.studyPeriod.to}
                          onChange={(e) => updateEducation(index, 'studyPeriod', { ...edu.studyPeriod, to: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addEducation} className="w-full py-3 border border-dashed border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition flex justify-center items-center gap-2">
                <span>+ Add another Nursing Institution</span>
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

          {/* Section 3: Registration */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6">Nursing Registration / License Details</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-200 mb-2">Have you ever been suspended/dismissed?</label>
              <div className="flex gap-4">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-white">
                    <input type="radio"
                      checked={formState.registrationDetails.hasDisciplinaryAction === opt}
                      onChange={() => updateForm(prev => ({ ...prev, registrationDetails: { ...prev.registrationDetails, hasDisciplinaryAction: opt as 'Yes' | 'No' } }))}
                    /> {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {formState.registrationDetails.entries.map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 relative">
                  {formState.registrationDetails.entries.length > 1 && (
                    <button type="button" onClick={() => removeRegistration(index)} className="absolute top-4 right-4 text-xs text-rose-300">Remove</button>
                  )}
                  <h4 className="text-lg font-semibold text-white mb-4">Registration {index + 1}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase text-slate-300">Council Name</label>
                      <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        list="council-suggestions"
                        value={entry.councilName} onChange={(e) => updateRegistration(index, 'councilName', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Reg Number</label>
                      <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={entry.registrationNumber} onChange={(e) => updateRegistration(index, 'registrationNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Issued</label>
                      <input type="date" className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={entry.issuedDate} onChange={(e) => updateRegistration(index, 'issuedDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Expiry</label>
                      <input type="date" className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={entry.expiryDate} onChange={(e) => updateRegistration(index, 'expiryDate', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-slate-300">Status</label>
                      <select className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={entry.status} onChange={(e) => updateRegistration(index, 'status', e.target.value)}>
                        <option value="">Select</option>
                        {registrationStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addRegistration} className="w-full py-3 border border-dashed border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition flex justify-center items-center gap-2">
                <span>+ Add another Registration</span>
              </button>
            </div>
            <datalist id="council-suggestions">
              {councilSuggestions.map((council) => (
                <option key={council} value={council} />
              ))}
            </datalist>
          </div>

          {/* Section: Employment */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6">Employment / Experience Details (Last 5 Years)</h3>
            <div className="space-y-6">
              {(formState.targetCountry === 'Canada' ? formState.canadaEmploymentHistory : formState.employmentHistory).map((entry, index) => (
                <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 relative">
                  {((formState.targetCountry === 'Canada' ? formState.canadaEmploymentHistory : formState.employmentHistory) as any).length > 1 && (
                    <button type="button" onClick={() => removeExperience(index)} className="absolute top-4 right-4 text-xs text-rose-300">Remove</button>
                  )}
                  <h4 className="text-lg font-semibold text-white mb-4">Experience {index + 1}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase text-slate-300">Employer / Hospital</label>
                      <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        list="employer-suggestions"
                        value={entry.employer} onChange={(e) => updateExperience(index, 'employer', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Joined</label>
                      <input type="date" className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={entry.dates.from} onChange={(e) => updateExperience(index, 'dates', { ...entry.dates, from: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-300">Left (Blank if Present)</label>
                      <input type="date" className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                        value={entry.dates.to} onChange={(e) => updateExperience(index, 'dates', { ...entry.dates, to: e.target.value })} />
                    </div>

                    {/* Canada Specifics */}
                    {formState.targetCountry === 'Canada' && (
                      <>
                        <div>
                          <label className="text-xs uppercase text-slate-300">Position</label>
                          <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                            value={entry.position} onChange={(e) => updateExperience(index, 'position', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs uppercase text-slate-300">Employment Type</label>
                          <select className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                            value={(entry as any).employmentType} onChange={(e) => updateExperience(index, 'employmentType', e.target.value)}>
                            <option value="">Select</option>
                            {employmentTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs uppercase text-slate-300">Hours Per Month</label>
                          <input type="number" className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                            value={(entry as any).hoursPerMonth} onChange={(e) => updateExperience(index, 'hoursPerMonth', e.target.value)} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addExperience} className="w-full py-3 border border-dashed border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition flex justify-center items-center gap-2">
                <span>+ Add another Experience</span>
              </button>
            </div>
            <datalist id="employer-suggestions">
              {employerSuggestions.map((emp) => (
                <option key={emp} value={emp} />
              ))}
            </datalist>
          </div>

          {/* NCLEX History */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-6">NCLEX-RN Exam History</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-200 mb-2">Have you written the NCLEX-RN exam before?</label>
              <div className="flex gap-4">
                {['Yes', 'No'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-white">
                    <input type="radio"
                      checked={formState.nclexExamHistory.hasWrittenExam === opt}
                      onChange={(e) => handleNclexExamChange('hasWrittenExam', e.target.value as 'Yes' | 'No')}
                    /> {opt}
                  </label>
                ))}
              </div>
            </div>

            {formState.nclexExamHistory.hasWrittenExam === 'Yes' && (
              <div className="space-y-6">
                {formState.nclexExamHistory.attempts.map((attempt, index) => (
                  <div key={index} className="border border-white/10 rounded-2xl p-5 bg-white/5 relative">
                    {formState.nclexExamHistory.attempts.length > 1 && (
                      <button type="button" onClick={() => removeNclexAttempt(index)} className="absolute top-4 right-4 text-xs text-rose-300">Remove</button>
                    )}
                    <h4 className="text-lg font-semibold text-white mb-4">Attempt {attempt.attemptNumber}</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase text-slate-300">Exam Date</label>
                        <input type="date" className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                          value={attempt.examDate} onChange={(e) => handleNclexAttemptChange(index, 'examDate', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-slate-300">Country</label>
                        <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                          list="country-suggestions"
                          value={attempt.country} onChange={(e) => handleNclexAttemptChange(index, 'country', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-slate-300">Province / State</label>
                        <input className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                          value={attempt.province} onChange={(e) => handleNclexAttemptChange(index, 'province', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-slate-300">Result</label>
                        <select className="w-full rounded-xl bg-slate-900/40 border border-white/10 text-white p-3 mt-1"
                          value={attempt.result} onChange={(e) => handleNclexAttemptChange(index, 'result', e.target.value)}>
                          <option value="">Select</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addNclexAttempt} className="w-full py-3 border border-dashed border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition flex justify-center items-center gap-2">
                  <span>+ Add another Attempt</span>
                </button>
              </div>
            )}
          </div>

          {/* Canadian Immigration - Only for Canada */}
          {formState.targetCountry === 'Canada' && (
            <div className="p-6 bg-teal-900/20 border border-teal-500/30 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-4">Canadian Immigration</h3>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Have you applied for Canadian Immigration?</label>
              <div className="flex gap-4">
                {['Yes', 'No'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-white">
                    <input type="radio"
                      checked={canadianImmigrationApplied === opt}
                      onChange={(e) => setCanadianImmigrationApplied(e.target.value as 'Yes' | 'No')}
                    /> {opt}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Document Submission & Submit */}
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
            <h4 className="text-white font-semibold mb-3">Document Submission Requirements</h4>
            <ul className="list-disc list-inside text-slate-400 text-sm space-y-1 mb-6">
              <li>All nursing mark lists & transcripts</li>
              <li>Nursing registration / license documents</li>
              <li>Affidavit for name change (if applicable)</li>
              <li>10th and Plus Two certificates</li>
              <li>Passport (Color Copy)</li>
            </ul>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="mt-1" checked={formState.documentChecklistAcknowledged}
                onChange={(e) => setFormState(prev => ({ ...prev, documentChecklistAcknowledged: e.target.checked }))} />
              <span className="text-slate-300 text-sm">I acknowledge the document submission requirements.</span>
            </label>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 ${isSubmitting ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white hover:scale-[1.02]'}`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>

        </form>
      </div>
    </section>
  );
}
