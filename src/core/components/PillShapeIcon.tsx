import { G, Path } from 'react-native-svg';
import { t, type MessageKey } from '@/src/i18n/translate';
import { en } from '@/src/i18n/en';
import type { PillShape } from '../types/domain';
import {
  CapsuleDivided,
  EffervescentTablet,
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
  FormSpray,
  FormVapour,
  FormWaterSolubleTablet,
  PillSvg,
  Shape3DCapsule,
  Shape3DCircle,
  Shape3DEllipse,
  Shape3DPolygon,
  Shape3DRect,
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
  spray: 'Spray',
  round_scored: 'Scored tablet',
  wide_oval: 'Wide oval',
  oblong_tablet: 'Oblong tablet',
  water_soluble_tablet: 'Water soluble',
  effervescent_tablet: 'Effervescent',
  pill_in_glass: 'Pill in glass',
  spilled_powder: 'Spilled powder',
};

export function formatShapeLabel(shape: string): string {
  const key = `shapeLabel.${shape}` as MessageKey;
  if (key in en) return t(key);
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
          <CapsuleDivided fill={fill} fill2={fill2} dual={dual} />
        </PillSvg>
      );
    case 'oval_capsule':
    case 'oval':
      return (
        <PillSvg size={size}>
          <Shape3DEllipse cx={24} cy={24} rx={17} ry={9} fill={fill} rotation={-20} gradId="oval-cap" />
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
    case 'rounded_rectangle':
      return (
        <PillSvg size={size}>
          <Shape3DRect x={6} y={14} w={36} h={20} rx={8} fill={fill} gradId="rect" />
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
    case 'spray':
      return (
        <PillSvg size={size}>
          <FormSpray fill={fill} />
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
