import type { Json } from "@/integrations/supabase/types";

interface TableData {
  headers: string[];
  rows: string[][];
}

function isTableData(data: unknown): data is TableData {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as TableData).headers) &&
    Array.isArray((data as TableData).rows)
  );
}

/**
 * Renders a question's graph/geometry (pre-rendered SVG, trusted content
 * from the generator pipeline's own render_visual.py script, written only
 * through the admin-authenticated import path) or table (plain structured
 * data, rendered as a real HTML table rather than through the renderer,
 * since there's nothing to rasterize).
 */
export function QuestionVisual({
  hasVisual,
  visualType,
  visualData,
  visualSvg,
}: {
  hasVisual: boolean;
  visualType: string | null;
  visualData: Json | null;
  visualSvg: string | null;
}) {
  if (!hasVisual) return null;

  if (visualType === "table" && isTableData(visualData)) {
    return (
      <div className="my-4 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {visualData.headers.map((h, i) => (
                <th key={i} className="border-b px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visualData.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-secondary/20" : ""}>
                {row.map((cell, j) => (
                  <td key={j} className="border-b px-3 py-2 last:border-b-0">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if ((visualType === "graph" || visualType === "geometry") && visualSvg) {
    return (
      <div
        className="my-4 flex justify-center rounded-md border bg-card p-4 [&_svg]:h-auto [&_svg]:max-w-full"
        // Trusted SVG from our own render_visual.py script, written only through the admin-authenticated import path -- not user input.
        dangerouslySetInnerHTML={{ __html: visualSvg }}
      />
    );
  }

  return (
    <div className="my-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      This question references a visual that couldn't be displayed.
    </div>
  );
}
