import type { CarrierInput } from './types';

// fictional carriers. names, people, streets, phone numbers and emails are invented;
// phone numbers use the 555-01xx range and emails use example.com
export const carriers: CarrierInput[] = [
  {
    id: 'henley-ridge',
    slug: 'henley-ridge-freight',
    name: 'Henley Ridge Freight',
    owner: 'Grant and Lena Whitfield',
    foundedYear: 2011,
    fleet: {
      tractors: 18,
      trailers: [{ type: '53-ft dry van', count: 45 }],
    },
    equipment: ['53-ft dry vans', 'Drop trailers', 'Load locks and straps'],
    base: { street: '210 Kestrel Industrial Way', city: 'McDonough', state: 'GA', zip: '30253', metro: 'Atlanta' },
    serviceArea: 'Regional Southeast, within about 400 miles of Atlanta',
    lanes: [
      { from: 'Atlanta, GA', to: 'Charlotte, NC', miles: 245, frequency: 'Daily' },
      { from: 'Atlanta, GA', to: 'Nashville, TN', miles: 250, frequency: 'Daily' },
      { from: 'Atlanta, GA', to: 'Jacksonville, FL', miles: 345, frequency: '3 times a week' },
      { from: 'Atlanta, GA', to: 'Birmingham, AL', miles: 147, frequency: 'Daily' },
    ],
    specialties: [
      'Retail store replenishment',
      'Drop-trailer programs for warehouses',
      'Palletized consumer goods',
      'Appointment deliveries to distribution centers',
    ],
    credentials: [
      'Fully insured, certificate of insurance on request',
      'Electronic logging devices in every truck',
      'DOT number on file',
    ],
    hours: ['Dispatch Mon–Fri 6:00 a.m.–8:00 p.m.', 'Sat 7:00 a.m.–12:00 p.m.'],
    quoteResponse: 'Quotes sent the same business day',
    contact: { phone: '(770) 555-0142', email: 'henleyridge.dispatch@example.com', person: 'Lena Whitfield' },
    ownerNote:
      'We are a family-run fleet. Our drivers run regional routes and are home most nights. We want steady, repeat freight from shippers who like to see the same drivers at the dock.',
  },
  {
    id: 'larkspur',
    slug: 'larkspur-cold-lines',
    name: 'Larkspur Cold Lines',
    owner: 'Priya Raman',
    foundedYear: 2016,
    fleet: {
      tractors: 26,
      trailers: [
        { type: '53-ft refrigerated trailer', count: 30 },
        { type: '53-ft multi-temperature refrigerated trailer', count: 6 },
      ],
    },
    equipment: ['53-ft reefers', 'Multi-temperature reefers', 'Trailer temperature monitoring'],
    base: { street: '88 Teal Creek Drive', city: 'Wilmer', state: 'TX', zip: '75172', metro: 'Dallas' },
    serviceArea: 'Texas, Oklahoma and Arkansas',
    lanes: [
      { from: 'Dallas, TX', to: 'Houston, TX', miles: 240, frequency: 'Daily' },
      { from: 'Dallas, TX', to: 'San Antonio, TX', miles: 275, frequency: 'Daily' },
      { from: 'McAllen, TX', to: 'Dallas, TX', miles: 500, frequency: 'Daily in produce season' },
      { from: 'Dallas, TX', to: 'Oklahoma City, OK', miles: 205, frequency: '4 times a week' },
      { from: 'Dallas, TX', to: 'Little Rock, AR', miles: 320, frequency: '2 times a week' },
    ],
    specialties: ['Fresh produce', 'Dairy', 'Frozen foods', 'Grocery distribution center deliveries'],
    credentials: [
      'Drivers trained on the FDA sanitary transportation rule',
      'Temperature records available for every load',
      'Fully insured, certificate of insurance on request',
      'DOT number on file',
    ],
    hours: ['Dispatch open 24/7'],
    quoteResponse: 'Quotes sent within 2 hours during business days',
    contact: { phone: '(214) 555-0117', email: 'larkspur.ops@example.com', person: 'Priya Raman' },
    ownerNote:
      'Temperature is the job. We pre-cool every trailer and we watch it the whole trip. If a reading moves, the shipper and the receiver hear from us before they ask.',
  },
  {
    id: 'ocotillo',
    slug: 'ocotillo-ridge-flatbed',
    name: 'Ocotillo Ridge Flatbed',
    owner: 'Dario Quintero',
    foundedYear: 2019,
    fleet: {
      tractors: 1,
      trailers: [
        { type: '48-ft flatbed', count: 1 },
        { type: '48-ft step deck', count: 1 },
      ],
    },
    equipment: ['48-ft flatbed', '48-ft step deck', 'Tarps, chains and straps on every load', 'Edge protectors'],
    base: { street: '4120 W Dry Wash Road', city: 'Tolleson', state: 'AZ', zip: '85353', metro: 'Phoenix' },
    serviceArea: 'Arizona, Nevada, New Mexico and Southern California',
    lanes: [
      { from: 'Phoenix, AZ', to: 'Tucson, AZ', miles: 115, frequency: 'Weekly' },
      { from: 'Phoenix, AZ', to: 'Las Vegas, NV', miles: 300, frequency: 'Weekly' },
      { from: 'Phoenix, AZ', to: 'Albuquerque, NM', miles: 420, frequency: 'On request' },
      { from: 'Phoenix, AZ', to: 'Ontario, CA', miles: 315, frequency: 'Weekly' },
    ],
    specialties: ['Building materials', 'Steel and pipe', 'Machinery up to step-deck height limits', 'Solar project materials'],
    credentials: ['Fully insured, certificate of insurance on request', 'DOT number on file'],
    hours: ['Mon–Sat 5:00 a.m.–7:00 p.m.', 'Texts answered after hours'],
    quoteResponse: 'Quotes sent the same day',
    contact: { phone: '(602) 555-0186', email: 'ocotillo.flatbed@example.com', person: 'Dario Quintero' },
    ownerNote:
      'I run the truck myself. You talk to the driver who hauls your load. I tarp and secure every load and I send photos at pickup and at delivery.',
  },
];

export function carrierById(id: string): CarrierInput {
  const carrier = carriers.find((c) => c.id === id);
  if (!carrier) throw new Error(`unknown carrier ${id}`);
  return carrier;
}
