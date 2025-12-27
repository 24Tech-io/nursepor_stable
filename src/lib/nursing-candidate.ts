import type {
  DateRange,
  NursingCandidateFormPayload,
  NursingCanadaExperienceEntry,
  NursingEducationEntry,
  NursingExperienceEntry,
  NursingPersonalDetails,
  NursingRegistrationEntry,
  NclexExamAttempt,
} from '@/types/nursing-candidate';
import { sanitizeString, validateEmail } from './security';

const cleanString = (value: unknown, fallback = 'N/A', maxLength = 1024) =>
  sanitizeString(typeof value === 'string' ? value : fallback, maxLength) || fallback;

const cleanDatePart = (value: unknown) => cleanString(value, 'N/A', 64);

const normalizeDateRange = (value: unknown): DateRange => {
  if (value && typeof value === 'object') {
    const rangeValue = value as Partial<DateRange>;
    return {
      from: cleanDatePart(rangeValue.from),
      to: cleanDatePart(rangeValue.to),
    };
  }

  if (typeof value === 'string') {
    const delimiter = value.includes(' to ')
      ? ' to '
      : value.includes(' - ')
        ? ' - '
        : value.includes(' – ')
          ? ' – '
          : value.includes(' — ')
            ? ' — '
            : null;
    if (delimiter) {
      const [fromPart, toPart] = value.split(delimiter).map((part) => part?.trim());
      return {
        from: cleanDatePart(fromPart || value),
        to: cleanDatePart(toPart || 'N/A'),
      };
    }
    return {
      from: cleanDatePart(value),
      to: 'N/A',
    };
  }

  return { from: 'N/A', to: 'N/A' };
};

const formatDateRange = (range: DateRange) => {
  const from = range?.from || 'N/A';
  const to = range?.to || 'N/A';
  if (from === 'N/A' && to === 'N/A') {
    return 'N/A';
  }
  if (to === 'N/A') {
    return from;
  }
  if (from === 'N/A') {
    return to;
  }
  return `${from} to ${to}`;
};

const getYesNo = (value: unknown, fallback: 'Yes' | 'No' = 'No'): 'Yes' | 'No' =>
  value === 'Yes' || value === 'No' ? value : fallback;

