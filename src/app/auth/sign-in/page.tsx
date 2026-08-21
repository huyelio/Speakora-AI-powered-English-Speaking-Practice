import Link from "next/link";
import { signIn } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignInPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <main>
      <h1>Đăng nhập</h1>
      <AuthForm action={signIn} submitLabel="Đăng nhập">
        <input name="next" type="hidden" value={returnPath} />
        <p>
          <label htmlFor="email">Email</label>
          <input autoComplete="email" id="email" name="email" required type="email" />
        </p>
        <p>
          <label htmlFor="password">Mật khẩu</label>
          <input autoComplete="current-password" id="password" minLength={8} name="password" required type="password" />
        </p>
      </AuthForm>
      <p><Link href={`/auth/forgot-password?next=${encodeURIComponent(returnPath)}`}>Quên mật khẩu?</Link></p>
      <p>Chưa có tài khoản? <Link href={`/auth/sign-up?next=${encodeURIComponent(returnPath)}`}>Đăng ký</Link></p>
    </main>
  );
}
