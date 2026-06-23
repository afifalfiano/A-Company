export function validateProjectInput(title: string, description: string): string | null {
  const t = title.trim();
  const d = description.trim();
  if (!t) return "Title cannot be empty";
  if (t.length > 200) return "Title must be 200 characters or fewer";
  if (d.length > 2000) return "Description must be 2000 characters or fewer";
  return null;
}
