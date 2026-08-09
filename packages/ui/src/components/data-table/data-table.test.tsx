import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './data-table';
import { DataTableColumnHeader } from './data-table-column-header';

// A fully generic, made-up row shape — deliberately not Lead/DiscoveryJob/
// CrmTask, proving DataTable itself carries no business-specific logic
// (founder's explicit requirement).
interface Widget {
  id: string;
  name: string;
  category: 'alpha' | 'beta';
  count: number;
}

const ROWS: Widget[] = [
  { id: '1', name: 'Zeta', category: 'alpha', count: 3 },
  { id: '2', name: 'Alpha', category: 'beta', count: 9 },
  { id: '3', name: 'Mid', category: 'alpha', count: 5 },
];

const COLUMNS: ColumnDef<Widget, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    meta: { label: 'Name' },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    meta: {
      label: 'Category',
      filterVariant: 'select',
      filterOptions: [
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta' },
      ],
    },
  },
  {
    accessorKey: 'count',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Count" />,
  },
];

describe('DataTable', () => {
  it('renders every row and column cell', () => {
    render(<DataTable columns={COLUMNS} data={ROWS} getRowId={(row) => row.id} />);
    expect(screen.getByText('Zeta')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Mid')).toBeInTheDocument();
  });

  it('shows the empty state when data is empty, not a blank table', () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={[]}
        emptyTitle="No widgets yet"
        emptyDescription="Create one to get started."
      />,
    );
    expect(screen.getByText('No widgets yet')).toBeInTheDocument();
    expect(screen.getByText('Create one to get started.')).toBeInTheDocument();
  });

  it('shows skeleton rows while loading, not the empty state', () => {
    const { container } = render(<DataTable columns={COLUMNS} data={[]} isLoading />);
    expect(screen.queryByText('No results')).not.toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('shows an inline ErrorState instead of rows/empty-state on error', () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        data={[]}
        error={{ code: 'INTERNAL_ERROR', message: 'boom' }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('client-sorts a column when its header is clicked', async () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        getRowId={(row) => row.id}
        sorting={{ mode: 'client' }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /sort by name/i }));

    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(within(rows[0] as HTMLElement).getByText('Alpha')).toBeInTheDocument();
  });

  it('calls the server sorting onChange callback instead of sorting in place, when mode is server', async () => {
    const onChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        getRowId={(row) => row.id}
        sorting={{ mode: 'server', state: [], onChange }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /sort by name/i }));

    expect(onChange).toHaveBeenCalledWith([{ id: 'name', desc: false }]);
    // Row order in the DOM is unchanged — manual mode never sorts `data` itself.
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0] as HTMLElement).getByText('Zeta')).toBeInTheDocument();
  });

  it('filters rows via the global search input, matching any column', async () => {
    render(
      <DataTable columns={COLUMNS} data={ROWS} getRowId={(row) => row.id} enableGlobalFilter />,
    );
    // "Mid" only appears in row 3's `name` — unlike "Alpha", which would
    // also match row 1's `category: 'alpha'` case-insensitively (correct
    // global-search behavior: it matches any column, not just one).
    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), 'Mid');

    expect(screen.getByText('Mid')).toBeInTheDocument();
    expect(screen.queryByText('Zeta')).not.toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('filters rows via a select-variant column filter', async () => {
    render(
      <DataTable columns={COLUMNS} data={ROWS} getRowId={(row) => row.id} enableColumnFilters />,
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /filter by category/i }),
      'beta',
    );

    const dataRows = screen.getAllByRole('row').slice(1); // skip header row
    expect(dataRows).toHaveLength(1);
    expect(within(dataRows[0] as HTMLElement).getByText('Alpha')).toBeInTheDocument();
  });

  it('toggles column visibility from the Columns menu', async () => {
    render(
      <DataTable columns={COLUMNS} data={ROWS} getRowId={(row) => row.id} enableColumnVisibility />,
    );
    expect(screen.getAllByText('Zeta')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Columns' }));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Name' }));

    expect(screen.queryByText('Zeta')).not.toBeInTheDocument();
  });

  it('supports row selection and runs a bulk action against the selected rows', async () => {
    const onAction = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        getRowId={(row) => row.id}
        enableRowSelection
        bulkActions={[{ id: 'archive', label: 'Archive', onAction }]}
      />,
    );

    const rowCheckboxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    await userEvent.click(rowCheckboxes[0] as HTMLElement); // first data row (Zeta)
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onAction).toHaveBeenCalledWith([ROWS[0]]);
  });

  it('"select all" checkbox selects every row on the page', async () => {
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        getRowId={(row) => row.id}
        enableRowSelection
        bulkActions={[{ id: 'archive', label: 'Archive', onAction: vi.fn() }]}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('client pagination shows only pageSize rows and Next/Previous work', async () => {
    const manyRows = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      name: `Row ${i}`,
      category: 'alpha' as const,
      count: i,
    }));
    render(
      <DataTable
        columns={COLUMNS}
        data={manyRows}
        getRowId={(row) => row.id}
        pagination={{ mode: 'client', initialPageSize: 2 }}
      />,
    );

    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.queryByText('Row 2')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Row 2')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('server pagination renders exactly the given data and calls onNextPage/onPreviousPage', async () => {
    const onNextPage = vi.fn();
    const onPreviousPage = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        data={ROWS}
        getRowId={(row) => row.id}
        pagination={{
          mode: 'server',
          pageSize: 3,
          hasNextPage: true,
          hasPreviousPage: false,
          onNextPage,
          onPreviousPage,
        }}
      />,
    );

    expect(screen.getByText('Zeta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNextPage).toHaveBeenCalledTimes(1);
    expect(onPreviousPage).not.toHaveBeenCalled();
  });
});
