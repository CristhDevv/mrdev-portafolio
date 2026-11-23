export type ProjectId =
  | 'mr-tender'
  | 'dropradar'
  | 'secop-sie'
  | 'bendita-store'
  | 'tesorapp'
  | 'misapuntesu'
  | 'pidefacil';

export type DeviceMode = 'desktop' | 'cinema';

export type StageViewMode = 'live' | 'hd';

export interface ProjectVisualHighlight {
  label: string;
  value: string;
}

export interface QuickPillar {
  title: string;
  shortDesc: string;
}

export interface ProjectItem {
  id: ProjectId;
  number: string;
  name: string;
  shortName: string;
  iconText: string;
  categoryBadge: string;
  shortHeadline: string;
  url: string;
  displayUrl: string;
  screenshotPath: string;
  accentColor: string;
  secondaryGlow: string;
  hasLoginWall?: boolean;
  iframeBlocked?: boolean;
  kpis: ProjectVisualHighlight[];
  featurePills: string[];
  stack: string[];
  quickPillars: QuickPillar[];
}
