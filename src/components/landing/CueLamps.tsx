import type { CSSProperties } from "react";

const TONES = ["amber", "blue", "green"] as const;
const DELAYS = ["0.9s", "1.7s", "2.5s"];

/** The request lifecycle as three cue lamps. With `sequence` they light one after another on load. */
export function CueLamps({ labels, sequence = false }: { labels: [string, string, string]; sequence?: boolean }) {
  return (
    <ol className="tc-lamps" data-sequence={sequence ? "" : undefined}>
      {labels.map((label, index) => (
        <li
          key={label}
          className="tc-lamp"
          data-tone={TONES[index]}
          style={{ "--delay": DELAYS[index] } as CSSProperties}
        >
          <span className="tc-bulb" aria-hidden="true" />
          <span className="tc-lamp-label">{label}</span>
        </li>
      ))}
    </ol>
  );
}
