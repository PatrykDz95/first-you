import { AUTO_CATEGORIES, type AutoCategory } from '../classifier/types';
import type { MessageKey } from '../../locales';

function Tick() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="var(--pine-ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** Same cards on onboarding and in settings. Styles in src/pages/picker.css. */
export function CategoryPicker(props: {
  t: (key: MessageKey) => string;
  value: readonly AutoCategory[];
  onChange: (next: AutoCategory[]) => void;
  labelledBy: string;
}) {
  const { t, value, onChange } = props;
  const toggle = (c: AutoCategory) =>
    onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <ul class="skills" aria-labelledby={props.labelledBy}>
      {AUTO_CATEGORIES.map((c) => (
        <li key={c}>
          <button type="button" class="skill" aria-pressed={value.includes(c)} onClick={() => toggle(c)}>
            <span class="mark">
              <Tick />
            </span>
            <span class="skill-title">{t(`category.${c}.title`)}</span>
            <span class="skill-desc">{t(`category.${c}.desc`)}</span>
            <span class="skill-example">{t(`category.${c}.example`)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
