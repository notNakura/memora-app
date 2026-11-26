import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RosterStudent, SectionHeader, SectionSummary, StudentPerformance } from '../../../services/api/teacher';
import type { TeacherClient } from '../teacherClient';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

export const renderWithSafeArea = (ui: ReactElement) => render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

export const header: SectionHeader = {
  sectionId: 1,
  subjectCode: 'SI3',
  subjectName: 'Sistemas de Información III',
  sectionName: 'Sección 1',
  termName: '2026-II',
  joinCode: 'SK3A26',
  inviteLink: 'memora.app/u/SK3A26',
  joinMode: 'roster',
  capacity: 40,
  codeExpiresOn: '2026-09-30',
  codeExpired: false,
  activeCount: 32,
  pendingCount: 12,
  invitedCount: 30,
};

export const summary = (over: Partial<SectionSummary> = {}): SectionSummary => {
  const { joinCode: _c, inviteLink: _l, ...rest } = header;
  return {
    ...rest,
    pendingEndorsementCount: 3,
    units: [
      { unitId: 1, number: 1, name: 'Fundamentos', mastery: 84 },
      { unitId: 2, number: 2, name: 'Modelo ER', mastery: 61 },
      { unitId: 3, number: 3, name: 'Normalización', mastery: null },
    ],
    ...over,
  };
};

export const students: RosterStudent[] = [
  {
    studentId: 4,
    name: 'Carla Rojas',
    mastery: 62,
    lastReviewAt: '2026-11-16T10:00:00',
    daysSinceReview: 4,
    attention: ['below_minimum', 'inactive'],
  },
  { studentId: 3, name: 'Luis Pérez', mastery: 71, lastReviewAt: null, daysSinceReview: 0, attention: ['plan_incomplete'] },
  { studentId: 9, name: 'Zoe Alba', mastery: null, lastReviewAt: null, daysSinceReview: null, attention: [] },
];

export const performance: StudentPerformance = {
  student: { studentId: 4, name: 'Carla Rojas', nationalId: 'V-20000002', extendedTime: true },
  overall: 62,
  units: [
    { unitId: 1, number: 1, name: 'Fundamentos', mastery: 84, unlocked: false },
    { unitId: 2, number: 2, name: 'Modelo ER', mastery: 48, unlocked: false },
    { unitId: 3, number: 3, name: 'Normalización', mastery: null, unlocked: true },
  ],
  lastReviewAt: '2026-11-16T10:00:00',
  daysSinceReview: 4,
  activity: [0, 0, 3, 0, 0, 0, 0].map((reviews, i) => ({ day: `2026-11-1${4 + i}`, reviews })),
  assessments: [{ assessmentId: 1, title: 'Unidad 2 · Modelo ER', attemptNumber: 1, masteryPct: 50, grade: 10 }],
  hardestCards: [{ cardId: 2, front: '¿Qué indica la cardinalidad 1:N?', lapses: 5 }],
  streak: { currentDays: 0, bestStreak: 9 },
  plan: { day: 1, days: 3, completed: false },
};

export function fakeClient(over: Partial<TeacherClient> = {}): jest.Mocked<TeacherClient> {
  return {
    sections: jest.fn(async () => [summary()]),
    section: jest.fn(async () => ({ section: header, students })),
    updateJoinSettings: jest.fn(async (_id, patch) => ({ ...header, ...patch })),
    regenerateCode: jest.fn(async () => ({ ...header, joinCode: 'TQ7W9M', inviteLink: 'memora.app/u/TQ7W9M' })),
    requests: jest.fn(async () => ({
      section: header,
      summary: { pending: 3, onRoster: 1, notOnRoster: 2, active: 28 },
      requests: [
        {
          studentId: 21,
          name: 'Mariana Ortiz',
          nationalId: 'V-30118402',
          email: 'mariana.ortiz@gmail.com',
          requestedAt: '2026-11-19T08:00:00',
          onRoster: true,
        },
        {
          studentId: 22,
          name: 'Ricardo Luna',
          nationalId: 'V-31222333',
          email: 'ricardo.luna@gmail.com',
          requestedAt: '2026-11-19T09:00:00',
          onRoster: false,
        },
        {
          studentId: 23,
          name: 'Kevin Duarte',
          nationalId: 'V-32004871',
          email: 'kd2007@hotmail.com',
          requestedAt: '2026-11-19T10:00:00',
          onRoster: false,
        },
      ],
    })),
    decide: jest.fn(async (_s, _d, ids) => ids.length),
    student: jest.fn(async () => performance),
    unlockUnit: jest.fn(async () => undefined),
    previewRoster: jest.fn(async () => ({
      rows: [
        { line: 2, nationalId: 'V-30555801', firstNames: 'Daniela', lastNames: 'Suárez', email: 'd@gmail.com', status: 'new' as const },
        {
          line: 3,
          nationalId: '',
          firstNames: 'Sin',
          lastNames: 'Cédula',
          email: 's@gmail.com',
          status: 'error' as const,
          error: 'Falta la cédula.',
        },
      ],
      validCount: 1,
      errorCount: 1,
    })),
    importRoster: jest.fn(async () => ({ rows: [], imported: 1, created: 1, invited: 1, activated: 0, errorCount: 1 })),
    ...over,
  } as jest.Mocked<TeacherClient>;
}
