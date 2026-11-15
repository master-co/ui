/**
 * A week of a design team's calendar, as an application hands it to the schedule: days for all-day events,
 * local times for the others, each end exclusive, and a category for the calendar it belongs to.
 */
export const calendars = {
  violet: 'Research',
  teal: 'Design system',
  orange: 'Launch',
  blue: 'Customers',
  green: 'Team',
}

export const events = [
  { id: 'interviews', title: 'User interviews', start: '2026-11-03T10:00', end: '2026-11-03T11:30', category: 'violet', where: 'Room 4', who: 'Yi-ching, Misaki' },
  { id: 'offsite', title: 'Design offsite', start: '2026-11-07', end: '2026-11-11', allDay: true, category: 'green', where: 'Lisbon', who: 'The whole team' },
  { id: 'audit', title: 'Token audit', start: '2026-11-10T13:00', end: '2026-11-10T15:00', category: 'teal', where: 'Online', who: 'Kenta, Ji-hoon' },
  { id: 'deploy', title: 'Deploy window', start: '2026-11-12T22:00', end: '2026-11-13T01:00', category: 'orange', where: 'On call', who: 'Seo-yeon' },
  { id: 'launch', title: 'Launch day', start: '2026-11-13', end: '2026-11-14', allDay: true, category: 'orange', where: 'Everywhere', who: 'Everyone' },
  { id: 'standup', title: 'Standup', start: '2026-11-13T09:00', end: '2026-11-13T09:15', category: 'green', where: 'Online', who: 'The whole team' },
  { id: 'review', title: 'Design review', start: '2026-11-13T10:00', end: '2026-11-13T11:30', category: 'teal', where: 'Room 2', who: 'Yi-ching, Kenta' },
  { id: 'lunch', title: 'Team lunch', start: '2026-11-13T12:00', end: '2026-11-13T13:00', category: 'green', where: 'Canteen', who: 'The whole team' },
  { id: 'call', title: 'Customer call', start: '2026-11-13T14:00', end: '2026-11-13T15:00', category: 'blue', where: 'Online', who: 'Misaki' },
  { id: 'retro', title: 'Retro', start: '2026-11-13T16:30', end: '2026-11-13T17:15', category: 'green', where: 'Room 4', who: 'The whole team' },
  { id: 'planning', title: 'Planning', start: '2026-11-17T09:30', end: '2026-11-17T11:00', category: 'teal', where: 'Room 2', who: 'Ji-hoon' },
  { id: 'synthesis', title: 'Research synthesis', start: '2026-11-18T14:00', end: '2026-11-18T16:00', category: 'violet', where: 'Room 4', who: 'Yi-ching' },
  { id: 'conference', title: 'Design conference', start: '2026-11-19', end: '2026-11-22', allDay: true, category: 'violet', where: 'Berlin', who: 'Yi-ching, Misaki' },
  { id: 'onboarding', title: 'Onboarding', start: '2026-11-24T10:00', end: '2026-11-24T12:00', category: 'blue', where: 'Room 1', who: 'Seo-yeon' },
]
