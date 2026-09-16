import { useEffect, useState } from "react";
import { fetchMyInterestIds, fetchMyPhotos } from "@/lib/api";
import { MIN_INTERESTS_REQUIRED } from "@/constants/interests";

export function useOnboardingStatus(userId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMyPhotos(userId), fetchMyInterestIds(userId)])
      .then(([photos, interestIds]) => {
        if (cancelled) return;
        setIsComplete(photos.length > 0 && interestIds.length >= MIN_INTERESTS_REQUIRED);
      })
      .catch(() => {
        if (!cancelled) setIsComplete(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { loading, isComplete };
}
