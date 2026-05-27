// Wordmark — serif italic "Medabot" preceded by a small CSS dot anchor.
// The .mb-wordmark class (and its ::before dot pseudo-element) are defined
// in app/index.css as part of the Task 1 token/style foundation.

interface WordmarkProps {
  size?: number;
  className?: string;
}

export function Wordmark({ size = 22, className }: WordmarkProps) {
  return (
    <span
      className={"mb-wordmark " + (className ?? "")}
      style={{ fontSize: size }}
    >
      <span className="mark" />
      Medabot
    </span>
  );
}
