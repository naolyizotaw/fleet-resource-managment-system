import { useRef } from 'react'
import useFetch from '../../../hooks/useFetch.js'
import Table from '../../../components/ui/Table.jsx'

function exportCSV(rows, filename) {
  const headers = Object.keys(rows[0] || {})
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

export default function Reports() {
  const ref = useRef(null)
  const { data: fuel } = useFetch('/reports/fuel')
  const { data: maintenance } = useFetch('/reports/maintenance')
  const { data: perdiem } = useFetch('/reports/per-diem')

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Reports</h2>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Fuel Consumption</h3>
          <div className="flex gap-2">
            <button onClick={() => exportCSV(fuel || [], 'fuel.csv')} className="px-3 py-1 text-sm border rounded">Export CSV</button>
            <button onClick={() => window.print()} className="px-3 py-1 text-sm border rounded">Print</button>
          </div>
        </div>
        <Table columns={[{ key: 'vehicle', header: 'Vehicle' }, { key: 'liters', header: 'Liters' }, { key: 'amount', header: 'Amount' }]} data={fuel || []} />
      </section>

      <section className="space-y-2" ref={ref}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Maintenance Cost</h3>
          <div className="flex gap-2">
            <button onClick={() => exportCSV(maintenance || [], 'maintenance.csv')} className="px-3 py-1 text-sm border rounded">Export CSV</button>
            <button onClick={() => window.print()} className="px-3 py-1 text-sm border rounded">Print</button>
          </div>
        </div>
        <Table columns={[{ key: 'vehicle', header: 'Vehicle' }, { key: 'count', header: 'Jobs' }, { key: 'cost', header: 'Cost' }]} data={maintenance || []} />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Per Diem Summary</h3>
          <div className="flex gap-2">
            <button onClick={() => exportCSV(perdiem || [], 'perdiem.csv')} className="px-3 py-1 text-sm border rounded">Export CSV</button>
            <button onClick={() => window.print()} className="px-3 py-1 text-sm border rounded">Print</button>
          </div>
        </div>
        <Table columns={[{ key: 'driver', header: 'Driver' }, { key: 'amount', header: 'Amount' }]} data={perdiem || []} />
      </section>
    </div>
  )
}


