import { useRouter } from "expo-router";
import { ArchivedPrayersScreen } from "../../../src/components/home/ArchivedPrayersScreen";

export default function ArchivedPrayersRoute() {
  const router = useRouter();
  return <ArchivedPrayersScreen onClose={() => router.back()} />;
}
