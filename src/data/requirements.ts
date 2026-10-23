// Official RAPTOR minimum requirements (from the project presentation) and clearly separated non-official lists.
export interface Requirement {
  id: string
  group: 'Environment & localization' | 'Navigation & tracking' | 'Sensor restrictions'
  text: string
  verification: string
}

export const OFFICIAL: Requirement[] = [
  { id: 'R01', group: 'Environment & localization', text: 'Indoor testing environment of at least 10 m × 10 m.', verification: 'Arena measurement and layout drawing' },
  { id: 'R02', group: 'Environment & localization', text: 'Robot operates without GNSS.', verification: 'Design review: no GNSS hardware in BOM' },
  { id: 'R03', group: 'Environment & localization', text: 'Localization uses raw UWB ranges from four fixed anchors together with IMU and camera information.', verification: 'Integration test: four-anchor ranging with IMU and camera in the loop' },
  { id: 'R04', group: 'Environment & localization', text: 'Real-time localization error below 20 cm under nominal conditions.', verification: 'Ground-truth experiment (e.g. marked floor grid or external reference)' },
  { id: 'R05', group: 'Environment & localization', text: 'Detect and handle degraded localization, perception or communication.', verification: 'Fault-injection tests with health monitor logs' },
  { id: 'R06', group: 'Environment & localization', text: 'Continue or recover when any one UWB anchor becomes unavailable or biased.', verification: 'Fault injection: unplug / bias one anchor at a time' },
  { id: 'R07', group: 'Environment & localization', text: 'Handle missing and biased UWB measurements, packet loss, visual occlusions and illumination changes.', verification: 'Scenario tests: dropout, NLOS, occlusion, lighting changes' },
  { id: 'R08', group: 'Navigation & tracking', text: 'Autonomously navigate through at least five arbitrarily chosen waypoints.', verification: 'Arena demonstration with random waypoints' },
  { id: 'R09', group: 'Navigation & tracking', text: 'Detect a designated moving target within two seconds of it entering the camera field of view.', verification: 'Detection latency test (timestamped video)' },
  { id: 'R10', group: 'Navigation & tracking', text: 'Continuously track the moving target while both target and robot are moving.', verification: 'Tracking test with logged track continuity' },
  { id: 'R11', group: 'Navigation & tracking', text: 'Reacquire a lost target within three seconds after it becomes visible again.', verification: 'Reacquisition test after forced occlusion' },
  { id: 'R12', group: 'Navigation & tracking', text: 'Physically follow the target at a safe distance.', verification: 'Following test with distance logging (from localization / target position)' },
  { id: 'R13', group: 'Navigation & tracking', text: 'Avoid arena boundaries and obstacles.', verification: 'Obstacle course run' },
  { id: 'R14', group: 'Navigation & tracking', text: 'Return to a safe zone or stop safely when necessary.', verification: 'Fault test: induced failure → safe stop / return' },
  { id: 'R15', group: 'Navigation & tracking', text: 'Provide a GUI showing robot status, estimated positions, sensor data and target tracking.', verification: 'GUI demonstration' },
  { id: 'R16', group: 'Sensor restrictions', text: 'LiDAR, GNSS and additional ranging devices are NOT allowed.', verification: 'BOM audit — this app blocks them from selection' },
]

export const NOT_PRESCRIBED = [
  'A specific Raspberry Pi model', 'A mandatory Linux board', 'A specific camera resolution', 'A specific camera frame rate', 'A specific motor configuration', 'A specific ROS 2 architecture', 'A particular localization algorithm',
]

export const RECOMMENDATIONS = [
  { id: 'E01', text: 'Hardware emergency stop that cuts motor power independent of software.', origin: 'Engineering recommendation' },
  { id: 'E02', text: 'Dedicated real-time MCU (watchdog) between the Linux host and the motors.', origin: 'Engineering recommendation' },
  { id: 'E03', text: 'Battery voltage/current monitoring with low-battery safe stop.', origin: 'Engineering recommendation' },
  { id: 'E04', text: 'Wheel odometry (encoders) to bridge UWB dropouts.', origin: 'Engineering recommendation' },
  { id: 'E05', text: 'Contact bumpers as a last-resort collision stop (not a ranging sensor).', origin: 'Engineering recommendation' },
]

export const UNVERIFIED_ASSUMPTIONS = [
  'All prices marked "preliminary" are team research values, not quotations.',
  'Vendor UWB accuracy figures are claims about ranging, not about robot localization.',
  'Runtime, payload-mass and streaming figures are assumption-based estimates until measured.',
  'Included-in-kit capabilities flagged "unverified" come from team notes, not the product page.',
]

export const APPROVAL_ITEMS = [
  'Optical-flow sensors (may contain ranging hardware)', 'Additional or stereo cameras', 'Thermal imaging', 'Depth sensors for 3D mapping (active depth is ranging)',
]

export const MILESTONES = [
  { date: '2026-10-30', title: 'Proposal Report', kind: 'administrative' },
  { date: '2026-12-04', title: 'Test Document', kind: 'administrative' },
  { date: '2026-12-07', title: 'Module Test Demo (Dec 7–11)', kind: 'administrative' },
  { date: '2026-12-25', title: 'Conceptual Design Report', kind: 'administrative' },
] as const
