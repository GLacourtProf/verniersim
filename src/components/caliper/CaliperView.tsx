/**
 * Simulation SVG d'un pied à coulisse au 1/50 (vernier de 50 graduations).
 *
 * Principe de lecture d'un vernier 1/50 :
 *  - la règle principale est graduée en millimètres ;
 *  - le vernier comporte 50 graduations couvrant 49 mm : sa graduation n
 *    est alignée avec une graduation de la règle exactement quand la
 *    fraction de millimètre vaut n / 50 (soit 2n centièmes de mm).
 *
 * Lecture : valeur entière lue sur la règle au niveau du zéro du vernier
 *           + 2n centièmes de mm où n est la graduation alignée du vernier.
 *
 * Disposition : les graduations de la règle descendent jusqu'à la ligne de
 * lecture, où pointent — en vis-à-vis — celles du vernier. Le point bas des
 * graduations de la règle est donc à la même hauteur que le point haut des
 * graduations du vernier, comme sur un instrument réel.
 */

import { useMemo, type ReactNode } from "react";

const MM_PER_UNIT = 5.5; // px par mm sur la règle principale
const VIEWBOX_HEIGHT = 300;
const MAX_MM = 200;

// Géométrie verticale.
const RULE_TOP = 44; // bord supérieur de la règle
const MEET_Y = 106; // ligne de lecture : bas règle = haut vernier
const VERNIER_BOTTOM = 184; // bord inférieur du coulisseau

type Props = {
  /** Valeur mesurée, en centièmes de millimètre (mm × 100). */
  measurementCm100: number;
  /** Mettre en surbrillance la graduation du vernier alignée avec la règle. */
  showAide: boolean;
  /** Largeur du viewBox (la vue est redimensionnée via le viewBox SVG). */
  width?: number;
};

