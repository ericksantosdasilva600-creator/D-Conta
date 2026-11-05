import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { NotesScreen } from "@/components/NotesScreen";

export default function NotesRoute() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const router = useRouter();
  useEffect(() => { if (create === "1") router.setParams({ create: undefined }); }, [create, router]);
  return <NotesScreen autoCreate={create === "1"} />;
}
