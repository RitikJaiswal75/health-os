import { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  GroundShadow,
  Shape3DCapsule,
  Shape3DCircle,
  Shape3DEllipse,
  adjustBrightness,
  shapeColors,
} from './pillShape3d';

/** Two-tone capsule: main colour on the right half, second colour (or white) on the left. */
export function CapsuleDivided({
  fill,
  fill2,
  dual,
}: {
  fill: string;
  fill2?: string;
  dual?: boolean;
}) {
  const right = shapeColors(fill);
  const left = shapeColors(dual && fill2 ? fill2 : '#F7F7F7');
  const outline = adjustBrightness(fill, 0.42);
  return (
    <G>
      <Defs>
        <LinearGradient id="cap-div-left" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={left.highlight} />
          <Stop offset="55%" stopColor={left.fill} />
          <Stop offset="100%" stopColor={left.shadow} />
        </LinearGradient>
        <LinearGradient id="cap-div-right" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={right.highlight} />
          <Stop offset="55%" stopColor={right.fill} />
          <Stop offset="100%" stopColor={right.shadow} />
        </LinearGradient>
      </Defs>
      <GroundShadow cx={24} cy={41} rx={13} />
      <G rotation={-40} origin="24, 24">
        <Path d="M24 16.5 L13.5 16.5 A7.5 7.5 0 0 0 13.5 31.5 L24 31.5 Z" fill="url(#cap-div-left)" />
        <Path d="M24 16.5 L34.5 16.5 A7.5 7.5 0 0 1 34.5 31.5 L24 31.5 Z" fill="url(#cap-div-right)" />
        <Rect x={6} y={16.5} width={36} height={15} rx={7.5} fill="none" stroke={outline} strokeWidth={1.3} />
        <Line x1={24} y1={16.5} x2={24} y2={31.5} stroke={outline} strokeWidth={1.3} />
        <Rect x={10.5} y={19.4} width={6.5} height={1.8} rx={0.9} fill={outline} opacity={0.75} />
        <Rect x={18.6} y={19.4} width={2.2} height={1.8} rx={0.9} fill={outline} opacity={0.75} />
        <Rect x={27.4} y={19.4} width={6.5} height={1.8} rx={0.9} fill="#FFFFFF" opacity={0.55} />
      </G>
    </G>
  );
}

export function Shape3DRoundScored({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  return (
    <G>
      <Shape3DCircle cx={24} cy={24} r={15} fill={fill} gradId="rs-h" />
      <Line x1={12} y1={24} x2={36} y2={24} stroke={c.deep} strokeWidth={1.2} opacity={0.65} />
    </G>
  );
}

export function Shape3DWideOval({ fill }: { fill: string }) {
  return <Shape3DEllipse cx={24} cy={24} rx={19} ry={10} fill={fill} rotation={-8} gradId="wide-oval" />;
}

/** Long cylindrical tablet with rounded (D-shaped) ends — caplet / oblong tablet. */
export function Shape3DOblongTablet({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  return (
    <G rotation={-18} origin="24, 24">
      <GroundShadow cx={24} cy={30} rx={14} />
      <Shape3DCapsule x={7} y={17} w={34} h={14} rx={7} fill={fill} rotation={0} gradId="oblong-tab" />
      <Rect x={11} y={19.5} width={10} height={3} rx={1.2} fill={c.glossSoft} />
    </G>
  );
}

export function EffervescentTablet({ fill }: { fill: string }) {
  const waterHighlight = '#9AD4F5';
  const bubbleStroke = 'rgba(255,255,255,0.75)';
  return (
    <G>
      <Shape3DCircle cx={20} cy={28} r={9} fill={fill} gradId="eff-1" />
      <Shape3DCircle cx={32} cy={26} r={8} fill={fill} gradId="eff-2" />
      {[
        [16, 14, 1.8],
        [20, 10, 1.4],
        [24, 8, 1.6],
        [28, 11, 1.3],
        [32, 9, 1.5],
        [36, 13, 1.2],
        [30, 15, 1.1],
      ].map(([x, y, r]) => (
        <G key={`${x}-${y}`}>
          <Circle cx={x} cy={y} r={r} fill="rgba(255,255,255,0.22)" stroke={bubbleStroke} strokeWidth={0.55} />
          <Circle cx={x - r * 0.28} cy={y - r * 0.32} r={r * 0.28} fill="rgba(255,255,255,0.55)" />
        </G>
      ))}
      <Circle cx={22} cy={18} r={1} fill={waterHighlight} opacity={0.6} />
      <Circle cx={34} cy={16} r={0.85} fill={waterHighlight} opacity={0.5} />
    </G>
  );
}

export function PillInGlass({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const glass = 'rgba(255,255,255,0.2)';
  const water = '#6CB8E8';
  return (
    <G>
      <Defs>
        <LinearGradient id="glass-water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#A8D8F0" />
          <Stop offset="100%" stopColor={water} />
        </LinearGradient>
      </Defs>
      <GroundShadow cx={24} cy={40} rx={10} />
      <Path
        d="M14 12 L14 34 C14 37 18 39 24 39 C30 39 34 37 34 34 L34 12 Z"
        fill={glass}
        stroke={adjustBrightness(c.stroke, 1.1)}
        strokeWidth={0.85}
      />
      <Rect x={16} y={24} width={16} height={13} rx={1} fill="url(#glass-water)" opacity={0.85} />
      <G rotation={-20} origin="24, 18">
        <Shape3DCapsule x={18} y={14} w={12} h={7} rx={3.5} fill={fill} rotation={0} gradId="glass-cap" />
      </G>
      <Ellipse cx={20} cy={16} rx={2} ry={4} fill="rgba(255,255,255,0.25)" />
    </G>
  );
}

export function SpilledPowder({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const grain = adjustBrightness(c.stroke, 0.9);
  return (
    <G>
      <G rotation={-30} origin="16, 18">
        <Path d="M8 18 C8 14 12 12 15 12 L15 24 C12 24 8 22 8 18 Z" fill={c.fill} stroke={c.stroke} strokeWidth={c.sw} />
      </G>
      {[
        [18, 26],
        [20, 28],
        [22, 30],
        [24, 32],
        [26, 31],
        [28, 33],
        [30, 29],
        [32, 27],
        [25, 35],
        [21, 33],
        [29, 35],
      ].map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.75} fill={grain} opacity={0.6} />
      ))}
    </G>
  );
}
