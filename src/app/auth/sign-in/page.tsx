import Link from "next/link";
import { Mail } from "lucide-react";
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
      layout="welcome"
      description=""
      eyebrow="CHÀO MỪNG TRỞ LẠI"
      footer={<>Chưa có tài khoản? <Link href={`/auth/sign-up?next=${encodeURIComponent(returnPath)}`}>Bắt đầu miễn phí</Link></>}
      title="Đăng nhập để tiếp tục luyện nói"
    >
      <AuthForm action={signIn} submitLabel="Đăng nhập">
        <input name="next" type="hidden" value={returnPath} />
        <AuthField
          autoComplete="email"
          id="email"
          icon={<Mail size={21} />}
          label="Email"
          name="email"
          placeholder="ban@example.com"
          required
          type="email"
        />
        <PasswordField
          illustrated
          autoComplete="current-password"
          labelAction={<Link href={`/auth/forgot-password?next=${encodeURIComponent(returnPath)}`}>Quên mật khẩu?</Link>}
        />
      </AuthForm>
    </AuthShell>
  );
}
