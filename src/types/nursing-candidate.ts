export interface DateRange {
  from: string;
  to: string;
}

export interface NursingPersonalDetails {
  firstName: string;
  lastName: string;
  collegeNameVariant: string;
  hasNameChange: 'Yes' | 'No';
  maidenName: string;
  motherMaidenName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  phoneNumber: string;
  email: string;
  firstLanguage: string;
}

export interface NursingEducationEntry {
  institutionName: string;
  address: string;
  programType: string;
  studyPeriod: DateRange;
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
  educationDetails: NursingEducationEntry[];
  registrationDetails: {
    hasDisciplinaryAction: 'Yes' | 'No';
    entries: NursingRegistrationEntry[];
  };
  employmentHistory: NursingExperienceEntry[];
  canadaEmploymentHistory: NursingCanadaExperienceEntry[];
  nclexHistory: {
    hasTakenBefore: 'Yes' | 'No';
    attempts: NclexExamAttempt[];
  };
  referenceNumber?: string;
  documentChecklistAcknowledged: boolean;
}

