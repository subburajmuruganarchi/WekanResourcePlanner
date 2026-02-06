import { CheckCircle2 } from "lucide-react";

interface Objective {
  title: string;
  description: string;
}

interface ObjectivesListProps {
  objectives: Objective[];
}

export function ObjectivesList({ objectives }: ObjectivesListProps) {
  return (
    <div className="space-y-4">
      {objectives.map((objective, index) => (
        <div
          key={index}
          className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg"
        >
          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              {objective.title}
            </h4>
            <p className="text-gray-700">{objective.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
