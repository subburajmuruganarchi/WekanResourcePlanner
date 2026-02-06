interface Milestone {
  phase: string;
  date: string;
  deliverables: string[];
  status: "completed" | "in-progress" | "upcoming";
}

interface TimelineProps {
  milestones: Milestone[];
}

export function Timeline({ milestones }: TimelineProps) {
  const getStatusColor = (status: Milestone["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "upcoming":
        return "bg-gray-300";
    }
  };

  const getStatusLabel = (status: Milestone["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in-progress":
        return "In Progress";
      case "upcoming":
        return "Upcoming";
    }
  };

  return (
    <div className="space-y-8">
      {milestones.map((milestone, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-4 h-4 rounded-full ${getStatusColor(
                milestone.status
              )}`}
            ></div>
            {index < milestones.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
            )}
          </div>
          <div className="flex-1 pb-8">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-semibold text-gray-900">{milestone.phase}</h4>
              <span className="text-sm text-gray-500">{milestone.date}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  milestone.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : milestone.status === "in-progress"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {getStatusLabel(milestone.status)}
              </span>
            </div>
            <ul className="space-y-1 text-sm text-gray-700">
              {milestone.deliverables.map((deliverable, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{deliverable}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
