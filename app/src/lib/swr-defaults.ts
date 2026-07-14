/** Shared SWR options for list hooks — cuts redundant Vercel→Render round-trips on navigation. */
export const listSwrOptions = {
    revalidateOnFocus: false,
    revalidateIfStale: true,
    dedupingInterval: 60_000,
    keepPreviousData: true,
} as const;
