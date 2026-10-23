import type { Product, ProcessorAttrs } from '../types'
import { CHECK_DATE, product as P } from './helpers'

const AD = 'https://www.adafruit.com/images/480x360'
const PI5IMG = `${AD}/5813-01.jpg`
const PI5NOTE = 'Photo of the Pi 5 board from an Adafruit listing; RAM variants look identical.'

const pi = (a: Partial<ProcessorAttrs> & Pick<ProcessorAttrs, 'cpu' | 'ramMB' | 'wifi' | 'powerIn' | 'supply5vA' | 'storage'>): ProcessorAttrs => ({
  family: 'raspberry-pi', kind: 'linux-sbc',
  cameraSupport: { 'csi-pi': 'yes', 'usb-uvc': 'yes' }, cameraNote: 'Native Raspberry Pi CSI + libcamera; USB UVC cameras also work.',
  hwEncode: 'hw-h264', hwEncodeNote: 'Hardware H.264 encoder.', ros2: 'native', realtime: 'none-linux',
  io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: false, csi: true }, upgradePath: 'Largest accessory/community ecosystem.', ...a,
})

const piBase = { brand: 'Raspberry Pi', seller: 'Raspberry Pi approved resellers', confidence: 'manufacturer' as const, specStatus: 'partial' as const, family: 'raspberry-pi' }
const piPage = { label: 'Raspberry Pi product page (blocked to automated fetch)', kind: 'manufacturer' as const }

