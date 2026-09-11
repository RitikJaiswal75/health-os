import type { ReactNode } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Line,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

const VIEWBOX = 48;

export function PillSvg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      {children}
    </Svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseHex(color: string) {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function adjustBrightness(color: string, factor: number) {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r * factor)}${toHex(rgb.g * factor)}${toHex(rgb.b * factor)}`;
}

export function shapeColors(fill: string) {
  const stroke = adjustBrightness(fill, 0.55);
  return {
    fill,
    stroke,
    highlight: adjustBrightness(fill, 1.28),
    shadow: adjustBrightness(fill, 0.72),
    deep: adjustBrightness(fill, 0.58),
    gloss: 'rgba(255,255,255,0.42)',
    glossSoft: 'rgba(255,255,255,0.18)',
    sw: 0.75,
  };
}

function Gradients({ id, fill }: { id: string; fill: string }) {
  const c = shapeColors(fill);
  return (
    <Defs>
      <LinearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor={c.highlight} />
        <Stop offset="45%" stopColor={c.fill} />
        <Stop offset="100%" stopColor={c.shadow} />
      </LinearGradient>
      <LinearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor={c.shadow} />
        <Stop offset="35%" stopColor={c.fill} />
        <Stop offset="100%" stopColor={c.highlight} />
      </LinearGradient>
    </Defs>
  );
}

export function GroundShadow({ cx, cy, rx, ry = 3 }: { cx: number; cy: number; rx: number; ry?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(0,0,0,0.22)" />;
}

export function GlossDot({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(255,255,255,0.45)" />;
}

export function Shape3DCircle({
  cx,
  cy,
  r,
  fill,
  gradId = 'circle',
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  gradId?: string;
}) {
  const c = shapeColors(fill);
  return (
    <G>
      <Gradients id={gradId} fill={fill} />
      <GroundShadow cx={cx} cy={cy + r - 2} rx={r * 0.82} />
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${gradId}-body)`} stroke={c.stroke} strokeWidth={c.sw} />
      <Ellipse
        cx={cx - r * 0.22}
        cy={cy - r * 0.28}
        rx={r * 0.38}
        ry={r * 0.22}
        fill={c.gloss}
      />
    </G>
  );
}

export function Shape3DEllipse({
  cx,
  cy,
  rx,
  ry,
  fill,
  rotation = 0,
  gradId = 'ellipse',
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
  rotation?: number;
  gradId?: string;
}) {
  const c = shapeColors(fill);
  return (
    <G rotation={rotation} origin={`${cx}, ${cy}`}>
      <Gradients id={gradId} fill={fill} />
      <GroundShadow cx={cx} cy={cy + ry - 1} rx={rx * 0.9} ry={2.5} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${gradId}-body)`} stroke={c.stroke} strokeWidth={c.sw} />
      <Ellipse cx={cx - rx * 0.25} cy={cy - ry * 0.35} rx={rx * 0.35} ry={ry * 0.28} fill={c.gloss} />
    </G>
  );
}

export function Shape3DRect({
  x,
  y,
  w,
  h,
  rx,
  fill,
  gradId = 'rect',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  fill: string;
  gradId?: string;
}) {
  const c = shapeColors(fill);
  const cx = x + w / 2;
  return (
    <G>
      <Gradients id={gradId} fill={fill} />
      <GroundShadow cx={cx} cy={y + h + 1} rx={w * 0.42} />
      <Rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#${gradId}-body)`} stroke={c.stroke} strokeWidth={c.sw} />
      <Rect x={x + 2} y={y + 2} width={w - 4} height={h * 0.38} rx={rx * 0.7} fill={c.glossSoft} />
      <GlossDot cx={x + w * 0.28} cy={y + h * 0.28} rx={w * 0.12} ry={h * 0.1} />
    </G>
  );
}

