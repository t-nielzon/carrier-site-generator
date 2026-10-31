import henleyRun1 from './fixtures/henley-ridge.run1.json';
import henleyRun2 from './fixtures/henley-ridge.run2.json';
import larkspurRun1 from './fixtures/larkspur.run1.json';
import ocotilloRun1 from './fixtures/ocotillo.run1.json';
import type { SiteSpec } from './types';
import { validateSpec } from './validate';

// recorded demo content. the specs, planning notes and review notes were drafted with claude during
// development and edited by hand; no pipeline run or api call produced them. the demo replays these
// runs through the real validator, renderer and checks, and never calls a model.

export interface RecordedRun {
  number: number;
  /** the recorded spec json, validated at use like a live response would be */
  output: unknown;
  /** planning notes recorded with this run, shown in the run details */
  notes: string[];
  /** when a run follows a failed one, the check failures that the rewrite responds to */
  feedback?: string[];
  /** set on the staged first draft that exists to show what the checks catch */
  staged?: boolean;
}

/** a before and after pair from the staged draft, shown next to the check that caught it */
export interface Correction {
  page: string;
  check: 'grounding' | 'meta-description' | 'local-keyword';
  before: string;
  after: string;
}

/** an illustrative review score, written by hand for the demo; no judge model produced it */
export interface RubricScore {
  criterion: string;
  score: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

export interface CarrierRecording {
  carrierId: string;
  runs: RecordedRun[];
  rubric: RubricScore[];
  corrections?: Correction[];
}

export const recordings: CarrierRecording[] = [
  {
    carrierId: 'henley-ridge',
    runs: [
      {
        number: 1,
        output: henleyRun1,
        staged: true,
        notes: [
          'Audience: shippers and logistics buyers in metro Atlanta who need regional dry van trucks.',
          'Lead with the equipment, the four regular lanes and the drop-trailer program.',
          'Local keyword for titles and meta descriptions: Atlanta. Secondary: McDonough, Southeast.',
          'Keep the quote action in the header, the hero and at the end of each page.',
        ],
      },
      {
        number: 2,
        output: henleyRun2,
        feedback: [
          'Services: meta description is missing.',
          'Home: "1998" maps to no input fact. The input says founded in 2011.',
          'Home: "award-winning" and "family-owned" map to no input fact. The input says "family-run".',
        ],
        notes: [
          'Write a Services meta description of 70–160 characters with the Atlanta keyword.',
          'Use the founding year from the input and say "family-run", as the owner note does.',
          'Remove the award claim. Use insurance and logging devices as trust signals, because the input has them.',
        ],
      },
    ],
    corrections: [
      {
        page: 'Home',
        check: 'grounding',
        before: 'Grant and Lena Whitfield have run Henley Ridge Freight since 1998.',
        after: 'Grant and Lena Whitfield started Henley Ridge Freight in 2011.',
      },
      {
        page: 'Home',
        check: 'grounding',
        before: 'It is an award-winning, family-owned fleet',
        after: 'It is still a family-run fleet',
      },
      {
        page: 'Services',
        check: 'meta-description',
        before: '',
        after: 'Retail replenishment, drop-trailer programs and palletized freight in 53-ft dry vans from Atlanta across the Southeast.',
      },
    ],
    rubric: [
      { criterion: 'Clear offer', score: 5, reason: 'The first lines say what is hauled, in what trailers and on which lanes.' },
      { criterion: 'Local relevance', score: 5, reason: 'Atlanta and the four lane cities appear in titles, descriptions and the lanes page.' },
      { criterion: 'Trust signals grounded in input', score: 4, reason: 'Insurance, logging devices and the founding year are grounded. The input has no reviews, so the site shows none.' },
      { criterion: 'Call to action clarity', score: 5, reason: 'Every page ends with one quote action, and the header keeps it in view.' },
      { criterion: 'Readability', score: 4, reason: 'Short, active sentences. The home and services pages describe the same freight twice.' },
    ],
  },
  {
    carrierId: 'larkspur',
    runs: [
      {
        number: 1,
        output: larkspurRun1,
        notes: [
          'Audience: food shippers and grocery buyers around Dallas who need cold-chain capacity.',
          'Lead with temperature control: pre-cooling, monitoring and records for every load.',
          'Local keyword for titles and meta descriptions: Dallas. Use lane cities on the lanes page.',
          'Do not add the two trailer counts into one total. The input does not state a total.',
        ],
      },
    ],
    rubric: [
      { criterion: 'Clear offer', score: 5, reason: 'Produce, dairy and frozen foods in reefers is clear from the hero.' },
      { criterion: 'Local relevance', score: 4, reason: 'Dallas is strong. The Oklahoma and Arkansas lanes get less detail than the Texas lanes.' },
      { criterion: 'Trust signals grounded in input', score: 5, reason: 'Temperature records and food safety training come straight from the input.' },
      { criterion: 'Call to action clarity', score: 4, reason: 'The quote form is clear, but the 24/7 phone line competes with it for attention.' },
      { criterion: 'Readability', score: 4, reason: 'Plain sentences. Some terms, such as set point, assume a freight reader.' },
    ],
  },
  {
    carrierId: 'ocotillo',
    runs: [
      {
        number: 1,
        output: ocotilloRun1,
        notes: [
          'Audience: contractors, supply yards and solar installers around Phoenix.',
          'Write in the first person. The owner drives the only truck, and that is the main selling point.',
          'Local keyword for titles and meta descriptions: Phoenix. Name the base in Tolleson.',
          'Be honest about capacity: one truck, one load at a time, so early booking helps.',
        ],
      },
    ],
    rubric: [
      { criterion: 'Clear offer', score: 4, reason: 'Flatbed and step deck are clear. The machinery limit is only described as step-deck height.' },
      { criterion: 'Local relevance', score: 5, reason: 'Phoenix is in every title and description, and the lanes page names each city.' },
      { criterion: 'Trust signals grounded in input', score: 4, reason: 'Photos at pickup and delivery and the owner voice are grounded. There are few other proof points in the input.' },
      { criterion: 'Call to action clarity', score: 5, reason: 'Call, text or form, and each one says how fast the quote comes back.' },
      { criterion: 'Readability', score: 5, reason: 'Short first-person sentences that a busy site manager can scan.' },
    ],
  },
];

export function recordingFor(carrierId: string): CarrierRecording {
  const r = recordings.find((x) => x.carrierId === carrierId);
  if (!r) throw new Error(`no recording for ${carrierId}`);
  return r;
}

/** the last run of each carrier is the one that was published */
export function publishedSpec(carrierId: string): SiteSpec {
  const runs = recordingFor(carrierId).runs;
  const last = runs[runs.length - 1];
  const v = validateSpec(last?.output);
  if (!v.ok) throw new Error(`published spec for ${carrierId} is invalid: ${v.problems.join('; ')}`);
  return v.spec;
}
