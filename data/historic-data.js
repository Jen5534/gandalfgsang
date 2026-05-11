// Historic desk usage patterns — source of truth for routine detection and soft holds.
// Each entry represents a colleague's established habit: which days they come in,
// when they typically arrive, and which desk they always use.
// Consistency (0–1) reflects how reliably they follow the pattern.

const HISTORIC_PATTERNS = [
  {
    userId: 'bc8c2dd5-9501-4961-bd84-639fc4422151',
    name: 'Brandi Holloway',
    patterns: [
      { day: 'monday',    arrivalTime: '08:00', deskId: 'G-W1', consistency: 0.92 },
      { day: 'wednesday', arrivalTime: '08:00', deskId: 'G-W1', consistency: 0.88 },
      { day: 'friday',    arrivalTime: '08:15', deskId: 'G-W3', consistency: 0.74 },
    ]
  },
  {
    userId: '69948abc-8e02-4ab1-b0c8-c92b0513c7bc',
    name: 'Shana Baird',
    patterns: [
      { day: 'monday',    arrivalTime: '09:30', deskId: 'G-Q1', consistency: 0.85 },
      { day: 'wednesday', arrivalTime: '09:30', deskId: 'G-Q1', consistency: 0.90 },
      { day: 'thursday',  arrivalTime: '09:30', deskId: 'G-Q1', consistency: 0.80 },
    ]
  },
  {
    userId: '1c0b3f97-92b4-4269-b8ec-2aba48797603',
    name: 'Clarissa Terry',
    patterns: [
      { day: 'monday',    arrivalTime: '08:30', deskId: 'G-Q2', consistency: 0.88 },
      { day: 'wednesday', arrivalTime: '08:30', deskId: 'G-Q2', consistency: 0.82 },
    ]
  },
  {
    userId: 'b381819e-d00b-4798-a4b5-ab4fef210bf4',
    name: 'Farley Nichols',
    patterns: [
      { day: 'monday',    arrivalTime: '07:45', deskId: 'G-L1', consistency: 0.95 },
      { day: 'wednesday', arrivalTime: '07:45', deskId: 'G-L1', consistency: 0.91 },
      { day: 'thursday',  arrivalTime: '08:00', deskId: 'G-L1', consistency: 0.78 },
    ]
  },
  {
    userId: '53695775-df3c-424e-91f2-8222f2ad69c1',
    name: 'Burnett Donovan',
    patterns: [
      { day: 'monday',    arrivalTime: '09:00', deskId: 'G-Q3', consistency: 0.87 },
      { day: 'wednesday', arrivalTime: '09:00', deskId: 'G-Q3', consistency: 0.83 },
    ]
  },
  {
    userId: '3486f2c2-fc3a-47d4-8520-f6b349071405',
    name: 'Stella Briggs',
    patterns: [
      { day: 'monday',    arrivalTime: '08:15', deskId: 'G-L2', consistency: 0.90 },
      { day: 'wednesday', arrivalTime: '08:15', deskId: 'G-L2', consistency: 0.85 },
      { day: 'friday',    arrivalTime: '09:00', deskId: 'G-L2', consistency: 0.70 },
    ]
  },
  {
    userId: '8c8946bf-cdd5-4026-bbe1-e8fcfac05665',
    name: 'Dillon Hodges',
    patterns: [
      { day: 'monday',    arrivalTime: '09:00', deskId: 'G-C1', consistency: 0.88 },
      { day: 'wednesday', arrivalTime: '09:00', deskId: 'G-C1', consistency: 0.85 },
      { day: 'thursday',  arrivalTime: '09:15', deskId: 'G-C1', consistency: 0.82 },
    ]
  },
  {
    userId: '78784aec-1cd2-4eec-8c51-d6a543bceb2a',
    name: 'Welch Bowers',
    patterns: [
      { day: 'monday',    arrivalTime: '10:00', deskId: 'G-C4', consistency: 0.80 },
      { day: 'wednesday', arrivalTime: '10:00', deskId: 'G-C4', consistency: 0.75 },
    ]
  },
  {
    userId: 'ce2bbc48-63e8-4090-990a-039f0ec34a34',
    name: 'Brandy Sargent',
    patterns: [
      { day: 'monday',    arrivalTime: '08:45', deskId: 'F-Q1', consistency: 0.91 },
      { day: 'wednesday', arrivalTime: '08:45', deskId: 'F-Q1', consistency: 0.86 },
      { day: 'thursday',  arrivalTime: '08:45', deskId: 'F-Q1', consistency: 0.78 },
    ]
  },
  {
    userId: '391511bb-b582-449d-96c2-3231a8160b39',
    name: 'Rebekah Robinson',
    patterns: [
      { day: 'monday',    arrivalTime: '09:15', deskId: 'G-C2', consistency: 0.90 },
      { day: 'wednesday', arrivalTime: '09:15', deskId: 'G-C2', consistency: 0.87 },
      { day: 'thursday',  arrivalTime: '09:15', deskId: 'G-C2', consistency: 0.83 },
      { day: 'friday',    arrivalTime: '09:30', deskId: 'G-C2', consistency: 0.72 },
    ]
  },
  {
    userId: '7b490075-4e45-4c0e-ab34-1852752041b9',
    name: 'Kristi Hart',
    patterns: [
      { day: 'monday',    arrivalTime: '09:30', deskId: 'G-C5', consistency: 0.85 },
      { day: 'wednesday', arrivalTime: '09:30', deskId: 'G-C5', consistency: 0.88 },
      { day: 'thursday',  arrivalTime: '09:30', deskId: 'F-C3', consistency: 0.75 },
    ]
  },
  {
    userId: '3124576a-2a78-4a72-a49a-4fd826b772f3',
    name: 'Abigail Livingston',
    patterns: [
      { day: 'monday',    arrivalTime: '08:00', deskId: 'G-L3', consistency: 0.93 },
      { day: 'tuesday',   arrivalTime: '08:00', deskId: 'G-L3', consistency: 0.87 },
      { day: 'wednesday', arrivalTime: '08:00', deskId: 'G-L3', consistency: 0.89 },
      { day: 'thursday',  arrivalTime: '08:15', deskId: 'G-L3', consistency: 0.84 },
      { day: 'friday',    arrivalTime: '08:30', deskId: 'F-L1', consistency: 0.70 },
    ]
  },
  {
    userId: 'a92c6a10-de70-4536-b032-34a344053691',
    name: 'Josefina Koch',
    patterns: [
      { day: 'monday',    arrivalTime: '09:00', deskId: 'G-W2', consistency: 0.86 },
      { day: 'wednesday', arrivalTime: '09:00', deskId: 'G-W2', consistency: 0.82 },
    ]
  },
];