export function Shape3DPolygon({
  points,
  fill,
  gradId = 'poly',
  shadowCx,
  shadowRx,
}: {
  points: string;
  fill: string;
  gradId?: string;
  shadowCx?: number;
  shadowRx?: number;
}) {
  const c = shapeColors(fill);
  const cx = shadowCx ?? 24;
  const rx = shadowRx ?? 12;
  return (
    <G>
      <Gradients id={gradId} fill={fill} />
      <GroundShadow cx={cx} cy={37} rx={rx} />
      <Polygon points={points} fill={`url(#${gradId}-body)`} stroke={c.stroke} strokeWidth={c.sw} />
      <Polygon points={points} fill={c.glossSoft} opacity={0.55} />
    </G>
  );
}

export function Shape3DCapsule({
  x,
  y,
  w,
  h,
  rx,
  fill,
  fill2,
  dual,
  rotation = -20,
  gradId = 'cap',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  fill: string;
  fill2?: string;
  dual?: boolean;
  rotation?: number;
  gradId?: string;
}) {
  const c = shapeColors(fill);
  const c2 = shapeColors(fill2 ?? fill);
  const mid = x + w / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <G rotation={rotation} origin={`${cx}, ${cy}`}>
      <Gradients id={gradId} fill={fill} />
      <GroundShadow cx={cx} cy={cy + h * 0.9} rx={w * 0.38} />
      {dual && fill2 ? (
        <>
          <Rect x={x} y={y} width={w / 2} height={h} rx={rx} fill={`url(#${gradId}-body)`} stroke={c.stroke} strokeWidth={c.sw} />
          <Rect x={mid} y={y} width={w / 2} height={h} rx={rx} fill={c2.fill} stroke={c2.stroke} strokeWidth={c.sw} />
          <Line x1={mid} y1={y} x2={mid} y2={y + h} stroke={c.stroke} strokeWidth={0.65} />
        </>
      ) : (
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#${gradId}-body)`} stroke={c.stroke} strokeWidth={c.sw} />
      )}
      <Ellipse cx={cx - w * 0.12} cy={y + h * 0.28} rx={w * 0.22} ry={h * 0.35} fill={c.gloss} />
    </G>
  );
}

