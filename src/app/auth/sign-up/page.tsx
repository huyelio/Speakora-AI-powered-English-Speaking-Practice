import Link from "next/link";
import { signUp } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <main>
      <h1>Tạo tài khoản</h1>
      <AuthForm action={signUp} submitLabel="Đăng ký">
        <input name="next" type="hidden" value={returnPath} />
        <p>
          <label htmlFor="email">Email</label>
          <input autoComplete="email" id="email" name="email" required type="email" />
        </p>
        <p>
          <label htmlFor="password">Mật khẩu</label>
          <input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" />
        </p>
      </AuthForm>
      <p>Đã có tài khoản? <Link href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>Đăng nhập</Link></p>
    </main>
  );
}
