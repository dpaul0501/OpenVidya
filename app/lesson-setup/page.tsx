'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, Paperclip, Link, X, FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { EDUCATION_MODES, isValidMode, DEFAULT_EDUCATION_MODE } from '@/lib/config/education-modes';
import type { EducationMode } from '@/lib/config/education-modes';
import { buildCurriculumContext } from '@/lib/config/curriculum';
import { useUserProfileStore } from '@/lib/store/user-profile';
import { useSettingsStore } from '@/lib/store/settings';
import { storePdfBlob } from '@/lib/utils/image-storage';
import type { UserRequirements } from '@/lib/types/generation';

const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;
const EDUCATION_MODE_STORAGE_KEY = 'educationMode';

// Modes to show on lesson-setup (all except coming-soon)
const SELECTABLE_MODES = EDUCATION_MODES.filter((m) => !m.comingSoon);

function LessonSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<EducationMode>(DEFAULT_EDUCATION_MODE);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [urls, setUrls] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlList, setUrlList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore topic + mode from navigation state
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    if (topicParam) setTopic(decodeURIComponent(topicParam));

    try {
      const savedMode = localStorage.getItem(EDUCATION_MODE_STORAGE_KEY);
      if (isValidMode(savedMode)) setMode(savedMode);
    } catch { /* ignore */ }
  }, [searchParams]);

  function addUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed || urlList.includes(trimmed)) return;
    setUrlList((prev) => [...prev, trimmed]);
    setUrlInput('');
  }

  function removeUrl(url: string) {
    setUrlList((prev) => prev.filter((u) => u !== url));
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > MAX_PDF_SIZE_BYTES) {
      setPdfError('PDF exceeds 50 MB limit');
      return;
    }
    setPdfError(null);
    setPdfFile(file);
  }

  async function handleBuild() {
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    setError(null);
    setIsBuilding(true);

    try {
      // Persist mode choice
      localStorage.setItem(EDUCATION_MODE_STORAGE_KEY, mode);

      const userProfile = useUserProfileStore.getState();
      const curriculumContext = buildCurriculumContext({
        studentClass: userProfile.studentClass,
        board: userProfile.board,
        stream: userProfile.stream,
        subjects: userProfile.subjects,
        targetExam: userProfile.targetExam,
      });

      // Append any URLs to the requirement as reference context
      const urlContext = urlList.length > 0
        ? `\n\nReference URLs:\n${urlList.map((u) => `- ${u}`).join('\n')}`
        : '';

      const requirements: UserRequirements = {
        requirement: topic.trim() + urlContext,
        language: (() => {
          try {
            const lang = localStorage.getItem('generationLanguage');
            if (lang === 'en-US' || lang === 'sa') return lang;
          } catch { /* ignore */ }
          return 'en-US';
        })(),
        userNickname: userProfile.nickname || undefined,
        userBio: userProfile.bio || undefined,
        educationMode: mode,
        curriculumContext: curriculumContext || undefined,
        studentClass: userProfile.studentClass ?? null,
      };

      let pdfStorageKey: string | undefined;
      let pdfFileName: string | undefined;
      let pdfProviderId: string | undefined;
      let pdfProviderConfig: { apiKey?: string; baseUrl?: string } | undefined;

      if (pdfFile) {
        pdfStorageKey = await storePdfBlob(pdfFile);
        pdfFileName = pdfFile.name;
        const settings = useSettingsStore.getState();
        pdfProviderId = settings.pdfProviderId;
        const providerCfg = settings.pdfProvidersConfig?.[settings.pdfProviderId];
        if (providerCfg) {
          pdfProviderConfig = { apiKey: providerCfg.apiKey, baseUrl: providerCfg.baseUrl };
        }
      }

      sessionStorage.setItem('generationSession', JSON.stringify({
        sessionId: nanoid(),
        requirements,
        pdfText: '',
        pdfImages: [],
        imageStorageIds: [],
        pdfStorageKey,
        pdfFileName,
        pdfProviderId,
        pdfProviderConfig,
        sceneOutlines: null,
        currentStep: 'generating' as const,
      }));

      router.push('/generation-preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsBuilding(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
        <button
          onClick={() => router.push('/')}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Topic</p>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full text-sm font-medium bg-transparent border-0 focus:outline-none text-foreground placeholder:text-muted-foreground/50"
            placeholder="Enter topic…"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl mx-auto w-full space-y-8">

        {/* Mode picker */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            How do you want to learn?
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SELECTABLE_MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all',
                    active
                      ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-sm'
                      : 'border-border/50 bg-card hover:border-violet-200 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-950/10',
                  )}
                >
                  <span className="text-xl leading-none">{m.emoji}</span>
                  <p className={cn(
                    'text-xs font-semibold leading-tight',
                    active ? 'text-violet-700 dark:text-violet-300' : 'text-foreground',
                  )}>
                    {m.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                    {m.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Supporting materials */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Supporting materials <span className="normal-case font-normal">(optional)</span>
          </h2>

          {/* PDF upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 cursor-pointer transition-all',
              pdfFile
                ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20'
                : 'border-border/50 hover:border-violet-200 dark:hover:border-violet-700 hover:bg-muted/30',
            )}
          >
            <Paperclip className="size-4 text-muted-foreground shrink-0" />
            {pdfFile ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="size-3.5 text-violet-500 shrink-0" />
                <span className="text-xs text-foreground truncate">{pdfFile.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                  className="ml-auto p-0.5 rounded hover:bg-muted"
                >
                  <X className="size-3 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Attach PDF (textbook, notes…)</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfChange}
          />
          {pdfError && <p className="mt-1 text-[11px] text-destructive">{pdfError}</p>}

          {/* URL input */}
          <div className="mt-2.5 flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 hover:border-violet-200 dark:hover:border-violet-700 focus-within:border-violet-300 dark:focus-within:border-violet-600 transition-colors">
              <Link className="size-3.5 text-muted-foreground shrink-0" />
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                placeholder="Paste a URL and press Enter…"
                className="flex-1 text-xs bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <button
              onClick={addUrl}
              disabled={!urlInput.trim()}
              className="px-3 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
          {urlList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {urlList.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 pl-2.5 pr-1 py-0.5"
                >
                  <span className="text-[10px] text-violet-700 dark:text-violet-300 max-w-[180px] truncate">{url}</span>
                  <button onClick={() => removeUrl(url)} className="p-0.5 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900">
                    <X className="size-2.5 text-violet-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Build button — sticky footer */}
      <div className="sticky bottom-0 px-6 py-4 border-t border-border/40 bg-background/80 backdrop-blur-sm max-w-2xl mx-auto w-full">
        <button
          onClick={handleBuild}
          disabled={!topic.trim() || isBuilding}
          className={cn(
            'w-full h-11 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all',
            topic.trim() && !isBuilding
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20'
              : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
          )}
        >
          {isBuilding ? (
            <span className="flex items-center gap-2">
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Building lesson…
            </span>
          ) : (
            <>
              Build Lesson
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function LessonSetupPage() {
  return (
    <Suspense>
      <LessonSetupContent />
    </Suspense>
  );
}
