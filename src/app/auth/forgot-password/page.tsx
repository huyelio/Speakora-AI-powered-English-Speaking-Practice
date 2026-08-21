import Link from "next/link";
import { requestPasswordReset } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function ForgotPasswordPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <main>
      <h1>Đặt lại mật khẩu</h1>
      <AuthForm action={requestPasswordReset} submitLabel="Gửi email đặt lại mật khẩu">
        <input name="next" type="hidden" value={returnPath} />
        <p>
          <label htmlFor="email">Email</label>
          <input autoComplete="email" id="email" name="email" required type="email" />
        </p>
      </AuthForm>
      <p><Link href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>Quay lại đăng nhập</Link></p>
    </main>
  );
}
