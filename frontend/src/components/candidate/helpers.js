// frontend/src/components/candidate/helpers.js
// Owner: Shivani
// Small date / text helpers shared by the candidate pages.

// '2026-11-20' or ISO -> '20 Nov 2026'
export const fmtDate = (d, withYear = true) =>
  d
    ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
      })
    : '—';

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Days from today until a 'YYYY-MM-DD' date (0 = today), null when no date
export function daysLeft(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${date}T00:00:00`) - today) / 86400000);
}

// { text, urgent } for a closing date
export function closingLabel(date) {
  const d = daysLeft(date);
  if (d === null) return { text: 'Open until filled', urgent: false };
  if (d <= 0) return { text: 'Closes today', urgent: true };
  if (d === 1) return { text: 'Closes tomorrow', urgent: true };
  if (d <= 5) return { text: `Closes in ${d} days`, urgent: true };
  return { text: `Closes ${fmtDate(date, false)}`, urgent: false };
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// 'Software Development' -> 'SD'
export const initials = (text = '') =>
  text.split(/[\s&/]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export const STAGE_TEXT = {
  APPLIED: 'Our team is reviewing your answers.',
  SHORTLISTED: 'You are shortlisted. HR will contact you about an interview.',
  INTERVIEW: 'Your interview is being arranged. Check your email for details.',
  OFFER: 'You have received an offer. HR will contact you.',
  HIRED: 'Congratulations, you have been hired!',
  REJECTED: 'This application was not successful. You can apply for another position.',
};
