import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@shared/api/axios-instance";
import { queryKeys } from "@shared/query/query-keys";

export interface UserStats {
  dueToday: number;
  newCards: number;
  reviewedToday: number;
  dayStreak: number;
  retention30d?: number;
  dailyGoal: number;
}

export function useUserStats() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<UserStats>({
    queryKey: queryKeys.stats.user(),
    queryFn: async () => {
      const response = await axiosInstance.get<UserStats>("/v1/stats", {
        params: { tz },
      });
      return response.data;
    },
  });
}

/**
 * Updates the user's daily study goal (synced to the backend) and refreshes the stats so the
 * sidebar goal widget and dashboard reflect the new target.
 */
export function useUpdateDailyGoal() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (dailyGoal) => {
      await axiosInstance.patch("/v1/account/preferences", { dailyGoal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.user() });
    },
  });
}
