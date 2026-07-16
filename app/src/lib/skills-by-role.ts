import type { EmployeeRole } from '@/types/api';

/** Skill catalog categories that typically apply to a job role. */
const CATEGORIES_BY_ROLE: Partial<Record<EmployeeRole, string[]>> = {
    Architect: ['Backend', 'Frontend', 'DevOps', 'Other', 'Technical'],
    'Mobile Architect': ['Mobile', 'Frontend', 'Other', 'Technical'],
    'Associate Architect': ['Backend', 'Frontend', 'DevOps', 'Other', 'Technical'],
    'SDE III (Full Stack)': ['Frontend', 'Backend', 'Other', 'Technical'],
    'SDE (Full Stack)': ['Frontend', 'Backend', 'Other', 'Technical'],
    'SDE II (Full Stack)': ['Frontend', 'Backend', 'Other', 'Technical'],
    'SDE (Backend)': ['Backend', 'Other', 'Technical'],
    'SDE II (Backend)': ['Backend', 'Other', 'Technical'],
    'SDE II (Frontend)': ['Frontend', 'Other', 'Technical'],
    'SDE III (Mobile)': ['Mobile', 'Frontend', 'Other', 'Technical'],
    'SDE II (Mobile)': ['Mobile', 'Frontend', 'Other', 'Technical'],
    DBA: ['Backend', 'Data Science', 'Other', 'Technical'],
    'QA Engineer': ['Other', 'Technical', 'Frontend', 'Backend'],
    'QA Lead': ['Other', 'Technical', 'Frontend', 'Backend', 'Project Management'],
    'UX Designer': ['Design', 'Other'],
    'UI Designer': ['Design', 'Frontend', 'Other'],
    'DevOps Engineer': ['DevOps', 'Backend', 'Other', 'Technical'],
    'Site Reliability Engineer': ['DevOps', 'Backend', 'Other', 'Technical'],
    'Data Analyst': ['Data Science', 'Other', 'Technical'],
    'Data Engineer': ['Data Science', 'Backend', 'Other', 'Technical'],
    'Product Manager': ['Project Management', 'Other'],
    'Product Owner': ['Project Management', 'Other'],
    'PMO Head': ['Project Management', 'Other'],
    'Program Manager': ['Project Management', 'Other'],
    'Senior Project Manager': ['Project Management', 'Other'],
    'Project Manager': ['Project Management', 'Other'],
    'Associate Project Manager': ['Project Management', 'Other'],
    'Project Coordinator': ['Project Management', 'Other'],
    'Delivery Head': ['Project Management', 'Other'],
    'Program Delivery Manager': ['Project Management', 'Other'],
    'Senior Delivery Manager': ['Project Management', 'Other'],
    'Delivery Manager': ['Project Management', 'Other'],
    'Associate Delivery Manager': ['Project Management', 'Other'],
    'Delivery Coordinator': ['Project Management', 'Other'],
    'HR Manager': ['Other'],
    'HR Executive': ['Other'],
    'Sales Executive': ['Other'],
    'Account Manager': ['Other'],
    'Marketing Manager': ['Other'],
    'Marketing Specialist': ['Other'],
    'Customer Support Specialist': ['Other'],
    'Support Lead': ['Other'],
    'Finance Analyst': ['Other', 'Data Science'],
    Accountant: ['Other'],
    'Operations Manager': ['Other', 'Project Management'],
    'Operations Coordinator': ['Other'],
    'Office Administrator': ['Other'],
    'Executive Assistant': ['Other'],
};

