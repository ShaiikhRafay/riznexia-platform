import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('Tabs', () => {
  it('shows only the active tab panel and switches on click', async () => {
    render(
      <Tabs defaultValue="desktop">
        <TabsList>
          <TabsTrigger value="desktop">Desktop</TabsTrigger>
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
        </TabsList>
        <TabsContent value="desktop">Desktop panel</TabsContent>
        <TabsContent value="mobile">Mobile panel</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('Desktop panel')).toBeInTheDocument();
    expect(screen.queryByText('Mobile panel')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Mobile' }));

    expect(screen.getByText('Mobile panel')).toBeInTheDocument();
    expect(screen.queryByText('Desktop panel')).not.toBeInTheDocument();
  });

  it('supports a controlled value/onValueChange for URL-persisted tab state', async () => {
    let value = 'desktop';
    const onValueChange = (next: string) => {
      value = next;
    };

    function Controlled() {
      return (
        <Tabs value={value} onValueChange={onValueChange}>
          <TabsList>
            <TabsTrigger value="desktop">Desktop</TabsTrigger>
            <TabsTrigger value="tablet">Tablet</TabsTrigger>
          </TabsList>
          <TabsContent value="desktop">Desktop panel</TabsContent>
          <TabsContent value="tablet">Tablet panel</TabsContent>
        </Tabs>
      );
    }

    render(<Controlled />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tablet' }));
    expect(value).toBe('tablet');
  });
});
