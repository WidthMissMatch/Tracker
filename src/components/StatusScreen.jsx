// Full-screen loading / error message.
export function StatusScreen({ title, detail, error = false, action }) {
  return (
    <div className={`status-screen ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
      {!error && <div className="spinner" />}
      <div className="status-title">{title}</div>
      {detail && <code>{detail}</code>}
      {action && (
        <button type="button" className="status-btn" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  );
}
