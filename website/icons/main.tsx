import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PillShapeIcon,
  SHAPE_GRID_COLOR,
  SHAPE_PREVIEW_COLOR,
  formatShapeLabel,
} from '@/src/core/components/PillShapeIcon';
import {
  FORM_SHAPES,
  MEDICATION_TYPES,
  PILL_COLORS,
  PILL_SHAPE_CATEGORIES,
  defaultShapeForMedicationType,
  supportsDualColor,
} from '@/src/core/types/domain';

type Tile = { shape: string; caption: string; note?: string };

const COLORS = [SHAPE_PREVIEW_COLOR, SHAPE_GRID_COLOR, ...PILL_COLORS];
const SIZES = [32, 48, 72, 112];

const pickerShapes = new Set<string>(PILL_SHAPE_CATEGORIES.flatMap((c) => c.shapes));

const SECTIONS: { title: string; hint: string; tiles: Tile[] }[] = [
  {
    title: 'Medication types',
    hint: 'Default icon chosen when the user picks each type.',
    tiles: MEDICATION_TYPES.map((type) => ({
      shape: defaultShapeForMedicationType(type.value),
      caption: type.label,
      note: defaultShapeForMedicationType(type.value),
    })),
  },
  ...PILL_SHAPE_CATEGORIES.map((category) => ({
    title: `Picker: ${category.title}`,
    hint: 'Shown on the choose-shape screen.',
    tiles: category.shapes.map((shape) => ({ shape, caption: formatShapeLabel(shape), note: shape })),
  })),
  {
    title: 'Form shapes not in the picker',
    hint: 'Renderable but not selectable.',
    tiles: FORM_SHAPES.filter((shape) => !pickerShapes.has(shape)).map((shape) => ({
      shape,
      caption: formatShapeLabel(shape),
      note: shape,
    })),
  },
];

// Optional deep-link params, e.g. /icons.html?q=spray&size=112&color=%232196F3
const params = new URLSearchParams(window.location.search);

function Gallery() {
  const [color, setColor] = useState<string>(params.get('color') ?? SHAPE_PREVIEW_COLOR);
  const [color2, setColor2] = useState<string>(PILL_COLORS[5]);
  const [size, setSize] = useState(Number(params.get('size')) || 72);
  const [dark, setDark] = useState(params.has('dark'));
  const [query, setQuery] = useState(params.get('q') ?? '');

  const q = query.trim().toLowerCase();

  return (
    <div className={dark ? 'page dark' : 'page'}>
      <header className="toolbar">
        <h1>Health OS icons</h1>
        <input
          type="search"
          placeholder="Filter (e.g. spray)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="group">
          <span>Colour</span>
          {COLORS.map((c) => (
            <button
              key={c}
              className={c === color ? 'swatch active' : 'swatch'}
              style={{ background: c }}
              title={c}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="group">
          <span>2nd colour</span>
          {PILL_COLORS.map((c) => (
            <button
              key={c}
              className={c === color2 ? 'swatch active' : 'swatch'}
              style={{ background: c }}
              title={c}
              onClick={() => setColor2(c)}
            />
          ))}
        </div>
        <div className="group">
          <span>Size</span>
          {SIZES.map((s) => (
            <button key={s} className={s === size ? 'chip active' : 'chip'} onClick={() => setSize(s)}>
              {s}
            </button>
          ))}
        </div>
        <label className="group">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /> Dark background
        </label>
      </header>

      {SECTIONS.map((section) => {
        const tiles = section.tiles.filter(
          (tile) => !q || tile.caption.toLowerCase().includes(q) || tile.shape.includes(q),
        );
        if (tiles.length === 0) return null;
        return (
          <section key={section.title}>
            <h2>
              {section.title} <small>{section.hint}</small>
            </h2>
            <div className="grid">
              {tiles.map((tile) => (
                <figure key={`${section.title}-${tile.caption}-${tile.shape}`} className="tile">
                  <PillShapeIcon
                    shape={tile.shape}
                    color={color}
                    color2={supportsDualColor(tile.shape) ? color2 : undefined}
                    size={size}
                  />
                  <figcaption>
                    {tile.caption}
                    {tile.note && tile.note !== tile.caption ? <code>{tile.note}</code> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
