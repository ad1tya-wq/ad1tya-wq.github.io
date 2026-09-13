export const site = {
  // TODO(user): replace name and title before launch; everything else reads from here
  name: 'Your Name',
  title: 'software engineer',
  line: 'I build systems that decide what to trust: security triage, ML, and the tools around them.',
  email: 'sahu200431@gmail.com',
  github: 'https://github.com/ad1tya-wq',
  linkedin: 'https://www.linkedin.com/in/', // TODO(user): full profile URL
  resume: '/resume.pdf',
} as const;

export const chapters = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'horizon', label: 'Horizon' },
] as const;
