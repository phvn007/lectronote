import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddPeriod } from "@/hooks/useQueries";
import {
  AlertCircle,
  CheckCircle2,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Web Speech API types ────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function translateToTelugu(text: string): Promise<string> {
  const encoded = encodeURIComponent(text.trim());
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|te`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Translation request failed");
  const data = await res.json();
  const translated = data?.responseData?.translatedText as string | undefined;
  if (!translated) throw new Error("No translation returned");
  return translated;
}

// Safely disconnect all handlers and stop a recognizer instance.
// Nulling handlers BEFORE stop() prevents Chrome from delivering
// any more onresult/onend events after we've moved on.
function destroyRecognizer(r: SpeechRecognitionInstance | null) {
  if (!r) return;
  r.onresult = null;
  r.onerror = null;
  r.onend = null;
  try {
    r.stop();
  } catch {
    /* ignore */
  }
}

// ─── Types ───────────────────────────────────────────────────
type RecordingState = "idle" | "recording" | "translating" | "review";

interface RecordClassDialogProps {
  classId: bigint;
  date: string; // YYYYMMDD
  displayDate: string;
}

// ─── Component ───────────────────────────────────────────────
export function RecordClassDialog({
  classId,
  date,
  displayDate,
}: RecordClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<RecordingState>("idle");
  const [periodNumber, setPeriodNumber] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [englishSummary, setEnglishSummary] = useState("");
  const [teluguSummary, setTeluguSummary] = useState("");
  const [error, setError] = useState("");

  const recognizerRef = useRef<SpeechRecognitionInstance | null>(null);
  const stageRef = useRef<RecordingState>("idle");
  const accumulatedRef = useRef<string>("");
  // Tracks the last accepted final chunk to skip exact consecutive duplicates.
  // Chrome sometimes fires the same final result twice in rapid succession;
  // this guard drops the second copy without blocking legitimate repetition.
  const lastChunkRef = useRef<string>("");
  // Prevent double-restart when Chrome fires onend more than once
  const isRestartingRef = useRef(false);
  // Ref to always hold the latest createAndStartRecognizer to avoid stale closures
  const createAndStartRecognizerRef = useRef<() => void>(() => {});
  const addPeriod = useAddPeriod();
  const SpeechRecognitionClass = getSpeechRecognition();
  const isSpeechSupported = !!SpeechRecognitionClass;

  // Keep stageRef in sync with stage state
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Clean up recognizer when dialog closes
  useEffect(() => {
    if (!open) {
      destroyRecognizer(recognizerRef.current);
      recognizerRef.current = null;
      isRestartingRef.current = false;
    }
  }, [open]);

  const resetForm = useCallback(() => {
    destroyRecognizer(recognizerRef.current);
    recognizerRef.current = null;
    isRestartingRef.current = false;
    accumulatedRef.current = "";
    lastChunkRef.current = "";
    setStage("idle");
    setPeriodNumber("");
    setFinalTranscript("");
    setInterimTranscript("");
    setEnglishSummary("");
    setTeluguSummary("");
    setError("");
  }, []);

  // ── Create and attach a fresh recognizer instance ─────────
  const createAndStartRecognizer = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    // CRITICAL: Null out all handlers BEFORE stopping the old recognizer.
    // Chrome fires onresult asynchronously after stop(); if the handler is
    // still attached it runs against the new session, doubling every word.
    destroyRecognizer(recognizerRef.current);
    recognizerRef.current = null;

    const recognizer = new SpeechRecognitionClass();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = "en-US";

    recognizer.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const newChunk = result[0].transcript.trim();
          if (newChunk) {
            // Only skip if this chunk is an exact consecutive duplicate.
            // This handles Chrome firing the same final result twice in a row
            // without blocking the user from legitimately repeating a word.
            if (newChunk.toLowerCase() !== lastChunkRef.current.toLowerCase()) {
              accumulatedRef.current += `${newChunk} `;
              lastChunkRef.current = newChunk;
            }
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setFinalTranscript(accumulatedRef.current);
      setInterimTranscript(interim);
    };

    recognizer.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Microphone error: ${event.error}. Please try again.`);
        setStage("idle");
      }
    };

    recognizer.onend = () => {
      setInterimTranscript("");
      // Guard against Chrome firing onend multiple times for the same session.
      if (stageRef.current === "recording" && !isRestartingRef.current) {
        isRestartingRef.current = true;
        setTimeout(() => {
          if (stageRef.current === "recording") {
            createAndStartRecognizerRef.current();
          }
          isRestartingRef.current = false;
        }, 200);
      }
    };

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch {
      // already started or other error -- ignore
    }
  }, [SpeechRecognitionClass]);

  // Keep the ref up-to-date with the latest callback
  useEffect(() => {
    createAndStartRecognizerRef.current = createAndStartRecognizer;
  }, [createAndStartRecognizer]);

  // ── Start Recording ────────────────────────────────────────
  const handleStartRecording = () => {
    const pNum = Number.parseInt(periodNumber, 10);
    if (!periodNumber || Number.isNaN(pNum) || pNum < 1) {
      setError("Please enter a valid period number (≥ 1) before recording.");
      return;
    }
    setError("");

    if (!SpeechRecognitionClass) return;

    // Reset accumulated transcript for new recording
    accumulatedRef.current = "";
    lastChunkRef.current = "";
    isRestartingRef.current = false;
    setFinalTranscript("");
    setInterimTranscript("");
    setStage("recording");
    createAndStartRecognizer();
  };

  // ── Stop Recording & Translate ─────────────────────────────
  const handleStopRecording = async () => {
    // Mark stage as translating BEFORE stopping so the onend restart logic
    // sees the updated stageRef and does NOT restart the recognizer.
    setStage("translating");
    stageRef.current = "translating";
    isRestartingRef.current = false;
    destroyRecognizer(recognizerRef.current);
    recognizerRef.current = null;

    const text = accumulatedRef.current.trim() || finalTranscript.trim();
    if (!text) {
      setError("No speech was captured. Please try recording again.");
      setStage("idle");
      return;
    }

    setError("");

    try {
      const telugu = await translateToTelugu(text);
      setEnglishSummary(text);
      setTeluguSummary(telugu);
      setStage("review");
    } catch {
      // If translation fails, still go to review with the English text
      setEnglishSummary(text);
      setTeluguSummary("");
      setError(
        "Translation failed. You can type the Telugu summary manually below.",
      );
      setStage("review");
    }
  };

  // ── Save Session ───────────────────────────────────────────
  const handleSave = () => {
    const pNum = Number.parseInt(periodNumber, 10);
    if (!englishSummary.trim()) {
      setError("English summary is required.");
      return;
    }
    if (!teluguSummary.trim()) {
      setError("Telugu summary (తెలుగు సారాంశం) is required.");
      return;
    }
    setError("");

    addPeriod.mutate(
      {
        courseId: classId,
        date,
        periodNumber: BigInt(pNum),
        summaryPrimary: englishSummary.trim(),
        summarySecondary: teluguSummary.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Period ${pNum} recorded for ${displayDate}`);
          setOpen(false);
          resetForm();
        },
        onError: () => {
          setError("Failed to save period. Please try again.");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="gap-2 font-semibold"
          data-ocid="record.open_modal_button"
        >
          <Mic className="h-5 w-5" />
          Record Today's Class
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="record.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Record Class Session
          </DialogTitle>
          <DialogDescription>
            Speak your class summary — it will be transcribed in English and
            translated to Telugu automatically.{" "}
            <span className="font-medium text-foreground">{displayDate}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Period Number — always visible */}
          <div className="space-y-2">
            <Label htmlFor="period-number">Period Number</Label>
            <Input
              id="period-number"
              type="number"
              min={1}
              placeholder="e.g. 1"
              value={periodNumber}
              onChange={(e) => {
                setPeriodNumber(e.target.value);
                setError("");
              }}
              data-ocid="record.period.input"
              className="h-10"
              disabled={stage !== "idle" || addPeriod.isPending}
            />
          </div>

          <AnimatePresence mode="wait">
            {/* ── IDLE / No Speech Support ─── */}
            {stage === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {!isSpeechSupported ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MicOff className="h-5 w-5 shrink-0" />
                      <p className="text-sm font-medium">
                        Voice recording not supported in this browser.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Please type your summaries manually below.
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="fallback-english">
                          English Summary
                        </Label>
                        <Textarea
                          id="fallback-english"
                          placeholder="Type the class summary in English..."
                          value={englishSummary}
                          onChange={(e) => setEnglishSummary(e.target.value)}
                          data-ocid="record.english_summary.textarea"
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="fallback-telugu">
                          తెలుగు సారాంశం (Telugu Summary)
                        </Label>
                        <Textarea
                          id="fallback-telugu"
                          placeholder="తెలుగులో తరగతి సారాంశం రాయండి..."
                          value={teluguSummary}
                          onChange={(e) => setTeluguSummary(e.target.value)}
                          data-ocid="record.telugu_summary.textarea"
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-5 flex flex-col items-center gap-3 text-center">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mic className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        Ready to record
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Speak in English — we'll auto-translate to Telugu
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleStartRecording}
                      className="gap-2 font-semibold mt-1"
                      data-ocid="record.start_recording.button"
                    >
                      <Mic className="h-4 w-4" />
                      Start Recording
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── RECORDING ─── */}
            {stage === "recording" && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Pulsing mic indicator */}
                <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="h-3 w-3 rounded-full bg-destructive shrink-0"
                  />
                  <p className="text-sm font-medium text-destructive">
                    Recording… speak now
                  </p>
                </div>

                {/* Live transcript */}
                <div
                  className="rounded-xl border border-border bg-card p-4 min-h-[100px] text-sm leading-relaxed"
                  data-ocid="record.transcript.panel"
                >
                  {finalTranscript || interimTranscript ? (
                    <>
                      <span className="text-foreground">{finalTranscript}</span>
                      <span className="text-muted-foreground/70 italic">
                        {interimTranscript}
                      </span>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Your speech will appear here…
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleStopRecording}
                  className="w-full gap-2 font-semibold"
                  data-ocid="record.stop_recording.button"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              </motion.div>
            )}

            {/* ── TRANSLATING ─── */}
            {stage === "translating" && (
              <motion.div
                key="translating"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-4 py-6"
                data-ocid="record.translating.loading_state"
              >
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Languages className="h-8 w-8 text-primary" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/40"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Translating to Telugu…
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    తెలుగులోకి అనువదిస్తోంది…
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── REVIEW ─── */}
            {stage === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Success badge */}
                <div className="flex items-center gap-2 text-sm font-medium text-foreground rounded-lg bg-primary/8 border border-primary/20 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  Transcript captured — review and edit if needed
                </div>

                {/* English summary */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="english-summary"
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5 font-semibold border border-blue-200/60 dark:border-blue-700/40">
                      EN
                    </span>
                    English Summary
                  </Label>
                  <Textarea
                    id="english-summary"
                    value={englishSummary}
                    onChange={(e) => setEnglishSummary(e.target.value)}
                    data-ocid="record.english_summary.textarea"
                    className="min-h-[90px] resize-none text-sm"
                    placeholder="Edit English summary if needed..."
                    disabled={addPeriod.isPending}
                  />
                </div>

                {/* Telugu summary */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="telugu-summary"
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-xs bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 rounded px-1.5 py-0.5 font-semibold border border-orange-200/60 dark:border-orange-700/40">
                      TE
                    </span>
                    తెలుగు సారాంశం (Telugu Summary)
                  </Label>
                  <Textarea
                    id="telugu-summary"
                    value={teluguSummary}
                    onChange={(e) => setTeluguSummary(e.target.value)}
                    data-ocid="record.telugu_summary.textarea"
                    className="min-h-[90px] resize-none text-sm"
                    placeholder="తెలుగు అనువాదం ఇక్కడ ఉంటుంది…"
                    disabled={addPeriod.isPending}
                    dir="auto"
                  />
                </div>

                {/* Re-record option */}
                <button
                  type="button"
                  onClick={() => {
                    accumulatedRef.current = "";
                    lastChunkRef.current = "";
                    isRestartingRef.current = false;
                    setStage("idle");
                    setFinalTranscript("");
                    setInterimTranscript("");
                    setEnglishSummary("");
                    setTeluguSummary("");
                    setError("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Re-record
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          {error && (
            <Alert variant="destructive" data-ocid="record.error_state">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={addPeriod.isPending || stage === "translating"}
            data-ocid="record.cancel_button"
          >
            Cancel
          </Button>

          {/* Show Save only in review state or fallback manual mode */}
          {(stage === "review" || (stage === "idle" && !isSpeechSupported)) && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={addPeriod.isPending}
              data-ocid="record.submit_button"
            >
              {addPeriod.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Session"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
