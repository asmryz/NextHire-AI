// frontend/src/components/ui/Avatar.jsx
// Owner: Aarian (UI kit)
// Shows the profile picture, or initials if there is none.
//   <Avatar name={user.full_name} src={user.profile_picture_url} size={40} />
export default function Avatar({ name = '', src, size = 40 }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const style = { width: size, height: size, fontSize: Math.max(12, size / 3) };

  if (src) {
    return (
      <img
        src={src}
        alt={`${name} profile picture`}
        style={style}
        className="shrink-0 rounded-full border-2 border-amber object-cover"
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={`${name} profile picture`}
      style={style}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-amber bg-cream font-semibold text-brown"
    >
      {initials || '?'}
    </span>
  );
}
