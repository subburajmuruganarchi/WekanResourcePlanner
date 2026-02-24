'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvailabilityWidget from '../widgets/AvailabilityWidget';
import ProjectStackWidget from '../widgets/ProjectStackWidget';
import StaffingWidget from '../widgets/StaffingWidget';
import AllocationsWidget from '../widgets/AllocationsWidget';
import AppraisalWidget from '../widgets/AppraisalWidget';
import EmployeeSkillsWidget from '../widgets/EmployeeSkillsWidget';
import MatrixReportWidget from '../widgets/MatrixReportWidget';
import { BOTS } from './BotSelector';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    widget?: {
        type: 'availability' | 'stack' | 'staffing' | 'allocations' | 'appraisal' | 'skills' | 'matrix';
        data: any;
    };
    timestamp: Date;
}

const MOCK_PROJECT_DATA = {
    projectName: "AWL",
    projectCode: "PRJ-0001",
    projectLogo: "https://files.catbox.moe/dktgbu.png",
    stack: "Java, MongoDB, Docker",
    dateStart: "2026-02-10",
    dateEnd: "2026-02-20",
    candidates: [
        {
            employeeId: "e1",
            name: "Abhishek Pandit",
            department: "Engineering",
            position: "Full Stack Engineer",
            profileImage: "https://files.catbox.moe/w3gcou.png",
            availabilityPercent: 100,
            freeDays: 11,
            activeAllocations: []
        },
        {
            employeeId: "e2",
            name: "Geetha B",
            department: "Platform",
            position: "Backend Engineer",
            profileImage: "https://files.catbox.moe/1606wo.jpeg",
            availabilityPercent: 60,
            freeDays: 7,
            activeAllocations: [{ projectName: "ProjectX", allocationPercentage: 40 }]
        }
    ]
};

const MOCK_STACK_DATA = {
    found: true,
    project: {
        projectId: "p1",
        projectName: "AWL",
        projectCode: "PRJ-0001",
        projectLogo: "https://files.catbox.moe/dktgbu.png",
        requiredSkills: [
            { skillName: "Java", minSkillLevel: "Expert", requiredHeadcount: 2, requiredDays: 60 },
            { skillName: "MongoDB", minSkillLevel: "Intermediate", requiredHeadcount: 1, requiredDays: 40 },
            { skillName: "Docker", minSkillLevel: "Beginner", requiredHeadcount: 1, requiredDays: 30 }
        ]
    }
};

const MOCK_ALLOCATIONS_DATA = {
    dateStart: "2026-02-01",
    dateEnd: "2026-03-01",
    employees: [
        {
            employeeId: "e1",
            name: "Abhishek Pandit",
            department: "Engineering",
            position: "Full Stack Engineer",
            totalAllocationPercent: 90,
            availabilityPercent: 10,
            allocations: [
                { projectId: "p1", projectName: "AWL", allocationPercentage: 50, allocationStartDate: "2026-02-01", allocationEndDate: "2026-03-01" },
                { projectId: "p2", projectName: "Internal Tools", allocationPercentage: 40, allocationStartDate: "2026-02-01", allocationEndDate: "2026-02-15" }
            ]
        }
    ]
};

const MOCK_APPRAISAL_DATA = {
    found: true,
    employee: {
        employeeId: "e1",
        name: "Abhishek Pandit",
        department: "Engineering",
        position: "Full Stack Engineer",
    },
    okrs: [
        {
            okrId: "o1",
            objective: "Deliver AWL Platform Core",
            period: "Q1 2026",
            okrAchievementPercent: 95,
            keyResults: [
                { title: "API Performance Optimization", target: 100, achieved: 95, unit: "ms", status: "completed", achievementPercent: 95 }
            ]
        }
    ],
    scores: {
        okrScore: 92,
        reviewScore: 88,
        compositeScore: 90,
        formula: "(OKR Score * 0.6) + (Peer Review * 0.4)"
    },
    hike: {
        hikePercent: 12,
        band: "Exceeds Expectations",
        bandEmoji: "⭐"
    }
};

