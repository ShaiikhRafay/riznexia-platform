'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Input,
  Skeleton,
  StatusBadge,
} from '@riznexia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLeads } from '@/src/features/leads/api/use-leads';
import { ApiError } from '@/src/lib/api-client';
import {
  useBuildPackDownload,
  useCustomSites,
  useDeploySite,
  useMarkProposalSent,
  useOutreach,
  useProposalDraft,
  useSaveProposal,
  useUploadSite,
  type DraftChannel,
  type DraftLanguage,
} from '../api/outreach-api';

function errText(e: unknown): string {
  return e instanceof ApiError || e instanceof Error ? e.message : 'Something went wrong';
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Copy failed — select and copy manually');
  }
}

export function OutreachPage() {
  const router = useRouter();
  const params = useSearchParams();
  const leadId = params.get('leadId');
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">
        Outreach &amp; Proposals
      </h1>
      <LeadPicker
        onPick={(id) => {
          const p = new URLSearchParams(params.toString());
          p.set('leadId', id);
          router.push(`?${p.toString()}`);
        }}
      />
      {leadId ? (
        <LeadOutreach leadId={leadId} />
      ) : (
        <p className="text-(--color-text-secondary) text-sm">Search and pick a lead to begin.</p>
      )}
    </div>
  );
}

function LeadPicker({ onPick }: { onPick: (id: string) => void }) {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(draft.trim().length >= 2 ? draft.trim() : ''), 300);
    return () => clearTimeout(t);
  }, [draft]);
  return (
    <div className="flex flex-col gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search leads by business name…"
        aria-label="Search leads"
      />
      {q ? (
        <Results
          q={q}
          onPick={(id) => {
            onPick(id);
            setDraft('');
            setQ('');
          }}
        />
      ) : null}
    </div>
  );
}

