interface TableOfContentsProps {
  sections: Array<{ id: string; title: string; icon: string }>;
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="sticky top-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
        Contents
      </h3>
      <ul className="space-y-2">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => scrollToSection(section.id)}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 w-full text-left px-2 py-1.5 rounded transition-colors"
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
