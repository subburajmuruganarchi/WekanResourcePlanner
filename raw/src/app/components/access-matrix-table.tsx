interface AccessMatrixData {
  module: string;
  admin: string;
  pm: string;
  employee: string;
  leadership: string;
}

interface AccessMatrixTableProps {
  data: AccessMatrixData[];
}

export function AccessMatrixTable({ data }: AccessMatrixTableProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Module
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Admin
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              PM
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Employee
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Leadership
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {row.module}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  {row.admin}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {row.pm}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                  {row.employee}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                  {row.leadership}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
