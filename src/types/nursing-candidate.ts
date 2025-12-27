export interface DateRange {
  from: string;
  to: string;
}

export interface SchoolEntry {
  institutionName: string;
  address: StructuredAddress;
  studyPeriod: DateRange;
  gradeStudied?: string; // For "Other Schools"
}

export interface StructuredAddress {
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface NursingPersonalDetails {
  firstName: string;
  lastName: string;
  collegeNameVariant: string;
  hasNameChange: 'Yes' | 'No';
  nameChangeDetails?: string; // If Yes – what's the name
  needsAffidavit: boolean; // Affidavit reminder checkbox
  maidenName: string;
  motherMaidenName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  address: StructuredAddress;
  phoneNumber: string;
  email: string;
  firstLanguage: string;
}

export interface NursingEducationEntry {
  institutionName: string;
  address: StructuredAddress;
  programType: string;
  studyPeriod: DateRange;
  languageOfInstruction?: string;
  isCollegeOperational?: 'Yes' | 'No';
}

export interface NursingRegistrationEntry {
  councilName: string;
  registrationNumber: string;
  issuedDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Inactive' | 'Pending' | 'Suspended' | string;
}

export interface NursingExperienceEntry {
  employer: string;
  position: string;
  dates: DateRange;
}

export interface NursingCanadaExperienceEntry extends NursingExperienceEntry {
  employmentType: 'Full-time' | 'Part-time' | 'Casual' | 'Contract' | string;
  hoursPerMonth: string;
}

export interface NclexExamAttempt {
  examDate: string;
  country: string;
  province: string;
  result?: string;
}

export interface NursingCandidateFormPayload {
  targetCountry: 'Canada' | 'USA' | 'Australia';
  personalDetails: NursingPersonalDetails;

  // School Information (New Section)
  schoolDetails: {
    class10: SchoolEntry;
    class12: SchoolEntry;
    otherSchools: SchoolEntry[];
  };

  educationDetails: NursingEducationEntry[];
  registrationDetails: {
    hasDisciplinaryAction: 'Yes' | 'No';
    entries: NursingRegistrationEntry[];
  };
  nclexExamHistory: {
    hasWrittenExam: 'Yes' | 'No';
    attempts: NclexExamAttempt[];
  };
  employmentHistory: NursingExperienceEntry[];
  canadaEmploymentHistory: NursingCanadaExperienceEntry[];

  // Country Specific
  canadianImmigrationApplied?: 'Yes' | 'No';

  referenceNumber?: string;
  documentChecklistAcknowledged: boolean;
  createdAt?: string; // Changed to string to match JSON payload easier
}
