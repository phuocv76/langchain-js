import { useEffect, useState } from "react";

/**
 * Returns true after the component mounts on the client.
 * Use to defer hooks that require browser-only CopilotKit APIs.
 */
export const useClientMounted = (): boolean => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
};
