import { Property } from "../types";

export const generatePropertyDescription = async (
  title: string,
  features: string[],
  address: string
): Promise<string> => {
  const safeTitle = (title || '').trim();
  const safeAddress = (address || '').trim();
  const safeFeatures = (features || []).filter(Boolean).slice(0, 8);

  const base = safeTitle ? safeTitle : 'This property';
  const loc = safeAddress ? ` located at ${safeAddress}` : '';
  const feats = safeFeatures.length ? ` Features include: ${safeFeatures.join(', ')}.` : '';

  return `${base}${loc}.${feats}`.trim();
};

export const askAboutProperty = async (
  question: string,
  property: Property
): Promise<string> => {
  void question;
  void property;
  return "AI assistant is disabled.";
};

export const generatePropertyImage = async (prompt: string): Promise<string | null> => {
  void prompt;
  return null;
};