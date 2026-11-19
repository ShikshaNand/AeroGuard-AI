import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';

describe('AeroGuard AI Application Integration, Member Controls & AI Coach', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  it('renders semantic HTML5 landmarks, skip-to-content link, and plain-English air status hero', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText(/Skip to main content/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AeroGuard AI/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Delhi NCR/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/☣ HAZARDOUS/i).length).toBeGreaterThan(0);
  });

  it('toggles between Warm Beige Light theme and Warm Dark theme on document.body', () => {
    render(<App />);
    const toggleBtn = screen.getByRole('button', { name: /Switch to Warm Dark theme/i });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.body.classList.contains('dark-theme')).toBe(true);

    fireEvent.click(toggleBtn);
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('opens the city dropdown to switch cities and expands detailed scientific readings on demand', () => {
    render(<App />);

    const cityPickerBtn = screen.getByRole('button', { name: /Change city or search location/i });
    fireEvent.click(cityPickerBtn);

    const milanBtn = screen.getByRole('button', { name: /Milan \(Po Valley\)/i });
    fireEvent.click(milanBtn);

    expect(screen.getAllByText(/Milan \(Po Valley\), Italy/i).length).toBeGreaterThan(0);

    const detailsBtn = screen.getByRole('button', { name: /See Detailed Readings/i });
    fireEvent.click(detailsBtn);
    expect(screen.getByText(/Fine Dust \(PM2\.5 & PM10\)/i)).toBeInTheDocument();
  });

  it('allows changing exact family member values via sidebar steppers and My Family panel', () => {
    render(<App />);

    // Default household size is 4 (2 Adults + 1 Kid + 1 Senior)
    expect(screen.getByRole('button', { name: /My Family \(4\)/i })).toBeInTheDocument();

    // Quick-increase Kids count from sidebar
    const incKidsSidebar = screen.getByRole('button', { name: /Quick increase Kids \/ Infants/i });
    fireEvent.click(incKidsSidebar);
    expect(screen.getByRole('button', { name: /My Family \(5\)/i })).toBeInTheDocument();

    // Open full My Family panel and increase Seniors count
    fireEvent.click(screen.getByRole('button', { name: /My Family \(5\)/i }));
    expect(screen.getByText(/Personalize Advice for Your Family & Home/i)).toBeInTheDocument();

    const incSeniorsDrawer = screen.getByRole('button', { name: /^Increase Seniors \(65\+\)$/i });
    fireEvent.click(incSeniorsDrawer);
    expect(screen.getByRole('button', { name: /My Family \(6\)/i })).toBeInTheDocument();
  });

  it('navigates interactive routine slides and switches between Slide View and All Cards view', () => {
    render(<App />);

    expect(screen.getByText(/Slide 1 of 5/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }));
    expect(screen.getByText(/Slide 2 of 5/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /All \(5\)/i }));
    expect(screen.queryByText(/Slide 2 of 5/i)).not.toBeInTheDocument();
  });

  it('reflects updated member counts live inside the AI Coach and responds to custom typed questions', async () => {
    render(<App />);

    // Increase Kids count to 3 (total household becomes 6)
    const incKids = screen.getByRole('button', { name: /Quick increase Kids \/ Infants/i });
    fireEvent.click(incKids);
    fireEvent.click(incKids);

    // Switch to Ask AeroGuard AI tab
    fireEvent.click(screen.getByRole('tab', { name: /Ask AeroGuard AI/i }));

    // Live context strip and dynamic welcome message both reflect updated 3 Kids immediately
    expect(screen.getAllByText(/3 Kids/i).length).toBeGreaterThanOrEqual(2);

    // Ask a custom typed question about kids & masks
    const promptInput = screen.getByLabelText(/Ask a question about winter smog/i);
    fireEvent.change(promptInput, {
      target: { value: 'How do I protect my kids with masks today?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Family Protection Guide/i)).toBeInTheDocument();
      expect(screen.getByText(/Children \(3\):/i)).toBeInTheDocument();
    });
  });

  it('persists updated family member values and selected city across a full page refresh', () => {
    const { unmount } = render(<App />);

    // Change member counts (increase Kids by 2 -> total becomes 6)
    const incKids = screen.getByRole('button', { name: /Quick increase Kids \/ Infants/i });
    fireEvent.click(incKids);
    fireEvent.click(incKids);
    expect(screen.getByRole('button', { name: /My Family \(6\)/i })).toBeInTheDocument();

    // Switch city to Milan
    fireEvent.click(screen.getByRole('button', { name: /Change city or search location/i }));
    fireEvent.click(screen.getByRole('button', { name: /Milan \(Po Valley\)/i }));
    expect(screen.getAllByText(/Milan \(Po Valley\), Italy/i).length).toBeGreaterThan(0);

    // Simulate browser page refresh (unmount & fresh mount)
    unmount();
    render(<App />);

    // Both saved family size (6) and city (Milan) persist!
    expect(screen.getByRole('button', { name: /My Family \(6\)/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Milan \(Po Valley\), Italy/i).length).toBeGreaterThan(0);
  });
});
