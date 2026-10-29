// frontend/src/utils/roles.js
// Owner: Aarian
export const ROLES = {
  HR_ADMIN: 'HR_ADMIN',
  INTERVIEWER: 'INTERVIEWER',
  CANDIDATE: 'CANDIDATE',
};

// Where each role lands after login (SRS REQ-5)
export function homeForRole(role) {
  if (role === ROLES.HR_ADMIN) return '/hr';
  if (role === ROLES.INTERVIEWER) return '/interviewer';
  if (role === ROLES.CANDIDATE) return '/candidate';
  return '/login';
}
