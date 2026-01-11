import React from 'react';

// Regex to find URLs
// Detects http/https URLs.
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface LinkifyProps {
  children: React.ReactNode;
}

export const Linkify: React.FC<LinkifyProps> = ({ children }) => {
  if (typeof children !== 'string') {
    return <>{children}</>;
  }

  const parts = children.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
};
