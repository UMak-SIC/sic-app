import type { Metadata } from "next";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/public/page-parts";
import { listAchievements } from "@/lib/public-site/content";

export const metadata: Metadata = { title: "Achievements" };

// Achievements with title, year and description, newest first (PS-03.6).
export default async function AchievementsPage() {
  const achievements = await listAchievements();
  if (achievements.length === 0) {
    return <EmptyState icon={Trophy} message="Our achievements will be posted soon." />;
  }

  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {achievements.map((achievement) => (
        <li key={achievement.id} className="flex gap-4 rounded-[16px] border border-line bg-paper p-5">
          <span className="h-fit shrink-0 rounded-full bg-cyan-soft px-3 py-1 font-display text-sm font-bold text-cyan">
            {achievement.year}
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-lg font-bold leading-snug">{achievement.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{achievement.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
