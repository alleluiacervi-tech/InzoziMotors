// Canonical Sawa vehicle inspection policy.
//
// This module is the only authority for checklist identity, completeness,
// scoring and pass/fail. Interfaces fetch this definition from the API instead
// of carrying their own subtly different lists. There are exactly 150 checks:
// one possible point per check, grouped into operational categories.

const CHECKLIST_VERSION = 'sawa-150-v1';
const SCORE_MAX = 150;
const PUBLISH_THRESHOLD = 105;
const VERDICTS = new Set(['pass', 'flag', 'fail']);

const item = (id, label, critical = false) => ({ id, label, critical });

const CATEGORIES = [
  {
    id: 'engine', name: 'Engine & Drivetrain', icon: 'cog-outline', max_points: 25,
    items: [
      item('e01', 'Engine oil level within specification'),
      item('e02', 'Engine oil condition free from contamination'),
      item('e03', 'Upper engine free from active oil leaks'),
      item('e04', 'Engine underside free from active oil leaks', true),
      item('e05', 'Coolant level within specification'),
      item('e06', 'Coolant condition free from oil or corrosion'),
      item('e07', 'Cooling system free from active leaks', true),
      item('e08', 'Radiator and expansion tank structurally sound'),
      item('e09', 'Cooling fan operates at working temperature'),
      item('e10', 'Cooling hoses secure and free from cracking'),
      item('e11', 'Accessory drive belts correctly tensioned'),
      item('e12', 'Timing belt or chain condition and service evidence'),
      item('e13', 'Engine mounts secure without excessive movement'),
      item('e14', 'Cold and warm engine starting performance'),
      item('e15', 'Engine idle stable at operating temperature'),
      item('e16', 'Engine acceleration smooth through operating range'),
      item('e17', 'Exhaust smoke within normal limits', true),
      item('e18', 'Exhaust system secure and free from leaks'),
      item('e19', 'Engine free from abnormal knock or bearing noise'),
      item('e20', 'Engine live-data readings within expected range'),
      item('e21', 'Transmission fluid level within specification'),
      item('e22', 'Transmission fluid condition acceptable'),
      item('e23', 'Forward and reverse gear engagement reliable', true),
      item('e24', 'Gear changes smooth during road test'),
      item('e25', 'Driveshafts, CV joints and differential free from abnormal noise'),
    ],
  },
  {
    id: 'brakes', name: 'Brakes & Steering', icon: 'disc-outline', max_points: 25,
    items: [
      item('b01', 'Front-left brake friction material above safe limit', true),
      item('b02', 'Front-right brake friction material above safe limit', true),
      item('b03', 'Rear-left brake friction material above safe limit', true),
      item('b04', 'Rear-right brake friction material above safe limit', true),
      item('b05', 'Front brake rotors free from unsafe wear or cracking', true),
      item('b06', 'Rear brake rotors or drums free from unsafe wear', true),
      item('b07', 'Brake fluid level within specification'),
      item('b08', 'Brake fluid condition acceptable'),
      item('b09', 'Brake lines and flexible hoses secure and undamaged', true),
      item('b10', 'Hydraulic braking system free from leaks', true),
      item('b11', 'Brake pedal feel and travel safe', true),
      item('b12', 'Brake servo or booster operates correctly'),
      item('b13', 'Parking brake holds the vehicle securely'),
      item('b14', 'ABS warning self-check completes without fault', true),
      item('b15', 'ABS wheel-speed data consistent during test'),
      item('b16', 'Power steering fluid or electric steering status normal'),
      item('b17', 'Steering wheel free play within safe tolerance', true),
      item('b18', 'Steering rack secure and free from active leaks'),
      item('b19', 'Tie rods and steering joints free from unsafe play', true),
      item('b20', 'Front suspension ball joints free from unsafe play', true),
      item('b21', 'Front-left wheel bearing free from noise or play'),
      item('b22', 'Front-right wheel bearing free from noise or play'),
      item('b23', 'Rear wheel bearings free from noise or play'),
      item('b24', 'Wheel alignment and steering-centre behaviour acceptable'),
      item('b25', 'Vehicle brakes straight and predictably during road test', true),
    ],
  },
  {
    id: 'body', name: 'Body & Exterior', icon: 'car-outline', max_points: 20,
    items: [
      item('bo01', 'Body panel gaps consistent around the vehicle'),
      item('bo02', 'Paint finish assessed for major damage or repaint'),
      item('bo03', 'Bonnet, doors and boot align and close correctly'),
      item('bo04', 'Bonnet latch and secondary catch operate securely', true),
      item('bo05', 'Door hinges, catches and seals operate correctly'),
      item('bo06', 'Front and rear bumpers securely mounted'),
      item('bo07', 'Windscreen free from safety-critical cracks', true),
      item('bo08', 'Side and rear glass secure and serviceable'),
      item('bo09', 'Exterior mirrors secure and undamaged'),
      item('bo10', 'Wipers and washers clear the windscreen effectively'),
      item('bo11', 'Roof panel free from structural deformation'),
      item('bo12', 'A, B and C pillars free from structural repair evidence', true),
      item('bo13', 'Front chassis rails free from structural damage', true),
      item('bo14', 'Rear chassis rails free from structural damage', true),
      item('bo15', 'Underbody free from severe corrosion', true),
      item('bo16', 'Suspension mounting points structurally sound', true),
      item('bo17', 'Visible accident repairs recorded accurately'),
      item('bo18', 'Fuel filler cap and door operate correctly'),
      item('bo19', 'Mudguards, liners and undertrays securely fitted'),
      item('bo20', 'Exterior identification plates and markings intact'),
    ],
  },
  {
    id: 'interior', name: 'Interior & Comfort', icon: 'car-sport-outline', max_points: 20,
    items: [
      item('i01', 'Driver seat frame and adjustment secure'),
      item('i02', 'Front passenger seat frame and adjustment secure'),
      item('i03', 'Rear seats and folding mechanisms secure'),
      item('i04', 'Seat upholstery condition recorded accurately'),
      item('i05', 'Dashboard and trim securely fitted'),
      item('i06', 'Instrument cluster gauges operate correctly'),
      item('i07', 'Odometer display operates and reading is recorded'),
      item('i08', 'Heating system produces warm air'),
      item('i09', 'Air-conditioning system produces cold air'),
      item('i10', 'Cabin blower works at all speeds'),
      item('i11', 'Front power windows operate correctly'),
      item('i12', 'Rear power windows operate correctly'),
      item('i13', 'Power mirror adjustment operates correctly'),
      item('i14', 'Interior and courtesy lights operate correctly'),
      item('i15', 'Door locks operate from inside and outside'),
      item('i16', 'Child-safety locks operate where fitted'),
      item('i17', 'Boot or cargo-area trim and floor condition recorded'),
      item('i18', 'Boot seal is dry and free from water ingress'),
      item('i19', 'Cabin free from evidence of significant water ingress'),
      item('i20', 'Warning labels and occupant controls legible'),
    ],
  },
  {
    id: 'electronics', name: 'Electronics & Safety', icon: 'flash-outline', max_points: 20,
    items: [
      item('el01', 'Battery state of charge acceptable'),
      item('el02', 'Battery health and load-test result acceptable'),
      item('el03', 'Battery terminals secure and free from severe corrosion'),
      item('el04', 'Alternator charging voltage within specification'),
      item('el05', 'Starter motor operates reliably'),
      item('el06', 'OBD diagnostic scan completed and faults recorded'),
      item('el07', 'Engine warning lamp self-check completes correctly'),
      item('el08', 'Airbag warning lamp self-check completes correctly', true),
      item('el09', 'Traction or stability control self-check completes'),
      item('el10', 'Driver seatbelt and buckle operate correctly', true),
      item('el11', 'Front passenger seatbelt and buckle operate correctly', true),
      item('el12', 'Rear seatbelts and buckles operate correctly', true),
      item('el13', 'Low- and high-beam headlights operate correctly', true),
      item('el14', 'Indicators and hazard lights operate correctly', true),
      item('el15', 'Brake lights operate correctly', true),
      item('el16', 'Tail, number-plate and reverse lights operate correctly'),
      item('el17', 'Horn operates correctly', true),
      item('el18', 'Central locking and remote key operate correctly'),
      item('el19', 'Immobilizer or security system operates correctly'),
      item('el20', 'Parking sensors or cameras tested where fitted'),
    ],
  },
  {
    id: 'tyres', name: 'Tyres & Wheels', icon: 'radio-button-on-outline', max_points: 15,
    items: [
      item('t01', 'Front-left tyre tread above minimum standard', true),
      item('t02', 'Front-right tyre tread above minimum standard', true),
      item('t03', 'Rear-left tyre tread above minimum standard', true),
      item('t04', 'Rear-right tyre tread above minimum standard', true),
      item('t05', 'All road tyres free from cuts, bulges or exposed cord', true),
      item('t06', 'Tyre pressures set and recorded'),
      item('t07', 'Tyre manufacture dates and ageing condition recorded'),
      item('t08', 'Tyres match appropriately across each axle'),
      item('t09', 'Spare tyre tread and condition acceptable'),
      item('t10', 'Spare tyre pressure acceptable'),
      item('t11', 'Front wheels free from cracks or unsafe distortion', true),
      item('t12', 'Rear wheels free from cracks or unsafe distortion', true),
      item('t13', 'Wheel nuts or bolts present and correctly seated', true),
      item('t14', 'Jack and wheel-changing tools present where supplied'),
      item('t15', 'Tyre wear pattern free from severe alignment defects'),
    ],
  },
  {
    id: 'documentation', name: 'Documentation & Roadworthiness', icon: 'document-text-outline', max_points: 25,
    items: [
      item('d01', 'Original vehicle registration card inspected', true),
      item('d02', 'Registration details are current and legible'),
      item('d03', 'Registered owner matches seller or authority to sell', true),
      item('d04', 'Dashboard or windscreen VIN recorded'),
      item('d05', 'Chassis-stamped VIN physically recorded'),
      item('d06', 'VIN matches registration and supporting documents', true),
      item('d07', 'Engine number matches available records'),
      item('d08', 'Registration plate matches the registration record'),
      item('d09', 'Seller identity checked against submitted identity record'),
      item('d10', 'Seller authority to list and transfer the vehicle verified', true),
      item('d11', 'Transfer restrictions or encumbrances declared', true),
      item('d12', 'Finance or lien status declared and documented'),
      item('d13', 'Available theft or police-clearance evidence checked', true),
      item('d14', 'RRA duty-payment proof checked where applicable', true),
      item('d15', 'Import declaration checked where applicable'),
      item('d16', 'Customs-clearance documents checked where applicable', true),
      item('d17', 'Country of origin and import path recorded'),
      item('d18', 'Insurance certificate status recorded'),
      item('d19', 'Roadworthiness certificate status recorded'),
      item('d20', 'Service-history records inspected'),
      item('d21', 'Recorded mileage is consistent with available history'),
      item('d22', 'Known major-accident history declared'),
      item('d23', 'Known flood or fire history declared'),
      item('d24', 'Number of keys and remote controls recorded'),
      item('d25', 'Owner manuals and supplied service documents recorded'),
    ],
  },
];