const MOCK_SKILLS_DATA = {
    found: true,
    employee: {
        employeeId: "e1",
        name: "Abhishek Pandit",
        department: "Engineering",
        position: "Full Stack Engineer",
    },
    skills: [
        { skillName: "React", skillLevel: "Expert", skillCategory: "Technical" },
        { skillName: "Node.js", skillLevel: "Expert", skillCategory: "Technical" },
        { skillName: "MongoDB", skillLevel: "Intermediate", skillCategory: "Technical" },
        { skillName: "Leadership", skillLevel: "Beginner", skillCategory: "Soft Skills" }
    ],
    totalSkills: 4
};

const MOCK_MATRIX_DATA = {
    weeks: ["Feb 24", "Mar 03", "Mar 10", "Mar 17"],
    projects: [
        {
            projectId: "p1",
            projectName: "AWL Platform",
            allocations: [
                { week: "Feb 24", percent: 80 },
                { week: "Mar 03", percent: 85 },
                { week: "Mar 10", percent: 90 },
                { week: "Mar 17", percent: 60 }
            ]
        },
        {
            projectId: "p2",
            projectName: "Wekan Internal",
            allocations: [
                { week: "Feb 24", percent: 20 },
                { week: "Mar 03", percent: 15 },
                { week: "Mar 10", percent: 10 },
                { week: "Mar 17", percent: 40 }
            ]
        }
    ],
    totalResourceCount: 50
};

interface ChatInterfaceProps {
    activeBotId?: string;
    onReset?: () => void;
}

