interface Feature {
  name: string;
  priority: "Must Have" | "Should Have" | "Nice to Have";
  description: string;
}

interface FeatureTableProps {
  features: Feature[];
}

export function FeatureTable({ features }: FeatureTableProps) {
  const getPriorityColor = (priority: Feature["priority"]) => {
    switch (priority) {
      case "Must Have":
        return "bg-red-100 text-red-700 border-red-200";
      case "Should Have":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Nice to Have":
        return "bg-green-100 text-green-700 border-green-200";
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-1/3">
              Feature
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">
              Priority
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {features.map((feature, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {feature.name}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getPriorityColor(
                    feature.priority
                  )}`}
                >
                  {feature.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {feature.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
