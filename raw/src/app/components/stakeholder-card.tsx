import { Mail } from "lucide-react";

interface Stakeholder {
  name: string;
  role: string;
  department: string;
  email: string;
  responsibilities: string;
}

interface StakeholderCardProps {
  stakeholder: Stakeholder;
}

export function StakeholderCard({ stakeholder }: StakeholderCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow bg-white">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
          {stakeholder.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{stakeholder.name}</h4>
          <p className="text-sm text-gray-600">{stakeholder.role}</p>
          <p className="text-sm text-gray-500">{stakeholder.department}</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 mb-3">{stakeholder.responsibilities}</p>
      <a
        href={`mailto:${stakeholder.email}`}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <Mail className="w-4 h-4" />
        <span>{stakeholder.email}</span>
      </a>
    </div>
  );
}
