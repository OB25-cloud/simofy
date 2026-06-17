// PostgREST caps unbounded selects at 1000 rows. We've hit this bug class
// repeatedly (notifications backfill, jobs page date filters, dashboard
// paid-invoice totals) — this is the shared, reusable fix instead of
// reinventing the same range() loop in every page that queries a table
// that can grow past 1000 rows.
const PAGE_SIZE = 1000

export async function paginateAll<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}
