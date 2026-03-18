import { cookies } from "next/headers";
import { validateToken, COOKIE_NAME } from "@/lib/adminAuth";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const authenticated = validateToken(token);

  if (!authenticated) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
