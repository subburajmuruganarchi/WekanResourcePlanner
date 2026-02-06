import { useState } from "react";
import { Calendar, Save, Clock } from "lucide-react";

const timeEntries = [
  {
    id: 1,
    week: "Feb 3 - Feb 9, 2026",
    entries: [
      { day: "Monday", date: "Feb 3", hours: 8, project: "PRJ-001", role: "Frontend", code: "PRJ-001" },
      { day: "Tuesday", date: "Feb 4", hours: 8, project: "PRJ-001", role: "Frontend", code: "PRJ-001" },
      { day: "Wednesday", date: "Feb 5", hours: 8, project: "PRJ-001", role: "Frontend", code: "PRJ-001" },
      { day: "Thursday", date: "Feb 6", hours: 6, project: "PRJ-001", role: "Frontend", code: "PRJ-001" },
      { day: "Thursday", date: "Feb 6", hours: 2, project: null, role: null, code: "TRAINING" },
      { day: "Friday", date: "Feb 7", hours: 8, project: "PRJ-001", role: "Frontend", code: "PRJ-001" },
    ],
  },
];

const allocatedProjects = [
  { code: "PRJ-001", name: "E-Commerce Platform Redesign", role: "Frontend" },
  { code: "PRJ-002", name: "Mobile App Development", role: "Frontend" },
];

const leaveTypes = [
  { code: "LV-PL", name: "Planned Leave" },
  { code: "LV-SL", name: "Sick Leave" },
];

const otherCodes = [
  { code: "TRAINING", name: "Training" },
  { code: "MEETING", name: "Internal Meetings" },
];

export function TimeEntry() {
  const [selectedWeek, setSelectedWeek] = useState("Feb 3 - Feb 9, 2026");

  const weekData = timeEntries.find((w) => w.week === selectedWeek);
  const totalHours = weekData?.entries.reduce((sum, e) => sum + e.hours, 0) || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Time Entry</h1>
          <p className="text-sm text-gray-600 mt-1">
            Submit your weekly timesheet for project tracking
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="w-4 h-4" />
          Save Timesheet
        </button>
      </div>

      {/* Week Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Current Week</p>
              <p className="text-sm text-gray-600">{selectedWeek}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-semibold text-gray-900">{totalHours}h</p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              totalHours === 40 ? "bg-green-100" : totalHours > 40 ? "bg-red-100" : "bg-yellow-100"
            }`}>
              <Clock className={`w-8 h-8 ${
                totalHours === 40 ? "text-green-600" : totalHours > 40 ? "text-red-600" : "text-yellow-600"
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Allocated Projects</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            {allocatedProjects.map((project) => (
              <li key={project.code}>
                • {project.code} - {project.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Rules</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• Only allocated projects selectable</li>
            <li>• Total weekly hours capped at 40h</li>
            <li>• Holiday entries auto-populated</li>
          </ul>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Time Code Types</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• Project codes (PRJ-XXX)</li>
            <li>• Leave codes (LV-XX)</li>
            <li>• Other (TRAINING, etc.)</li>
          </ul>
        </div>
      </div>

      {/* Time Entry Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Timesheet</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Time Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {weekData?.entries.map((entry, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.day}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{entry.date}</td>
                  <td className="px-4 py-3">
                    <select 
                      defaultValue={entry.code}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="Projects">
                        {allocatedProjects.map((proj) => (
                          <option key={proj.code} value={proj.code}>
                            {proj.code}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Leave">
                        {leaveTypes.map((leave) => (
                          <option key={leave.code} value={leave.code}>
                            {leave.code}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Other">
                        {otherCodes.map((other) => (
                          <option key={other.code} value={other.code}>
                            {other.code}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {entry.project ? (
                      <span className="text-gray-900">{entry.project}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {entry.role ? (
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {entry.role}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      defaultValue={entry.hours}
                      className="w-20 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Optional"
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}
              {/* Add New Entry Row */}
              <tr className="bg-gray-50">
                <td colSpan={7} className="px-4 py-3">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    + Add Entry
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                  Total Hours:
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{totalHours}h</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
