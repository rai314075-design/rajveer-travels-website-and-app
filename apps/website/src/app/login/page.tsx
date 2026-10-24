import AuthFormPanel from "@/components/AuthFormPanel";

const ERROR_MESSAGES: Record<string, string> = {
  session_expired:
    "Your sign-in link has expired or was already used. Please try logging in again.",
  access_denied: "Sign-in was cancelled. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string; returnTo?: string };
}) {
  const errorCode = searchParams?.error;
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] : undefined;

  return <AuthFormPanel initialMode="login" initialError={errorMessage} returnTo={searchParams?.returnTo} />;
}
