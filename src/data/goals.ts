export interface Goal { id: string; label: string; kind: 'software' | 'hardware' | 'mixed'; blurb: string }

export const GOALS: Goal[] = [
  { id: '3d-mapping', label: '3D Mapping', kind: 'mixed', blurb: 'Dense map of the arena. Depth sensing conflicts with the ranging restriction; monocular reconstruction can run on the GPU server.' },
  { id: 'vslam', label: 'Visual SLAM', kind: 'software', blurb: 'Camera-based SLAM, likely on the GPU server. Camera shutter type and timestamps matter.' },
  { id: 'adv-tracking', label: 'Advanced Target Tracking', kind: 'software', blurb: 'Re-identification, multi-target tracking, predictive trajectories — mostly server-side software.' },
  { id: 'arm', label: 'Robotic Arm', kind: 'hardware', blurb: 'A manipulator adds mass, servo current peaks and mounting loads.' },
  { id: 'obstacle', label: 'Autonomous Obstacle Avoidance', kind: 'software', blurb: 'Camera-based avoidance (no ranging sensors). Contact bumpers are a backup.' },
  { id: 'multi-robot', label: 'Multi-Robot Cooperation', kind: 'mixed', blurb: 'More tags on the same anchor set; protocol capacity and wireless bandwidth matter.' },
  { id: 'edge-ai', label: 'Edge AI', kind: 'mixed', blurb: 'On-robot inference so the robot degrades gracefully if the GPU link drops.' },
  { id: 'battery', label: 'Larger Battery', kind: 'hardware', blurb: 'Longer runtime costs mass and space, and needs correct charging.' },
  { id: 'camera2', label: 'Additional Camera System', kind: 'hardware', blurb: 'Second view or stereo. Extra cameras are not confirmed allowed hardware.' },
  { id: 'odometry', label: 'Advanced Odometry', kind: 'mixed', blurb: 'Better dead reckoning: encoders, visual-inertial odometry or optical flow (approval).' },
]
