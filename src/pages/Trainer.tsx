import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import CaliperView from "@/components/caliper/CaliperView";
import {
  Award,
  Check,
  ChevronRight,
  Dices,
  Eye,
  FileText,
  Lightbulb,
  RotateCcw,
  Send,
  Target,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "reading" | "checked";

type AttemptResult = {
  correct: boolean;
  aide: boolean;
  expectedCm100: number;
  answerCm100: number;
  /** Points attribués : 100 (exact), 70 (dixième), 40 (mm), 0 (faux). */
  points: number;
};

type StudentInfo = {
  prenom: string;
  nom: string;
  classe: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Nouvelle mesure : 0 à 199,98 mm par pas de 0,02 mm. */
function newMeasure() {
  return Math.floor(Math.random() * 10000) * 2;
}

/** Formate centièmes de mm en string : 1234 → « 12,34 ». */
function formatCm100(cm100: number) {
  const whole = Math.floor(cm100 / 100);
  const frac = cm100 % 100;
  return frac === 0
    ? `${whole} mm`
    : `${whole},${String(frac).padStart(2, "0")} mm`;
}

/** Parse la saisie utilisateur → centièmes de mm, ou null si invalide. */
function parseMm(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const v = Math.round(parseFloat(t) * 100);
  if (v < 0 || v > 20000) return null;
  return v;
}

/**
 * Score basé sur la précision :
 *   100 pts — valeur exacte (au centième près)
 *    70 pts — correct au dixième (écart ≤ 0,04 mm, soit < 0,05)
 *    40 pts — correct au mm (écart < 0,5 mm)
 *     0 pts — faux
 */
function precisionPoints(answer: number, expected: number): number {
  const diff = Math.abs(answer - expected);
  if (diff === 0) return 100;
  if (diff < 5) return 70; // < 0,05 mm
  if (diff < 50) return 40; // < 0,5 mm
  return 0;
}

function precisionLabel(pts: number): string {
  if (pts === 100) return "Exact";
  if (pts === 70) return "Dixième";
  if (pts === 40) return "Millimètre";
  return "Faux";
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Trainer() {
  // ── Student identity ──
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [prenomDraft, setPrenomDraft] = useState("");
  const [nomDraft, setNomDraft] = useState("");
  const [classeDraft, setClasseDraft] = useState("");

  // ── Exercise state ──
  const [measurement, setMeasurement] = useState<number>(() => newMeasure());
  const [answer, setAnswer] = useState("");
  const [aide, setAide] = useState(false);
  const [phase, setPhase] = useState<Phase>("reading");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Session ──
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // ── Score sheet ──
  const [showSheet, setShowSheet] = useState(false);

  // ── Derived stats ──
  const totalAttempts = attempts.length;
  const totalPoints = attempts.reduce((s, a) => s + a.points, 0);
  const maxPoints = totalAttempts * 100;
  const scorePercent = maxPoints === 0 ? 0 : Math.round((totalPoints / maxPoints) * 100);
  const exactCount = attempts.filter((a) => a.points === 100).length;
  const tenthCount = attempts.filter((a) => a.points === 70).length;
  const mmCount = attempts.filter((a) => a.points === 40).length;
  const wrongCount = attempts.filter((a) => a.points === 0).length;

  // ── Handlers ──
  const startSession = useCallback(() => {
    if (!prenomDraft.trim() || !nomDraft.trim() || !classeDraft.trim()) return;
    setStudent({
      prenom: prenomDraft.trim(),
      nom: nomDraft.trim(),
      classe: classeDraft.trim(),
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [prenomDraft, nomDraft, classeDraft]);

  const nextMeasure = useCallback(() => {
    setMeasurement(newMeasure());
    setAnswer("");
    setAide(false);
    setPhase("reading");
    setResult(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const check = useCallback(() => {
    if (phase === "checked") return;
    const parsed = parseMm(answer);
    if (parsed === null) {
      return;
    }
    const points = precisionPoints(parsed, measurement);
    const isCorrect = points === 100;
    const attempt: AttemptResult = {
      correct: isCorrect,
      aide,
      expectedCm100: measurement,
      answerCm100: parsed,
      points,
    };
    setPhase("checked");
    setResult(attempt);
    setAttempts((prev) => [...prev, attempt]);
    setStreak((s) => (isCorrect ? s + 1 : 0));
    setBestStreak((b) => Math.max(b, isCorrect ? streak + 1 : b));
  }, [aide, answer, measurement, phase, streak]);

  const resetSession = useCallback(() => {
    setAttempts([]);
    setStreak(0);
    setBestStreak(0);
    nextMeasure();
  }, [nextMeasure]);

  // ── No student yet: show identity form ──
  if (!student) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
          <div className="w-full">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Métrologie · entraînement
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              Simulateur pied à coulisse
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Renseignez vos informations pour commencer l'exercice.
            </p>

            <Card className="mt-8 border-border/60 shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={prenomDraft}
                    onChange={(e) => setPrenomDraft(e.target.value)}
                    placeholder="ex. Marie"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={nomDraft}
                    onChange={(e) => setNomDraft(e.target.value)}
                    placeholder="ex. Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe">Classe</Label>
                  <Input
                    id="classe"
                    value={classeDraft}
                    onChange={(e) => setClasseDraft(e.target.value)}
                    placeholder="ex. 2nde C"
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={startSession}
                  disabled={!prenomDraft.trim() || !nomDraft.trim() || !classeDraft.trim()}
                >
                  Commencer
                  <ChevronRight className="size-4" />
                </Button>
              </CardContent>
            </Card>

            <p className="mt-6 font-mono text-xs text-muted-foreground">
              précision 0,02 mm · plage 0–200 mm
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Main exercise view ──
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* En-tête */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Métrologie · lecture au 1/50
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Simulateur pied à coulisse
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.prenom} {student.nom} · {student.classe}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatCard label="Score" value={`${scorePercent} %`} />
            <StatCard label="Tentatives" value={totalAttempts} />
          </div>
        </header>

        <Separator className="my-6" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Colonne principale */}
          <div className="flex flex-col gap-5">
            <Card className="border-border/60 shadow-none">
              <CardContent className="p-4 sm:p-6">
                <CaliperView
                  measurementCm100={measurement}
                  showAide={aide}
                  width={1000}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-none">
              <CardContent className="p-5 sm:p-6">
                {phase === "reading" ? (
                  <form
                    className="flex flex-col gap-4 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      check();
                    }}
                  >
                    <div className="flex-1">
                      <label htmlFor="answer" className="text-sm font-medium">
                        Lecture saisie (mm, deux décimales)
                      </label>
                      <Input
                        id="answer"
                        ref={inputRef}
                        autoFocus
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="ex. 12,34"
                        inputMode="decimal"
                        className="mt-2 h-12 text-lg font-mono tabular-nums"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAide((a) => !a)}
                        className="gap-2"
                      >
                        <Lightbulb className="size-4" />
                        {aide ? "Masquer l'aide" : "Afficher l'aide"}
                      </Button>
                      <Button type="submit" className="gap-2">
                        <Send className="size-4" />
                        Vérifier
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={nextMeasure}
                        className="gap-2 text-muted-foreground"
                      >
                        <Dices className="size-4" />
                        Autre mesure
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {result && (
                        <Badge
                          className={`gap-1.5 ${
                            result.points === 100
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : result.points === 70
                                ? "bg-amber-600 text-white hover:bg-amber-600"
                                : result.points === 40
                                  ? "bg-orange-500 text-white hover:bg-orange-500"
                                  : "bg-destructive text-destructive-foreground hover:bg-destructive"
                          }`}
                        >
                          {result.points === 100 ? (
                            <Target className="size-3.5" />
                          ) : result.points > 0 ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <X className="size-3.5" />
                          )}
                          {precisionLabel(result.points)}
                        </Badge>
                      )}
                      {result?.aide && (
                        <Badge
                          variant="outline"
                          className="gap-1.5 text-muted-foreground"
                        >
                          <Eye className="size-3.5" />
                          aide utilisée
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result?.correct
                        ? "Lecture exacte."
                        : `Valeur mesurée : ${formatCm100(result?.expectedCm100 ?? 0)} · Votre réponse : ${formatCm100(result?.answerCm100 ?? 0)}`}
                    </p>
                    <div>
                      <Button onClick={nextMeasure} className="gap-2">
                        <RotateCcw className="size-4" />
                        Mesure suivante
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne latérale */}
          <aside className="flex flex-col gap-5">
            {/* Rappel de lecture */}
            <Card className="border-border/60 shadow-none">
              <CardContent className="p-5">
                <p className="text-sm font-medium">Rappel de lecture</p>
                <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-6 text-muted-foreground">
                  <li>
                    Lire le nombre entier sur la règle au niveau du{" "}
                    <strong className="text-foreground">zéro du vernier</strong>.
                  </li>
                  <li>
                    Chercher la graduation du{" "}
                    <strong className="text-foreground">vernier</strong> qui
                    coïncide avec une graduation de la règle.
                  </li>
                  <li>
                    Son numéro × 0,02 mm donne la partie décimale.
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Répartition des scores */}
            {totalAttempts > 0 && (
              <Card className="border-border/60 shadow-none">
                <CardContent className="p-5">
                  <p className="text-sm font-medium">Répartition</p>
                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <ScoreLine
                      label="Exact"
                      count={exactCount}
                      total={totalAttempts}
                      color="bg-emerald-600"
                    />
                    <ScoreLine
                      label="Dixième"
                      count={tenthCount}
                      total={totalAttempts}
                      color="bg-amber-600"
                    />
                    <ScoreLine
                      label="Millimètre"
                      count={mmCount}
                      total={totalAttempts}
                      color="bg-orange-500"
                    />
                    <ScoreLine
                      label="Faux"
                      count={wrongCount}
                      total={totalAttempts}
                      color="bg-destructive"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Série */}
            <Card className="border-border/60 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Série en cours</p>
                  <Award className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight tabular-nums">
                    {streak}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    · record : {bestStreak}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Aides */}
            <Card className="border-border/60 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Aides utilisées</p>
                  <Eye className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {attempts.filter((a) => a.aide).length === 0
                    ? "Aucune aide utilisée."
                    : `${attempts.filter((a) => a.aide).length} sur ${totalAttempts} lectures.`}
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {totalAttempts > 0 && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowSheet(true)}
                >
                  <FileText className="size-4" />
                  Générer la fiche de score
                </Button>
              )}
              <Button
                variant="ghost"
                className="gap-2 text-muted-foreground"
                onClick={resetSession}
              >
                <RotateCcw className="size-4" />
                Recommencer
              </Button>
            </div>
          </aside>
        </div>

        <footer className="mt-12 border-t pt-5 font-mono text-xs text-muted-foreground">
          précision 0,02 mm · plage 0–200 mm · lecture : valeur entière à la
          règle + graduation alignée × 0,02 mm
        </footer>
      </div>

      {/* ── Fiche de score ── */}
      {showSheet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-background border border-border/60 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Aperçu */}
            <div className="p-6" id="score-sheet-content">
              <div className="text-center border-b pb-4 mb-4">
                <h2 className="text-lg font-bold">Simulateur pied à coulisse</h2>
                <p className="text-sm text-muted-foreground mt-1">Fiche de résultats</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-medium">{student.nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prénom</span>
                  <span className="font-medium">{student.prenom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Classe</span>
                  <span className="font-medium">{student.classe}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg border border-border/60">
                  <p className="text-3xl font-bold tabular-nums">{scorePercent} %</p>
                  <p className="text-xs text-muted-foreground mt-1">Score global</p>
                </div>
                <div className="text-center p-4 rounded-lg border border-border/60">
                  <p className="text-3xl font-bold tabular-nums">{totalAttempts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Tentatives</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded border border-emerald-600/30 bg-emerald-600/10">
                  <p className="font-bold text-emerald-600 tabular-nums">{exactCount}</p>
                  <p className="text-muted-foreground">Exact</p>
                </div>
                <div className="p-2 rounded border border-amber-600/30 bg-amber-600/10">
                  <p className="font-bold text-amber-600 tabular-nums">{tenthCount}</p>
                  <p className="text-muted-foreground">Dixième</p>
                </div>
                <div className="p-2 rounded border border-orange-500/30 bg-orange-500/10">
                  <p className="font-bold text-orange-500 tabular-nums">{mmCount}</p>
                  <p className="text-muted-foreground">Millimètre</p>
                </div>
                <div className="p-2 rounded border border-destructive/30 bg-destructive/10">
                  <p className="font-bold text-destructive tabular-nums">{wrongCount}</p>
                  <p className="text-muted-foreground">Faux</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>Barème :</strong> exact = 100 pts · correct au dixième = 70
                  pts · correct au mm = 40 pts · faux = 0 pts
                </p>
                <p>
                  Score = {totalPoints} / {maxPoints} points
                </p>
                <p>
                  Record de série : {bestStreak} · Aides :{" "}
                  {attempts.filter((a) => a.aide).length}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => window.print()}
              >
                Imprimer
              </Button>
              <Button className="flex-1" onClick={() => setShowSheet(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/60 px-4 py-2 text-right">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ScoreLine({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">{label}</div>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-12 text-right tabular-nums">
        {count} <span className="text-muted-foreground/60">({pct}%)</span>
      </div>
    </div>
  );
}
