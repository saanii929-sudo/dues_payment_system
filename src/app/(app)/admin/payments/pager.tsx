import Link from "next/link";
import { Button } from "@/components/ui/button";

function buildHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function Pager({
  page,
  totalPages,
  searchParams,
  basePath,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-ink-muted">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={buildHref(basePath, searchParams, page - 1)}>Previous</Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            Previous
          </Button>
        )}
        {hasNext ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={buildHref(basePath, searchParams, page + 1)}>Next</Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
