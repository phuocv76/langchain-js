// Internal
import { useClientMounted } from "@/hooks/use-client-mounted";
import { useThreadTitleFromFirstMessage } from "@/hooks/use-thread-title-from-first-message";

interface ThreadTitleSyncProps {
  readonly agentId: string;
}

/**
 * Client-only thread title sync — `useThreads` needs a browser store snapshot.
 */
export const ThreadTitleSync = ({
  agentId,
}: ThreadTitleSyncProps): React.JSX.Element | null => {
  const isMounted = useClientMounted();

  if (!isMounted) {
    return null;
  }

  return <ThreadTitleSyncInner agentId={agentId} />;
};

const ThreadTitleSyncInner = ({ agentId }: ThreadTitleSyncProps): null => {
  useThreadTitleFromFirstMessage(agentId);
  return null;
};
