import type { Product } from '../types'
import { CHECK_DATE, product as P } from './helpers'

const AD = 'https://www.adafruit.com/images/480x360'
const PO = 'https://a.pololu-files.com/picture'
const src = (label: string, url: string, kind: 'distributor' | 'manufacturer' = 'distributor') => [{ label: `${label} (fetched ${CHECK_DATE})`, kind, url }]

export const imus: Product[] = [
  P({
    id: 'imu-mpu6050', slots: ['imu'], name: 'MPU-6050 6-DoF breakout', brand: 'Adafruit (InvenSense MPU-6050)', price: 12.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Adafruit',
    priceNote: 'Adafruit STEMMA QT breakout price. Cheaper generic GY-521 clones exist but are not priced here.', url: 'https://www.adafruit.com/product/3886', image: `${AD}/3886-06.jpg`,
    summary: 'Economical 6-axis accelerometer + gyro over I²C; no magnetometer and no onboard orientation fusion.',
    pros: ['Cheap and ubiquitous', 'Huge pool of example code', 'I²C — easy to connect to any host'], cons: ['Gyro drift: yaw needs external correction (UWB / camera)', 'No magnetometer', 'Older part; noisier than LSM6DSOX'],
    specs: [['Axes', '3-axis accel + 3-axis gyro'], ['Interface', 'I²C (STEMMA QT / Qwiic)']], includes: ['Breakout board'], excludes: ['Headers/cable'], provides: ['imu'],
    sources: src('Adafruit listing', 'https://www.adafruit.com/product/3886'), confidence: 'distributor', specStatus: 'partial', ratings: { integration: 5, docs: 4, expandability: 2 }, ratingBasis: 'Easy to wire; limited accuracy.',
    raptorStatus: 'requires-firmware', raptorNote: 'Orientation filter (e.g. complementary / EKF) and bias calibration are software tasks.', tags: ['6-axis', 'i2c'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'imu-lsm6dsox', slots: ['imu'], name: 'LSM6DSOX 6-DoF breakout', brand: 'Adafruit (ST LSM6DSOX)', price: 11.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Adafruit',
    url: 'https://www.adafruit.com/product/4438', image: 'https://cdn-shop.adafruit.com/480x360/4438-05.jpg', summary: 'Modern 6-axis IMU with low noise and an embedded machine-learning core.',
    pros: ['Lower noise and better stability than MPU-6050', 'Same price class', 'I²C / SPI'], cons: ['No magnetometer / no onboard fusion', 'Yaw still drifts', 'Fewer legacy tutorials than MPU-6050'],
    specs: [['Axes', '3-axis accel + 3-axis gyro'], ['Interface', 'I²C / SPI (STEMMA QT)']], includes: ['Breakout board'], excludes: [], provides: ['imu'],
    sources: src('Adafruit listing', 'https://www.adafruit.com/product/4438'), confidence: 'distributor', specStatus: 'partial', ratings: { integration: 4, docs: 4, expandability: 3 }, ratingBasis: 'Good datasheet and driver support.',
    raptorStatus: 'requires-firmware', raptorNote: 'Good value inertial source for UWB-IMU fusion.', tags: ['6-axis', 'i2c', 'spi'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'imu-bno085', slots: ['imu'], name: 'BNO085 9-DoF orientation IMU', brand: 'Adafruit (CEVA BNO085)', price: 29.5, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Adafruit',
    url: 'https://www.adafruit.com/product/4754', image: `${AD}/4754-00.jpg`, summary: '9-axis IMU with an onboard fusion processor that outputs absolute orientation.',
    pros: ['Onboard sensor fusion — stable heading without custom filter', 'Magnetometer included', 'Rotation-vector output at low host load'], cons: ['Highest IMU cost here', 'Magnetometer is unreliable near motors / steel', 'Closed fusion algorithm; harder to inspect/tune'],
    specs: [['Axes', '9-axis (accel, gyro, mag) + fusion'], ['Interface', 'I²C / SPI / UART (breakout)']], includes: ['Breakout board'], excludes: [], provides: ['imu'],
    sources: src('Adafruit listing', 'https://www.adafruit.com/product/4754'), confidence: 'distributor', specStatus: 'partial', ratings: { integration: 4, docs: 4, expandability: 4 }, ratingBasis: 'Strong fused output; costlier.',
    raptorStatus: 'requires-validation', raptorNote: 'Magnetic heading near motors must be tested; may be used gyro-only.', tags: ['9-axis', 'fusion'], purchasePriority: 'optional',
  }),
]

export const odometry: Product[] = [
  P({
    id: 'romi-encoders', slots: ['odometry'], name: 'Romi Encoder Pair Kit (12 CPR)', brand: 'Pololu', price: 9.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Pololu',
    url: 'https://www.pololu.com/product/3542', image: `${PO}/0J9433.600x480.jpg`, summary: 'Magnetic quadrature encoder pair designed for Romi motors (extended back shaft).',
    pros: ['Quadrature output, 12 counts/rev (motor shaft)', 'Drops onto Romi chassis motors', 'Documented and supported'], cons: ['Fits Romi/Pololu extended-shaft motors; mechanical fit elsewhere is NOT assured', 'Two encoders only (differential drive)', '12 CPR before gearbox needs a high-rate counter'],
    specs: [['Resolution', '12 CPR at motor shaft'], ['Supply', '3.5–18 V']], includes: ['2 encoders'], excludes: ['Wiring'], provides: ['encoders'],
    sources: src('Pololu listing', 'https://www.pololu.com/product/3542', 'manufacturer'), confidence: 'manufacturer', specStatus: 'partial',
    raptorStatus: 'compatible-in-principle', raptorNote: 'Compatible with Pololu Romi chassis only (mechanical).', tags: ['encoder', 'romi-only'], purchasePriority: 'before-integration', defaultQty: 1,
  }),
  P({
    id: 'as5600', slots: ['odometry'], name: 'AS5600 magnetic rotary encoder', brand: 'ams OSRAM (breakout varies)', price: 5.95, priceStatus: 'preliminary', seller: 'Various breakout sellers',
    priceNote: 'Team price $5.95 each. Web search 2026-10-23 found Soldered €4.95 (out of stock), Seeed Grove $9.90, Adafruit ≈ £12 — the $5.95 figure is NOT confirmed.', url: 'https://soldered.com/products/position-sensor-as5600-breakout',
    summary: '12-bit absolute magnetic angle sensor (I²C / PWM / analog) for custom wheel or axle encoders.',
    pros: ['Absolute angle without index pulse', 'I²C interface — no counter needed', 'Cheap'], cons: ['Needs a diametric magnet and a custom mechanical mount', 'Fixed I²C address — multiple sensors need a mux', 'Absolute angle, not a high-rate quadrature counter'],
    specs: [['Resolution', '12-bit (4096 steps/turn)'], ['Interface', 'I²C / PWM / analog']], includes: ['Breakout board'], excludes: ['Magnet', 'I²C multiplexer'], provides: ['encoders'],
    sources: [{ label: 'Soldered AS5600 breakout (search 2026-10-23)', kind: 'distributor', url: 'https://soldered.com/products/position-sensor-as5600-breakout' }], confidence: 'distributor', specStatus: 'partial',
    raptorStatus: 'requires-firmware', raptorNote: 'Requires mechanical design for each wheel; two sensors → I²C address conflict.', tags: ['encoder', 'i2c', 'custom-mount'], purchasePriority: 'optional', defaultQty: 2,
  }),
  P({
    id: 'motor-encoders-generic', slots: ['odometry'], name: 'Geared motors with integrated encoders (generic)', brand: 'Generic', price: null, priceStatus: 'unknown',
    summary: 'Placeholder for replacing the platform motors with encoder-equipped geared motors. Pick and price a specific model.', pros: ['Quadrature feedback at the wheel', 'Cleanest mechanical solution'], cons: ['No specific product selected', 'Motor voltage/shaft/mount must match the chassis'],
    specs: [['Note', 'No specific model chosen']], includes: [], excludes: [], provides: ['encoders'], sources: [{ label: 'Team notes', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Add a real model + price.', tags: ['encoder', 'placeholder'], purchasePriority: 'research', defaultQty: 1,
  }),
]

export const powerMonitors: Product[] = [
  P({
    id: 'ina260', slots: ['power-monitor'], name: 'INA260 power monitor', brand: 'Adafruit (TI INA260)', price: 9.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Adafruit',
    url: 'https://www.adafruit.com/product/4226', image: `${AD}/4226-12.jpg`, summary: 'High/low-side voltage, current and power sensor with integrated shunt (I²C).',
    pros: ['Integrated precision shunt', 'Voltage + current + power in one chip', 'I²C'], cons: ['Shunt rating limits max current (check vs motor stall)', 'Extra cost if the platform already monitors power', 'Needs firmware/driver'],
    specs: [['Interface', 'I²C'], ['Measures', 'Bus voltage, current, power']], includes: ['Breakout'], excludes: [], provides: ['power-monitor'],
    sources: src('Adafruit listing', 'https://www.adafruit.com/product/4226'), confidence: 'distributor', specStatus: 'partial', raptorStatus: 'compatible-in-principle', raptorNote: 'Battery state estimation for runtime and low-battery safety stop.', tags: ['power', 'i2c'], purchasePriority: 'optional',
  }),
  P({
    id: 'ina219', slots: ['power-monitor'], name: 'INA219 high-side current sensor', brand: 'Adafruit (TI INA219)', price: 9.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Adafruit',
    url: 'https://www.adafruit.com/product/904', image: `${AD}/904-09.jpg`, summary: '26 V ±3.2 A breakout; common on robot driver boards already.',
    pros: ['Compact and well supported', 'I²C', 'May already exist on the selected robot board'], cons: ['±3.2 A range', 'External shunt resistor on breakout', 'Duplicate if kit already includes it'],
    specs: [['Range', '26 V, ±3.2 A']], includes: ['Breakout'], excludes: [], provides: ['power-monitor'],
    sources: src('Adafruit listing', 'https://www.adafruit.com/product/904'), confidence: 'distributor', specStatus: 'partial', raptorStatus: 'compatible-in-principle', raptorNote: 'Skip if the platform board includes one.', tags: ['power', 'i2c'], purchasePriority: 'optional',
  }),
]

export const safety: Product[] = [
  P({
    id: 'bumper-switch', slots: ['safety'], name: 'Bumper micro-switch', brand: 'Generic / Pololu snap-action', price: 1.5, priceStatus: 'preliminary', seller: 'Various',
    observed: { price: 2.37, seller: 'Pololu (snap-action switch #1405)', date: CHECK_DATE, url: 'https://www.pololu.com/product/1405' }, priceNote: 'Team price $1.50 each. Pololu snap-action switch listed $2.37.',
    url: 'https://www.pololu.com/product/1405', image: `${PO}/0J12564.600x480.jpg`, summary: 'Mechanical contact switch for a last-resort collision stop (a contact sensor, not a ranging device).',
    pros: ['Cheap, deterministic, hardware-level signal', 'Not a ranging sensor — allowed', 'Wired straight to a safety MCU interrupt'], cons: ['Detects contact only', 'Needs a mechanical bumper design', 'Limited coverage'],
    specs: [['Type', 'SPDT snap-action']], includes: ['1 switch'], excludes: ['Bumper bar'], provides: [], defaultQty: 2,
    sources: src('Pololu listing', 'https://www.pololu.com/product/1405', 'manufacturer'), confidence: 'manufacturer', specStatus: 'partial', raptorStatus: 'compatible-in-principle', raptorNote: 'Contact sensing complements camera-based obstacle avoidance.', tags: ['safety', 'contact'], purchasePriority: 'optional',
  }),
  P({
    id: 'estop-switch', slots: ['safety'], name: 'Emergency-stop / master power switch', brand: 'Generic', price: null, priceHint: { price: 4, note: 'Typical hobby-grade latching switch — team estimate, not a quote.' },
    summary: 'A latching switch that cuts motor power independent of software. Pick a part rated for the pack voltage and stall current.', pros: ['Software-independent stop', 'Demonstrates safety compliance clearly'], cons: ['Part not chosen — price unknown', 'Must be rated for motor current'],
    specs: [['Rating', 'Must exceed motor stall current at pack voltage']], includes: ['1 switch'], excludes: [], provides: ['estop', 'power-switch'], sources: [{ label: 'Team estimate', kind: 'team-estimate' }],
    raptorStatus: 'requires-validation', raptorNote: 'Verification: fault test (stop within a defined time).', tags: ['safety'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'inline-fuse', slots: ['safety'], name: 'Inline fuse holder + fuses', brand: 'Generic', price: null, priceHint: { price: 2, note: 'Typical hobby price — team estimate.' },
    summary: 'Protects the Li-ion pack and wiring from shorts.', pros: ['Cheap protection', 'Reduces fire risk'], cons: ['Part not chosen', 'Needs correct current rating'], specs: [['Rating', 'Choose from pack + motor current']], includes: ['Holder', 'Spare fuses'], excludes: [], provides: ['fuse'],
    sources: [{ label: 'Team estimate', kind: 'team-estimate' }], raptorStatus: 'compatible-in-principle', raptorNote: 'Recommended for Li-ion packs.', tags: ['safety', 'power'], purchasePriority: 'before-integration',
  }),
]

export const extraSensors: Product[] = [
  P({
    id: 'x-optical-flow', slots: ['extra-sensor'], name: 'Optical-flow sensor (downward)', brand: 'Generic', price: null,
    summary: 'Measures ground-relative motion for odometry. Whether it counts as an "additional ranging device" must be confirmed with the supervisor before use.',
    pros: ['Odometry without wheel contact (helps on mecanum / tracks)'], cons: ['Scope approval not obtained', 'Some modules bundle a ToF rangefinder (prohibited)', 'No specific model chosen'],
    specs: [['Status', 'Requires supervisor approval']], includes: [], excludes: [], provides: [], sources: [{ label: 'Project requirements (no additional ranging devices)', kind: 'team-estimate' }],
    raptorStatus: 'insufficient-info', raptorNote: 'Needs scope approval before it can be treated as allowed hardware.', tags: ['approval-required', 'odometry'], purchasePriority: 'research',
  }),
  P({
    id: 'x-thermal', slots: ['extra-sensor'], name: 'Thermal imaging camera (low-res)', brand: 'Generic', price: null,
    summary: 'Low-resolution thermal array for illumination-independent target cues. Not part of the stated sensor set — approval needed.',
    pros: ['Works in darkness', 'Helps with illumination-change robustness'], cons: ['Scope approval not obtained', 'Low resolution', 'No specific model chosen'], specs: [['Status', 'Requires supervisor approval']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Team notes', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Treat as research until approved.', tags: ['approval-required', 'imaging'], purchasePriority: 'research',
  }),
  P({
    id: 'x-second-camera', slots: ['extra-sensor'], name: 'Second camera (additional view)', brand: 'Generic', price: null,
    summary: 'Extra camera for stereo / rear view. Additional cameras are not confirmed allowed hardware.', pros: ['Wider coverage', 'Enables later stereo VSLAM'], cons: ['Approval not established', 'Doubles video bandwidth', 'Needs a second CSI/USB port'], specs: [['Status', 'Requires supervisor approval']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Project requirements', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Distinguish from the confirmed single camera.', tags: ['approval-required', 'imaging'], purchasePriority: 'research',
  }),
  P({
    id: 'x-temp', slots: ['extra-sensor'], name: 'Battery / motor temperature sensor', brand: 'Generic', price: null, priceHint: { price: 3, note: 'Typical NTC / digital sensor — team estimate.' },
    summary: 'Thermistor or digital sensor for pack / driver temperature diagnostics.', pros: ['Cheap diagnostics', 'Not a ranging device'], cons: ['Part not chosen'], specs: [['Type', 'NTC / digital']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Team estimate', kind: 'team-estimate' }], raptorStatus: 'compatible-in-principle', raptorNote: 'Optional diagnostics.', tags: ['diagnostics'], purchasePriority: 'optional',
  }),
]

export const prohibited: Product[] = ([
  ['p-lidar', 'LiDAR (e.g. LD19 / STL-27L class)', 'LiDAR is prohibited by the RAPTOR sensor restrictions. Waveshare rover pages advertise LiDAR mounts — do NOT use them.', ['LiDAR', 'ranging']],
  ['p-ultrasonic', 'Ultrasonic distance sensor (HC-SR04 class)', 'Ultrasonic ranging is not allowed. Several robot kits (e.g. Pirate bundle, Freenove kits) ship with one — it must stay unused.', ['ultrasonic', 'ranging']],
  ['p-tof', 'Time-of-flight distance module (VL53L-class)', 'ToF ranging modules are additional ranging devices and are not allowed.', ['ToF', 'ranging']],
  ['p-gnss', 'GNSS / GPS receiver', 'GNSS is excluded: the robot must operate without it.', ['GNSS']],
  ['p-radar', 'mmWave radar module', 'Additional radar ranging is not allowed.', ['radar', 'ranging']],
] as const).map(([id, name, why, tags]) => P({
  id, slots: ['prohibited'], name, brand: 'N/A', price: null, priceStatus: 'unknown', summary: why, prohibitedReason: why,
  pros: ['Would give direct distance information (research only)'], cons: ['Prohibited by official RAPTOR sensor restrictions', 'Would require a change to the project requirements'],
  specs: [['Status', 'NOT compliant with current project restrictions']], includes: [], excludes: [], provides: [id === 'p-ultrasonic' ? 'ultrasonic' : 'camera'].slice(0, id === 'p-ultrasonic' ? 1 : 0) as never,
  sources: [{ label: 'RAPTOR project presentation (sensor restrictions)', kind: 'team-estimate' }], raptorStatus: 'prohibited', raptorNote: why, tags: [...tags, 'prohibited'], purchasePriority: 'research',
}))
