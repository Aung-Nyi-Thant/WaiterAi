import Diner from "@/modules/diner/Diner";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Diner slug={(await params).slug} />;
}
