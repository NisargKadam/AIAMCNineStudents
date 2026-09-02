/**
 * Remounts on every navigation, so the deck glides in each time a route
 * changes. The rail and header live in the layout and stay fixed, which is
 * what makes the movement read as content travelling rather than the whole
 * viewport lurching.
 */
export default function PortalTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="glide preserve-3d">{children}</div>;
}
