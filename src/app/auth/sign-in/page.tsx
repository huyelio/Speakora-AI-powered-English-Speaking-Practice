import Link from "next/link";
import { AuthField } from "../../../components/auth/auth-field";
import { AuthShell } from "../../../components/auth/auth-shell";
import { PasswordField } from "../../../components/auth/password-field";
import { signIn } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignInPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <AuthShell
      description="Đăng nhập để tiếp tục mục tiêu hôm nay và xem lại tiến độ của bạn."
      eyebrow="CHÀO MỪNG TRỞ LẠI"
      footer={<>Chưa có tài khoản? <Link href={`/auth/sign-up?next=${encodeURIComponent(returnPath)}`}>Bắt đầu miễn phí</Link></>}
      title="Tiếp tục hành trình nói tự tin"
    >
      <AuthForm action={signIn} submitLabel="Đăng nhập">
        <input name="next" type="hidden" value={returnPath} />
        <AuthField
          autoComplete="email"
          id="email"
          label="Email"
          name="email"
          placeholder="ban@example.com"
          required
          type="email"
        />
        <PasswordField
          autoComplete="current-password"
          labelAction={<Link href={`/auth/forgot-password?next=${encodeURIComponent(returnPath)}`}>Quên mật khẩu?</Link>}
        />
      </AuthForm>
    </AuthShell>
  );
}
