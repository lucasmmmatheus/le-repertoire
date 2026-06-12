interface ProgressBarProps {
  /** 0–100 (aproximado). */
  pct: number;
}

/** Barra fina de progresso das gerações de IA. */
export function ProgressBar({ pct }: ProgressBarProps) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
