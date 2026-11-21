import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { focusRing, PageBody } from "@/components/public/page-parts";
import { getPublishedNewsPost } from "@/lib/public-site/content";
import { formatPostDate } from "@/lib/public-site/format";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedNewsPost((await params).id);
  return { title: post?.title ?? "News" };
}

// A full news post (PS-06.2). The body is sanitized Markdown (SY-08.7).
export default async function NewsPostPage({ params }: Props) {
  const post = await getPublishedNewsPost((await params).id);
  if (!post) notFound();

  return (
    <PageBody className="max-w-3xl gap-8">
      <Link href="/news" className={cn("inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-cyan rounded-[4px]", focusRing)}>
        <ArrowLeft size={16} aria-hidden="true" />
        All news
      </Link>
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <p className="text-sm text-muted">{formatPostDate(post.postDate)}</p>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
            {post.title}
          </h1>
        </header>
        {post.coverUrl ? (
          <div className="relative aspect-[16/9] overflow-hidden rounded-[16px] border border-line">
            <Image src={post.coverUrl} alt="" fill unoptimized priority sizes="(min-width: 768px) 48rem, 100vw" className="object-cover" />
          </div>
        ) : null}
        <div className="public-prose text-base" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
      </article>
    </PageBody>
  );
}