export const processors: Product[] = [
  P({
    ...piBase, id: 'pi-zero2w', slots: ['processor'], name: 'Raspberry Pi Zero 2 W', price: 15,
    observed: { price: 19.05, seller: 'Adafruit (authorised distributor)', date: CHECK_DATE, url: 'https://www.adafruit.com/product/5291' },
    priceNote: 'Preliminary $15. Adafruit listed $19.05 on 2026-10-23.', url: 'https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/', image: `${AD}/5291-00.jpg`,
    summary: 'Tiny, cheap Linux computer with CSI camera input and hardware H.264 encoding — at the cost of 512 MB of RAM.',
    pros: ['Cheapest Linux computer in the shortlist', 'Hardware H.264 encode for the GPU-server stream', 'Native CSI camera and libcamera support'],
    cons: ['512 MB RAM limits local fusion, logging and ROS 2', 'Wi-Fi 2.4 GHz only', 'Single micro-USB port; header may need soldering'],
    specs: [['CPU', 'Quad Cortex-A53 @ 1 GHz'], ['RAM', '512 MB'], ['Wi-Fi', '2.4 GHz 802.11 b/g/n, BT 4.2'], ['Camera', '22-pin CSI'], ['Power', '5 V (≈2.5 A supply recommended)']],
    includes: ['Board only'], excludes: ['microSD card', 'Power supply', 'Camera cable adapter'], provides: ['linux-computer'],
    sources: [{ ...piPage, url: 'https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/' }, { label: 'Adafruit listing (fetched 2026-10-23)', kind: 'distributor', url: 'https://www.adafruit.com/product/5291' }],
    proc: pi({ cpu: 'Quad Cortex-A53 1 GHz', ramMB: 512, wifi: '2.4 GHz only', powerIn: '5 V via micro-USB', supply5vA: 2.5, storage: 'microSD', ros2: 'limited', upgradePath: 'Limited by RAM; moving to Pi 4/5 later is mostly an image change.' }),
    ratings: { integration: 4, docs: 5, expandability: 2 }, ratingBasis: 'Docs: Raspberry Pi documentation is the broadest. Expandability: 512 MB RAM and one USB port are hard ceilings.',
    raptorStatus: 'requires-validation', raptorNote: 'Probably enough to acquire sensors and stream video; local fusion + ROS 2 headroom is small. Software team decides.',
    tags: ['linux', 'budget', 'csi', 'hw-encode'], purchasePriority: 'before-integration',
  }),
  P({
    ...piBase, id: 'pi4-2gb', slots: ['processor'], name: 'Raspberry Pi 4 Model B 2 GB', price: 67.5,
    observed: { price: 80, seller: 'Adafruit (authorised distributor)', date: CHECK_DATE, url: 'https://www.adafruit.com/product/4292' },
    priceNote: 'Preliminary $67.50. Adafruit listed $80.00 on 2026-10-23.', url: 'https://www.raspberrypi.com/products/raspberry-pi-4-model-b/', image: `${AD}/4292-13.jpg`,
    summary: 'Balanced Linux computer with hardware H.264 encode, USB 3 and CSI camera — the lowest-risk video-streaming host.',
    pros: ['Hardware H.264 encoder offloads the stream to the GPU server', 'Mature ROS 2 / Ubuntu support', 'Dual-band Wi-Fi, Gigabit Ethernet, USB 3'],
    cons: ['Slower than Pi 5', 'Needs a 5 V / 3 A supply from the robot battery', 'Price drifted above preliminary value at distributors'],
    specs: [['CPU', 'Quad Cortex-A72 @ 1.5 GHz'], ['RAM', '2 GB'], ['Wi-Fi', 'Dual-band 802.11ac, BT 5.0'], ['Camera', '15-pin CSI'], ['Video', 'H.264 HW encode up to 1080p30'], ['Power', '5 V 3 A']],
    includes: ['Board only'], excludes: ['microSD', 'Power supply', 'Cooling'], provides: ['linux-computer'],
    sources: [{ ...piPage, url: 'https://www.raspberrypi.com/products/raspberry-pi-4-model-b/' }, { label: 'Adafruit listing (fetched 2026-10-23)', kind: 'distributor', url: 'https://www.adafruit.com/product/4292' }],
    proc: pi({ cpu: 'Quad Cortex-A72 1.5 GHz', ramMB: 2048, wifi: 'Dual-band 802.11ac', powerIn: '5 V via USB-C / GPIO', supply5vA: 3, storage: 'microSD / USB boot', upgradePath: 'USB 3 for external storage/accelerators; no PCIe.' }),
    ratings: { integration: 5, docs: 5, expandability: 4 }, ratingBasis: 'Widest compatibility with kits (Freenove / SunFounder / Waveshare). Hardware encoder reduces streaming risk.',
    raptorStatus: 'compatible-in-principle', raptorNote: 'Reference host for the camera-to-GPU-server pipeline.', tags: ['linux', 'hw-encode', 'csi', 'ros2'], purchasePriority: 'before-integration',
  }),
  ...([['1gb', 1024, 45], ['2gb', 2048, 77.5], ['4gb', 4096, 110]] as const).map(([k, ram, price]) => P({
    ...piBase, id: `pi5-${k}`, slots: ['processor'], family: 'raspberry-pi', name: `Raspberry Pi 5 ${ram / 1024} GB`, price,
    url: 'https://www.raspberrypi.com/products/raspberry-pi-5/', image: PI5IMG, imageNote: PI5NOTE,
    summary: k === '1gb' ? 'Entry Pi 5: fast CPU, PCIe and dual camera ports but little RAM, and no hardware H.264 encoder.'
      : k === '2gb' ? 'Pi 5 with 2 GB — the sensible minimum for Pi 5 with ROS 2 and a camera pipeline.'
        : 'More RAM for future workloads (local VSLAM, logging, mapping) at about a third of the project budget.',
    pros: ['Fastest per-core Pi; PCIe 2.0 x1 for accelerators / NVMe', 'Two 22-pin CSI/DSI ports (future second camera)', k === '4gb' ? 'RAM headroom for onboard Visual SLAM experiments' : 'Lower cost than the 4 GB model'],
    cons: ['No hardware H.264 encoder — video is encoded on the CPU', 'Needs a 5 V / 5 A supply (27 W PD ideal) from the robot', k === '1gb' ? '1 GB RAM is tight for ROS 2 + camera pipeline' : k === '4gb' ? '$110 leaves little budget for the rest' : 'Price above Pi 4 2 GB for a missing hardware encoder'],
    specs: [['CPU', 'Quad Cortex-A76 @ 2.4 GHz'], ['RAM', `${ram / 1024} GB`], ['Camera', '2 × 22-pin CSI/DSI'], ['Video', 'HEVC decode only; no H.264 hardware encode'], ['PCIe', '1 lane (external FFC)'], ['Power', '5 V / 5 A recommended']],
    includes: ['Board only'], excludes: ['microSD', '27 W PSU', 'Active cooler'], provides: ['linux-computer'],
    sources: [{ ...piPage, url: 'https://www.raspberrypi.com/products/raspberry-pi-5/' }, { label: 'Web search: Pi 5 has no hardware H.264 encoder (2026-10-23)', kind: 'community' }],
    proc: pi({ cpu: 'Quad Cortex-A76 2.4 GHz', ramMB: ram, wifi: 'Dual-band 802.11ac', powerIn: '5 V / 5 A USB-C', supply5vA: 5, storage: 'microSD / NVMe via PCIe', hwEncode: 'sw-only',
      hwEncodeNote: 'No hardware H.264 encoder: video is encoded on the CPU (Raspberry Pi reports real-time 1080p30 software encoding in its tests).',
      io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: true, csi: true }, upgradePath: 'PCIe for NVMe / AI accelerators; best upgrade path of the Pi family.' }),
    ratings: { integration: 5, docs: 5, expandability: 5 }, ratingBasis: 'Same ecosystem as Pi 4 plus PCIe; encode path is software.',
    raptorStatus: 'compatible-in-principle', raptorNote: k === '4gb' ? 'Overkill for the minimum robot if the GPU server does the vision; valuable for upgrades.' : 'Strong, but the 5 A supply and CPU video encoding must be planned.',
    tags: ['linux', 'pcie', 'sw-encode', 'csi'], purchasePriority: k === '4gb' ? 'optional' : 'before-integration',
  })),
  P({
    id: 'arduino-uno-q', slots: ['processor'], name: 'Arduino UNO Q 2 GB', brand: 'Arduino', family: 'arduino', price: 59, priceStatus: 'preliminary', priceDate: CHECK_DATE, seller: 'Arduino Store',
    priceNote: 'Team price $59; the Arduino store page was fetched on 2026-10-23 but its price figure was not parsed.', url: 'https://store.arduino.cc/products/uno-q', image: 'https://store.arduino.cc/cdn/shop/files/ABX00162_00.default_1200x900.jpg?v=1759218128',
    summary: 'Linux (Qualcomm QRB2210) and a real-time STM32U585 MCU on one UNO-format board — camera support is USB/UVC.',
    pros: ['Split processing: Debian Linux plus an MCU for motor/safety timing', 'Wi-Fi 5 and Bluetooth 5.1 onboard', 'UNO form factor with 3.3/5 V shield ecosystem'],
    cons: ['One USB-C host port — a CSI connector is NOT documented (MIPI DSI only on JMEDIA)', 'Smaller ROS 2 / robotics community than Raspberry Pi', 'Power: 5 V/3 A at USB-C or 7–24 V on VIN'],
    specs: [['MPU', 'Qualcomm Dragonwing QRB2210, quad Cortex-A53 @ 2.0 GHz, dual ISP'], ['MCU', 'STM32U585 Cortex-M33 @ 160 MHz, 2 MB flash, 786 KB SRAM'], ['RAM / storage', '2 GB LPDDR4 / 16 GB eMMC'], ['Wireless', 'Wi-Fi 5 dual band + BT 5.1'], ['Camera', 'UVC webcam over USB-C (page); MIPI DSI on JMEDIA'], ['Power', 'USB-C 5 V / 3 A, VIN 7–24 V'], ['OS', 'Debian Linux (MPU), Zephyr (MCU)']],
    includes: ['Board only'], excludes: ['USB-C hub for webcam + other USB', 'Camera'], provides: ['linux-computer', 'motor-mcu'],
    sources: [{ label: 'Arduino Store page (fetched 2026-10-23)', kind: 'manufacturer', url: 'https://store.arduino.cc/products/uno-q' }], confidence: 'manufacturer', specStatus: 'checked',
    proc: { family: 'arduino', kind: 'linux-mcu-hybrid', cpu: 'Qualcomm QRB2210 quad A53 2 GHz + STM32U585', ramMB: 2048, storage: '16 GB eMMC', wifi: 'Wi-Fi 5 dual band + BT 5.1',
      cameraSupport: { 'usb-uvc': 'yes', 'csi-pi': 'unverified' }, cameraNote: 'Arduino documents UVC webcams over USB-C. A CSI connector is not listed in the spec text (MIPI DSI on JMEDIA only) — Raspberry Pi CSI cameras are NOT confirmed.',
      hwEncode: 'hw-h264-unverified', hwEncodeNote: 'Qualcomm SoC has video hardware but user-space encoder exposure on this board is not documented in the reviewed text.', ros2: 'possible', realtime: 'hybrid-mcu',
      io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: false, csi: false, can: true }, powerIn: 'USB-C 5 V/3 A or VIN 7–24 V', supply5vA: 3, vinDirect: true,
      upgradePath: 'Docker support; MCU handles real-time IO. No PCIe; accelerators limited to the onboard Qualcomm AI engine.' },
    ratings: { integration: 3, docs: 3, expandability: 3 }, ratingBasis: 'New platform; strong concept for motor-safety isolation; smaller robotics community than Raspberry Pi.',
    raptorStatus: 'requires-validation', raptorNote: 'Attractive separation of Linux and real-time control, but the camera must be USB (UVC) unless CSI is documented.', tags: ['linux', 'mcu', 'usb-camera', 'hybrid'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'esp32-p4x-eye', slots: ['processor'], name: 'ESP32-P4X-EYE Vision Board', brand: 'Espressif', family: 'esp32', price: 33.36, priceStatus: 'preliminary', seller: 'Espressif / Mouser',
    priceNote: 'Preliminary price from team notes; distributor listings (Mouser) exist but the price was not re-verified.', url: 'https://www.mouser.in/new/espressif/espressif-esp32-p4x-eye-vision-development-board/',
    summary: 'Camera-centric ESP32-P4 board with H.264 encoder, MIPI-CSI, Wi-Fi via ESP32-C6, LCD, mic and microSD — not a Linux computer.',
    pros: ['Integrated camera and H.264 encoder (distributor listing)', 'Very low cost and power', 'Wi-Fi/BT through onboard ESP32-C6'],
    cons: ['No Linux: sensor fusion, ROS 2 and networking are ESP-IDF / bare-metal work', 'Smallest software ecosystem for robotics', 'Vision-demo board with few exposed pins; RAM size not verified'],
    specs: [['SoC', 'ESP32-P4 (MIPI-CSI/DSI, USB 2.0 HS, H.264 encoder per listings)'], ['Wireless', 'ESP32-C6-MINI-1U module (Wi-Fi/BT)'], ['Onboard', 'Camera, 1.54" 240×240 LCD, digital mic, microSD']],
    includes: ['Board with integrated camera, LCD, mic'], excludes: ['Motor / UWB wiring'], provides: ['camera'], providesUnverified: { camera: 'Integrated camera confirmed by distributor listings; sensor model / FOV not captured — verify.' },
    sources: [{ label: 'Mouser product listing (search result 2026-10-23)', kind: 'distributor', url: 'https://www.mouser.in/new/espressif/espressif-esp32-p4x-eye-vision-development-board/' }], confidence: 'distributor', specStatus: 'partial',
    proc: { family: 'esp32', kind: 'mcu-vision', cpu: 'ESP32-P4 dual-core RISC-V (+ LP core)', ramMB: 0, storage: 'microSD / flash', wifi: 'Wi-Fi + BT via ESP32-C6', cameraSupport: { integrated: 'yes', 'csi-pi': 'unverified', 'usb-uvc': 'unverified' },
      cameraNote: 'Camera is integrated on the board. External Raspberry Pi CSI cameras are not assumed compatible.', hwEncode: 'hw-h264-unverified', hwEncodeNote: 'H.264 encoder listed for the ESP32-P4 chip; firmware support for streaming must be verified.', ros2: 'micro-ros', realtime: 'mcu',
      io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: false, csi: true }, powerIn: 'USB-C 5 V (verify)', supply5vA: null, upgradePath: 'Stays inside the ESP32 ecosystem; no path to Linux / ROS 2 on this board. (RAM = 0 means unknown.)' },
    ratings: { integration: 2, docs: 3, expandability: 2 }, ratingBasis: 'Custom firmware for everything; RAM size not captured.',
    raptorStatus: 'requires-firmware', raptorNote: 'Only if the team accepts bare-metal firmware for fusion/communication.', tags: ['mcu', 'camera', 'hw-encode', 'no-linux'], purchasePriority: 'research',
  }),
  P({
    id: 'orangepi-3b-2gb', slots: ['processor'], name: 'Orange Pi 3B 2 GB', brand: 'Orange Pi', family: 'orange-pi', price: 41.5, priceStatus: 'preliminary', seller: 'Orange Pi / resellers', priceNote: 'Preliminary price from team notes.',
    url: 'http://www.orangepi.org/html/hardWare/computerAndMicrocontrollers/details/Orange-Pi-3B.html',
    summary: 'RK3566 SBC with hardware H.264 encoder, MIPI-CSI and M.2 storage; the Raspberry Pi camera / HAT ecosystem does not carry over.',
    pros: ['Hardware 1080p60 H.264 encode (VPU, via Rockchip MPP)', '0.8 TOPS NPU on the SoC', 'Cheap, with M.2 NVMe/SATA socket'],
    cons: ['Official Raspberry Pi cameras reported unsupported (single reviewer)', 'Smaller ROS 2 / community support; vendor kernels', 'Raspberry Pi robot kits (HAT boards) will not fit'],
    specs: [['SoC', 'Rockchip RK3566, quad Cortex-A55 up to 1.8 GHz, Mali-G52'], ['RAM', '2 GB LPDDR4'], ['Video', 'H.264 1080p60 / H.265 1080p100 encode (VPU)'], ['Camera', '2-lane MIPI CSI'], ['NPU', '0.8 TOPS (SoC)']],
    includes: ['Board only'], excludes: ['PSU', 'Storage', 'Camera'], provides: ['linux-computer'],
    sources: [{ label: 'CNX Software spec summary (search 2026-10-23)', kind: 'community', url: 'https://www.cnx-software.com/2023/08/05/orange-pi-3b-a-rockchip-rk3566-sbc-with-an-m-2-nvme-sata-ssd-socket-up-to-8gb-ram/' }], confidence: 'community', specStatus: 'partial',
    proc: { family: 'orange-pi', kind: 'linux-sbc', cpu: 'RK3566 quad Cortex-A55 1.8 GHz', ramMB: 2048, storage: 'eMMC socket / M.2 / microSD', wifi: 'Wi-Fi + BT (revision-dependent — verify)', cameraSupport: { 'usb-uvc': 'yes', 'csi-pi': 'no' },
      cameraNote: 'MIPI CSI exists, but Raspberry Pi CSI cameras are reported unsupported — use USB UVC or a Rockchip-supported sensor.', hwEncode: 'hw-h264', hwEncodeNote: 'VPU encode through Rockchip MPP / GStreamer — more software-stack effort than on a Pi.', ros2: 'possible', realtime: 'none-linux',
      io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: false, csi: true }, powerIn: '5 V USB-C (verify rating)', supply5vA: 3, upgradePath: 'M.2 storage; NPU for light on-device models; fewer prebuilt accelerators.' },
    ratings: { integration: 3, docs: 3, expandability: 3 }, ratingBasis: 'Good hardware per dollar; vendor-image ecosystem and Pi-specific camera support are weaker.',
    raptorStatus: 'requires-validation', raptorNote: 'Needs a USB camera or a sensor with a verified driver; Raspberry Pi kits will not interface electrically.', tags: ['linux', 'hw-encode', 'npu'], purchasePriority: 'research',
  }),
  P({
    id: 'luckfox-pico-max', slots: ['processor'], name: 'Luckfox Pico Max', brand: 'Luckfox', family: 'luckfox', price: null, priceStatus: 'unknown',
    priceHint: { price: 14.99, note: 'A Waveshare listing of about $14.99 was seen via web search on 2026-10-23; not confirmed. Resellers list it higher.' },
    seller: 'Luckfox / Waveshare', url: 'https://waveshare.com/luckfox-pico-pro.htm?sku=25719',
    summary: 'RV1106 micro Linux board with MIPI-CSI, NPU and Ethernet — tiny RAM, price still to be verified.',
    pros: ['MIPI-CSI camera, ISP and NPU', 'Very low cost (reference listing)', '26 GPIO and 10/100M Ethernet'], cons: ['Single Cortex-A7, 256 MB RAM', 'Practically no ROS 2; Buildroot-style SDK', 'NPU / chip revision (G2 vs G3) differs between listings'],
    specs: [['SoC', 'Rockchip RV1106 (A7 + RISC-V MCU + NPU)'], ['RAM', '256 MB DDR3L (Max)'], ['Storage', 'SPI NAND 256 MB'], ['Camera', 'MIPI CSI 2-lane, ISP 5 MP @30'], ['USB', '2.0 host/device'], ['Network', '10/100M Ethernet, no onboard Wi-Fi']],
    includes: ['Board only'], excludes: ['Camera', 'Wi-Fi dongle'], provides: ['linux-computer'],
    sources: [{ label: 'Waveshare Luckfox Pico listing (search 2026-10-23)', kind: 'distributor', url: 'https://waveshare.com/luckfox-pico-pro.htm?sku=25719' }, { label: 'CNX Software article', kind: 'community', url: 'https://cnx-software.com/?p=126270' }], confidence: 'distributor', specStatus: 'partial',
    proc: { family: 'luckfox', kind: 'linux-sbc', cpu: 'RV1106 single Cortex-A7 + RISC-V', ramMB: 256, storage: 'SPI NAND 256 MB / microSD', wifi: 'None onboard (USB dongle)', cameraSupport: { 'csi-pi': 'unverified', 'usb-uvc': 'unverified' },
      cameraNote: 'MIPI CSI works with sensors supported by the Rockchip ISP stack; Raspberry Pi cameras are not assumed.', hwEncode: 'hw-h264-unverified', hwEncodeNote: 'RV1106 integrates a video encoder; SDK exposure not verified here.', ros2: 'limited', realtime: 'none-linux',
      io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: false, csi: true }, powerIn: '5 V (USB-C)', supply5vA: 1, upgradePath: 'Dead end for ROS 2 / local VSLAM; suited to embedded vision streaming.' },
    ratings: { integration: 2, docs: 2, expandability: 1 }, ratingBasis: '256 MB RAM and a niche SDK limit everything beyond streaming.',
    raptorStatus: 'insufficient-info', raptorNote: 'Price to verify.', tags: ['linux', 'npu', 'tiny', 'price-unknown'], purchasePriority: 'research',
  }),
]

