import AuthFormPanel from "@/components/AuthFormPanel";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: { returnTo?: string };
}) {
  return <AuthFormPanel initialMode="register" returnTo={searchParams?.returnTo} />;
}
