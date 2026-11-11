export const NAV = [
  { label: 'Products', href: '#products' },
  { label: 'Projects', href: '#projects' },
  { label: 'Technology', href: '#technology' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export const PRODUCTS = {
  tile: {
    name: 'Tile UPVC',
    profile: 'tile',
    blurb:
      'Classic tile profile, built to hold its colour through four decades of sun and monsoon.',
    specs: [
      'Roman tile profile that reads as clay from the street',
      '2.5 mm total build across three co-extruded layers',
      'Walkable at the purlin without crazing or creep',
    ],
    tags: ['ASA coated surface', 'Interlocking side lap'],
    colours: [
      { name: 'Terracotta', hex: '#a3452f' },
      { name: 'Charcoal', hex: '#3b3e42' },
      { name: 'Forest', hex: '#2f4c3c' },
      { name: 'Slate', hex: '#5d6873' },
    ],
  },
  trafford: {
    name: 'Trafford sheet',
    profile: 'trafford',
    blurb:
      'Deep trapezoidal ribs for long spans, warehouses, factories and coastal sheds.',
    specs: [
      'Trapezoidal rib allows wider purlin spacing',
      '2.0 mm build with an anti-corrosive underside',
      'Up to 1050 mm effective cover width per sheet',
    ],
    tags: ['Anti-corrosive underside', 'Long-span rib'],
    colours: [
      { name: 'Brick', hex: '#8c3a2b' },
      { name: 'Graphite', hex: '#4a4e54' },
      { name: 'Olive', hex: '#66673d' },
      { name: 'Stone', hex: '#aaa59b' },
    ],
  },
};

export const TESTS = [
  {
    area: 'Fire safety',
    title: 'Engineered for fire safety',
    value: '94',
    unit: 'UL',
    caption: 'UL94 tested, self-extinguishing',
    body: 'Tested to the UL94-2013 standard, the material self-extinguishes rather than carrying flame across a run of roof.',
  },
  {
    area: 'Weather & chemical',
    title: 'Superior corrosion resistance',
    value: '24',
    unit: 'h',
    caption: 'acid, saline and alkali immersion',
    body: 'No chemical reaction after twenty-four hours in acid, saline below 70% or alkali. The sheet to fit on the coast.',
  },
  {
    area: 'Thermal',
    title: 'Remarkable heat insulation',
    value: '35',
    unit: '%',
    caption: 'less heat carried than metal sheet',
    body: 'The ASA-PVC body carries far less heat than a metal deck of the same span, so the floor below stays workable all afternoon.',
  },
  {
    area: 'Acoustic',
    title: 'Good sound insulation',
    value: '30',
    unit: 'dB',
    caption: 'rain impact noise absorbed',
    body: 'Under the impact of rain the sheet absorbs rather than rings, a marked drop against bare metal of the same pitch.',
  },
  {
    area: 'UV & colour',
    title: 'Long-lasting colour stability',
    value: '10',
    unit: 'yr',
    caption: 'colour stability at ΔE ≤ 5',
    body: 'Anti-UV performance holds for at least ten years across swinging temperatures and hard outdoor exposure.',
  },
  {
    area: 'Structural',
    title: 'High load-bearing capacity',
    value: '150',
    unit: 'kg',
    caption: 'point load across span',
    body: 'Shaped to carry load across the purlin. It takes a fitter walking a run without deflection setting in at the crown.',
  },
  {
    area: 'Installation',
    title: 'Fast, simple fitting',
    value: '1050',
    unit: 'mm',
    caption: 'effective cover width',
    body: 'Lighter than clay and wider per sheet, so a crew closes a roof in fewer passes and with fewer hands on the ladder.',
  },
];

export const FAQ = [
  {
    q: 'What are UPVC roofing sheets made of?',
    a: 'UPVC is unplasticised PVC, a rigid plastic that does not rust or rot. Our Tile sheet is 2.5 mm across three co-extruded layers with an ASA-coated surface, and our Trafford sheet is a 2.0 mm build with an anti-corrosive underside.',
  },
  {
    q: 'Which profile should I choose, Tile or Trafford?',
    a: 'Choose Tile when the roof is part of the look: homes, villas and shops. Choose Trafford for long spans, warehouses, factories and coastal sheds. Its deep trapezoidal ribs allow wider purlin spacing.',
  },
  {
    q: 'Will the colour fade in strong sun and monsoon rain?',
    a: 'The ASA-coated surface is designed to resist sun and heavy rain, and the Tile sheet is built to hold its colour through decades of both. You should not need to repaint it.',
  },
  {
    q: 'Is it suitable for coastal areas?',
    a: 'Yes. Salt air corrodes coated steel, but UPVC does not rust. Trafford adds an anti-corrosive underside for buildings close to the sea.',
  },
  {
    q: 'Will the roof be hot or noisy?',
    a: 'UPVC conducts far less heat than metal, so the space under it stays more comfortable, and rain falls with a softer sound. A ceiling or insulation layer improves both further.',
  },
  {
    q: 'Can people walk on it during installation?',
    a: 'Yes, at the purlin. Step on the purlin lines rather than the middle of a span, and use a crawl board across wide spans.',
  },
  {
    q: 'How do I clean and maintain it?',
    a: 'Rinse with clean water and a soft brush when dust or leaves collect, and clear the gutters before the monsoon. Avoid solvents and abrasive scrubbers.',
  },
];

/* ------------------------------------------------------------------
   Media — files live in /public/media. Replace them with your own
   photos and videos using the same file names (or edit the paths).
------------------------------------------------------------------ */
export const SHOWREEL = {
  src: '/media/showreel.mp4',
  poster: '/media/showreel.jpg',
  title: 'A-Roof through a Kerala monsoon',
};

export const PROJECTS = [
  { src: '/media/project-1.jpg', place: 'Kakkanad, Kochi', kind: 'Homes', sheet: 'Tile, Terracotta', title: 'Two-storey villa' },
  { src: '/media/project-2.jpg', place: 'Aluva', kind: 'Commercial', sheet: 'Trafford, Graphite', title: 'Distribution warehouse' },
  { src: '/media/project-3.jpg', place: 'Thrissur', kind: 'Homes', sheet: 'Tile, Charcoal', title: 'Family home' },
  { src: '/media/project-4.jpg', place: 'Kollam coast', kind: 'Commercial', sheet: 'Trafford, Stone', title: 'Seafood processing unit' },
  { src: '/media/project-5.jpg', place: 'Munnar', kind: 'Homes', sheet: 'Tile, Forest', title: 'Hillside homestay' },
  { src: '/media/project-6.jpg', place: 'Kottayam', kind: 'Commercial', sheet: 'Trafford, Brick', title: 'Rubber workshop' },
];

export const VIDEOS = [
  { src: '/media/clip-rain.mp4', poster: '/media/clip-rain.jpg', title: 'Monsoon rain test', note: 'Tile sheet, Slate' },
  { src: '/media/clip-trafford.mp4', poster: '/media/clip-trafford.jpg', title: 'Trafford on a long span', note: 'Trafford sheet, Olive' },
  { src: '/media/clip-coast.mp4', poster: '/media/clip-coast.jpg', title: 'Coastal storage shed', note: 'Trafford sheet, Graphite' },
];