export function Shape3DPeanut({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  return (
    <G>
      <Gradients id="peanut" fill={fill} />
      <GroundShadow cx={24} cy={35} rx={14} />
      <Circle cx={17} cy={24} r={9} fill={`url(#peanut-body)`} stroke={c.stroke} strokeWidth={c.sw} />
      <Circle cx={31} cy={24} r={9} fill={`url(#peanut-body)`} stroke={c.stroke} strokeWidth={c.sw} />
      <GlossDot cx={14} cy={20} rx={3.5} ry={2.2} />
      <GlossDot cx={28} cy={20} rx={3.5} ry={2.2} />
    </G>
  );
}

export function Shape3DSegmentedBar({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const segments = [8, 18, 28, 38];
  const widths = [8, 8, 8, 4];
  return (
    <G>
      <GroundShadow cx={24} cy={35} rx={14} />
      {segments.map((x, i) => (
        <G key={x}>
          <Rect
            x={x}
            y={16}
            width={widths[i]}
            height={16}
            rx={2}
            fill={i % 2 === 0 ? c.fill : c.shadow}
            stroke={c.stroke}
            strokeWidth={c.sw}
          />
          <Rect x={x + 1} y={17} width={widths[i] - 2} height={5} rx={1} fill={c.glossSoft} />
        </G>
      ))}
    </G>
  );
}

export function FormPowder({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const grain = adjustBrightness(c.stroke, 0.88);
  const grainLight = adjustBrightness(c.highlight, 0.95);
  const woodLight = '#D4A574';
  const woodMid = '#B8895A';
  const woodDark = '#8F6A42';
  const coarseGrains = [
    [20, 27, 1.6, 0.9, -18],
    [23, 24, 1.4, 0.75, 12],
    [26, 26, 1.5, 0.85, -8],
    [22, 21, 1.3, 0.7, 22],
    [25, 19, 1.2, 0.65, -15],
    [27, 22, 1.35, 0.72, 8],
    [18, 23, 1.25, 0.6, 25],
    [29, 24, 1.3, 0.68, -20],
    [21, 29, 1.4, 0.7, 5],
    [28, 28, 1.35, 0.66, -10],
    [24, 17, 1.1, 0.55, 0],
    [17, 28, 1.2, 0.58, 18],
    [31, 27, 1.15, 0.52, -25],
  ] as const;
  return (
    <G>
      <Defs>
        <LinearGradient id="powder-bowl" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={woodLight} />
          <Stop offset="55%" stopColor={woodMid} />
          <Stop offset="100%" stopColor={woodDark} />
        </LinearGradient>
        <LinearGradient id="powder-cone" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={c.highlight} />
          <Stop offset="55%" stopColor={c.fill} />
          <Stop offset="100%" stopColor={c.shadow} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={24} cy={38} rx={17} ry={3} fill="rgba(0,0,0,0.2)" />
      <Path
        d="M8 33 C8 37.5 15 39.5 24 39.5 C33 39.5 40 37.5 40 33 L40 31.5 C40 31.5 34 30 24 30 C14 30 8 31.5 8 31.5 Z"
        fill="url(#powder-bowl)"
        stroke={woodDark}
        strokeWidth={0.7}
      />
      <Ellipse cx={24} cy={31} rx={15.5} ry={3.2} fill={woodDark} opacity={0.28} />
      <Ellipse cx={24} cy={30.5} rx={14} ry={2.2} fill={woodLight} opacity={0.22} />
      <Path
        d="M24 7 C20 14 15.5 24 12.5 30.5 C18 29.5 21 29 24 29 C27 29 30 29.5 35.5 30.5 C32.5 24 28 14 24 7 Z"
        fill="url(#powder-cone)"
        stroke={c.stroke}
        strokeWidth={c.sw}
      />
      <Path
        d="M24 7 C21 13 18 21 16.5 28 C19 27.2 21.5 27 24 27 C26.5 27 29 27.2 31.5 28 C30 21 27 13 24 7 Z"
        fill={c.highlight}
        opacity={0.28}
      />
      <Path
        d="M24 7 L27.5 28 C26 27.5 25 27.3 24 27.3 C23 27.3 22 27.5 20.5 28 L24 7 Z"
        fill={c.shadow}
        opacity={0.22}
      />
      {coarseGrains.map(([x, y, rx, ry, rot]) => (
        <Ellipse
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          rx={rx}
          ry={ry}
          fill={grainLight}
          stroke={grain}
          strokeWidth={0.35}
          opacity={0.82}
          rotation={rot}
          origin={`${x}, ${y}`}
        />
      ))}
    </G>
  );
}

function SteamPlume({
  d,
  fill,
  opacity,
}: {
  d: string;
  fill: string;
  opacity: number;
}) {
  return <Path d={d} fill={fill} opacity={opacity} />;
}

function SteamStreak({
  cx,
  cy,
  rx,
  ry,
  opacity,
  fill,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  opacity: number;
  fill: string;
}) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={opacity} />;
}

export function FormVapour({ fill: _fill }: { fill: string }) {
  const steamBase = '#C8D8E4';
  const steamSoft = '#E4EEF4';
  const steamMid = '#F2F7FA';
  const steamBright = '#FFFFFF';
  const wisps = [
    { cx: 15, cy: 36, rx: 2.2, ry: 3.8, o: 0.2 },
    { cx: 14, cy: 30, rx: 3.4, ry: 6.2, o: 0.32 },
    { cx: 15.5, cy: 23, rx: 4.2, ry: 7.4, o: 0.42 },
    { cx: 14, cy: 16, rx: 3.6, ry: 6.5, o: 0.36 },
    { cx: 15, cy: 10, rx: 2.4, ry: 4.2, o: 0.26 },
    { cx: 14.5, cy: 5, rx: 1.6, ry: 2.8, o: 0.18 },
    { cx: 24, cy: 36, rx: 2.8, ry: 4.2, o: 0.24 },
    { cx: 24, cy: 29, rx: 5.2, ry: 8.5, o: 0.48 },
    { cx: 24, cy: 21, rx: 6, ry: 9.2, o: 0.58 },
    { cx: 24, cy: 13, rx: 5, ry: 7.8, o: 0.5 },
    { cx: 24, cy: 7, rx: 3.2, ry: 5, o: 0.34 },
    { cx: 24, cy: 2.5, rx: 2, ry: 3.2, o: 0.22 },
    { cx: 33, cy: 36, rx: 2.2, ry: 3.8, o: 0.2 },
    { cx: 34, cy: 30, rx: 3.4, ry: 6.2, o: 0.32 },
    { cx: 32.5, cy: 23, rx: 4.2, ry: 7.4, o: 0.42 },
    { cx: 34, cy: 16, rx: 3.6, ry: 6.5, o: 0.36 },
    { cx: 33, cy: 10, rx: 2.4, ry: 4.2, o: 0.26 },
    { cx: 33.5, cy: 5, rx: 1.6, ry: 2.8, o: 0.18 },
  ] as const;

  return (
    <G>
      <Path
        d="M8 39.5 C14 38 18 38.5 24 38.2 C30 37.9 34 38.2 40 39.5"
        fill="none"
        stroke={steamBase}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.45}
      />
      <SteamPlume
        d="M13 38 C10 32 16 26 13 18 C11 11 15 5 13 1 C15 5 17 11 16 18 C18 26 14 32 17 38 Z"
        fill={steamSoft}
        opacity={0.28}
      />
      <SteamPlume
        d="M24 38 C20 30 26 22 23 14 C21 7 25 2 24 0 C23 2 27 7 25 14 C28 22 22 30 25 38 Z"
        fill={steamMid}
        opacity={0.34}
      />
      <SteamPlume
        d="M35 38 C38 32 32 26 35 18 C37 11 33 5 35 1 C33 5 31 11 32 18 C30 26 36 32 33 38 Z"
        fill={steamSoft}
        opacity={0.28}
      />
      {wisps.map(({ cx, cy, rx, ry, o }) => (
        <SteamStreak key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} opacity={o} fill={steamMid} />
      ))}
      <Path
        d="M15 38 C13 31 17 24 15 17 C13 10 16 4 14 1"
        fill="none"
        stroke={steamBright}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.7}
      />
      <Path
        d="M24 38 C22 30 26 22 24 14 C22 7 25 2 24 0"
        fill="none"
        stroke={steamBright}
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.82}
      />
      <Path
        d="M33 38 C35 31 31 24 33 17 C35 10 32 4 34 1"
        fill="none"
        stroke={steamBright}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.7}
      />
      <Path
        d="M18 31 C20 28 22 26 24 25 C26 26 28 28 30 31"
        fill="none"
        stroke={steamSoft}
        strokeWidth={2.8}
        strokeLinecap="round"
        opacity={0.22}
      />
      <Path
        d="M17 21 C19 17 22 15 24 14 C26 15 29 17 31 21"
        fill="none"
        stroke={steamSoft}
        strokeWidth={2.2}
        strokeLinecap="round"
        opacity={0.18}
      />
    </G>
  );
}

