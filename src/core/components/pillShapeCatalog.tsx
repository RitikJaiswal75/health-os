import { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  GroundShadow,
  Shape3DCapsule,
  Shape3DCircle,
  Shape3DEllipse,
  adjustBrightness,
  shapeColors,
} from './pillShape3d';

export function CapsuleDividedPowder({
  fill,
  fill2,
  dual,
}: {
  fill: string;
  fill2?: string;
  dual?: boolean;
}) {
  const c = shapeColors(fill);
  const dots = [
    [27, 22],
    [30, 24],
    [28, 26],
    [31, 22],
    [29, 23],
    [32, 25],
  ];
  return (
    <G rotation={-22} origin="24, 24">
      <Shape3DCapsule
        x={8}
        y={20}
        w={32}
        h={10}
        rx={5}
        fill={fill}
        fill2={fill2}
        dual={dual}
        rotation={0}
        gradId="cap-div-p"
      />
      {dots.map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.75} fill={c.deep} opacity={0.55} />
      ))}
    </G>
  );
}

export function CapsuleStandard({ fill }: { fill: string }) {
  return (
    <G>
      <Shape3DCapsule x={17} y={8} w={14} h={32} rx={7} fill={fill} rotation={0} gradId="cap-std" />
    </G>
  );
}

export function CapsuleOpen({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  return (
    <G rotation={-18} origin="24, 24">
      <Path
        d="M10 24 C10 18 14 14 18 14 L18 30 C14 30 10 28 10 24 Z"
        fill={c.shadow}
        stroke={c.stroke}
        strokeWidth={c.sw}
      />
      <Path
        d="M38 24 C38 18 34 14 30 14 L30 30 C34 30 38 28 38 24 Z"
        fill={c.highlight}
        stroke={c.stroke}
        strokeWidth={c.sw}
      />
      <Shape3DCircle cx={24} cy={24} r={7} fill={fill} gradId="cap-open-tab" />
    </G>
  );
}

export function CapsuleSplitPowder({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const grain = adjustBrightness(c.stroke, 0.9);
  return (
    <G>
      <G rotation={-25} origin="18, 20">
        <Path d="M8 20 C8 16 12 14 16 14 L16 26 C12 26 8 24 8 20 Z" fill={c.fill} stroke={c.stroke} strokeWidth={c.sw} />
      </G>
      <G rotation={20} origin="30, 24">
        <Path d="M32 24 C32 20 28 18 24 18 L24 30 C28 30 32 28 32 24 Z" fill={c.highlight} stroke={c.stroke} strokeWidth={c.sw} />
      </G>
      {[
        [22, 28],
        [24, 30],
        [26, 29],
        [23, 32],
        [25, 33],
        [27, 31],
        [21, 31],
        [29, 33],
      ].map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.7} fill={grain} opacity={0.65} />
      ))}
    </G>
  );
}

export function CapsuleHalves({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  return (
    <G>
      <G rotation={-12} origin="16, 24">
        <Path d="M8 24 C8 18 12 14 16 14 L16 34 C12 34 8 30 8 24 Z" fill={c.fill} stroke={c.stroke} strokeWidth={c.sw} />
        <Rect x={9} y={17} width={4} height={10} rx={1} fill={c.glossSoft} />
      </G>
      <G rotation={12} origin="32, 24">
        <Path d="M40 24 C40 18 36 14 32 14 L32 34 C36 34 40 30 40 24 Z" fill={c.highlight} stroke={c.stroke} strokeWidth={c.sw} />
        <Rect x={35} y={17} width={4} height={10} rx={1} fill={c.glossSoft} />
      </G>
    </G>
  );
}

export function Shape3DRoundScored({
  fill,
  diagonal = false,
}: {
  fill: string;
  diagonal?: boolean;
}) {
  const c = shapeColors(fill);
  return (
    <G>
      <Shape3DCircle cx={24} cy={24} r={15} fill={fill} gradId={diagonal ? 'rs-d' : 'rs-h'} />
      {diagonal ? (
        <Line x1={14} y1={30} x2={34} y2={18} stroke={c.deep} strokeWidth={1.2} opacity={0.65} />
      ) : (
        <Line x1={12} y1={24} x2={36} y2={24} stroke={c.deep} strokeWidth={1.2} opacity={0.65} />
      )}
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

export function BlisterPack({ fill, capsules = false }: { fill: string; capsules?: boolean }) {
  const foil = '#E8E8E8';
  const foilDark = '#BDBDBD';
  return (
    <G>
      <GroundShadow cx={24} cy={38} rx={12} />
      <Rect x={10} y={10} width={28} height={28} rx={4} fill={foil} stroke={foilDark} strokeWidth={0.8} />
      {capsules
        ? [
            [16, 17],
            [32, 17],
            [16, 31],
            [32, 31],
          ].map(([x, y]) => (
            <G key={`${x}-${y}`} rotation={-20} origin={`${x}, ${y}`}>
              <Shape3DCapsule x={x - 5} y={y - 4} w={10} h={8} rx={4} fill={fill} rotation={0} gradId={`blc-${x}`} />
            </G>
          ))
        : [
            [16, 17],
            [32, 17],
            [16, 31],
            [32, 31],
          ].map(([x, y]) => (
            <Shape3DCircle key={`${x}-${y}`} cx={x} cy={y} r={5.5} fill={fill} gradId={`bl-${x}`} />
          ))}
    </G>
  );
}

export function BlisterStrip({ fill, capsules = false }: { fill: string; capsules?: boolean }) {
  const foil = '#ECECEC';
  const foilDark = '#BDBDBD';
  const slots = capsules
    ? [[24, 12], [24, 22], [24, 32]]
    : [[24, 11], [24, 20], [24, 29], [24, 38]];
  return (
    <G>
      <GroundShadow cx={24} cy={40} rx={8} />
      <Rect x={14} y={6} width={20} height={36} rx={4} fill={foil} stroke={foilDark} strokeWidth={0.8} />
      {slots.map(([x, y]) =>
        capsules ? (
          <G key={`${x}-${y}`} rotation={-15} origin={`${x}, ${y}`}>
            <Shape3DCapsule x={x - 6} y={y - 3.5} w={12} h={7} rx={3.5} fill={fill} rotation={0} gradId={`bls-${y}`} />
          </G>
        ) : (
          <Shape3DCircle key={`${x}-${y}`} cx={x} cy={y} r={y === 38 ? 4.5 : 5} fill={fill} gradId={`bls-${y}`} />
        ),
      )}
    </G>
  );
}

export function HerbalCapsule({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const leaf = adjustBrightness(fill, 0.85);
  return (
    <G>
      <Shape3DCapsule x={10} y={20} w={28} h={10} rx={5} fill={fill} rotation={-15} gradId="herbal-cap" />
      <Path d="M22 32 C20 30 20 28 22 27 C24 28 24 30 22 32 Z" fill={leaf} stroke={c.stroke} strokeWidth={0.5} />
      <Path d="M26 32 C28 30 28 28 26 27 C24 28 24 30 26 32 Z" fill={leaf} stroke={c.stroke} strokeWidth={0.5} />
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
