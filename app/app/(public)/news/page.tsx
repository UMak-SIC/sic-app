import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "@phosphor-icons/react/dist/ssr";

import { EmptyState, focusRing, PageBody, PageHeader, Pager, pageFromParam } from "@/components/public/page-parts";
import { listPublishedNews } from "@/lib/public-site/content";
import { formatPostDate } from "@/lib/public-site/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "News" };

const PAGE_SIZE = 10;

// News and announcements, newest first, a page at a time (PS-06).
export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const page = pageFromParam((await searchParams).page);
  const { posts, total } = await listPublishedNews(page, PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageBody>
      <PageHeader title="News and Announcements" intro="Updates from the Society of Innovative Computing." />
      {posts.length > 0 ? (
        <>
          <ol className="flex flex-col gap-3">
            {posts.map((post) => (
              <li key={post.id} className="relative grid gap-1 rounded-[16px] border border-line bg-paper p-5 transition-colors hover:border-cyan-border sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline sm:gap-6">
                <p className="text-sm text-muted">{formatPostDate(post.postDate)}</p>
                <h2 className="font-display text-lg font-bold leading-snug">
                  <Link href={`/news/${post.id}`} className={cn("after:absolute after:inset-0 hover:text-cyan rounded-[4px]", focusRing)}>
                    {post.title}
                  </Link>
                </h2>
              </li>
            ))}
          </ol>
          <Pager page={page} pageCount={pageCount} hrefFor={(target) => `/news?page=${target}`} label="News pages" />
        </>
      ) : (
        <EmptyState icon={Newspaper} message="No news has been posted yet. Announcements will appear here." />
      )}
    </PageBody>
  );
}
