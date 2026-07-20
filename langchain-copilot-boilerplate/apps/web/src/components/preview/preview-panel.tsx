// Internal
import { PreviewBody } from '@/components/preview/preview-body';
import { usePreviewPanel } from '@/components/preview/preview-panel-context';

/**
 * Side panel that visualizes the latest workspace tool result as structured
 * UI instead of leaving it as streamed text inside the chat transcript.
 */
export const PreviewPanel = (): React.JSX.Element | null => {
  const { preview, clearPreview } = usePreviewPanel();

  if (!preview) {
    return null;
  }

  return (
    <aside className="flex w-full max-w-md shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground">{preview.title}</h2>
        <button
          type="button"
          onClick={clearPreview}
          aria-label="Close preview"
          className="rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <PreviewBody kind={preview.kind} data={preview.data} />
      </div>
    </aside>
  );
};
