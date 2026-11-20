import type { Correction, Exam, Result, Student } from './model'

export const students: Student[] = [
  { id: 'NW-24017', name: 'Avery Patel', programme: 'B.Sc. Computer Science' },
  { id: 'NW-24023', name: 'Morgan Lee', programme: 'B.Sc. Computer Science' },
  { id: 'NW-24031', name: 'Jordan Rivera', programme: 'B.Sc. Computer Science' },
  { id: 'NW-24042', name: 'Sam Okafor', programme: 'B.Sc. Data Science' },
  { id: 'NW-24056', name: 'Casey Chen', programme: 'B.Sc. Data Science' },
  { id: 'NW-24063', name: 'Taylor Singh', programme: 'B.Sc. Data Science' },
]
export const exams: Exam[] = [
  { id: 'EX-26-SP', name: 'Semester II Finals', term: 'Spring 2026' },
  { id: 'EX-25-AU', name: 'Semester I Finals', term: 'Autumn 2025' },
  { id: 'EX-26-SU', name: 'Summer Assessment', term: 'Summer 2026' },
]
export const demoReference = 'VM-SP26-017-V1'
export const subjects = ['Data Structures', 'Discrete Mathematics', 'Computer Networks', 'Database Systems', 'Technical Writing']
export const results: Result[] = students.map((student, i) => ({
  ref: i === 0 ? demoReference : `VM-SP26-${student.id.slice(-3)}-V1`, student, exam: exams[0],
  marks: subjects.map((subject, j) => ({ subject, scored: [85, 91, 88, 93, 89][j] - i + (i * j) % 7, maximum: 100 })),
  date: '2026-06-12', version: 1, current: i !== 1,
}))
results.unshift({ ...results[1], ref: 'VM-SP26-023-V2', marks: results[1].marks.map((m, i) => i === 1 ? { ...m, scored: 94 } : m), date: '2026-06-15', version: 2, current: true })
results.push({ ...results.find(r => r.ref === demoReference)!, ref: 'VM-AU25-017-V1', exam: exams[1], date: '2025-12-18', marks: results[1].marks.map(m => ({ ...m, scored: m.scored - 4 })) })
export const corrections: Correction[] = [
  { id: 'CR-1043', ref: demoReference, subject: subjects[2], original: 88, proposed: 90, reason: 'Recount requested for the practical assessment rubric.', state: 'pending', reviewSteps: 1 },
  { id: 'CR-1042', ref: 'VM-SP26-023-V1', subject: subjects[1], original: 91, proposed: 94, reason: 'Three points on the final page were omitted from the tally.', state: 'approved', reviewSteps: 2 },
  { id: 'CR-1041', ref: 'VM-SP26-031-V1', subject: subjects[0], original: 83, proposed: 87, reason: 'The requested change was not supported by the grading record.', state: 'rejected', reviewSteps: 0 },
]
