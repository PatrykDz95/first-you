import { h, render } from 'preact';
import css from './card.css?inline';
import { OutcomeCard, type OutcomeCardProps } from './OutcomeCard';
import { createShadowHost } from './shadow';

export interface CardHandle {
  close: () => void;
}

export function openOutcomeCard(props: Omit<OutcomeCardProps, 'onClose' | 'onRate'> & {
  onRate: OutcomeCardProps['onRate'];
}): CardHandle {
  const { container, remove } = createShadowHost('first-you-card', css);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    render(null, container);
    remove();
  };
  render(
    h(OutcomeCard, {
      ...props,
      onRate: (o) => {
        props.onRate(o);
        setTimeout(close, 1500);
      },
      onClose: close,
    }),
    container,
  );
  return { close };
}
