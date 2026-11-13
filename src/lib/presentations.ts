export type SlideLayout = "title" | "content" | "split" | "quote" | "conclusion";
export type PresentationSlide = {
  id: string;
  kind: SlideLayout;
  title: string;
  subtitle?: string;
  body?: string;
  bullets: string[];
  visualIdea: string;
  imageData?: string;
};
export type PresentationProject = {
  id: string;
  title: string;
  topic: string;
  goal: string;
  style: "minimal" | "editorial" | "bold" | "classroom";
  detail: "brief" | "balanced" | "detailed";
  slides: PresentationSlide[];
  citations: string[];
  updatedAt: string;
};

export const PRESENTATIONS_PREFERENCES_KEY = "study_ai_presentations_v1";
export const MAX_PRESENTATION_PROJECTS = 20;
export const MAX_PRESENTATION_SLIDES = 40;
export const MAX_PRESENTATION_PROJECT_BYTES = 8_000_000;

export function isPresentationProject(value: unknown): value is PresentationProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<PresentationProject>;
  return typeof project.id === "string" && typeof project.title === "string" && typeof project.topic === "string" &&
    typeof project.goal === "string" && Array.isArray(project.slides) && project.slides.length >= 3 && project.slides.length <= MAX_PRESENTATION_SLIDES &&
    project.slides.every(slide => slide && typeof slide === "object" && typeof slide.id === "string" && typeof slide.title === "string" &&
      Array.isArray(slide.bullets) && slide.bullets.every(item => typeof item === "string") && typeof slide.visualIdea === "string");
}
