export const FORMATS = {
  'instagram-carousel':  { width: 1080, height: 1350, label: 'Instagram Post (4:5)' },
  'instagram-story':     { width: 1080, height: 1920, label: 'Instagram Story (9:16)' },
  'instagram-square':    { width: 1080, height: 1080, label: 'Instagram Square (1:1)' },
  'linkedin-post':       { width: 1200, height: 627,  label: 'LinkedIn Post (1.91:1)' },
  'linkedin-square':     { width: 1080, height: 1080, label: 'LinkedIn Square' },
  'twitter-post':        { width: 1024, height: 512,  label: 'Twitter/X Post (2:1)' },
  'facebook-ad':         { width: 1200, height: 628,  label: 'Facebook Ad' },
  'facebook-story':      { width: 1080, height: 1920, label: 'Facebook Story' },
  'youtube-thumbnail':   { width: 1280, height: 720,  label: 'YouTube Thumbnail (16:9)' },
  'poster-a4':           { width: 2480, height: 3508, label: 'Poster A4 (300dpi)' },
  'poster-letter':       { width: 2550, height: 3300, label: 'Poster Letter (300dpi)' },
  'presentation-16-9':   { width: 1920, height: 1080, label: 'Presentación 16:9' },
  'email-banner':        { width: 600,  height: 200,  label: 'Email Banner' },
};

export const FORMAT_TYPOGRAPHY = {
  'instagram-carousel':  { title: 72, subtitle: 32, label: 20, body: 28, cta: 26 },
  'instagram-story':     { title: 80, subtitle: 36, label: 22, body: 30, cta: 28 },
  'instagram-square':    { title: 72, subtitle: 32, label: 20, body: 28, cta: 26 },
  'linkedin-post':       { title: 56, subtitle: 28, label: 18, body: 24, cta: 22 },
  'linkedin-square':     { title: 60, subtitle: 30, label: 18, body: 26, cta: 24 },
  'twitter-post':        { title: 44, subtitle: 24, label: 16, body: 20, cta: 20 },
  'facebook-ad':         { title: 56, subtitle: 28, label: 18, body: 24, cta: 22 },
  'youtube-thumbnail':   { title: 80, subtitle: 40, label: 24, body: 32, cta: 30 },
  'presentation-16-9':   { title: 72, subtitle: 36, label: 22, body: 28, cta: 26 },
  'poster-a4':           { title: 120, subtitle: 56, label: 36, body: 44, cta: 48 },
};

export const FORMAT_SAFE_AREAS = {
  'instagram-story':  { top: 120, bottom: 200, left: 40, right: 40 },
  'facebook-story':   { top: 120, bottom: 200, left: 40, right: 40 },
  default:            { top: 40,  bottom: 40,  left: 40, right: 40 },
};

export function getDimensions(format) {
  return FORMATS[format] || FORMATS['instagram-carousel'];
}

export function getTypography(format) {
  return FORMAT_TYPOGRAPHY[format] || FORMAT_TYPOGRAPHY['instagram-carousel'];
}

export function getSafeArea(format) {
  return FORMAT_SAFE_AREAS[format] || FORMAT_SAFE_AREAS.default;
}
