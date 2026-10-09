import type { ReactNode } from 'react'
interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
}
export function DataTable<T>({
  columns,
  rows,
  getRowId,
}: {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
}) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowId(row)}>
              {columns.map((column) => (
                <td key={column.id}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
