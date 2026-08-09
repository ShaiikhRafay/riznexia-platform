import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

describe('Card', () => {
  it('renders a title, description, and content as plain composable sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Overall Score</CardTitle>
          <CardDescription>Weighted across all five categories</CardDescription>
        </CardHeader>
        <CardContent>
          <p>87 / 100</p>
        </CardContent>
        <CardFooter>
          <span>Computed by the backend</span>
        </CardFooter>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Overall Score' })).toBeInTheDocument();
    expect(screen.getByText('Weighted across all five categories')).toBeInTheDocument();
    expect(screen.getByText('87 / 100')).toBeInTheDocument();
    expect(screen.getByText('Computed by the backend')).toBeInTheDocument();
  });

  it('forwards a className onto the root element', () => {
    const { container } = render(<Card className="custom-card" />);
    expect(container.firstChild).toHaveClass('custom-card');
  });
});
