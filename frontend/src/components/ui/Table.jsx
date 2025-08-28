export default function Table({ columns, data, keyField = '_id' }) {
  return (
    <div className="overflow-x-auto bg-white border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-3 py-2 border-b">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.length ? (
            data.map((row) => (
              <tr key={row[keyField]} className="odd:bg-white even:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2 border-b">
                    {c.render ? c.render(row[c.key], row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-6 text-center text-gray-500" colSpan={columns.length}>No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}






