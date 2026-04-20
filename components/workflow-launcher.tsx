'use client';

/**
 * WorkflowLauncher — post-session panel that surfaces the 4 sub-workflows
 * available from a teacher-narration lesson.
 *
 * Shown when the student ends a teacher-narration Q&A session.
 * Each card navigates to the landing page with the topic pre-filled and
 * the workflow mode pre-selected, so generation starts in the right mode.
 */

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowLauncherProps {
  topic: string;
  open: boolean;
  onClose: () => void;
}


export function WorkflowLauncher({ topic, open, onClose }: WorkflowLauncherProps) {
  const router = useRouter();

  function startNextLesson() {
    localStorage.setItem('educationMode', 'teacher-narration');
    router.push(`/lesson-setup?topic=${encodeURIComponent(topic)}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-sm mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-border p-6"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="mb-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Lesson complete
              </p>
              <h2 className="text-base font-semibold text-foreground leading-snug">
                {topic}
              </h2>
            </div>

            <div className="space-y-2">
              <button
                onClick={onClose}
                className="w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 px-4 py-3 text-left transition-all"
              >
                <span className="text-xl">💬</span>
                <div>
                  <p className="text-sm font-medium text-foreground">Q&A / Doubt Clearing</p>
                  <p className="text-[11px] text-muted-foreground">Ask the teacher anything about this lesson</p>
                </div>
              </button>

              <button
                onClick={startNextLesson}
                className="w-full flex items-center gap-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 px-4 py-3 text-left transition-all"
              >
                <span className="text-xl">🎯</span>
                <div>
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Next Lesson</p>
                  <p className="text-[11px] text-muted-foreground">Choose a new mode for this topic</p>
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
