type ToastProps = {
  message: string;
};

export function Toast({ message }: ToastProps) {
  return (
    <div id="toast" className={message ? 'toast-visible' : ''} role="status" aria-live="polite">
      {message}
    </div>
  );
}