const ALL_ITEMS = CATEGORIES.flatMap((category) => category.items.map((entry) => ({
  ...entry,
  category_id: category.id,
  category_name: category.name,
})));
const ITEM_BY_ID = new Map(ALL_ITEMS.map((entry) => [entry.id, entry]));
const REQUIRED_ITEM_IDS = ALL_ITEMS.map((entry) => entry.id);

if (ALL_ITEMS.length !== SCORE_MAX || CATEGORIES.some((category) => category.items.length !== category.max_points)) {
  throw new Error('Inspection policy must define exactly 150 one-point checks');
}

function validateChecklist(checklistResults) {
  if (!checklistResults || typeof checklistResults !== 'object' || Array.isArray(checklistResults)) {
    return { valid: false, complete: false, missing: [...REQUIRED_ITEM_IDS], unknown: [], invalid: [] };
  }
  const keys = Object.keys(checklistResults);
  const unknown = keys.filter((id) => !ITEM_BY_ID.has(id));
  const invalid = keys.filter((id) => ITEM_BY_ID.has(id) && !VERDICTS.has(checklistResults[id]));
  const missing = REQUIRED_ITEM_IDS.filter((id) => !Object.prototype.hasOwnProperty.call(checklistResults, id));
  return {
    valid: unknown.length === 0 && invalid.length === 0 && missing.length === 0,
    complete: missing.length === 0,
    missing,
    unknown,
    invalid,
  };
}

