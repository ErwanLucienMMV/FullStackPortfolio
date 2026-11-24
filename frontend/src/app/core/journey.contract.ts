export type JourneyKind = 'experience' | 'education' | 'project' | 'goal';

export interface JourneyHighlight {
  id: string;
  title: string;
  description: string;
  technologies: readonly string[];
}

/** Optional expanded content rendered below the timeline for this entry. */
export interface JourneySection {
  title: string;
  description: string;
  highlights?: readonly JourneyHighlight[];
  topics?: readonly string[];
}

/** One ordered card from GET /parcours?locale=fr|en. Text is server-localized. */
export interface JourneyEntry {
  id: string;
  kind: JourneyKind;
  period: string;
  title: string;
  description: string;
  details: readonly string[];
  section?: JourneySection;
}
