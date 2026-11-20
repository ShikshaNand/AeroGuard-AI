import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlideDeckContainer } from '../components/SlideDeckContainer';

interface SampleItem {
  id: string;
  name: string;
}

const SAMPLE_ITEMS: SampleItem[] = [
  { id: 's1', name: 'First Slide' },
  { id: 's2', name: 'Second Slide' },
  { id: 's3', name: 'Third Slide' },
];

describe('SlideDeckContainer component & keyboard accessibility', () => {
  it('renders empty state cleanly when no items match', () => {
    render(
      <SlideDeckContainer
        title="Empty Deck"
        items={[]}
        getKey={(i: SampleItem) => i.id}
        getLabel={(i: SampleItem) => i.name}
        renderSlide={(i: SampleItem) => <div>{i.name}</div>}
      />
    );
    expect(screen.getByText(/No items match this filter/i)).toBeInTheDocument();
  });

  it('navigates slides via buttons, dots, and keyboard arrows while updating ARIA progress', () => {
    render(
      <SlideDeckContainer
        title="Demo Deck"
        items={SAMPLE_ITEMS}
        getKey={(i) => i.id}
        getLabel={(i) => i.name}
        renderSlide={(i) => <div>{i.name}</div>}
      />
    );

    const progress = screen.getByRole('progressbar', { name: /Demo Deck progress/i });
    expect(progress).toHaveAttribute('aria-valuenow', '1');
    expect(progress).toHaveAttribute('aria-valuemax', '3');
    expect(screen.getByText('First Slide')).toBeInTheDocument();

    // Next button advances slide
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }));
    expect(screen.getByText('Second Slide')).toBeInTheDocument();
    expect(progress).toHaveAttribute('aria-valuenow', '2');

    // Keyboard ArrowRight advances to slide 3
    fireEvent.keyDown(screen.getByRole('region', { name: 'Demo Deck' }), { key: 'ArrowRight' });
    expect(screen.getByText('Third Slide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to slide 3: Third Slide/i })).toHaveAttribute(
      'aria-current',
      'step'
    );

    // Previous wraps back cleanly from slide 1 to slide 3
    fireEvent.click(screen.getByRole('button', { name: /Go to slide 1: First Slide/i }));
    fireEvent.click(screen.getByRole('button', { name: /Previous slide/i }));
    expect(screen.getByText('Third Slide')).toBeInTheDocument();

    // Switch to All view renders all items simultaneously
    fireEvent.click(screen.getByRole('button', { name: /All \(3\)/i }));
    expect(screen.getByText('First Slide')).toBeInTheDocument();
    expect(screen.getByText('Second Slide')).toBeInTheDocument();
    expect(screen.getByText('Third Slide')).toBeInTheDocument();
  });
});
