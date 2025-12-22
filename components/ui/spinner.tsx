export function Spinner({ className }: { className?: string }) {
  // If className provided, try to use it for size/color, but maintain spinner structure.
  // The current spinner has hardcoded classes. Let's make it more flexible.
  // Or just wrap it.
  // Actually, standard Spinner usually accepts className to merge.

  if (className) {
      // Basic implementation to support custom class (like w-4 h-4)
      return (
          <div className={`animate-spin rounded-full border-b-2 border-current ${className}`}></div>
      );
  }

  return (
    <div className="flex justify-center items-center h-full w-full p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
    </div>
  );
}
