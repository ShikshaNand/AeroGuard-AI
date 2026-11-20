import React from 'react';

interface SafeMarkdownTextProps {
  content: string;
}

/**
 * Renders inline bold (**text**) and inline code (`code`) spans safely as native React nodes
 * without dangerouslySetInnerHTML. Also formats common atmospheric chemistry notation.
 */
function renderInlineSpans(text: string): React.ReactNode[] {
  const cleanedMath = text
    .replace(/\$\\text\{PM\}_\{2\.5\}\$/g, 'PM₂.₅')
    .replace(/\$\\text\{NO\}_x\$/g, 'NOₓ')
    .replace(/\$\\text\{NO\}_2\$/g, 'NO₂')
    .replace(/\$\\text\{CO\}_2\\text\{e\}\$/g, 'CO₂e')
    .replace(/\$\\text\{CO\}_2\$/g, 'CO₂');

  const tokens = cleanedMath.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-[#231D17]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="rounded bg-[#EFE7D9] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#1B4D35]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function renderSafeLine(line: string, idx: number): React.ReactNode {
  const trimmed = line.trim();
  if (!trimmed) {
    return <div key={idx} className="h-2" />;
  }

  if (trimmed === '---') {
    return <hr key={idx} className="my-2 border-[#DFD2BE]" />;
  }

  if (trimmed.startsWith('### ')) {
    return (
      <h4 key={idx} className="mt-2 text-sm font-extrabold text-[#1B4D35]">
        {renderInlineSpans(trimmed.slice(4))}
      </h4>
    );
  }

  if (trimmed.startsWith('#### ')) {
    return (
      <h5 key={idx} className="mt-2 text-xs font-extrabold uppercase tracking-wider text-[#7A4B00]">
        {renderInlineSpans(trimmed.slice(5))}
      </h5>
    );
  }

  if (trimmed.startsWith('> ')) {
    return (
      <blockquote
        key={idx}
        className="beige-sage my-2 rounded-xl border-l-4 border-l-[#2D6A4F] px-3.5 py-2.5 text-xs text-[#1D3B2B]"
      >
        {renderInlineSpans(trimmed.slice(2))}
      </blockquote>
    );
  }

  if (trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
    return (
      <div key={idx} className="ml-2 flex items-start gap-2 text-xs text-[#3B3228] leading-relaxed">
        <span className="text-[#2D6A4F] font-extrabold" aria-hidden="true">
          •
        </span>
        <span>{renderInlineSpans(trimmed.replace(/^-\s*/, ''))}</span>
      </div>
    );
  }

  return (
    <p key={idx} className="text-xs text-[#3B3228] leading-relaxed">
      {renderInlineSpans(trimmed)}
    </p>
  );
}

/**
 * Safe, XSS-free structured markdown renderer using native React nodes (zero dangerouslySetInnerHTML).
 */
export const SafeMarkdownText: React.FC<SafeMarkdownTextProps> = React.memo(({ content }) => (
  <div className="space-y-1">
    {content.split('\n').map((line, i) => renderSafeLine(line, i))}
  </div>
));
SafeMarkdownText.displayName = 'SafeMarkdownText';
