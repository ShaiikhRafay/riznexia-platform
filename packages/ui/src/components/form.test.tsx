import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Button } from './button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';

// The RHF + Zod integration surface every future frontend module's forms
// build on (frontend architecture review §13). This is F1's own proof the
// wiring works end to end — no real business form exists yet, since no
// feature module owning one has landed.
const demoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

function DemoForm({ onSubmit }: { onSubmit: (values: z.infer<typeof demoSchema>) => void }) {
  const form = useForm<z.infer<typeof demoSchema>>({
    resolver: zodResolver(demoSchema),
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

describe('Form primitives (RHF + Zod integration)', () => {
  it('blocks submission and shows the Zod message when the field is invalid', async () => {
    const onSubmit = vi.fn();
    render(<DemoForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits with the parsed values once the field is valid, clearing the error', async () => {
    const onSubmit = vi.fn();
    render(<DemoForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox'), 'Joe');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Joe' }, expect.anything());
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });
});
