/**
 * A site's traffic over three periods. Each period holds everything the dashboard shows, so choosing one
 * changes the figures and the charts together and they always agree. A series names its category, and the
 * category, not its place in the list, decides its color.
 */
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']

export const periods = {
  week: {
    name: 'The last 7 days',
    visitors: ['12,480', '8.2%', true],
    signups: ['642', '3.1%', true],
    bounce: ['38.4%', '1.6%', false],
    labels: days,
    fresh: [980, 1240, 1130, 1420, 1510, 890, 760],
    returning: [620, 710, 690, 820, 860, 470, 380],
    sources: [5240, 3870, 2120, 1250],
    pages: [4820, 3112, 2240, 1360, 948],
  },
  month: {
    name: 'The last 30 days',
    visitors: ['51,930', '12.4%', true],
    signups: ['2,718', '6.8%', true],
    bounce: ['39.1%', '0.4%', true],
    labels: Array.from({ length: 30 }, (_, index) => (index < 17 ? `Oct ${index + 15}` : `Nov ${index - 16}`)),
    fresh: [910, 960, 720, 640, 1010, 1080, 1120, 1190, 1150, 800, 690, 1090, 1170, 1230, 1280, 1210, 840, 730, 1140, 1260, 1310, 1380, 1290, 900, 790, 980, 1240, 1130, 1420, 1510],
    returning: [540, 580, 400, 350, 590, 630, 660, 700, 670, 430, 360, 640, 690, 720, 750, 710, 450, 390, 670, 740, 770, 810, 760, 480, 410, 620, 710, 690, 820, 860],
    sources: [21400, 16900, 8530, 5100],
    pages: [19840, 12760, 9310, 5620, 3980],
  },
  year: {
    name: 'The last 12 months',
    visitors: ['584,200', '31.0%', true],
    signups: ['28,940', '24.6%', true],
    bounce: ['41.7%', '2.9%', false],
    labels: months,
    fresh: [21400, 22800, 24100, 26900, 28300, 27600, 30200, 32800, 31900, 34600, 37100, 39400],
    returning: [11200, 11900, 12800, 13600, 15100, 14800, 16300, 17500, 17100, 18900, 20400, 21600],
    sources: [238000, 196400, 97300, 52500],
    pages: [221500, 148200, 104700, 63900, 45100],
  },
}

export const sources = [
  { name: 'Search', category: 'blue' },
  { name: 'Direct', category: 'teal' },
  { name: 'Social', category: 'violet' },
  { name: 'Referral', category: 'amber' },
]

export const pages = ['Installation', 'Button', 'Dialog', 'Default theme', 'Command']
