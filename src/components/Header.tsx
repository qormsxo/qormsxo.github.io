import { plainText } from "@/lib/notion/rich-text";
import type { PublicProfile } from "@/lib/notion/types";
import { Avatar } from "./Avatar";
import { RichText } from "./RichText";

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function ContactLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-ink no-underline transition hover:border-accent hover:text-accent"
    >
      {children}
    </a>
  );
}

export function Header({ profile }: { profile: PublicProfile }) {
  const websiteHref = profile.website?.find((s) => s.href)?.href ?? plainText(profile.website);
  const websiteLabel = plainText(profile.website);

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex items-center gap-5 sm:gap-7">
          <Avatar name={profile.name} />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{profile.name}</h1>
            {profile.position && (
              <RichText value={profile.position} className="mt-2 text-lg font-medium text-accent sm:text-xl" />
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {profile.email && <ContactLink href={`mailto:${profile.email}`}>{profile.email}</ContactLink>}
          {profile.url && <ContactLink href={profile.url}>{displayUrl(profile.url)}</ContactLink>}
          {websiteLabel && <ContactLink href={websiteHref}>{displayUrl(websiteLabel)}</ContactLink>}
        </div>

        {profile.intro && (
          <RichText value={profile.intro} className="mt-8 max-w-3xl text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8" />
        )}
      </div>
    </header>
  );
}
