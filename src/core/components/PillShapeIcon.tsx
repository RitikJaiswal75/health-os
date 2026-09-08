import type { ReactNode } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';
import type { PillShape } from '../types/domain';

const VIEWBOX = 48;

interface PillShapeIconProps {
  shape: PillShape | string;
  color?: string;
  color2?: string;
  size?: number;
}

export const SHAPE_PREVIEW_COLOR = '#D8D8D8';
export const SHAPE_GRID_COLOR = '#F2F2F2';

export function formatShapeLabel(shape: string): string {
  return shape.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function PillSvg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      {children}
    </Svg>
  );
}

function fillColor(color?: string) {
  return color ?? SHAPE_GRID_COLOR;
}

function fillColor2(color?: string, color2?: string) {
  return color2 ?? color ?? SHAPE_GRID_COLOR;
}

function TwoToneHorizontalCapsule({
  fill,
  fill2,
  stroke,
  sw,
  x,
  y,
  w,
  h,
  rx,
}: {
  fill: string;
  fill2: string;
  stroke: string;
  sw: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}) {
  const mid = x + w / 2;
  const clipId = `cap-${x}-${y}-${w}`;
  return (
    <>
      <Defs>
        <ClipPath id={`${clipId}-left`}>
          <Rect x={x} y={y - 1} width={w / 2 + 1} height={h + 2} />
        </ClipPath>
        <ClipPath id={`${clipId}-right`}>
          <Rect x={mid} y={y - 1} width={w / 2 + 1} height={h + 2} />
        </ClipPath>
      </Defs>
      <Rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={stroke} strokeWidth={sw} />
      <G clipPath={`url(#${clipId}-left)`}>
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} />
      </G>
      <G clipPath={`url(#${clipId}-right)`}>
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill={fill2} />
      </G>
      <Line x1={mid} y1={y} x2={mid} y2={y + h} stroke={stroke} strokeWidth={0.6} />
    </>
  );
}

