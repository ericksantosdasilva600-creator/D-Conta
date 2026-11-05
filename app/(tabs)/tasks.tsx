import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { TasksScreen } from "@/components/TasksScreen";

export default function TasksRoute() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const router = useRouter();
  useEffect(() => { if (create === "1") router.setParams({ create: undefined }); }, [create, router]);
  return <TasksScreen autoCreate={create === "1"} />;
}
