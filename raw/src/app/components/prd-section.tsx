import { ReactNode } from "react";

interface PRDSectionProps {
  id: string;
  title: string;
  icon: string;
  children: ReactNode;
}

export function PRDSection({ id, title, icon, children }: PRDSectionProps) {
  return (
    <section id={id} className="mb-12 scroll-mt-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="pl-9 text-gray-700 leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}