export default function CaliperView({
  measurementCm100,
  showAide,
  width = 1000,
}: Props) {
  const mm = measurementCm100 / 100;

  // Position (px) du zéro du vernier dans la vue : fixe, confortable.
  const xZero = Math.round(width * 0.42);

  // Valeur entière en mm et fraction en centièmes.
  const wholeMm = Math.floor(mm);
  const fracCm100 = measurementCm100 - wholeMm * 100; // 0, 2, 4 … 98

  // Graduation du vernier alignée avec la règle (0..49).
  const alignedIndex = fracCm100 / 2;

  // Graduations de la règle visibles dans la fenêtre.
  const { ruleLines, fromMm, toMm } = useMemo(() => {
    const leftMm = wholeMm - xZero / MM_PER_UNIT;
    const rightMm = wholeMm + (width - xZero) / MM_PER_UNIT;
    const from = Math.max(0, Math.floor(leftMm) - 1);
    const to = Math.min(MAX_MM, Math.ceil(rightMm) + 1);
    const lines: ReactNode[] = [];
    for (let i = from; i <= to; i++) {
      const x = xZero + (i - wholeMm) * MM_PER_UNIT;
      const isCm = i % 10 === 0;
      const isHalfCm = i % 5 === 0;
      // Tous les traits partagent le même point bas (ligne de lecture) et
      // se prolongent plus ou moins vers le haut selon leur importance.
      const h = isCm ? 36 : isHalfCm ? 27 : 18;
      const w = isCm ? 1.6 : 1.1;
      const opacity = isCm ? 0.95 : isHalfCm ? 0.75 : 0.45;
      lines.push(
        <line
          key={`r${i}`}
          x1={x}
          y1={MEET_Y - h}
          x2={x}
          y2={MEET_Y}
          stroke="currentColor"
          strokeWidth={w}
          opacity={opacity}
        />,
      );
      if (isCm) {
        lines.push(
          <text
            key={`t${i}`}
            x={x + 4}
            y={RULE_TOP + 18}
            fill="currentColor"
            opacity={0.85}
            fontSize={15}
            fontWeight={500}
            className="font-mono tabular-nums"
          >
            {i}
          </text>,
        );
      }
    }
    return { ruleLines: lines, fromMm: from, toMm: to };
  }, [wholeMm, xZero, width]);

  // Fin visible de la règle (butée 0 ou 200 mm).
  const ruleEndX = (endMm: number) => xZero + (endMm - wholeMm) * MM_PER_UNIT;

  // Position réelle du zéro du vernier : après la graduation entière, décalé
  // de la fraction de millimètre. C'est ce décalage qui rend la coïncidence
  // géométriquement exacte à l'écran.
  const xVernier0 = xZero + (fracCm100 / 100) * MM_PER_UNIT;

  // Vernier : 50 graduations sur 49 mm, espacées de 49/50 mm.
  const vernierStepPx = (49 / 50) * MM_PER_UNIT;
  const jawW = 30 * vernierStepPx;
  const vernierLines: ReactNode[] = [];
  for (let n = 0; n <= 49; n++) {
    const x = xVernier0 + n * vernierStepPx;
    const aligned = showAide && n === alignedIndex;
    const isMajor = n % 5 === 0;
    const h = isMajor ? 30 : 22;
    // Tous les traits partagent le même point haut (ligne de lecture) et
    // descendent vers le bas du coulisseau.
    vernierLines.push(
      <line
        key={`v${n}`}
        x1={x}
        y1={MEET_Y}
        x2={x}
        y2={MEET_Y + h}
        stroke="currentColor"
        strokeWidth={aligned ? 3 : isMajor ? 1.5 : 1.1}
        opacity={aligned ? 1 : isMajor ? 0.9 : 0.6}
      />,
    );
    if (aligned) {
      // L'aide se limite à mettre en évidence la graduation alignée :
      // aucun chiffre n'est affiché, l'utilisateur doit lire lui-même.
      vernierLines.push(
        <rect
          key={`vg${n}`}
          x={x - 9}
          y={MEET_Y - 4}
          width={18}
          height={46}
          rx={5}
          fill="currentColor"
          opacity={0.15}
        />,
      );
    }
    if (isMajor) {
      // Sur un vernier au 1/50, les repères sont numérotés en centièmes :
      // la graduation 5 vaut 0,10 mm → « 10 ».
      vernierLines.push(
        <text
          key={`vt${n}`}
          x={x}
          y={MEET_Y + 46}
          textAnchor="middle"
          fill="currentColor"
          fontSize={13}
          fontWeight={500}
          opacity={0.8}
          className="font-mono tabular-nums"
        >
          {n * 2}
        </text>,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${VIEWBOX_HEIGHT}`}
      width="100%"
      height="auto"
      role="img"
      aria-label={`Pied à coulisse au 1/50 : lecture à effectuer.`}
      className="select-none text-foreground"
    >
      {/* Corps fixe (règle) */}
      <rect
        x={-10}
        y={RULE_TOP}
        width={width + 20}
        height={MEET_Y - RULE_TOP}
        rx={6}
        fill="currentColor"
        opacity={0.04}
      />
      <line
        x1={0}
        y1={RULE_TOP}
        x2={width}
        y2={RULE_TOP}
        stroke="currentColor"
        strokeWidth={1.4}
        opacity={0.35}
      />
      <line
        x1={0}
        y1={MEET_Y}
        x2={width}
        y2={MEET_Y}
        stroke="currentColor"
        strokeWidth={1.4}
        opacity={0.35}
      />

      {/* Butées de la règle (0 et 200 mm) si visibles */}
      {fromMm <= 0 && (
        <line
          x1={ruleEndX(0)}
          y1={RULE_TOP + 4}
          x2={ruleEndX(0)}
          y2={MEET_Y - 4}
          stroke="currentColor"
          strokeWidth={3}
          opacity={0.5}
        />
      )}
      {toMm >= MAX_MM && (
        <line
          x1={ruleEndX(MAX_MM)}
          y1={RULE_TOP + 4}
          x2={ruleEndX(MAX_MM)}
          y2={MEET_Y - 4}
          stroke="currentColor"
          strokeWidth={3}
          opacity={0.5}
        />
      )}

      {/* Graduations de la règle (pointes en bas, sur la ligne de lecture) */}
      {ruleLines}

      {/* Ligne de lecture : le zéro du vernier */}
      <line
        x1={xVernier0}
        y1={RULE_TOP}
        x2={xVernier0}
        y2={VERNIER_BOTTOM}
        stroke="currentColor"
        strokeWidth={1.2}
        strokeDasharray="4 4"
        opacity={0.5}
      />

      {/* Corps mobile (coulisseau / vernier), sous la règle */}
      <g>
        <rect
          x={xVernier0 - 4}
          y={MEET_Y}
          width={jawW + 8}
          height={VERNIER_BOTTOM - MEET_Y}
          rx={4}
          fill="currentColor"
          opacity={0.08}
        />
        <line
          x1={xVernier0 - 4}
          y1={MEET_Y}
          x2={xVernier0 - 4}
          y2={VERNIER_BOTTOM}
          stroke="currentColor"
          strokeWidth={2}
          opacity={0.8}
        />
        <line
          x1={xVernier0 + jawW + 4}
          y1={MEET_Y}
          x2={xVernier0 + jawW + 4}
          y2={VERNIER_BOTTOM}
          stroke="currentColor"
          strokeWidth={2}
          opacity={0.8}
        />
        {/* Fenêtre de lecture */}
        <rect
          x={xVernier0}
          y={MEET_Y}
          width={jawW}
          height={VERNIER_BOTTOM - MEET_Y}
          fill="currentColor"
          opacity={0.03}
        />
        {/* Graduations du vernier (pointes en haut, sur la ligne de lecture) */}
        {vernierLines}
        {/* Bord du vernier */}
        <line
          x1={xVernier0 - 4}
          y1={VERNIER_BOTTOM}
          x2={xVernier0 + jawW + 4}
          y2={VERNIER_BOTTOM}
          stroke="currentColor"
          strokeWidth={2}
          opacity={0.8}
        />
      </g>

      {/* Légendes */}
      <text
        x={16}
        y={VIEWBOX_HEIGHT - 26}
        fill="currentColor"
        opacity={0.55}
        fontSize={12}
      >
        Règle principale (mm)
      </text>
      <text
        x={16}
        y={VIEWBOX_HEIGHT - 10}
        fill="currentColor"
        opacity={0.55}
        fontSize={12}
      >
        {showAide
          ? "Aide : la graduation encadrée du vernier est alignée avec une graduation de la règle."
          : "Vernier : 50 graduations = 49 mm (précision 0,02 mm)"}
      </text>
    </svg>
  );
}
