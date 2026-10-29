// frontend/src/services/departments.js
// Owner: Aarian (reads Shivani's /api/departments; Shivani can use it for filters too)
import { useEffect, useState } from 'react';
import api from './api';

// const { departments, error } = useDepartments();
export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .get('/departments')
      .then(({ data }) => alive && setDepartments(data.departments || []))
      .catch(() => alive && setError('Departments could not be loaded. Make sure the departments API is running.'));
    return () => {
      alive = false;
    };
  }, []);

  return { departments, error };
}