function evaluateChecklist(checklistResults) {
  const validation = validateChecklist(checklistResults);
  const value = (verdict) => verdict === 'pass' ? 1 : verdict === 'flag' ? 0.5 : 0;
  const category_scores = CATEGORIES.map((category) => {
    const earned = category.items.reduce((sum, entry) => sum + value(checklistResults?.[entry.id]), 0);
    const verdicts = category.items.map((entry) => checklistResults?.[entry.id]);
    const flags = category.items
      .filter((entry) => checklistResults?.[entry.id] && checklistResults[entry.id] !== 'pass')
      .map((entry) => ({ id: entry.id, label: entry.label, verdict: checklistResults[entry.id], critical: entry.critical }));
    return {
      id: category.id,
      name: category.name,
      max_points: category.max_points,
      earned: Number(earned.toFixed(1)),
      checked: verdicts.filter((verdict) => VERDICTS.has(verdict)).length,
      pass_count: verdicts.filter((verdict) => verdict === 'pass').length,
      flag_count: verdicts.filter((verdict) => verdict === 'flag').length,
      fail_count: verdicts.filter((verdict) => verdict === 'fail').length,
      flags,
    };
  });
  const rawScore = category_scores.reduce((sum, category) => sum + category.earned, 0);
  const score = Math.round(rawScore);
  const critical_failures = ALL_ITEMS
    .filter((entry) => entry.critical && checklistResults?.[entry.id] === 'fail')
    .map((entry) => ({ id: entry.id, label: entry.label, category: entry.category_name }));
  const passed = validation.valid && score >= PUBLISH_THRESHOLD && critical_failures.length === 0;
  return { ...validation, score, raw_score: rawScore, passed, critical_failures, category_scores };
}

function grade(score) {
  return score >= 128 ? 'A' : score >= PUBLISH_THRESHOLD ? 'B' : score >= 83 ? 'C' : 'D';
}

function publicDefinition() {
  return {
    version: CHECKLIST_VERSION,
    max_score: SCORE_MAX,
    passing_score: PUBLISH_THRESHOLD,
    item_count: ALL_ITEMS.length,
    verdicts: ['pass', 'flag', 'fail'],
    categories: CATEGORIES,
  };
}

module.exports = {
  // The verdict vocabulary is part of the contract, not a private detail:
  // the draft-save route has to refuse anything the completion would reject.
  VERDICTS,
  CHECKLIST_VERSION,
  SCORE_MAX,
  PUBLISH_THRESHOLD,
  CATEGORIES,
  ALL_ITEMS,
  ITEM_BY_ID,
  REQUIRED_ITEM_IDS,
  validateChecklist,
  evaluateChecklist,
  grade,
  publicDefinition,
};
