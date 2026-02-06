interface EntityField {
  field: string;
  type: string;
  notes: string;
}

interface EntityTableProps {
  title: string;
  fields: EntityField[];
}

export function EntityTable({ title, fields }: EntityTableProps) {
  return (
    <div>
      <h5 className="font-semibold text-gray-900 mb-3">{title}</h5>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Field
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Type
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fields.map((field, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">
                  {field.field}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {field.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {field.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
