/**
 * Highlights the first occurrence of `query` within `text` using <mark>.
 * Used in findings tables/cards for visual search feedback.
 */
export function HighlightText({ text, query }: { text: string; query: string }) {
   const q = query.trim();
   if (!q) return <>{text}</>;
   const lower = text.toLowerCase();
   const ql = q.toLowerCase();
   const idx = lower.indexOf(ql);
   if (idx === -1) return <>{text}</>;
   return (
      <>
         {text.slice(0, idx)}
         <mark className="bg-warning/30 text-base-content rounded px-0.5">
            {text.slice(idx, idx + ql.length)}
         </mark>
         {text.slice(idx + ql.length)}
      </>
   );
}
