import type {
  DateRange,
  NursingCandidateFormPayload,
  NursingCanadaExperienceEntry,
  NursingEducationEntry,
  NursingExperienceEntry,
  NursingPersonalDetails,
  NursingRegistrationEntry,
} from '@/types/nursing-candidate';
import { sanitizeString, validateEmail } from './security';

const educationSections = [
  { key: 'gnm', label: 'GNM – General Nursing and Midwifery', programType: 'GNM' },
  { key: 'bsc', label: 'BSc Nursing', programType: 'BSc Nursing' },
  { key: 'postBasic', label: 'Post Basic BSc Nursing', programType: 'Post Basic BSc Nursing' },
  { key: 'msc', label: 'MSc Nursing', programType: 'MSc Nursing' },
  { key: 'plusTwo', label: 'Plus Two / 12th Grade', programType: 'Plus Two / 12th Grade' },
  { key: 'tenthGrade', label: '10th Grade / Secondary School', programType: '10th Grade / Secondary School' },
  { key: 'primaryHighSchool', label: 'Primary and High School (Grades 1–10)', programType: 'Primary & High School' },
] as const;

const defaultEducationEntry = (programType: string): NursingEducationEntry => ({
  institutionName: 'N/A',
  address: 'N/A',
  programType,
  studyPeriod: { from: 'N/A', to: 'N/A' },
});

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
    const delimiter =
      value.includes(' to ')
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
    maidenName: cleanString(personalPayload.maidenName),
    motherMaidenName: cleanString(personalPayload.motherMaidenName),
    dateOfBirth: cleanString(personalPayload.dateOfBirth),
    placeOfBirth: cleanString(personalPayload.placeOfBirth),
    gender: ['Male', 'Female', 'Other'].includes(personalPayload.gender) ? personalPayload.gender : 'Other',
    address: cleanString(personalPayload.address, 'N/A', 2048),
    phoneNumber,
    email,
    firstLanguage: cleanString(personalPayload.firstLanguage),
  };

  const educationSource = payload.educationDetails || {};
  const educationDetails = educationSections.reduce((acc, section) => {
    const sectionPayload = educationSource[section.key] || {};
    acc[section.key] = {
      institutionName: cleanString(sectionPayload.institutionName),
      address: cleanString(sectionPayload.address),
      programType: cleanString(sectionPayload.programType || section.programType),
      studyPeriod: normalizeDateRange(sectionPayload.studyPeriod),
    };
    return acc;
  }, {} as NursingCandidateFormPayload['educationDetails']);

  const registrationEntries: NursingRegistrationEntry[] = (payload.registrationDetails?.entries || payload.registrationEntries || [])
    .slice(0, 3)
    .map((entry: any) => ({
      councilName: cleanString(entry?.councilName),
      registrationNumber: cleanString(entry?.registrationNumber),
      issuedDate: cleanString(entry?.issuedDate),
      expiryDate: cleanString(entry?.expiryDate),
      status: cleanString(entry?.status) as NursingRegistrationEntry['status'],
    }));
  while (registrationEntries.length < 3) {
    registrationEntries.push({
      councilName: 'N/A',
      registrationNumber: 'N/A',
      issuedDate: 'N/A',
      expiryDate: 'N/A',
      status: 'Inactive',
    });
  }

  const buildExperience = (entry: any): NursingExperienceEntry => ({
    employer: cleanString(entry?.employer),
    position: cleanString(entry?.position),
    dates: normalizeDateRange(entry?.dates),
  });

  const employmentHistory: NursingExperienceEntry[] = (payload.employmentHistory || payload.employmentDetails || [])
    .slice(0, 3)
    .map(buildExperience);
  while (employmentHistory.length < 3) {
    employmentHistory.push(buildExperience({}));
  }

  const buildCanadaExperience = (entry: any): NursingCanadaExperienceEntry => ({
    ...buildExperience(entry),
    employmentType: cleanString(entry?.employmentType) as NursingCanadaExperienceEntry['employmentType'],
    hoursPerMonth: cleanString(entry?.hoursPerMonth),
  });

  const canadaEmploymentHistory: NursingCanadaExperienceEntry[] = (payload.canadaEmploymentHistory || [])
    .slice(0, 3)
    .map(buildCanadaExperience);
  while (canadaEmploymentHistory.length < 3) {
    canadaEmploymentHistory.push(buildCanadaExperience({}));
  }

  return {
    personalDetails,
    educationDetails,
    registrationDetails: {
      hasDisciplinaryAction: getYesNo(
        payload.registrationDetails?.hasDisciplinaryAction ??
          payload.hasDisciplinaryAction ??
          'No'
      ),
      entries: registrationEntries,
    },
    employmentHistory,
    canadaEmploymentHistory,
    documentChecklistAcknowledged: Boolean(payload.documentChecklistAcknowledged),
  };
}

export function formatNursingCandidateDocument(data: NursingCandidateFormPayload): string {
  const lines: string[] = [];
  lines.push('NursePro Academy – NCLEX-RN Registration Information Form');
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
  educationSections.forEach((section) => {
    const entry = data.educationDetails[section.key];
    lines.push(`${section.label}`);
    lines.push(`  • Institution name: ${entry.institutionName}`);
    lines.push(`  • Full address: ${entry.address}`);
    lines.push(`  • Program / degree type: ${entry.programType}`);
    lines.push(`  • Dates studied: ${formatDateRange(entry.studyPeriod)}`);
    lines.push('');
  });

  lines.push('Section 3: Registration / License Details');
  lines.push(
    `• Disciplinary action history: ${data.registrationDetails.hasDisciplinaryAction}`
  );
  data.registrationDetails.entries.forEach((entry, index) => {
    lines.push(`Nursing Registration ${index + 1}`);
    lines.push(`  • Council or licensing body name: ${entry.councilName}`);
    lines.push(`  • Registration number: ${entry.registrationNumber}`);
    lines.push(`  • Date issued: ${entry.issuedDate}`);
    lines.push(`  • Expiry / renewal date: ${entry.expiryDate}`);
    lines.push(`  • Current status: ${entry.status}`);
    lines.push('');
  });

  lines.push('Section 4: Employment History – USA and Australia');
  data.employmentHistory.forEach((entry, index) => {
    lines.push(`Nursing Experience ${index + 1}`);
    lines.push(`  • Employer / hospital name: ${entry.employer}`);
    lines.push(`  • Job title / position: ${entry.position}`);
    lines.push(`  • Dates (Joined – Left): ${formatDateRange(entry.dates)}`);
    lines.push('');
  });

  lines.push('Section 5: Employment / Experience Details – Canada Only');
  data.canadaEmploymentHistory.forEach((entry, index) => {
    lines.push(`Canada Nursing Experience ${index + 1}`);
    lines.push(`  • Employer / hospital name: ${entry.employer}`);
    lines.push(`  • Job title / position: ${entry.position}`);
    lines.push(`  • Dates (Joined – Left): ${formatDateRange(entry.dates)}`);
    lines.push(`  • Full-time or part-time: ${entry.employmentType}`);
    lines.push(`  • Approx. hours per month: ${entry.hoursPerMonth}`);
    lines.push('');
  });

  lines.push('Document Submission Checklist (emailed separately to nurses@nurseproacademy.ca)');
  lines.push('• All nursing mark lists and transcripts');
  lines.push('• All nursing registration/licence documents');
  lines.push('• Affidavit for any name change (if applicable)');
  lines.push('• 10th and Plus Two certificates');
  lines.push('• Passport');

  return lines.join('\n');
}

