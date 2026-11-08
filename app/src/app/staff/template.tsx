// A template (unlike a layout) is mounted again on every navigation, so the page content slides in each time the route changes.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="sa-page">{children}</div>;
}
