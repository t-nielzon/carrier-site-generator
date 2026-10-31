// the licensed photo library a generated site may pick from. a spec names a photo by id and
// writes its own alt text; it never supplies a url, so a site can only show vetted images.
// every photo is illustrative stock and is credited on the page where it appears.

export interface MediaAsset {
  id: string;
  /** file name stem under /carrier-media/, one file per width and format */
  stem: string;
  widths: number[];
  /** intrinsic aspect of the derived files */
  width: number;
  height: number;
  author: string;
  sourceUrl: string;
  license: 'Pexels License' | 'CC0';
  /** what the photo shows, so a spec can match equipment to the carrier */
  subject: string;
}

export const MEDIA_BASE = '/carrier-media/';

export const MEDIA: MediaAsset[] = [
  {
    id: 'dry-van-highway',
    stem: 'henley-ridge-van',
    widths: [960, 1920],
    width: 1900,
    height: 950,
    author: 'Tom Jackson',
    sourceUrl: 'https://www.pexels.com/photo/kenworth-t680-semi-trailer-truck-driving-down-the-road-27099095/',
    license: 'Pexels License',
    subject: 'US conventional tractor pulling a 53-ft dry van on a two-lane highway',
  },
  {
    id: 'reefer-conventional',
    stem: 'larkspur-reefer',
    widths: [960, 1920],
    width: 2600,
    height: 1300,
    author: 'R9 Media Photo Collective',
    sourceUrl: 'https://www.pexels.com/photo/powerful-red-semi-truck-in-scenic-parking-area-33081220/',
    license: 'Pexels License',
    subject: 'US long-nose tractor with a refrigerated trailer; the reefer unit is visible',
  },
  {
    id: 'reefer-unit',
    stem: 'larkspur-reefer-unit',
    widths: [480, 760],
    width: 760,
    height: 760,
    author: 'R9 Media Photo Collective',
    sourceUrl: 'https://www.pexels.com/photo/powerful-red-semi-truck-in-scenic-parking-area-33081220/',
    license: 'Pexels License',
    subject: 'Close crop of the refrigeration unit on the front of the trailer',
  },
  {
    id: 'flatbed-tractor',
    stem: 'ocotillo-flatbed',
    widths: [1000, 2000],
    width: 2331,
    height: 1165,
    author: 'Thai blanc (Wikimedia Commons)',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Truck_du_Nouveau_Brunswick.jpg',
    license: 'CC0',
    subject: 'US long-nose tractor coupled to an empty flatbed trailer in a dirt yard',
  },
  {
    id: 'flatbed-strapped-load',
    stem: 'ocotillo-load',
    widths: [800, 1600],
    width: 3200,
    height: 1600,
    author: 'Wikideas1 (Wikimedia Commons)',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Flat_bed_trailer.jpg',
    license: 'CC0',
    subject: 'Flatbed trailer with bundled lumber held down by ratchet straps',
  },
];

export function mediaById(id: string): MediaAsset | undefined {
  return MEDIA.find((m) => m.id === id);
}

export function mediaSrc(asset: MediaAsset, width: number, format: 'avif' | 'webp' | 'jpg'): string {
  return `${MEDIA_BASE}${asset.stem}-${width}.${format}`;
}

export function mediaCredit(asset: MediaAsset): string {
  return `Illustrative photo: ${asset.author}, ${asset.license}. Not this carrier's truck.`;
}