/** Common skill name keywords used when category metadata is sparse (e.g. imported "General"). */
const KEYWORDS_BY_ROLE: Partial<Record<EmployeeRole, string[]>> = {
    Architect: ['java', 'spring', 'node', 'aws', 'azure', 'system', 'architecture', 'micro'],
    'Mobile Architect': ['android', 'ios', 'flutter', 'react native', 'kotlin', 'swift', 'mobile'],
    'Associate Architect': ['java', 'spring', 'node', 'aws', 'architecture'],
    'SDE III (Full Stack)': ['react', 'node', 'typescript', 'javascript', 'java', 'spring', 'mongo', 'sql'],
    'SDE (Full Stack)': ['react', 'node', 'typescript', 'javascript', 'java', 'mongo', 'sql'],
    'SDE II (Full Stack)': ['react', 'node', 'typescript', 'javascript', 'java', 'mongo', 'sql'],
    'SDE (Backend)': ['java', 'spring', 'node', 'nest', 'python', 'mongo', 'sql', 'aws', 'api'],
    'SDE II (Backend)': ['java', 'spring', 'node', 'nest', 'python', 'mongo', 'sql', 'aws', 'api'],
    'SDE II (Frontend)': ['react', 'angular', 'vue', 'typescript', 'javascript', 'css', 'html', 'next'],
    'SDE III (Mobile)': ['android', 'ios', 'flutter', 'react native', 'kotlin', 'swift'],
    'SDE II (Mobile)': ['android', 'ios', 'flutter', 'react native', 'kotlin', 'swift'],
    DBA: ['sql', 'mongo', 'postgres', 'mysql', 'oracle', 'database', 'dba'],
    'QA Engineer': ['selenium', 'cypress', 'jest', 'testing', 'qa', 'automation', 'playwright'],
    'QA Lead': ['selenium', 'cypress', 'jest', 'testing', 'qa', 'automation', 'playwright'],
    'UX Designer': ['figma', 'sketch', 'ux', 'wireframe', 'prototype'],
    'UI Designer': ['figma', 'sketch', 'ui', 'design', 'css'],
    'DevOps Engineer': ['docker', 'kubernetes', 'aws', 'azure', 'ci', 'jenkins', 'terraform', 'devops'],
    'Site Reliability Engineer': ['docker', 'kubernetes', 'aws', 'monitoring', 'sre', 'terraform'],
    'Data Analyst': ['sql', 'python', 'tableau', 'power bi', 'excel', 'analytics'],
    'Data Engineer': ['python', 'spark', 'airflow', 'sql', 'etl', 'aws', 'data'],
    'Product Manager': ['jira', 'agile', 'product', 'roadmap'],
    'Product Owner': ['jira', 'agile', 'product', 'scrum'],
    'PMO Head': ['jira', 'pmo', 'governance', 'agile'],
    'Program Manager': ['jira', 'program', 'agile', 'delivery'],
    'Senior Project Manager': ['jira', 'pmp', 'agile', 'scrum', 'project'],
    'Project Manager': ['jira', 'pmp', 'agile', 'scrum', 'project'],
    'Associate Project Manager': ['jira', 'agile', 'scrum', 'project'],
    'Project Coordinator': ['jira', 'excel', 'coordination'],
    'Delivery Head': ['delivery', 'agile', 'governance'],
    'Program Delivery Manager': ['delivery', 'agile', 'program'],
    'Senior Delivery Manager': ['delivery', 'agile', 'portfolio'],
    'Delivery Manager': ['delivery', 'agile', 'portfolio'],
    'Associate Delivery Manager': ['delivery', 'agile'],
    'Delivery Coordinator': ['delivery', 'coordination', 'jira'],
};

export interface SkillLike {
    id: string;
    name: string;
    category: string;
    isActive?: boolean;
}

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Skills relevant to a job role (designation).
 * Prefer category + name keyword matches; if none match the catalog, return all active skills
 * so the dropdown is never empty when skills exist.
 */
export function skillsForRole(
    skills: SkillLike[] | undefined | null,
    designation: EmployeeRole | '' | undefined
): SkillLike[] {
    const active = (skills ?? []).filter((s) => s.isActive !== false && Boolean(s.id));
    if (!designation) return [];

    const categories = (CATEGORIES_BY_ROLE[designation] ?? ['Other']).map(normalize);
    const keywords = KEYWORDS_BY_ROLE[designation] ?? [];

    const matched = active.filter((skill) => {
        const category = normalize(skill.category || '');
        const name = normalize(skill.name || '');
        if (categories.includes(category)) return true;
        return keywords.some((kw) => name.includes(kw));
    });

    if (matched.length > 0) {
        return matched.sort((a, b) => a.name.localeCompare(b.name));
    }

    return active.sort((a, b) => a.name.localeCompare(b.name));
}