export function FormOintment({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  return (
    <G rotation="-12" origin="24, 24">
      <Defs>
        <LinearGradient id="oint-body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={c.highlight} />
          <Stop offset="100%" stopColor={c.shadow} />
        </LinearGradient>
      </Defs>
      <GroundShadow cx={26} cy={36} rx={12} />
      <Rect x={10} y={18} width={26} height={14} rx={4} fill="url(#oint-body)" stroke={c.stroke} strokeWidth={c.sw} />
      <Path d="M36 20 L42 24 L36 28 Z" fill={c.shadow} stroke={c.stroke} strokeWidth={0.6} />
      <Rect x={12} y={20} width={18} height={4} rx={2} fill={c.glossSoft} />
      <Rect x={14} y={26} width={10} height={2} rx={1} fill={c.deep} opacity={0.35} />
    </G>
  );
}

export function FormDropper({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const bulb = adjustBrightness(fill, 1.08);
  const glass = 'rgba(255,255,255,0.28)';
  return (
    <G>
      <Defs>
        <LinearGradient id="dropper-tube" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={c.shadow} />
          <Stop offset="45%" stopColor={glass} />
          <Stop offset="100%" stopColor={c.highlight} />
        </LinearGradient>
        <LinearGradient id="dropper-bulb" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={adjustBrightness(bulb, 1.12)} />
          <Stop offset="60%" stopColor={bulb} />
          <Stop offset="100%" stopColor={c.shadow} />
        </LinearGradient>
      </Defs>
      <GroundShadow cx={24} cy={40} rx={4} />
      <Rect x={22.2} y={12} width={3.6} height={27} rx={1.2} fill="url(#dropper-tube)" stroke={c.stroke} strokeWidth={0.65} />
      <Rect x={23} y={14} width={1} height={22} fill={c.glossSoft} opacity={0.7} />
      <Path
        d="M24 2.5 C30 2.5 33.5 5.5 33.5 8.5 C33.5 10.5 31.5 11.2 29.5 11.2 L18.5 11.2 C16.5 11.2 14.5 10.5 14.5 8.5 C14.5 5.5 18 2.5 24 2.5 Z"
        fill="url(#dropper-bulb)"
        stroke={c.stroke}
        strokeWidth={c.sw}
      />
      <Path
        d="M20 4.5 C22 3.5 26 3.5 28 4.5 C27 5.5 25 6 24 6 C23 6 21 5.5 20 4.5 Z"
        fill={c.gloss}
        opacity={0.55}
      />
      <Rect x={20} y={10.8} width={8} height={1.8} rx={0.9} fill={c.stroke} opacity={0.75} />
      <Path d="M23.4 38.5 L24 40.5 L24.6 38.5 Z" fill={c.fill} opacity={0.85} />
      <Circle cx={24} cy={39.2} r={1.1} fill={c.fill} opacity={0.55} />
    </G>
  );
}

export function FormInjection({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const barrel = 'rgba(255,255,255,0.18)';
  return (
    <G>
      <GroundShadow cx={24} cy={39} rx={8} />
      <Line x1={24} y1={6} x2={24} y2={10} stroke={adjustBrightness(c.stroke, 0.75)} strokeWidth={1.2} />
      <Path d="M23 6 L24 4 L25 6 Z" fill={adjustBrightness(c.stroke, 0.75)} />
      <Rect x={19} y={10} width={10} height={20} rx={2} fill={barrel} stroke={c.stroke} strokeWidth={c.sw} />
      <Rect x={20} y={16} width={8} height={10} rx={1} fill={c.fill} opacity={0.9} />
      <Rect x={20} y={16} width={8} height={3} rx={1} fill={c.highlight} opacity={0.35} />
      <Rect x={19.5} y={14} width={9} height={3} rx={1.2} fill={c.shadow} stroke={c.stroke} strokeWidth={0.5} />
      <Rect x={21} y={30} width={6} height={5} rx={1} fill={c.shadow} stroke={c.stroke} strokeWidth={c.sw} />
      <Rect x={15} y={33} width={18} height={3} rx={1} fill={c.stroke} />
      <Rect x={22} y={35} width={4} height={5} rx={1} fill={adjustBrightness(c.stroke, 0.85)} />
      <Rect x={20.5} y={11} width={2} height={18} fill={c.glossSoft} opacity={0.55} />
    </G>
  );
}

export function FormAsthmaPump({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const boot = adjustBrightness(fill, 0.88);
  const bootDark = adjustBrightness(fill, 0.72);
  return (
    <G>
      <Defs>
        <LinearGradient id="asthma-can" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={c.shadow} />
          <Stop offset="50%" stopColor={c.fill} />
          <Stop offset="100%" stopColor={c.highlight} />
        </LinearGradient>
        <LinearGradient id="asthma-boot" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={boot} />
          <Stop offset="100%" stopColor={bootDark} />
        </LinearGradient>
      </Defs>
      <GroundShadow cx={22} cy={39} rx={12} />
      <Rect x={15} y={6} width={11} height={4.5} rx={2} fill={c.stroke} />
      <Rect x={14} y={9} width={13} height={22} rx={5} fill="url(#asthma-can)" stroke={c.stroke} strokeWidth={c.sw} />
      <Rect x={15.5} y={11} width={3.5} height={18} rx={1.2} fill={c.glossSoft} />
      <Path
        d="M14 28 L14 31 C14 33.5 16 35 19 35 L33 35 C36.5 35 38.5 33.5 38.5 31 L38.5 30 C38.5 28.5 37 27.5 33 27.5 L27 27.5 L27 25 L14 25 Z"
        fill="url(#asthma-boot)"
        stroke={c.stroke}
        strokeWidth={c.sw}
      />
      <Rect x={30} y={29} width={9} height={5.5} rx={2.5} fill={bootDark} stroke={c.stroke} strokeWidth={0.65} />
      <Ellipse cx={36.5} cy={31.8} rx={2.2} ry={1.6} fill="#1A1A1A" opacity={0.55} />
      <Rect x={31} y={30.2} width={4} height={2.2} rx={1} fill={c.glossSoft} opacity={0.45} />
    </G>
  );
}

export function FormWaterSolubleTablet({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const water = '#5CB8E8';
  const waterDeep = '#3A9FD4';
  const waterHighlight = '#9AD4F5';
  const bubbleStroke = 'rgba(255,255,255,0.75)';
  const dissolveParticles = [
    [18, 30, 1.3, 0.55],
    [21, 32, 1.1, 0.45],
    [24, 31, 1.4, 0.6],
    [27, 32, 1.2, 0.5],
    [30, 30, 1, 0.4],
    [20, 34, 0.9, 0.35],
    [28, 34, 0.85, 0.32],
    [24, 35, 1.1, 0.38],
  ] as const;
  return (
    <G>
      <Defs>
        <LinearGradient id="wst-water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={waterHighlight} />
          <Stop offset="55%" stopColor={water} />
          <Stop offset="100%" stopColor={waterDeep} />
        </LinearGradient>
        <ClipPath id="wst-tablet-top">
          <Rect x={0} y={0} width={48} height={25.5} />
        </ClipPath>
        <LinearGradient id="wst-dissolve" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={c.fill} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={c.fill} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M6 36 C10 33 14 35 18 33 C22 31 26 33 30 33 C34 33 38 31 42 34 L42 40 L6 40 Z" fill="url(#wst-water)" />
      <Path
        d="M8 34.5 C12 32.5 16 34 20 32.5 C24 31 28 32.5 32 32.5 C36 32.5 38 31.5 40 33"
        fill="none"
        stroke={waterHighlight}
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.85}
      />
      <Path
        d="M10 37 C14 35.5 18 36.5 22 35.5 C26 34.5 30 35.5 34 35.5 C37 35.5 39 34.8 40 35.8"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <Path
        d="M11 27 C15 25.5 19 26.5 24 25.8 C29 25 33 26 37 27 C33 28.5 29 29 24 29 C19 29 15 28.5 11 27 Z"
        fill={waterHighlight}
        opacity={0.35}
      />
      <G clipPath="url(#wst-tablet-top)">
        <Shape3DCircle cx={24} cy={21} r={12} fill={fill} gradId="wst" />
      </G>
      <Path
        d="M12 26.5 C16 24.5 20 25.5 24 25 C28 24.5 32 25.5 36 26.5 C32 28 28 28.5 24 28.5 C20 28.5 16 28 12 26.5 Z"
        fill="url(#wst-dissolve)"
      />
      {dissolveParticles.map(([x, y, r, opacity]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={c.fill} opacity={opacity} />
      ))}
      {[
        [12, 16, 2.2],
        [16, 11, 1.6],
        [34, 14, 2],
        [36, 20, 1.4],
        [10, 24, 1.5],
        [37, 26, 1.8],
        [14, 28, 1.2],
        [32, 9, 1.3],
      ].map(([x, y, r]) => (
        <G key={`${x}-${y}`}>
          <Circle cx={x} cy={y} r={r} fill="rgba(255,255,255,0.22)" stroke={bubbleStroke} strokeWidth={0.55} />
          <Circle cx={x - r * 0.28} cy={y - r * 0.32} r={r * 0.28} fill="rgba(255,255,255,0.55)" />
        </G>
      ))}
      <Path
        d="M30 8 C31.5 10 33 10.5 33.5 12 C34 13.5 33 15 31.5 15.5 C30 16 28.5 15 28 13.5 C27.5 12 28.5 10 30 8 Z"
        fill={waterHighlight}
        opacity={0.9}
      />
      <Path
        d="M14 10 C15 11.5 15.5 12.5 15.2 13.5 C14.9 14.5 14 15 13.2 14.5 C12.4 14 12 13 12.2 12 C12.4 11 13.2 10.2 14 10 Z"
        fill={waterHighlight}
        opacity={0.75}
      />
    </G>
  );
}

export function FormPatch({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  const backing = '#E6D8C3';
  const backingShadow = '#C9B79A';
  return (
    <G rotation="-6" origin="24, 24">
      <Defs>
        <LinearGradient id="patch-body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={c.highlight} />
          <Stop offset="100%" stopColor={c.shadow} />
        </LinearGradient>
      </Defs>
      <GroundShadow cx={24} cy={37} rx={13} />
      <Rect x={9} y={18} width={28} height={18} rx={4} fill={backing} stroke={backingShadow} strokeWidth={0.6} />
      <Rect x={10} y={16} width={24} height={18} rx={4} fill="url(#patch-body)" stroke={c.stroke} strokeWidth={c.sw} />
      <Path
        d="M28 16 L36 10 L36 18 C36 20 34 21 32 20 L28 16 Z"
        fill={backing}
        stroke={backingShadow}
        strokeWidth={0.65}
      />
      <Path
        d="M28 16 L34 12 L34 17.5 C34 18.5 32.5 19 31 18.2 L28 16 Z"
        fill={adjustBrightness(backing, 1.08)}
        stroke={backingShadow}
        strokeWidth={0.45}
      />
      <Path
        d="M12 20 Q18 22 24 22 Q30 22 32 20"
        fill="none"
        stroke={c.stroke}
        strokeWidth={0.45}
        strokeDasharray="1.5 1.5"
        opacity={0.55}
      />
      <GlossDot cx={15} cy={20} rx={3.5} ry={2} />
    </G>
  );
}

export function FormIU({ fill }: { fill: string }) {
  const c = shapeColors(fill);
  return (
    <G>
      <Defs>
        <LinearGradient id="iu-body" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={c.shadow} />
          <Stop offset="50%" stopColor={c.fill} />
          <Stop offset="100%" stopColor={c.highlight} />
        </LinearGradient>
      </Defs>
      <GroundShadow cx={24} cy={38} rx={8} />
      <Rect x={17} y={10} width={14} height={26} rx={3} fill="url(#iu-body)" stroke={c.stroke} strokeWidth={c.sw} />
      <Rect x={19} y={12} width={3} height={20} fill={c.glossSoft} />
      <Rect x={16} y={8} width={16} height={4} rx={2} fill={c.stroke} />
      <Path d="M20 18 L20 28 M20 18 L26 18 M20 23 L25 23" stroke={c.deep} strokeWidth={1.3} strokeLinecap="round" />
      <Circle cx={24} cy={32} r={1.5} fill={c.highlight} />
    </G>
  );
}

export function FormInhaler({ fill }: { fill: string }) {
  return <FormAsthmaPump fill={fill} />;
}

export function FormPump({ fill }: { fill: string }) {
  return <FormAsthmaPump fill={fill} />;
}
