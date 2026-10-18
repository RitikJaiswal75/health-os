/**
 * Minimal web stand-in for `react-native-svg`, used only by the dev icon gallery.
 * Maps RN SVG components onto DOM SVG elements, converts `rotation`/`origin`
 * into `transform`, and scopes gradient/clip ids per <Svg> so icons drawn with
 * different colours on one page do not share each other's gradients.
 */
import { createContext, createElement, useContext, useId, type ReactNode } from 'react';

type SvgProps = Record<string, unknown> & { children?: ReactNode };

const IdPrefix = createContext('');

const URL_PROPS = ['fill', 'stroke', 'clipPath', 'mask', 'filter'] as const;

function scopeUrl(value: unknown, prefix: string): unknown {
  return typeof value === 'string' ? value.replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`) : value;
}

function parseOrigin(origin: unknown): [number, number] {
  if (typeof origin === 'number') return [origin, origin];
  if (typeof origin === 'string') {
    const [x = 0, y = x] = origin.split(/[\s,]+/).filter(Boolean).map(Number);
    return [x, y];
  }
  return [0, 0];
}

function toDomProps(props: SvgProps, prefix: string): SvgProps {
  const { rotation, origin, scale, transform, ...rest } = props;
  const out: SvgProps = { ...rest };

  if (typeof out.id === 'string') out.id = `${prefix}${out.id}`;
  for (const key of URL_PROPS) {
    if (key in out) out[key] = scopeUrl(out[key], prefix);
  }

  const transforms: string[] = [];
  if (typeof transform === 'string') transforms.push(transform);
  const [ox, oy] = parseOrigin(origin);
  const deg = Number(rotation ?? 0);
  if (deg) transforms.push(`rotate(${deg} ${ox} ${oy})`);
  const factor = Number(scale ?? 1);
  if (factor !== 1) {
    transforms.push(`translate(${ox} ${oy}) scale(${factor}) translate(${-ox} ${-oy})`);
  }
  if (transforms.length > 0) out.transform = transforms.join(' ');

  return out;
}

function element(tag: string) {
  return function SvgElement(props: SvgProps) {
    return createElement(tag, toDomProps(props, useContext(IdPrefix)));
  };
}

export default function Svg({ children, ...props }: SvgProps) {
  const prefix = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}-`;
  return (
    <IdPrefix.Provider value={prefix}>
      <svg xmlns="http://www.w3.org/2000/svg" {...props}>
        {children}
      </svg>
    </IdPrefix.Provider>
  );
}

export const Circle = element('circle');
export const ClipPath = element('clipPath');
export const Defs = element('defs');
export const Ellipse = element('ellipse');
export const G = element('g');
export const Line = element('line');
export const LinearGradient = element('linearGradient');
export const Path = element('path');
export const Polygon = element('polygon');
export const Polyline = element('polyline');
export const RadialGradient = element('radialGradient');
export const Rect = element('rect');
export const Stop = element('stop');
export const Text = element('text');
