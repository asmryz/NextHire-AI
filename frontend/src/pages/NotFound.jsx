// frontend/src/pages/NotFound.jsx
// Owner: Aarian
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
      <p className="font-heading text-6xl font-extrabold text-rust">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="font-semibold text-brown underline-offset-4 hover:underline">Go to home</Link>
    </div>
  );
}
