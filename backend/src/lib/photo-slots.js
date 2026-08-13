const REQUIRED_SLOTS = [
  'ext_front', 'ext_fl45', 'ext_left', 'ext_rl45', 'ext_rear', 'ext_rr45', 'ext_right', 'ext_fr45',
  'det_roof', 'det_under', 'det_wfl', 'det_wfr', 'det_wrl', 'det_wrr',
  'det_tfl', 'det_tfr', 'det_trl', 'det_trr',
  'hood_bay', 'hood_serial', 'inst_odo', 'inst_vin',
  'int_dash', 'int_info', 'int_driver', 'int_rear', 'int_boot', 'int_head',
];

const OPTIONAL_SLOTS = ['def1', 'def2', 'def3', 'def4', 'def5', 'def6', 'def7', 'def8'];
const ALL_SLOTS = [...REQUIRED_SLOTS, ...OPTIONAL_SLOTS];
const SLOT_POSITION = new Map(ALL_SLOTS.map((key, index) => [key, index]));

module.exports = { REQUIRED_SLOTS, OPTIONAL_SLOTS, ALL_SLOTS, SLOT_POSITION };
