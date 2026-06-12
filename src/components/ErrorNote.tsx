interface ErrorNoteProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorNote({ message, onDismiss }: ErrorNoteProps) {
  return (
    <div className="error-note fadein" role="alert">
      <span aria-hidden>⚠</span>
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dispensar">
          ✕
        </button>
      )}
    </div>
  );
}
