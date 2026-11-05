import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FinanceScreen } from "@/components/FinanceScreen";

export default function FinanceRoute() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const router = useRouter();
  useEffect(() => { if (create === "1") router.setParams({ create: undefined }); }, [create, router]);
  return <FinanceScreen autoCreate={create === "1"} />;
}
