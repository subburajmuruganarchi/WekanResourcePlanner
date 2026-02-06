import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface StatusIndicatorProps {
  status: "approved" | "in-review" | "draft";
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = {
    approved: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      label: "Approved",
    },
    "in-review": {
      icon: AlertCircle,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      label: "In Review",
    },
    draft: {
      icon: Circle,
      color: "text-gray-600",
      bg: "bg-gray-50",
      border: "border-gray-200",
      label: "Draft",
    },
  };

  const { icon: Icon, color, bg, border, label } = config[status];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${bg} ${border}`}
    >
      <Icon className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}
