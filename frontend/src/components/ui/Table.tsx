import React, { useMemo, useState } from 'react';

/**
 * Reusable Table Component (TypeScript + Tailwind)
 * Features:
 * - Generic typing for rows
 * - Custom column renderers
 * - Sorting (client-side)
 * - Pagination (client-side)
 * - Row selection (checkboxes)
 * - Row actions column
 * - Loading and empty states
 *
 * Usage: see example at the bottom of this file.
 */

export type Align = 'left' | 'center' | 'right';

export type Column<T> = {
  header: string;
  /**
   * Either a key of the row object or a function that returns the cell value
   */
  accessor?: keyof T | ((row: T) => any);
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  sortable?: boolean;
  width?: string; // tailwind width or style e.g. 'w-32' or '150px'
  align?: Align;
};

type SortState<T> = {
  column?: Column<T>;
  direction: 'asc' | 'desc' | null;
};

type Props<T> = {
  data: T[];
  columns: Column<T>[];
  pageSize?: number; // 0 or undefined means no pagination
  rowKey?: keyof T | ((row: T) => string);
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode; // renders action buttons for a row
  loading?: boolean;
  className?: string;
  emptyState?: React.ReactNode;
};

function defaultGetRowKey<T extends Record<string, any>>(row: T, rowKey?: keyof T | ((row: T) => string), index = 0) {
  if (!rowKey) return index.toString();
  if (typeof rowKey === 'function') return rowKey(row);
  return String(row[rowKey]);
}

