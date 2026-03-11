import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CourseRecord, PeriodInput, PeriodRecord } from "../backend.d.ts";
import { useActor } from "./useActor";

// ─── Course Queries ──────────────────────────────────────────

export function useGetCourse(courseId: bigint | null) {
  const { actor } = useActor();
  return useQuery<CourseRecord | null>({
    queryKey: ["course", courseId?.toString()],
    queryFn: async () => {
      if (!actor || courseId === null) return null;
      try {
        const result = await actor.getCourse(courseId);
        return result;
      } catch {
        return null;
      }
    },
    enabled: !!actor && courseId !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useRegisterCourse() {
  const { actor } = useActor();
  return useMutation<bigint, Error, { name: string; year: string }>({
    mutationFn: async ({ name, year }) => {
      if (!actor) throw new Error("Not connected");
      return actor.registerCourse(name, year);
    },
  });
}

export function useLoginCourse() {
  const { actor } = useActor();
  return useMutation<CourseRecord, Error, bigint>({
    mutationFn: async (courseId) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.getCourse(courseId);
      if (!result) throw new Error("Invalid Class ID");
      return result;
    },
  });
}

export function useGetAllCourses() {
  const { actor } = useActor();
  return useQuery<CourseRecord[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCourses();
    },
    enabled: !!actor,
    staleTime: 30 * 1000,
  });
}

// ─── Period Queries ──────────────────────────────────────────

export function useGetPeriodsForDate(courseId: bigint | null, date: string) {
  const { actor } = useActor();
  return useQuery<PeriodRecord[]>({
    queryKey: ["periods", courseId?.toString(), date],
    queryFn: async () => {
      if (!actor || courseId === null || !date) return [];
      return actor.getPeriodsForDate(courseId, date);
    },
    enabled: !!actor && courseId !== null && !!date,
    staleTime: 30 * 1000,
  });
}

export function useAddPeriod() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, PeriodInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Not connected");
      return actor.addPeriod(input);
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: ["periods", input.courseId.toString(), input.date],
      });
    },
  });
}

export function useDeleteCourse() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, bigint>({
    mutationFn: async (courseId) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteCourse(courseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
