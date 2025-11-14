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
  studyPeriod: string;
}

export interface NursingRegistrationEntry {
  councilName: string;
  registrationNumber: string;
  issuedDate: string;
  expiryDate: string;
  status: string;
}

export interface NursingExperienceEntry {
  employer: string;
  position: string;
  dates: string;
}

export interface NursingCanadaExperienceEntry extends NursingExperienceEntry {
  employmentType: string;
  hoursPerMonth: string;
}

export interface NursingCandidateFormPayload {
  personalDetails: NursingPersonalDetails;
  educationDetails: {
    gnm: NursingEducationEntry;
    bsc: NursingEducationEntry;
    postBasic: NursingEducationEntry;
    msc: NursingEducationEntry;
    plusTwo: NursingEducationEntry;
    tenthGrade: NursingEducationEntry;
    primaryHighSchool: NursingEducationEntry;
  };
  registrationDetails: {
    hasDisciplinaryAction: 'Yes' | 'No';
    entries: NursingRegistrationEntry[];
  };
  employmentHistory: NursingExperienceEntry[];
  canadaEmploymentHistory: NursingCanadaExperienceEntry[];
  referenceNumber?: string;
  documentChecklistAcknowledged: boolean;
}

