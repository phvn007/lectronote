import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Square, Volume2 } from "lucide-react";
import { useState } from "react";
import type { PeriodRecord } from "../backend.d.ts";

interface PeriodCardProps {
  period: PeriodRecord;
  index: number;
}

export function PeriodCard({ period, index }: PeriodCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleHear = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const speakPrimary = new SpeechSynthesisUtterance(period.summaryPrimary);
    const speakSecondary = new SpeechSynthesisUtterance(
      period.summarySecondary,
    );

    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setIsSpeaking(false);
      }
    };

    speakPrimary.onend = () => {
      // Brief pause then speak secondary
      setTimeout(() => {
        if (!window.speechSynthesis.paused) {
          window.speechSynthesis.speak(speakSecondary);
        }
      }, 500);
    };

    speakPrimary.onerror = finish;
    speakSecondary.onend = finish;
    speakSecondary.onerror = finish;

    setIsSpeaking(true);
    window.speechSynthesis.speak(speakPrimary);
  };

  return (
    <Card
      className="border-border/60 shadow-card hover:shadow-elevated transition-shadow duration-200 animate-fade-in"
      data-ocid={`period.item.${index}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono font-bold">
              Period {period.periodNumber.toString()}
            </Badge>
          </div>
          <Button
            variant={isSpeaking ? "destructive" : "outline"}
            size="sm"
            onClick={handleHear}
            data-ocid={`period.hear.button.${index}`}
            aria-label={isSpeaking ? "Stop reading" : "Hear summary aloud"}
            className="gap-2 transition-all"
          >
            {isSpeaking ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                Hear
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Primary Language
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {period.summaryPrimary}
          </p>
        </div>

        <Separator className="my-2" />

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Second Language
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {period.summarySecondary}
          </p>
        </div>

        {isSpeaking && (
          <div
            className="flex items-center gap-2 text-xs text-primary animate-pulse"
            data-ocid={`period.speaking.${index}`}
            aria-live="polite"
          >
            <Volume2 className="h-3 w-3" />
            Reading aloud...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