const ctrl = (
  id: string, name: string, brand: string, family: ProcessorAttrs['family'], cpu: string, wifi: string,
  extra: Partial<Product> & Pick<Product, 'summary' | 'pros' | 'cons'>, io: Partial<ProcessorAttrs['io']> = {},
) => P({
  id, slots: ['controller'], name, brand, price: null, includes: ['Board'], excludes: [], provides: ['motor-mcu'],
  sources: [{ label: 'Team notes', kind: 'team-estimate' }], raptorStatus: 'compatible-in-principle', raptorNote: 'Real-time layer beneath a Linux host; not a Linux replacement.',
  tags: ['mcu', 'real-time'], ratings: { integration: 3, docs: 4, expandability: 3 }, ratingBasis: 'Community size and documentation depth (qualitative).',
  specs: [['MCU', cpu]], purchasePriority: 'optional',
  proc: { family, kind: 'mcu-controller', cpu, ramMB: 0, storage: 'flash', wifi, cameraSupport: {}, cameraNote: 'No camera.', hwEncode: 'unknown', hwEncodeNote: 'Not applicable.', ros2: 'micro-ros', realtime: 'mcu',
    io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: false, csi: false, ...io }, powerIn: '5 V / 3.3 V', supply5vA: null, upgradePath: 'Real-time layer beneath a Linux host.' },
  ...extra,
})

