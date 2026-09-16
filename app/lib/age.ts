export function ageFromBirthdate(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm == null) return "";
  if (distanceKm < 1) return "< 1 km";
  return `${Math.round(distanceKm)} km`;
}
