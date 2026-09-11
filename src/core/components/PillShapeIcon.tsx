import { G, Path } from 'react-native-svg';
import type { PillShape } from '../types/domain';
import {
  BlisterPack,
  BlisterStrip,
  CapsuleDividedPowder,
  CapsuleHalves,
  CapsuleOpen,
  CapsuleSplitPowder,
  CapsuleStandard,
  EffervescentTablet,
  HerbalCapsule,
  PillInGlass,
  Shape3DOblongTablet,
  Shape3DRoundScored,
  Shape3DWideOval,
  SpilledPowder,
} from './pillShapeCatalog';
import {
  FormDropper,
  FormInjection,
  FormInhaler,
  FormIU,
  FormOintment,
  FormPatch,
  FormPowder,
  FormPump,
  FormVapour,
  FormWaterSolubleTablet,
  PillSvg,
  Shape3DCapsule,
  Shape3DCircle,
  Shape3DEllipse,
  Shape3DPeanut,
  Shape3DPolygon,
  Shape3DRect,
  Shape3DSegmentedBar,
  shapeColors,
} from './pillShape3d';

interface PillShapeIconProps {
  shape: PillShape | string;
  color?: string;
  color2?: string;
  size?: number;
}

export const SHAPE_PREVIEW_COLOR = '#D8D8D8';
export const SHAPE_GRID_COLOR = '#F2F2F2';

const SHAPE_LABELS: Record<string, string> = {
  iu: 'IU',
  pump: 'Asthma pump',
  inhaler: 'Asthma pump',
  capsule_split_powder: 'Split capsule',
  capsule_halves: 'Capsule halves',
  capsule_open: 'Open capsule',
  herbal_capsule: 'Herbal capsule',
  round_scored: 'Scored tablet',
  round_scored_diagonal: 'Diagonal score',
  wide_oval: 'Wide oval',
  oblong_tablet: 'Oblong tablet',
  blister_pack: 'Blister pack',
  blister_strip: 'Blister strip',
  blister_pack_capsule: 'Capsule blister',
  blister_strip_capsule: 'Capsule strip',
  water_soluble_tablet: 'Water soluble',
  effervescent_tablet: 'Effervescent',
  pill_in_glass: 'Pill in glass',
  spilled_powder: 'Spilled powder',
};

