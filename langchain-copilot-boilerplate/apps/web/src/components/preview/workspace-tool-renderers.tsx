// Libs for third party
import { useRenderTool } from '@copilotkit/react-core/v2';
import { useEffect } from 'react';
import { z } from 'zod';

// Internal
import { usePreviewPanel } from '@/components/preview/preview-panel-context';

/** Loose render props across useRenderTool status variants. */
type ToolRenderProps = {
  readonly status: string;
  readonly result?: string;
};

const parseResult = (result: string): unknown => {
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
};

/** Inline chip in the transcript; pushes the result into the side panel. */
const PreviewChip = ({
  kind,
  title,
  result,
}: ToolRenderProps & {
  readonly kind: string;
  readonly title: string;
}): React.JSX.Element => {
  const { showPreview } = usePreviewPanel();
  // `result` only exists on the complete variant, so its presence is the
  // reliable completion signal across status-enum spellings.
  const isComplete = typeof result === 'string';

  useEffect(() => {
    if (isComplete) {
      showPreview({ kind, title, data: parseResult(result!) });
    }
  }, [isComplete, result, showPreview, kind, title]);

  if (!isComplete) {
    return (
      <p className="text-sm text-muted-foreground">Loading {title.toLowerCase()}…</p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => showPreview({ kind, title, data: parseResult(result!) })}
      className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
    >
      📄 {title} — view in panel
    </button>
  );
};

/** Tool arguments vary per tool; the panel only needs the result. */
const anyArgs = z.object({}).passthrough();

const usePreviewRenderer = (name: string, title: string): void => {
  useRenderTool(
    {
      name,
      parameters: anyArgs,
      render: (props: ToolRenderProps) => (
        <PreviewChip
          kind={name}
          title={title}
          status={props.status}
          result={props.result}
        />
      ),
    },
    [title],
  );
};

/**
 * Registers side-panel renderers for every workspace tool so results appear
 * as structured UI in the preview panel instead of raw JSON in the chat.
 * Must be mounted inside both CopilotKit and PreviewPanelProvider.
 */
export const WorkspaceToolRenderers = (): null => {
  usePreviewRenderer('get_employee_profile', 'Employee profile');
  usePreviewRenderer('search_employees', 'Employee search results');
  usePreviewRenderer('get_employee_projects', 'Employee projects');
  usePreviewRenderer('get_employee_time_off', 'Time off');
  usePreviewRenderer('list_projects', 'Projects');
  usePreviewRenderer('get_project_members', 'Project members');
  usePreviewRenderer('get_workspace_stats', 'Workspace statistics');
  return null;
};