export function normalizeNursingCandidatePayload(payload: any): NursingCandidateFormPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid submission payload');
  }

  const personalPayload = payload.personalDetails || payload;
  const email = cleanString(personalPayload.email);
  if (!validateEmail(email)) {
    throw new Error('A valid email is required');
  }
  const firstName = cleanString(personalPayload.firstName, '', 255);
  const lastName = cleanString(personalPayload.lastName, '', 255);
  const phoneNumber = cleanString(personalPayload.phoneNumber, '', 50);

  if (!firstName || !lastName || !phoneNumber) {
    throw new Error('First name, last name, and phone number are required');
  }

  const personalDetails: NursingPersonalDetails = {
    firstName,
    lastName,
    collegeNameVariant: cleanString(personalPayload.collegeNameVariant),
    hasNameChange: getYesNo(personalPayload.hasNameChange),
    nameChangeDetails: cleanString(personalPayload.nameChangeDetails),
    needsAffidavit: Boolean(personalPayload.needsAffidavit),
    maidenName: cleanString(personalPayload.maidenName),
    motherMaidenName: cleanString(personalPayload.motherMaidenName),
    dateOfBirth: cleanString(personalPayload.dateOfBirth),
    placeOfBirth: cleanString(personalPayload.placeOfBirth),
    gender: ['Male', 'Female', 'Other'].includes(personalPayload.gender)
      ? personalPayload.gender
      : 'Other',
    address: normalizeStructuredAddress(personalPayload.address),
    phoneNumber,
    email,
    firstLanguage: cleanString(personalPayload.firstLanguage),
  };

  // Education Details: Dynamic Array
  const rawEducation = payload.educationDetails || [];
  const educationDetails: NursingEducationEntry[] = (Array.isArray(rawEducation) ? rawEducation : []).map((entry: any) => ({
    institutionName: cleanString(entry.institutionName),
    address: normalizeStructuredAddress(entry.address),
    programType: cleanString(entry.programType),
    studyPeriod: normalizeDateRange(entry.studyPeriod),
    languageOfInstruction: cleanString(entry.languageOfInstruction),
    isCollegeOperational: getYesNo(entry.isCollegeOperational),
  }));

  // Registration Details: Dynamic Array
  const rawRegistrations = payload.registrationDetails?.entries || payload.registrationEntries || [];
  const registrationEntries: NursingRegistrationEntry[] = (Array.isArray(rawRegistrations) ? rawRegistrations : []).map((entry: any) => ({
    councilName: cleanString(entry?.councilName),
    registrationNumber: cleanString(entry?.registrationNumber),
    issuedDate: cleanString(entry?.issuedDate),
    expiryDate: cleanString(entry?.expiryDate),
    status: cleanString(entry?.status) as NursingRegistrationEntry['status'],
  }));

  // Experience Helper
  const buildExperience = (entry: any): NursingExperienceEntry => ({
    employer: cleanString(entry?.employer),
    position: cleanString(entry?.position),
    dates: normalizeDateRange(entry?.dates),
  });

  const rawEmployment = payload.employmentHistory || payload.employmentDetails || [];
  const employmentHistory: NursingExperienceEntry[] = (Array.isArray(rawEmployment) ? rawEmployment : []).map(buildExperience);

  const buildCanadaExperience = (entry: any): NursingCanadaExperienceEntry => ({
    ...buildExperience(entry),
    employmentType: cleanString(
      entry?.employmentType
    ) as NursingCanadaExperienceEntry['employmentType'],
    hoursPerMonth: cleanString(entry?.hoursPerMonth),
  });

  const rawCanadaEmployment = payload.canadaEmploymentHistory || [];
  const canadaEmploymentHistory: NursingCanadaExperienceEntry[] = (Array.isArray(rawCanadaEmployment) ? rawCanadaEmployment : []).map(buildCanadaExperience);

  const targetCountry = (['Canada', 'USA', 'Australia'].includes(payload.targetCountry) ? payload.targetCountry : 'Canada') as 'Canada' | 'USA' | 'Australia';

  // Normalize NCLEX exam history (Consolidated)
  const nclexExamHistory = {
    hasWrittenExam: getYesNo(payload.nclexExamHistory?.hasWrittenExam || payload.hasWrittenNclexExam),
    attempts: (payload.nclexExamHistory?.attempts || payload.nclexAttempts || []).map((attempt: any): NclexExamAttempt => ({
      examDate: cleanString(attempt.examDate),
      country: cleanString(attempt.country),
      province: cleanString(attempt.province),
      result: cleanString(attempt.result, 'N/A'),
    })),
  };

  // Normalize School Details
  const schoolDetails = {
    class10: {
      institutionName: cleanString(payload.schoolDetails?.class10?.institutionName),
      address: normalizeStructuredAddress(payload.schoolDetails?.class10?.address),
      studyPeriod: normalizeDateRange(payload.schoolDetails?.class10?.studyPeriod),
    },
    class12: {
      institutionName: cleanString(payload.schoolDetails?.class12?.institutionName),
      address: normalizeStructuredAddress(payload.schoolDetails?.class12?.address),
      studyPeriod: normalizeDateRange(payload.schoolDetails?.class12?.studyPeriod),
    },
    otherSchools: (Array.isArray(payload.schoolDetails?.otherSchools) ? payload.schoolDetails.otherSchools : []).map((school: any) => ({
      gradeStudied: cleanString(school.gradeStudied),
      institutionName: cleanString(school.institutionName),
      address: normalizeStructuredAddress(school.address),
      studyPeriod: normalizeDateRange(school.studyPeriod),
    })),
  };

  return {
    targetCountry,
    personalDetails,
    schoolDetails,
    educationDetails,
    registrationDetails: {
      hasDisciplinaryAction: getYesNo(
        payload.registrationDetails?.hasDisciplinaryAction ??
        payload.hasDisciplinaryAction ??
        'No'
      ),
      entries: registrationEntries,
    },
    nclexExamHistory,
    employmentHistory,
    canadaEmploymentHistory,
    canadianImmigrationApplied: targetCountry === 'Canada' ? getYesNo(payload.canadianImmigrationApplied, undefined) : undefined,
    documentChecklistAcknowledged: Boolean(payload.documentChecklistAcknowledged),
    createdAt: payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function formatNursingCandidateDocument(data: NursingCandidateFormPayload): string {
  const lines: string[] = [];
  lines.push('NursePro Academy – NCLEX-RN Registration Information Form');
  lines.push(`Target Country: ${data.targetCountry}`);
  lines.push(`Reference Number: ${data.referenceNumber ?? 'Pending assignment'}`);
  lines.push('');
  lines.push('Section 1: Personal / Identity Details');
  lines.push(`• First name: ${data.personalDetails.firstName}`);
  lines.push(`• Last name: ${data.personalDetails.lastName}`);
  lines.push(`• Name as in college documents: ${data.personalDetails.collegeNameVariant}`);
  lines.push(`• Any name change (Yes/No): ${data.personalDetails.hasNameChange}`);
  lines.push(`• Maiden name: ${data.personalDetails.maidenName}`);
  lines.push(`• Mother’s maiden name: ${data.personalDetails.motherMaidenName}`);
  lines.push(`• Date of birth: ${data.personalDetails.dateOfBirth}`);
  lines.push(`• Place of birth: ${data.personalDetails.placeOfBirth}`);
  lines.push(`• Gender: ${data.personalDetails.gender}`);
  lines.push(`• Address: ${data.personalDetails.address}`);
  lines.push(`• Phone number: ${data.personalDetails.phoneNumber}`);
  lines.push(`• Email ID: ${data.personalDetails.email}`);
  lines.push(`• First language / mother tongue: ${data.personalDetails.firstLanguage}`);
  lines.push('');

  lines.push('Section 2: Education Details');
  data.educationDetails.forEach((entry, index) => {
    lines.push(`Institution ${index + 1}`);
    lines.push(`  • Institution name: ${entry.institutionName}`);
    lines.push(`  • Full address: ${entry.address}`);
    lines.push(`  • Program / degree type: ${entry.programType}`);
    lines.push(`  • Dates studied: ${formatDateRange(entry.studyPeriod)}`);
    lines.push('');
  });

  lines.push('Section 3: Registration / License Details');
  lines.push(`• Disciplinary action history: ${data.registrationDetails.hasDisciplinaryAction}`);
  data.registrationDetails.entries.forEach((entry, index) => {
    lines.push(`Nursing Registration ${index + 1}`);
    lines.push(`  • Council or licensing body name: ${entry.councilName}`);
    lines.push(`  • Registration number: ${entry.registrationNumber}`);
    lines.push(`  • Date issued: ${entry.issuedDate}`);
    lines.push(`  • Expiry / renewal date: ${entry.expiryDate}`);
    lines.push(`  • Current status: ${entry.status}`);
    lines.push('');
  });

  if (data.targetCountry === 'Canada') {
    lines.push('Section 4: Employment History (Canada Requirements)');
    data.canadaEmploymentHistory.forEach((entry, index) => {
      lines.push(`Experience ${index + 1}`);
      lines.push(`  • Employer / hospital name: ${entry.employer}`);
      lines.push(`  • Job title / position: ${entry.position}`);
      lines.push(`  • Dates (Joined – Left): ${formatDateRange(entry.dates)}`);
      lines.push(`  • Full-time or part-time: ${entry.employmentType}`);
      lines.push(`  • Approx. hours per month: ${entry.hoursPerMonth}`);
      lines.push('');
    });
  } else {
    lines.push(`Section 4: Employment History (${data.targetCountry})`);
    data.employmentHistory.forEach((entry, index) => {
      lines.push(`Experience ${index + 1}`);
      lines.push(`  • Employer / hospital name: ${entry.employer}`);
      lines.push(`  • Job title / position: ${entry.position}`);
      lines.push(`  • Dates (Joined – Left): ${formatDateRange(entry.dates)}`);
      lines.push('');
    });
  }

  lines.push('Section 5: NCLEX-RN Exam History');
  lines.push(`• Have you taken the NCLEX-RN before? ${data.nclexHistory.hasTakenBefore}`);
  if (data.nclexHistory.hasTakenBefore === 'Yes') {
    data.nclexHistory.attempts.forEach((attempt, index) => {
      lines.push(`Attempt ${index + 1}`);
      lines.push(`  • Exam Date: ${attempt.examDate}`);
      lines.push(`  • Country/Province: ${attempt.country}, ${attempt.province}`);
      lines.push(`  • Result: ${attempt.result}`);
      lines.push('');
    });
  }
  lines.push('');

  lines.push('Document Submission Checklist');
  lines.push('• All nursing mark lists and transcripts');
  lines.push('• All nursing registration/licence documents');
  lines.push('• Affidavit for any name change (if applicable)');
  lines.push('• 10th and Plus Two certificates');
  lines.push('• Passport');

  return lines.join('\n');
}
