import Diner from "./Diner";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Diner slug={(await params).slug} />;
}
