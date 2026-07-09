import { createClient } from "@/lib/supabase/server";
import LandingPage from "./landing-page";

export default async function IndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <LandingPage user={user} />;
}
