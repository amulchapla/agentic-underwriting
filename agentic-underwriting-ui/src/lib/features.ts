export const features = {
  aiApprovedDetails: process.env.NEXT_PUBLIC_FEATURE_AI_APPROVED_DETAILS !== "false",
} as const;

export type FeatureFlag = keyof typeof features;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