function compareValues(a: any, b: any) {
  // handle null/undefined
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // numbers
  if (typeof a === 'number' && typeof b === 'number') return a - b;

  // dates
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  // boolean
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a === b) ? 0 : a ? 1 : -1;

  // fallback to string comparison
  return String(a).localeCompare(String(b));
}

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 10,
  rowKey,
  selectable = false,
  onSelectionChange,
  onRowClick,
  actions,
  loading = false,
  className = '',
  emptyState,
}: Props<T>) {
  const [sort, setSort] = useState<SortState<T>>({ direction: null, column: undefined });
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const resolvedData = useMemo(() => {
    if (!sort || !sort.column || !sort.direction) return data;

    const accessor = sort.column.accessor;
    const copy = [...data];

    copy.sort((r1, r2) => {
      const v1 = typeof accessor === 'function' ? accessor(r1) : accessor ? r1[accessor as keyof T] : r1;
      const v2 = typeof accessor === 'function' ? accessor(r2) : accessor ? r2[accessor as keyof T] : r2;
      const cmp = compareValues(v1, v2);
      return sort.direction === 'asc' ? cmp : -cmp;
    });

    return copy;
  }, [data, sort]);

  const totalPages = pageSize && pageSize > 0 ? Math.max(1, Math.ceil(resolvedData.length / pageSize)) : 1;

  const pageData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return resolvedData;
    const start = (page - 1) * pageSize;
    return resolvedData.slice(start, start + pageSize);
  }, [resolvedData, page, pageSize]);

  function toggleSort(column: Column<T>) {
    if (!column.sortable) return;
    setPage(1);
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return { column: undefined, direction: null };
    });
  }

  function toggleSelectAllOnPage() {
    const newSet = new Set(selectedKeys);
    const keysOnPage = pageData.map((row, idx) => defaultGetRowKey(row, rowKey, (page - 1) * pageSize + idx));
    const allSelected = keysOnPage.every((k) => newSet.has(k));
    if (allSelected) {
      keysOnPage.forEach((k) => newSet.delete(k));
    } else {
      keysOnPage.forEach((k) => newSet.add(k));
    }
    setSelectedKeys(newSet);
    onSelectionChange && onSelectionChange(data.filter((r, i) => newSet.has(defaultGetRowKey(r, rowKey, i))));
  }

  function toggleSelectRow(key: string, row: T, index: number) {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedKeys(newSet);
    onSelectionChange && onSelectionChange(data.filter((r, i) => newSet.has(defaultGetRowKey(r, rowKey, i))));
  }

  function handleRowClick(row: T) {
    onRowClick && onRowClick(row);
  }

  return (
    <div className={`w-full overflow-hidden bg-white rounded-lg shadow ${className}`}>
      <div className="w-full overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={
                        pageData.length > 0 &&
                        pageData.every((r, i) =>
                          selectedKeys.has(
                            defaultGetRowKey(r, rowKey, (page - 1) * pageSize + i)
                          )
                        )
                      }
                      
                    onChange={toggleSelectAllOnPage}
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-2 text-sm font-medium  text-gray-700 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <div
                    className={`flex items-center gap-2 select-none ${col.sortable ? 'cursor-pointer' : ''}`}
                    onClick={() => toggleSort(col)}
                  >
                    <span>{col.header}</span>
                    {col.sortable && sort.column === col && sort.direction && (
                      <span className="text-xs text-gray-500">{sort.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}

              {actions && <th className="px-4 py-2 text-sm font-medium text-gray-700 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white  divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-6 py-10 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-6 py-10 text-center text-gray-500">
                  {emptyState ?? 'No data found.'}
                </td>
              </tr>
            ) : (
              pageData.map((row, rIdx) => {
                const globalIndex = (page - 1) * (pageSize || resolvedData.length) + rIdx;
                const key = defaultGetRowKey(row, rowKey, globalIndex);
                return (
                  <tr
                    key={key}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(key)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectRow(key, row, globalIndex);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}

                    {columns.map((col, cIdx) => {
                      const accessor = col.accessor;
                      const rawValue = typeof accessor === 'function' ? accessor(row) : accessor ? row[accessor as keyof T] : undefined;
                      const content = col.render ? col.render(rawValue, row, globalIndex) : String(rawValue ?? '');
                      return (
                        <td key={cIdx} className={`px-4 py-3 text-sm ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                          {content}
                        </td>
                      );
                    })}

                    {actions && <td className="px-4 py-3 text-sm text-right">{actions(row)}</td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize && pageSize > 0 && (
        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{Math.min((page - 1) * pageSize + 1, resolvedData.length)}</span> to{' '}
            <span className="font-medium">{Math.min(page * pageSize, resolvedData.length)}</span> of <span className="font-medium">{resolvedData.length}</span> results
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              First
            </button>
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="text-sm">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => setPage(Math.min(Math.max(1, Number(e.target.value || 1)), totalPages))}
              className="w-16 px-2 py-1 border rounded text-sm"
            />
            <span className="text-sm">of {totalPages}</span>
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Example usage
   ========================= */

// Uncomment the example to test the component in a story or page.
/*
import React from 'react';
import Table from './ReusableTable';

type Person = {
  id: string;
  name: string;
  email: string;
  age: number;
  joined: string; // ISO date
};

const sample: Person[] = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', age: 36, joined: '2022-01-02' },
  { id: '2', name: 'Alan Turing', email: 'alan@example.com', age: 41, joined: '2021-07-12' },
  { id: '3', name: 'Grace Hopper', email: 'grace@example.com', age: 85, joined: '2020-05-19' },
];

export default function Example() {
  return (
    <div className="p-6">
      <Table
        data={sample}
        rowKey="id"
        pageSize={5}
        selectable
        onSelectionChange={(rows) => console.log('selected', rows)}
        columns={[
          { header: 'Name', accessor: 'name', sortable: true },
          { header: 'Email', accessor: 'email' },
          { header: 'Age', accessor: 'age', sortable: true, align: 'right' },
          {
            header: 'Joined',
            accessor: (r: Person) => new Date(r.joined).toLocaleDateString(),
            sortable: true,
            render: (v) => <span className="text-sm text-gray-600">{v}</span>,
          },
        ]}
        actions={(row) => (
          <div className="flex items-center gap-2 justify-end">
            <button className="px-2 py-1 text-sm border rounded">View</button>
            <button className="px-2 py-1 text-sm border rounded">Edit</button>
          </div>
        )}
      />
    </div>
  );
}
*/