function Results({ q, onPick }: { q: string; onPick: (id: string) => void }) {
  const { data, isFetching } = useLeads({ q, limit: 10 });
  const items = data?.items ?? [];
  if (items.length === 0) {
    return isFetching ? null : (
      <p className="text-(--color-text-secondary) text-sm">No leads match &ldquo;{q}&rdquo;.</p>
    );
  }
  return (
    <ul className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-1 rounded-md border p-1">
      {items.map((l) => (
        <li key={l.id}>
          <button
            type="button"
            onClick={() => onPick(l.id)}
            className="hover:bg-(--color-bg-surface-raised) flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm"
          >
            <span className="text-(--color-text-primary) font-medium">{l.businessName}</span>
            <span className="text-(--color-text-secondary) text-xs">{l.city}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function LeadOutreach({ leadId }: { leadId: string }) {
  const { data, isLoading, error, refetch } = useOutreach(leadId);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) return null;
  return (
    <div className="flex flex-col gap-6">
      <ContactCard leadId={leadId} />
      <BuildCard leadId={leadId} />
      <ShareCard leadId={leadId} />
      <ProposalCard leadId={leadId} />
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="text-(--color-text-secondary) w-28 shrink-0">{k}</span>
      <span className="text-(--color-text-primary)">{children}</span>
    </div>
  );
}

function ContactCard({ leadId }: { leadId: string }) {
  const { data } = useOutreach(leadId);
  if (!data) return null;
  const b = data.business;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{b.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Row k="Category">{b.category}</Row>
        <Row k="City">{b.city}</Row>
        <Row k="Address">{b.address}</Row>
        <Row k="Phone">{b.phone ?? 'Not available'}</Row>
        <Row k="Google rating">
          {b.rating != null ? `${b.rating} / 5 (${b.reviewCount ?? 0} reviews)` : 'Not available'}
        </Row>
        <div className="flex flex-wrap gap-2 pt-2">
          {b.telLink ? (
            <Button size="sm" asChild>
              <a href={b.telLink}>Call</a>
            </Button>
          ) : null}
          {b.whatsappLink ? (
            <Button size="sm" variant="secondary" asChild>
              <a href={b.whatsappLink} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" asChild>
            <a href={b.mapsLink} target="_blank" rel="noreferrer">
              Open in Maps
            </a>
          </Button>
          {b.googleBusinessUrl ? (
            <Button size="sm" variant="secondary" asChild>
              <a href={b.googleBusinessUrl} target="_blank" rel="noreferrer">
                Google profile
              </a>
            </Button>
          ) : null}
          {b.phone ? (
            <Button size="sm" variant="secondary" onClick={() => void copy(b.phone!, 'Phone')}>
              Copy phone
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BuildCard({ leadId }: { leadId: string }) {
  const { data: o } = useOutreach(leadId);
  const sites = useCustomSites(leadId);
  const pack = useBuildPackDownload(
    leadId,
    o?.business.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'site',
  );
  const upload = useUploadSite(leadId);
  const deploy = useDeploySite(leadId);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build &amp; deploy website</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="text-(--color-text-secondary) list-decimal pl-5 text-sm">
          <li>Download the Build Pack and unzip it.</li>
          <li>
            In a terminal inside that folder, run <code>claude</code> and paste the prompt from{' '}
            <code>START.md</code>.
          </li>
          <li>
            When it finishes, run <code>bash package-site.sh</code> to create <code>site.zip</code>.
          </li>
          <li>
            Upload <code>site.zip</code> here, then Deploy.
          </li>
        </ol>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => pack.mutate(undefined, { onError: (e) => toast.error(errText(e)) })}
            disabled={pack.isPending}
          >
            {pack.isPending ? 'Preparing…' : 'Download Build Pack'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              upload.mutate(f, {
                onSuccess: (s) =>
                  toast.success(`Uploaded version ${s.version} (${s.fileCount} files)`),
                onError: (err) => toast.error(errText(err), { duration: 12000 }),
              });
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? 'Uploading…' : 'Upload site.zip'}
          </Button>
        </div>
        {upload.error ? (
          <pre className="text-(--color-text-secondary) whitespace-pre-wrap text-xs">
            {errText(upload.error)}
          </pre>
        ) : null}
        {sites.isLoading ? <Skeleton className="h-16 w-full" /> : null}
        {sites.error ? (
          <ErrorState error={sites.error} onRetry={() => void sites.refetch()} />
        ) : null}
        <ul className="flex flex-col gap-3 pt-2">
          {(sites.data ?? []).map((s) => {
            const latest = s.deployments[0];
            return (
              <li
                key={s.id}
                className="border-(--color-border-default) rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    Version {s.version} · {s.fileCount} files · {(s.totalBytes / 1024).toFixed(0)}{' '}
                    KB
                  </span>
                  <div className="flex items-center gap-2">
                    {latest ? (
                      <StatusBadge
                        variant={
                          latest.status === 'completed'
                            ? 'success'
                            : latest.status === 'failed'
                              ? 'danger'
                              : 'info'
                        }
                        label={
                          latest.status === 'completed'
                            ? 'Live'
                            : latest.status === 'failed'
                              ? 'Failed'
                              : 'Building…'
                        }
                      />
                    ) : (
                      <StatusBadge variant="neutral" label="Not deployed" />
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        deploy.mutate(s.id, {
                          onSuccess: () => toast.success('Deploy started — building on Vercel'),
                          onError: (e) => toast.error(errText(e)),
                        })
                      }
                      disabled={deploy.isPending || latest?.status === 'in_progress'}
                    >
                      Deploy
                    </Button>
                  </div>
                </div>
                {s.warnings.length ? (
                  <ul className="text-(--color-text-secondary) list-disc pl-5 text-xs">
                    {s.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                {latest?.liveUrl && latest.status === 'completed' ? (
                  <a
                    className="text-(--color-accent) break-all underline"
                    href={latest.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {latest.liveUrl}
                  </a>
                ) : null}
                {latest?.status === 'failed' && latest.errorMessage ? (
                  <p className="text-(--color-text-secondary) text-xs">{latest.errorMessage}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function ShareCard({ leadId }: { leadId: string }) {
  const { data } = useOutreach(leadId);
  if (!data) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Share website link</CardTitle>
      </CardHeader>
      <CardContent>
        {data.liveUrl ? (
          <>
            <a
              className="text-(--color-accent) break-all text-sm underline"
              href={data.liveUrl}
              target="_blank"
              rel="noreferrer"
            >
              {data.liveUrl}
            </a>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => void copy(data.liveUrl!, 'Link')}>
                Copy link
              </Button>
              {data.shareLinks.whatsapp ? (
                <Button size="sm" variant="secondary" asChild>
                  <a href={data.shareLinks.whatsapp} target="_blank" rel="noreferrer">
                    Send via WhatsApp
                  </a>
                </Button>
              ) : null}
              {data.shareLinks.mailto ? (
                <Button size="sm" variant="secondary" asChild>
                  <a href={data.shareLinks.mailto}>Email</a>
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-(--color-text-secondary) text-sm">
            No live website yet. Upload and deploy a site above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProposalCard({ leadId }: { leadId: string }) {
  const [language, setLanguage] = useState<DraftLanguage>('roman_ur');
  const [channel, setChannel] = useState<DraftChannel>('whatsapp');
  const [offer, setOffer] = useState('');
  const [sender, setSender] = useState('');
  const [text, setText] = useState('');
  const [waLink, setWaLink] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const draft = useProposalDraft(leadId);
  const save = useSaveProposal(leadId);
  const sent = useMarkProposalSent(leadId);
  const sel =
    'border-(--color-border-default) bg-(--color-bg-surface) rounded-md border px-2 py-1.5 text-sm';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposal / pitch</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <select
            className={sel}
            value={language}
            onChange={(e) => setLanguage(e.target.value as DraftLanguage)}
            aria-label="Language"
          >
            <option value="roman_ur">Roman Urdu</option>
            <option value="en">English</option>
          </select>
          <select
            className={sel}
            value={channel}
            onChange={(e) => setChannel(e.target.value as DraftChannel)}
            aria-label="Channel"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
          <Input
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="max-w-48"
          />
        </div>
        <Input
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="Offer / price line (optional), e.g. Rs 25,000 one-time incl. 1 year hosting"
          aria-label="Offer"
        />
        <div>
          <Button
            size="sm"
            disabled={draft.isPending}
            onClick={() =>
              draft.mutate(
                { language, channel, offer: offer || undefined, senderName: sender || undefined },
                {
                  onSuccess: (d) => {
                    setText(d.content);
                    setWaLink(d.whatsappLink);
                    setSavedId(null);
                  },
                  onError: (e) => toast.error(errText(e)),
                },
              )
            }
          >
            {draft.isPending ? 'Generating…' : 'Generate draft'}
          </Button>
        </div>
        {text ? (
          <>
            <textarea
              className={`${sel} min-h-64 w-full font-mono`}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSavedId(null);
              }}
              aria-label="Proposal text"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void copy(text, 'Proposal')}>
                Copy
              </Button>
              {waLink ? (
                <Button size="sm" variant="secondary" asChild>
                  <a
                    href={`${waLink.split('?')[0]}?text=${encodeURIComponent(text)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={save.isPending || savedId !== null}
                onClick={() =>
                  save.mutate(text, {
                    onSuccess: (p) => {
                      setSavedId(p.id);
                      toast.success(`Saved as proposal v${p.version}`);
                    },
                    onError: (e) => toast.error(errText(e)),
                  })
                }
              >
                {savedId ? 'Saved' : 'Save to CRM'}
              </Button>
              {savedId ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={sent.isPending || sent.isSuccess}
                  onClick={() =>
                    sent.mutate(savedId, {
                      onSuccess: () => toast.success('Marked as sent'),
                      onError: (e) => toast.error(errText(e)),
                    })
                  }
                >
                  {sent.isSuccess ? 'Marked sent' : 'Mark as sent'}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
