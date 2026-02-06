interface UserStory {
  id: string;
  role: string;
  action: string;
  benefit: string;
}

interface UserStoriesProps {
  stories: UserStory[];
}

export function UserStories({ stories }: UserStoriesProps) {
  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <div
          key={story.id}
          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
              {story.id}
            </div>
            <div className="flex-1">
              <p className="text-gray-700">
                As a <span className="font-semibold text-gray-900">{story.role}</span>, I want to{" "}
                <span className="font-semibold text-gray-900">{story.action}</span> so that{" "}
                <span className="font-semibold text-gray-900">{story.benefit}</span>.
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