export function PillShapeIcon({ shape, color, color2, size = 48 }: PillShapeIconProps) {
  const fill = fillColor(color);
  const fill2 = fillColor2(color, color2);
  const dual = color2 !== undefined && color2 !== color;
  const stroke = '#9E9E9E';
  const sw = 0.8;

  switch (shape) {
    case 'capsule_divided':
    case 'capsule':
      return (
        <PillSvg size={size}>
          <G rotation="-25" origin="24, 24">
            {dual ? (
              <TwoToneHorizontalCapsule
                fill={fill}
                fill2={fill2}
                stroke={stroke}
                sw={sw}
                x={8}
                y={20}
                w={32}
                h={10}
                rx={5}
              />
            ) : (
              <>
                <Rect x={8} y={20} width={32} height={10} rx={5} fill={fill} stroke={stroke} strokeWidth={sw} />
                <Line x1={24} y1={20} x2={24} y2={30} stroke={stroke} strokeWidth={0.7} />
              </>
            )}
          </G>
        </PillSvg>
      );
    case 'oval_capsule':
    case 'oval':
      return (
        <PillSvg size={size}>
          <G rotation="-20" origin="24, 24">
            <Ellipse cx={24} cy={24} rx={17} ry={9} fill={fill} stroke={stroke} strokeWidth={sw} />
          </G>
        </PillSvg>
      );
    case 'bullet_capsule':
      return (
        <PillSvg size={size}>
          <G rotation="-15" origin="24, 24">
            <Rect x={8} y={20} width={32} height={10} rx={5} fill={fill} stroke={stroke} strokeWidth={sw} />
            <Path
              d="M24 20 L36 25 L24 30 Z"
              fill="rgba(255,255,255,0.22)"
              stroke={stroke}
              strokeWidth={0.4}
            />
          </G>
        </PillSvg>
      );
    case 'flat_oval':
      return (
        <PillSvg size={size}>
          <G rotation="-15" origin="24, 24">
            <Path
              d="M24 11 C33 11 39 17 39 24 C39 31 33 37 24 37 C15 37 9 31 9 24 C9 17 15 11 24 11 Z"
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          </G>
        </PillSvg>
      );
    case 'peanut':
      return (
        <PillSvg size={size}>
          <Circle cx={17} cy={24} r={9} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Circle cx={31} cy={24} r={9} fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'round':
    case 'tablet':
      return (
        <PillSvg size={size}>
          <Circle cx={24} cy={24} r={16} fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'triangle':
      return (
        <PillSvg size={size}>
          <Polygon points="24,8 40,38 8,38" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'rounded_square':
    case 'square':
      return (
        <PillSvg size={size}>
          <Rect x={10} y={10} width={28} height={28} rx={8} fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'rounded_rectangle':
      return (
        <PillSvg size={size}>
          <Rect x={6} y={14} width={36} height={20} rx={8} fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'segmented_bar':
      return (
        <PillSvg size={size}>
          <Rect x={8} y={16} width={8} height={16} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={18} y={16} width={8} height={16} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={28} y={16} width={8} height={16} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={38} y={16} width={4} height={16} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'trapezoid':
      return (
        <PillSvg size={size}>
          <Polygon points="14,14 34,14 38,34 10,34" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'diamond':
      return (
        <PillSvg size={size}>
          <Polygon points="24,6 42,24 24,42 6,24" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'pentagon_up':
      return (
        <PillSvg size={size}>
          <Polygon points="24,8 40,20 34,38 14,38 8,20" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'hexagon':
      return (
        <PillSvg size={size}>
          <Polygon points="24,8 38,16 38,32 24,40 10,32 10,16" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'pentagon_down':
      return (
        <PillSvg size={size}>
          <Polygon points="24,40 8,22 14,10 34,10 40,22" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'heptagon':
      return (
        <PillSvg size={size}>
          <Polygon points="24,8 36,12 40,24 34,38 14,38 8,24 12,12" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'octagon':
      return (
        <PillSvg size={size}>
          <Polygon points="16,8 32,8 40,16 40,32 32,40 16,40 8,32 8,16" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'apple':
      return (
        <PillSvg size={size}>
          <Path
            d="M24 10 C18 10 12 16 12 24 C12 34 18 38 24 38 C30 38 36 34 36 24 C36 16 30 10 24 10 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
          <Path d="M24 8 Q26 4 28 6" stroke={stroke} strokeWidth={0.8} fill="none" />
        </PillSvg>
      );
    case 'semicircle':
      return (
        <PillSvg size={size}>
          <Path d="M10 34 L10 20 A14 14 0 0 1 38 20 L38 34 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'clover':
      return (
        <PillSvg size={size}>
          <Circle cx={24} cy={16} r={8} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Circle cx={16} cy={28} r={8} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Circle cx={32} cy={28} r={8} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Circle cx={24} cy={32} r={6} fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'heart':
      return (
        <PillSvg size={size}>
          <Path
            d="M24 36 C14 28 8 22 8 16 C8 10 12 8 16 8 C19 8 22 10 24 13 C26 10 29 8 32 8 C36 8 40 10 40 16 C40 22 34 28 24 36 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        </PillSvg>
      );
    case 'bowtie':
      return (
        <PillSvg size={size}>
          <Polygon points="8,16 20,24 8,32" fill={fill} stroke={stroke} strokeWidth={sw} />
          <Polygon points="40,16 28,24 40,32" fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
    case 'inhaler':
      return (
        <PillSvg size={size}>
          <Rect x={10} y={18} width={24} height={14} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={34} y={22} width={8} height={6} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Rect x={14} y={22} width={10} height={6} rx={2} fill="rgba(255,255,255,0.2)" />
        </PillSvg>
      );
    case 'vapour':
      return (
        <PillSvg size={size}>
          <Circle cx={18} cy={32} r={5.5} fill={fill} opacity={0.85} />
          <Circle cx={26} cy={28} r={4.5} fill={fill} opacity={0.9} />
          <Circle cx={21} cy={22} r={3.8} fill={fill} opacity={0.95} />
          <Circle cx={28} cy={18} r={3.2} fill={fill} />
          <Circle cx={23} cy={13} r={2.6} fill={fill} />
          <Path
            d="M15 34 C17 30 19 31 21 27 M27 30 C29 26 31 27 33 23"
            fill="none"
            stroke={fill}
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={0.6}
          />
        </PillSvg>
      );
    case 'powder':
      return (
        <PillSvg size={size}>
          {/* Petri dish rim */}
          <Ellipse cx={24} cy={32} rx={16} ry={5.5} fill="none" stroke={stroke} strokeWidth={sw} />
          <Ellipse cx={24} cy={33} rx={14} ry={3.5} fill="rgba(255,255,255,0.12)" stroke={stroke} strokeWidth={0.5} />
          <Path
            d="M8 32 C8 36 16 38 24 38 C32 38 40 36 40 32"
            fill="none"
            stroke={stroke}
            strokeWidth={0.6}
            opacity={0.7}
          />
          {/* Triangular powder heap */}
          <Polygon points="24,12 34,31 14,31" fill={fill} stroke={stroke} strokeWidth={sw} />
          <Polygon points="24,16 30,29 18,29" fill="rgba(255,255,255,0.18)" />
          {/* Powdery texture dots */}
          <Circle cx={20} cy={26} r={0.9} fill={stroke} opacity={0.45} />
          <Circle cx={24} cy={24} r={0.9} fill={stroke} opacity={0.45} />
          <Circle cx={28} cy={27} r={0.9} fill={stroke} opacity={0.45} />
          <Circle cx={22} cy={29} r={0.7} fill={stroke} opacity={0.35} />
          <Circle cx={26} cy={29} r={0.7} fill={stroke} opacity={0.35} />
        </PillSvg>
      );
    case 'injection':
      return <PillShapeIcon shape="inhaler" color={color} size={size} />;
    case 'vial':
    case 'drops':
    case 'patch':
    case 'cream':
    case 'device':
      return <PillShapeIcon shape="round" color={color} color2={color2} size={size} />;
    default:
      return (
        <PillSvg size={size}>
          <Circle cx={24} cy={24} r={14} fill={fill} stroke={stroke} strokeWidth={sw} />
        </PillSvg>
      );
  }
}
