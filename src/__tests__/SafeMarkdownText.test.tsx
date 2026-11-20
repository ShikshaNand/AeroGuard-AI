import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeMarkdownText } from '../components/SafeMarkdownText';

describe('SafeMarkdownText XSS-free structured renderer', () => {
  it('renders headings, blockquotes, lists, bold text, inline code, and chemistry notation safely', () => {
    const content = [
      '### Daily Plan for $\\text{PM}_{2.5}$',
      '#### Morning Action',
      '> Run your `MERV-13` box for **8 hours**.',
      '- Avoid $\\text{NO}_2$ peaks',
      '---',
      '<img src=x onerror=alert(1)> stays literal text',
    ].join('\n');

    const { container } = render(<SafeMarkdownText content={content} />);

    expect(screen.getByRole('heading', { level: 4, name: /Daily Plan for PM₂\.₅/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 5, name: /Morning Action/i })).toBeInTheDocument();
    expect(screen.getByText('MERV-13').tagName).toBe('CODE');
    expect(screen.getByText('8 hours').tagName).toBe('STRONG');
    expect(screen.getByText(/Avoid NO₂ peaks/i)).toBeInTheDocument();
    // Raw HTML tags must NEVER be injected as DOM elements
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/stays literal text/i)).toBeInTheDocument();
  });
});
