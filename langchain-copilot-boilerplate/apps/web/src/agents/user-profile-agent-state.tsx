'use client';

// Libs for third party
import { useAgentContext } from '@copilotkit/react-core/v2';
import { useMemo } from 'react';

// Internal
import type { AgentUserProfile } from '@repo/types';
import { useAuth } from '@/components/auth/auth-provider';

/** Keeps authenticated user data synchronized into CopilotKit/LangGraph state. */
export const UserProfileAgentState = (): null => {
  const { user } = useAuth();

  const userProfile = useMemo<AgentUserProfile | null>(() => {
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      userName: user.name,
      ...(user.email ? { userEmail: user.email } : {}),
    };
  }, [user]);

  const userContextValue: Record<string, string | boolean> = userProfile
    ? {
        isAuthenticated: true,
        userId: userProfile.userId,
        userName: userProfile.userName,
        ...(userProfile.userEmail ? { userEmail: userProfile.userEmail } : {}),
      }
    : { isAuthenticated: false };

  useAgentContext({
    description: 'Signed-in application user profile',
    value: userContextValue,
  });

  return null;
};