export const controllers: Product[] = [
  ctrl('pico2', 'Raspberry Pi Pico 2 (RP2350)', 'Raspberry Pi', 'raspberry-pi', 'RP2350 dual Cortex-M33 / RISC-V', 'None', {
    price: 6.25, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Adafruit', url: 'https://www.adafruit.com/product/6006', image: `${AD}/6006-02.jpg`,
    summary: 'Dual-core microcontroller — an inexpensive deterministic motor / safety layer beneath a Linux host.',
    pros: ['Deterministic PWM + encoder counting (PIO)', 'Very cheap', 'Excellent documentation'], cons: ['No Wi-Fi on the plain Pico 2', 'Not a replacement for a Linux computer', 'Needs a UART link to the host'],
    sources: [{ label: 'Adafruit listing (fetched 2026-10-23)', kind: 'distributor', url: 'https://www.adafruit.com/product/6006' }], confidence: 'distributor', specStatus: 'partial', ratings: { integration: 4, docs: 5, expandability: 3 },
    tags: ['mcu', 'safety', 'real-time'], purchasePriority: 'before-integration',
  }),
  ctrl('esp32-devkit', 'ESP32 DevKit (classic)', 'Espressif', 'esp32', 'ESP32 dual-core Xtensa LX6', 'Wi-Fi + BT', {
    summary: 'Wi-Fi / BT microcontroller; many robot kits already use one as a motor controller. Price depends on the exact board — enter it after choosing a seller.',
    pros: ['Wi-Fi/BT onboard', 'Huge Arduino / ESP-IDF community', 'Already the slave controller on Waveshare rovers'], cons: ['Price not fixed here', 'Fewer real-time peripherals than STM32', 'Redundant if the platform already has an ESP32 controller'],
  }),
  ctrl('esp32-s3', 'ESP32-S3 DevKit', 'Espressif', 'esp32', 'ESP32-S3 dual-core LX7', 'Wi-Fi + BT LE', {
    summary: 'ESP32-S3 with native USB; useful for lightweight on-device logic. Price to verify.',
    pros: ['Native USB', 'More RAM options than classic ESP32', 'Same toolchain'], cons: ['Price not fixed here', 'Still not Linux', 'Fewer motor-control examples than classic ESP32'],
  }),
  ctrl('stm32-nucleo', 'STM32 Nucleo board', 'STMicroelectronics', 'arduino', 'STM32 family (exact model TBD)', 'None', {
    summary: 'Real-time STM32 development board — robust choice for hardware-timer motor control and fault handling. Pick the exact Nucleo model and price.',
    pros: ['Hardware timers and quadrature encoder interfaces', 'Strong determinism and watchdogs', 'On-board ST-LINK debugger'], cons: ['Exact model and price not fixed', 'No wireless', 'Steeper learning curve'],
    ratings: { integration: 3, docs: 4, expandability: 5 }, tags: ['mcu', 'safety', 'real-time'],
  }, { can: true }),
  ctrl('arduino-uno-r4', 'Arduino UNO R4 WiFi', 'Arduino', 'arduino', 'Renesas RA4M1 Cortex-M4 + ESP32-S3 module', 'Wi-Fi + BT', {
    url: 'https://store.arduino.cc/products/uno-r4-wifi', summary: 'Shield-compatible real-time layer with Wi-Fi. Store price to be confirmed.',
    pros: ['Shield ecosystem', 'Easy Arduino IDE workflow', 'Wi-Fi/BT through onboard ESP32-S3'], cons: ['Price not confirmed in this app', 'Modest MCU', 'Not a Linux computer'],
    sources: [{ label: 'Arduino Store page (fetched 2026-10-23, price not parsed)', kind: 'manufacturer', url: 'https://store.arduino.cc/products/uno-r4-wifi' }], confidence: 'manufacturer', specStatus: 'partial', ratings: { integration: 4, docs: 5, expandability: 3 },
  }),
]
