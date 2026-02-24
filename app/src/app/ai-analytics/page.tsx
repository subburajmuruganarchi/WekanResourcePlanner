'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import ChatInterface from '@/components/chat/ChatInterface';
import BotSelector, { BOTS } from '@/components/chat/BotSelector';
import { Sparkles, ShieldAlert, X, Info } from 'lucide-react';

import AvailabilityWidget from '@/components/widgets/AvailabilityWidget';
import ProjectStackWidget from '@/components/widgets/ProjectStackWidget';
import StaffingWidget from '@/components/widgets/StaffingWidget';
import AllocationsWidget from '@/components/widgets/AllocationsWidget';
import AppraisalWidget from '@/components/widgets/AppraisalWidget';
import EmployeeSkillsWidget from '@/components/widgets/EmployeeSkillsWidget';
import MatrixReportWidget from '@/components/widgets/MatrixReportWidget';

const PREVIEW_DATA: Record<string, any> = {
    availability: {
        projectName: "Sample Project",
        projectCode: "PRJ-001",
        candidates: [
            { name: "John Doe", availabilityPercent: 100, position: "Lead Dev", freeDays: 14, activeAllocations: [] }
        ]
    },
    strategy: {
        found: true,
        project: {
            projectName: "NextGen Platform",
            requiredSkills: [{ skillName: "React", minSkillLevel: "Expert", requiredHeadcount: 2, requiredDays: 60 }]
        }
    },
    staffing: {
        projectName: "Mobile App Refresh",
        candidates: [
            { name: "Jane Smith", availabilityPercent: 80, position: "UI Designer", freeDays: 10, activeAllocations: [] }
        ]
    },
    utilization: {
        allocations: {
            employees: [
                { name: "Alice Johnson", totalAllocationPercent: 85, availabilityPercent: 15, allocations: [{ projectName: "Core API", allocationPercentage: 85 }] }
            ]
        },
        matrix: {
            weeks: ["W1", "W2", "W3", "W4"],
            projects: [{ projectName: "Data Pipeline", allocations: [{ week: "W1", percent: 100 }, { week: "W2", percent: 80 }, { week: "W3", percent: 40 }, { week: "W4", percent: 20 }] }]
        }
    },
    performance: {
        found: true,
        employee: { name: "Robert Brown", position: "Senior Arch" },
        okrs: [{ objective: "System Refactor", period: "Q1", okrAchievementPercent: 90, keyResults: [{ title: "Perf", target: 100, achieved: 90, unit: "ms", status: "completed", achievementPercent: 90 }] }],
        scores: { okrScore: 90, reviewScore: 85, compositeScore: 88, formula: "Custom Score" },
        hike: { hikePercent: 10, band: "Exceeds Expectations", bandEmoji: "⭐" }
    },
    skills: {
        found: true,
        employee: { name: "Michael Chen", position: "DevOps" },
        skills: [{ skillName: "Kubernetes", skillLevel: "Expert", skillCategory: "Technical" }],
        totalSkills: 5
    }
};

export default function AIAnalyticsPage() {
    const { user } = useAuth();
    const [activeBotId, setActiveBotId] = useState<string | undefined>();
    const [previewBotId, setPreviewBotId] = useState<string | undefined>();

    if (user?.role !== 'Admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
                <p className="text-gray-600 max-w-md">
                    The AI Analytics module is currently available for Administrative users only.
                    Please contact your system administrator for access.
                </p>
            </div>
        );
    }

    const previewBot = BOTS.find(b => b.id === previewBotId);

    return (
        <div className="flex flex-col min-h-screen pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Sparkles size={24} />
                        </div>
                        AI Analytics Hub
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">
                        Advanced resource intelligence powered by specialized AI agents.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                    </div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Sample Phase</span>
                </div>
            </div>

            {!activeBotId ? (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <BotSelector
                        onSelect={(id) => setActiveBotId(id)}
                        onPreview={(id) => setPreviewBotId(id)}
                        activeBotId={activeBotId}
                    />
                </div>
            ) : (
                <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <ChatInterface
                        activeBotId={activeBotId}
                        onReset={() => setActiveBotId(undefined)}
                    />
                </div>
            )}

            {/* Preview Modal */}
            {previewBot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/40 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 bg-gradient-to-br from-white to-gray-50/50">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                            <div className="flex items-center gap-6">
                                <div style={{ background: `${previewBot.color}15`, color: previewBot.color }} className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner">
                                    <previewBot.icon size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 leading-tight">
                                        {previewBot.name} Sample
                                    </h3>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                                        Visual Output Demonstration
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewBotId(undefined)}
                                className="w-12 h-12 bg-gray-100/50 hover:bg-gray-100 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                            >
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                            <div className="max-w-2xl mx-auto">
                                <div className="mb-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex gap-4">
                                    <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                                    <p className="text-sm font-medium text-blue-700 leading-relaxed">
                                        This is a sample of the visual report generated by the <strong>{previewBot.name}</strong>.
                                        In live mode, these widgets are populated with real-time data from your R360 workspace.
                                    </p>
                                </div>

                                <div className="shadow-2xl rounded-3xl overflow-hidden ring-1 ring-black/5 bg-white">
                                    {previewBot.id === 'pm' && (
                                        <div className="space-y-4">
                                            <StaffingWidget data={PREVIEW_DATA.staffing} />
                                            <AllocationsWidget data={PREVIEW_DATA.utilization.allocations} />
                                            <AvailabilityWidget data={PREVIEW_DATA.availability} />
                                        </div>
                                    )}
                                    {previewBot.id === 'performance' && (
                                        <div className="space-y-4">
                                            <AppraisalWidget data={PREVIEW_DATA.performance} />
                                            <EmployeeSkillsWidget data={PREVIEW_DATA.skills} />
                                        </div>
                                    )}
                                    {previewBot.id === 'reports' && (
                                        <div className="space-y-4">
                                            <MatrixReportWidget data={PREVIEW_DATA.utilization.matrix} />
                                            <AllocationsWidget data={PREVIEW_DATA.utilization.allocations} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-100 flex justify-end gap-3 bg-white/50">
                            <button
                                onClick={() => setPreviewBotId(undefined)}
                                className="px-8 py-4 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest"
                            >
                                Close Preview
                            </button>
                            <button
                                onClick={() => {
                                    setActiveBotId(previewBot.id);
                                    setPreviewBotId(undefined);
                                }}
                                style={{ background: previewBot.color }}
                                className="px-8 py-4 rounded-xl text-sm font-black text-white shadow-xl hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest"
                            >
                                Activate {previewBot.name}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