export function formatShapeLabel(shape: string): string {
  if (SHAPE_LABELS[shape]) return SHAPE_LABELS[shape];
  return shape.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fillColor(color?: string) {
  return color ?? SHAPE_GRID_COLOR;
}

function fillColor2(color?: string, color2?: string) {
  return color2 ?? color ?? SHAPE_GRID_COLOR;
}

export function PillShapeIcon({ shape, color, color2, size = 48 }: PillShapeIconProps) {
  const fill = fillColor(color);
  const fill2 = fillColor2(color, color2);
  const dual = color2 !== undefined && color2 !== color;
  const c = shapeColors(fill);

  switch (shape) {
    case 'capsule_divided':
      return (
        <PillSvg size={size}>
          <CapsuleDividedPowder fill={fill} fill2={fill2} dual={dual} />
        </PillSvg>
      );
    case 'capsule':
      return (
        <PillSvg size={size}>
          <CapsuleStandard fill={fill} />
        </PillSvg>
      );
    case 'oval_capsule':
    case 'oval':
      return (
        <PillSvg size={size}>
          <Shape3DEllipse cx={24} cy={24} rx={17} ry={9} fill={fill} rotation={-20} gradId="oval-cap" />
        </PillSvg>
      );
    case 'bullet_capsule':
      return (
        <PillSvg size={size}>
          <G rotation={-15} origin="24, 24">
            <Shape3DCapsule x={8} y={20} w={32} h={10} rx={5} fill={fill} rotation={0} gradId="bullet-cap" />
            <Path d="M24 20 L36 25 L24 30 Z" fill={c.glossSoft} stroke={c.stroke} strokeWidth={0.4} />
          </G>
        </PillSvg>
      );
    case 'capsule_open':
      return (
        <PillSvg size={size}>
          <CapsuleOpen fill={fill} />
        </PillSvg>
      );
    case 'capsule_split_powder':
      return (
        <PillSvg size={size}>
          <CapsuleSplitPowder fill={fill} />
        </PillSvg>
      );
    case 'capsule_halves':
      return (
        <PillSvg size={size}>
          <CapsuleHalves fill={fill} />
        </PillSvg>
      );
    case 'herbal_capsule':
      return (
        <PillSvg size={size}>
          <HerbalCapsule fill={fill} />
        </PillSvg>
      );
    case 'flat_oval':
      return (
        <PillSvg size={size}>
          <G rotation={-15} origin="24, 24">
            <Shape3DPolygon
              points="24,11 39,17 39,31 24,37 9,31 9,17"
              fill={fill}
              gradId="flat-oval"
              shadowCx={24}
              shadowRx={14}
            />
          </G>
        </PillSvg>
      );
    case 'wide_oval':
      return (
        <PillSvg size={size}>
          <Shape3DWideOval fill={fill} />
        </PillSvg>
      );
    case 'oblong_tablet':
      return (
        <PillSvg size={size}>
          <Shape3DOblongTablet fill={fill} />
        </PillSvg>
      );
    case 'peanut':
      return (
        <PillSvg size={size}>
          <Shape3DPeanut fill={fill} />
        </PillSvg>
      );
    case 'round':
    case 'tablet':
      return (
        <PillSvg size={size}>
          <Shape3DCircle cx={24} cy={24} r={16} fill={fill} gradId="round" />
        </PillSvg>
      );
    case 'round_scored':
      return (
        <PillSvg size={size}>
          <Shape3DRoundScored fill={fill} />
        </PillSvg>
      );
    case 'round_scored_diagonal':
      return (
        <PillSvg size={size}>
          <Shape3DRoundScored fill={fill} diagonal />
        </PillSvg>
      );
    case 'triangle':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="24,8 40,38 8,38" fill={fill} gradId="triangle" shadowRx={13} />
        </PillSvg>
      );
    case 'rounded_square':
    case 'square':
      return (
        <PillSvg size={size}>
          <Shape3DRect x={10} y={10} w={28} h={28} rx={8} fill={fill} gradId="sq" />
        </PillSvg>
      );
    case 'rounded_rectangle':
      return (
        <PillSvg size={size}>
          <Shape3DRect x={6} y={14} w={36} h={20} rx={8} fill={fill} gradId="rect" />
        </PillSvg>
      );
    case 'segmented_bar':
      return (
        <PillSvg size={size}>
          <Shape3DSegmentedBar fill={fill} />
        </PillSvg>
      );
    case 'trapezoid':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="14,14 34,14 38,34 10,34" fill={fill} gradId="trap" shadowRx={12} />
        </PillSvg>
      );
    case 'blister_pack':
      return (
        <PillSvg size={size}>
          <BlisterPack fill={fill} />
        </PillSvg>
      );
    case 'blister_strip':
      return (
        <PillSvg size={size}>
          <BlisterStrip fill={fill} />
        </PillSvg>
      );
    case 'blister_pack_capsule':
      return (
        <PillSvg size={size}>
          <BlisterPack fill={fill} capsules />
        </PillSvg>
      );
    case 'blister_strip_capsule':
      return (
        <PillSvg size={size}>
          <BlisterStrip fill={fill} capsules />
        </PillSvg>
      );
    case 'diamond':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="24,6 42,24 24,42 6,24" fill={fill} gradId="diamond" shadowRx={11} />
        </PillSvg>
      );
    case 'pentagon_up':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="24,8 40,20 34,38 14,38 8,20" fill={fill} gradId="pent-up" shadowRx={12} />
        </PillSvg>
      );
    case 'hexagon':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="24,8 38,16 38,32 24,40 10,32 10,16" fill={fill} gradId="hex" shadowRx={12} />
        </PillSvg>
      );
    case 'pentagon_down':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="24,40 8,22 14,10 34,10 40,22" fill={fill} gradId="pent-down" shadowRx={12} />
        </PillSvg>
      );
    case 'heptagon':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon
            points="24,8 36,12 40,24 34,38 14,38 8,24 12,12"
            fill={fill}
            gradId="hept"
            shadowRx={12}
          />
        </PillSvg>
      );
    case 'octagon':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon
            points="16,8 32,8 40,16 40,32 32,40 16,40 8,32 8,16"
            fill={fill}
            gradId="oct"
            shadowRx={13}
          />
        </PillSvg>
      );
    case 'apple':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon
            points="24,10 12,24 14,36 24,38 34,36 36,24 24,10"
            fill={fill}
            gradId="apple"
            shadowRx={12}
          />
          <Path d="M24 8 Q26 4 28 6" stroke={c.stroke} strokeWidth={0.8} fill="none" />
        </PillSvg>
      );
    case 'semicircle':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="10,34 10,20 24,8 38,20 38,34" fill={fill} gradId="semi" shadowRx={13} />
        </PillSvg>
      );
    case 'clover':
      return (
        <PillSvg size={size}>
          <Shape3DCircle cx={24} cy={16} r={8} fill={fill} gradId="clover1" />
          <Shape3DCircle cx={16} cy={28} r={8} fill={fill} gradId="clover2" />
          <Shape3DCircle cx={32} cy={28} r={8} fill={fill} gradId="clover3" />
          <Shape3DCircle cx={24} cy={32} r={6} fill={fill} gradId="clover4" />
        </PillSvg>
      );
    case 'heart':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon
            points="24,36 8,16 16,8 24,13 32,8 40,16 24,36"
            fill={fill}
            gradId="heart"
            shadowRx={11}
          />
        </PillSvg>
      );
    case 'bowtie':
      return (
        <PillSvg size={size}>
          <Shape3DPolygon points="8,16 20,24 8,32" fill={fill} gradId="bow-l" shadowCx={14} shadowRx={6} />
          <Shape3DPolygon points="40,16 28,24 40,32" fill={fill} gradId="bow-r" shadowCx={34} shadowRx={6} />
        </PillSvg>
      );
    case 'powder':
      return (
        <PillSvg size={size}>
          <FormPowder fill={fill} />
        </PillSvg>
      );
    case 'spilled_powder':
      return (
        <PillSvg size={size}>
          <SpilledPowder fill={fill} />
        </PillSvg>
      );
    case 'vapour':
      return (
        <PillSvg size={size}>
          <FormVapour fill={fill} />
        </PillSvg>
      );
    case 'ointment':
    case 'cream':
      return (
        <PillSvg size={size}>
          <FormOintment fill={fill} />
        </PillSvg>
      );
    case 'dropper':
    case 'drops':
    case 'liquid':
      return (
        <PillSvg size={size}>
          <FormDropper fill={fill} />
        </PillSvg>
      );
    case 'injection':
      return (
        <PillSvg size={size}>
          <FormInjection fill={fill} />
        </PillSvg>
      );
    case 'pump':
    case 'device':
      return (
        <PillSvg size={size}>
          <FormPump fill={fill} />
        </PillSvg>
      );
    case 'water_soluble_tablet':
      return (
        <PillSvg size={size}>
          <FormWaterSolubleTablet fill={fill} />
        </PillSvg>
      );
    case 'effervescent_tablet':
      return (
        <PillSvg size={size}>
          <EffervescentTablet fill={fill} />
        </PillSvg>
      );
    case 'pill_in_glass':
      return (
        <PillSvg size={size}>
          <PillInGlass fill={fill} />
        </PillSvg>
      );
    case 'patch':
      return (
        <PillSvg size={size}>
          <FormPatch fill={fill} />
        </PillSvg>
      );
    case 'iu':
    case 'vial':
      return (
        <PillSvg size={size}>
          <FormIU fill={fill} />
        </PillSvg>
      );
    case 'inhaler':
      return (
        <PillSvg size={size}>
          <FormInhaler fill={fill} />
        </PillSvg>
      );
    default:
      return (
        <PillSvg size={size}>
          <Shape3DCircle cx={24} cy={24} r={14} fill={fill} gradId="default" />
        </PillSvg>
      );
  }
}
