import type { Slot } from '../types'

export interface Preset {
  id: string
  name: string
  alias: string
  tagline: string
  rationale: string
  tradeoffs: string[]
  strengths: string[]
  limitations: string[]
  upgrades: string[]
  goals: string[]
  items: [Slot, string, number?][]
}

const UWB_QORVO: Preset['items'] = [['uwb-anchor', 'qorvo-dwm3001cdk', 4], ['uwb-tag', 'qorvo-dwm3001cdk', 1]]

export const PRESETS: Preset[] = [
  {
    id: 'min-cost', name: 'Minimum Cost', alias: 'Budget-First RAPTOR', tagline: 'Lowest realistic complete system cost.',
    rationale: 'DFRobot Baron is the cheapest chassis that includes encoder hardware; a Pi Zero 2 W, a Pico 2 real-time layer and a TB6612 driver are the cheapest credible electronics; Qorvo boards give the lowest verified-class UWB set.',
    tradeoffs: ['Highest integration effort of the presets: driver, MCU and power are all yours', 'Pi Zero 2 W has 512 MB RAM and 2.4 GHz Wi-Fi only', 'Baron motor voltage is not stated — confirm before choosing the pack'],
    strengths: ['Lowest known cost', 'Wheel encoders included', 'Hardware-encode capable host'], limitations: ['No kit IMU or power monitor (LSM6DSOX added)', 'Fewest software examples', 'Tight on RAM'],
    upgrades: ['Pi Zero 2 W → Pi 4 (adds ≈$50)', 'LSM6DSOX → BNO085', 'Camera Module 2 → Camera Module 3 Wide'], goals: [],
    items: [['platform', 'baron-4wd'], ...UWB_QORVO, ['processor', 'pi-zero2w'], ['controller', 'pico2'], ['camera', 'rpi-cam2'], ['imu', 'imu-lsm6dsox'], ['motor-driver', 'tb6612'],
      ['battery', 'cell-18650', 2], ['battery', 'holder-18650-2s'], ['converter', 'buck-5v-5a-generic'], ['safety', 'estop-switch'], ['safety', 'inline-fuse'], ['wiring', 'wiring-kit']],
  },
  {
    id: 'balanced', name: 'Balanced Engineering', alias: 'Balanced RAPTOR', tagline: 'Cost, documentation, reliability and integration effort in proportion.',
    rationale: 'WAVE ROVER already contains motor driver, ESP32 controller and power module, so electronics integration is small; the Pi Zero 2 W keeps the budget; the Camera Module 3 Wide matches the team’s preferred camera; Qorvo gives one board type for all five UWB nodes.',
    tradeoffs: ['0.8 kg payload ceiling', 'A Pi 4 would add ≈$52 and push the total over $350 at preliminary prices', 'IMU / power monitor claims for the kit are unverified'],
    strengths: ['Fewest separate electronics', 'Good documentation', 'Preferred wide camera'], limitations: ['Limited expansion', 'No confirmed wheel encoders', 'Small RAM on the Zero 2 W'],
    upgrades: ['Pi Zero 2 W → Pi 4 / Pi 5 if budget allows', 'Add encoder-equipped motors', 'BNO085 as optional IMU replacement'], goals: ['vslam', 'adv-tracking'],
    items: [['platform', 'wave-rover'], ...UWB_QORVO, ['processor', 'pi-zero2w'], ['camera', 'rpi-cam3-wide'], ['battery', 'cell-18650', 3], ['safety', 'estop-switch'], ['wiring', 'wiring-kit']],
  },
  {
    id: 'rapid', name: 'Rapid Prototyping', alias: 'Rapid Prototyping RAPTOR', tagline: 'Ready-to-use kit, integrated electronics, example code.',
    rationale: 'The Freenove 4WD kit includes a control board and camera with tutorials, and the Pi 4 has hardware H.264 encoding for the GPU stream.',
    tradeoffs: ['Kit camera model unverified', 'Kit ships an ultrasonic module that RAPTOR must not use', 'No IMU in the kit (LSM6DSOX added)', 'Tied to a Raspberry Pi host'],
    strengths: ['Fastest bring-up', 'Hardware video encoder', 'Tutorials'], limitations: ['Small, light-duty chassis', 'Weak expansion', 'Encoders unconfirmed'],
    upgrades: ['Pi 4 → Pi 5 (software encode)', 'Camera Module 3 Wide', 'Add a bumper bar'], goals: ['adv-tracking'],
    items: [['platform', 'freenove-4wd'], ...UWB_QORVO, ['processor', 'pi4-2gb'], ['imu', 'imu-lsm6dsox'], ['battery', 'cell-18650', 2], ['converter', 'buck-5v-5a-generic'], ['safety', 'estop-switch']],
  },
  {
    id: 'expansion', name: 'Future Expansion', alias: 'Upgrade-Ready RAPTOR', tagline: 'Modular platform, payload reserve, strong interfaces.',
    rationale: 'UGV02 has aluminium rails and a bigger deck; Pi 5 adds PCIe for accelerators; Camera Module 3 Wide keeps the preferred optics.',
    tradeoffs: ['Does not fit $350 at preliminary prices', 'Pi 5 has no hardware H.264 encoder', 'Pi 5 needs a 5 V / 5 A rail'],
    strengths: ['Rails and large deck', 'PCIe path for edge AI', 'Room for a larger battery'], limitations: ['Over budget', 'Payload figure not captured', 'Power-design effort'],
    upgrades: ['AI HAT (PCIe)', 'Larger battery', 'Second camera (approval)'], goals: ['arm', 'edge-ai', 'battery', 'vslam'],
    items: [['platform', 'ugv02'], ...UWB_QORVO, ['processor', 'pi5-2gb'], ['camera', 'rpi-cam3-wide'], ['battery', 'cell-18650', 3], ['safety', 'estop-switch'], ['wiring', 'wiring-kit']],
  },
  {
    id: 'custom-hw', name: 'Custom Hardware Development', alias: 'Custom Hardware RAPTOR', tagline: 'Cheap chassis and separate electronics for custom PCB / embedded work.',
    rationale: 'Waveshare Robot-Chassis plus Pico 2 + TB6612 allows custom firmware; BU03 modules invite a custom anchor PCB; AS5600 sensors need custom wheel mounts.',
    tradeoffs: ['BU03 anchor PCB cost and effort are unknown, so the total is incomplete', 'Chassis variant must be chosen on the Waveshare page', 'Highest firmware effort'],
    strengths: ['Cheapest known core parts', 'Educational PCB-design value', 'Max flexibility'], limitations: ['Total incomplete', 'RF and certification responsibility on the team', 'Schedule risk'],
    upgrades: ['Swap BU03 anchors for off-the-shelf boards if schedule slips'], goals: ['odometry'],
    items: [['platform', 'ws-chassis-high'], ['uwb-anchor', 'aithinker-bu03', 4], ['uwb-tag', 'aithinker-bu03', 1], ['processor', 'pi-zero2w'], ['controller', 'pico2'], ['camera', 'arducam-ov9281'], ['imu', 'imu-lsm6dsox'],
      ['odometry', 'as5600', 2], ['motor-driver', 'tb6612'], ['battery', 'cell-18650', 2], ['battery', 'holder-18650-2s'], ['converter', 'buck-5v-5a-generic'], ['safety', 'estop-switch'], ['safety', 'inline-fuse'], ['wiring', 'wiring-kit']],
  },
  {
    id: 'experimental', name: 'Experimental AI / Robotics', alias: 'Experimental AI/Robotics RAPTOR', tagline: 'Global-shutter vision and a stronger host for research upgrades.',
    rationale: 'OV9281 global shutter plus Pi 5 and BNO085 prepare for Visual SLAM and edge-AI research on the WAVE ROVER base.',
    tradeoffs: ['Over $350 at preliminary prices', 'Mono camera is poor for colour target identification', 'BNO085 duplicates the kit IMU (optional)'],
    strengths: ['Best VSLAM sensing', 'PCIe edge-AI path', 'Fused-orientation IMU'], limitations: ['Over budget', 'No hardware H.264 encoder', 'Payload and 5 A rail concerns'],
    upgrades: ['Add a colour camera as second view (approval)'], goals: ['vslam', 'edge-ai', 'odometry'],
    items: [['platform', 'wave-rover'], ...UWB_QORVO, ['processor', 'pi5-2gb'], ['camera', 'arducam-ov9281'], ['imu', 'imu-bno085'], ['battery', 'cell-18650', 3], ['safety', 'estop-switch']],
  },
]