export default function ChatInterface({ activeBotId, onReset }: ChatInterfaceProps) {
    const activeBot = BOTS.find(b => b.id === activeBotId);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: activeBot
                ? `Hello! I'm your ${activeBot.name}. ${activeBot.description} Ask me something like: "${activeBot.sampleQuery}"`
                : "Hello! I'm your R360 AI Analyst. I can help you with staffing, project requirements, and utilization reports. Select a specialized bot above to get started.",
            timestamp: new Date()
        }
    ]);

    useEffect(() => {
        if (activeBot) {
            setMessages([
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `Hello! I'm your ${activeBot.name}. ${activeBot.description} Ask me something like: "${activeBot.sampleQuery}"`,
                    timestamp: new Date()
                }
            ]);
        }
    }, [activeBotId]);

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleAllocate = (candidate: any) => {
        setIsTyping(true);
        setTimeout(() => {
            const successMsg: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ **Allocation Successful!** I have successfully allocated **${candidate.name}** to the AWL project. 

The resource management system has been updated, and a notification has been sent to the department head. You can now track this in the utilization heatmap.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, successMsg]);
            setIsTyping(false);
        }, 1200);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI thinking
        setTimeout(() => {
            let response: Partial<Message> = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                timestamp: new Date(),
                content: "I've analyzed your request."
            };

            const query = input.toLowerCase();
            const botType = activeBotId;

            if (query.includes('availability') || (query.includes('abhishek') && query.includes('free'))) {
                response.content = "I've checked the real-time availability. Abhishek Pandit is currently 100% available and ready for assignment.";
                response.widget = { type: 'availability', data: { found: true, ...MOCK_PROJECT_DATA } };
            } else if (query.includes('stack') || query.includes('requirement') || query.includes('need')) {
                response.content = "I've identified the technical requirements and project stack for AWL.";
                response.widget = { type: 'stack', data: MOCK_STACK_DATA };
            } else if (query.includes('staffing') || query.includes('recommend') || query.includes('best fit') || (botType === 'pm' && query.includes('awl'))) {
                response.content = "I've completed a staffing analysis for project AWL. Abhishek Pandit is the top-ranked candidate. You can allocate him directly below.";
                response.widget = { type: 'staffing', data: MOCK_PROJECT_DATA };
            } else if (query.includes('allocation') || query.includes('utilization') || query.includes('assigned')) {
                response.content = "Here is the current allocation breakdown for the engineering team.";
                response.widget = { type: 'allocations', data: MOCK_ALLOCATIONS_DATA };
            } else if (query.includes('appraisal') || query.includes('performance') || query.includes('review') || query.includes('hike') || (botType === 'performance' && query.includes('abhishek'))) {
                response.content = "I've retrieved the performance summary, OKR achievement, and hike recommendations.";
                response.widget = { type: 'appraisal', data: MOCK_APPRAISAL_DATA };
            } else if (query.includes('skill') || query.includes('expert') || query.includes('directory')) {
                response.content = "I've found the skill profile and expertise directory for the requested resource.";
                response.widget = { type: 'skills', data: MOCK_SKILLS_DATA };
            } else if (query.includes('matrix') || query.includes('capacity') || query.includes('heatmap') || botType === 'reports') {
                response.content = "Here is the strategic resource capacity matrix and utilization heatmap.";
                response.widget = { type: 'matrix', data: MOCK_MATRIX_DATA };
            } else {
                response.content = "I'm analyzing your request across the available R360 data dimensions. Could you please specify if you're looking for staffing, performance reviews, or capacity reports?";
            }

            setMessages(prev => [...prev, response as Message]);
            setIsTyping(false);
        }, 1500);
    };

    const hints = activeBotId === 'pm'
        ? ["Staffing for AWL", "Who is free?", "Team allocations"]
        : activeBotId === 'performance'
            ? ["Performance of Abhishek", "Skill directory", "Promotion review"]
            : ["Capacity Matrix", "Strategic Heatmap", "Utilization Report"];

    return (
        <div className="flex flex-col h-[600px] bg-gray-50 rounded-3xl border border-gray-200 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        {activeBot ? <activeBot.icon size={24} /> : <Sparkles size={24} />}
                    </div>
                    <div>
                        <h2 className="font-extrabold text-gray-900 leading-none">
                            {activeBot ? activeBot.name : 'R360 AI Assistant'}
                        </h2>
                        <span className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-1 inline-block">
                            {activeBot ? activeBot.category : 'General Analyst'} • Online
                        </span>
                    </div>
                </div>
                {activeBot && (
                    <button
                        onClick={onReset}
                        className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                        Switch Bot
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex gap-4 max-w-[90%]",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm",
                            msg.role === 'user' ? "bg-gray-200" : "bg-blue-50 text-blue-600"
                        )}>
                            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                        </div>
                        <div className="space-y-4 flex-1">
                            <div className={cn(
                                "p-4 rounded-3xl text-sm leading-relaxed font-medium whitespace-pre-wrap",
                                msg.role === 'user'
                                    ? "bg-blue-600 text-white rounded-tr-none"
                                    : "bg-white text-gray-800 border border-gray-100 shadow-xl rounded-tl-none"
                            )}>
                                {msg.content}
                            </div>

                            {msg.widget && (
                                <div className="mt-4 w-full transform transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-8">
                                    {msg.widget.type === 'availability' && <AvailabilityWidget data={msg.widget.data} onAllocate={handleAllocate} />}
                                    {msg.widget.type === 'stack' && <ProjectStackWidget data={msg.widget.data} />}
                                    {msg.widget.type === 'staffing' && <StaffingWidget data={msg.widget.data} onAllocate={handleAllocate} />}
                                    {msg.widget.type === 'allocations' && <AllocationsWidget data={msg.widget.data} />}
                                    {msg.widget.type === 'appraisal' && <AppraisalWidget data={msg.widget.data} />}
                                    {msg.widget.type === 'skills' && <EmployeeSkillsWidget data={msg.widget.data} />}
                                    {msg.widget.type === 'matrix' && <MatrixReportWidget data={msg.widget.data} />}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
                            <Bot size={20} />
                        </div>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-100">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={activeBot ? `Ask something to ${activeBot.name}...` : "Select a bot above to start..."}
                        className="w-full pl-6 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="absolute right-2.5 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {hints.map((hint) => (
                        <button
                            key={hint}
                            onClick={() => setInput(hint)}
                            className="text-[10px] uppercase tracking-widest font-extrabold text-blue-500/60 bg-blue-50/50 border border-blue-100/50 px-4 py-2 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-all whitespace-nowrap"
                        >
                            {hint}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
