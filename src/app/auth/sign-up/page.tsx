import Link from "next/link";
import { AuthField } from "../../../components/auth/auth-field";
import { AuthShell } from "../../../components/auth/auth-shell";
import { PasswordField } from "../../../components/auth/password-field";
import { signUp } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = typeof next === "string" ? safeReturnPath(next) : "/onboarding";

  return (
    <AuthShell
      description="Tạo tài khoản để luyện theo trình độ, theo dõi tiến bộ và nhận gợi ý phù hợp."
      eyebrow="BẮT ĐẦU CÙNG SPEAKORA"
      footer={<>Đã có tài khoản? <Link href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>Đăng nhập</Link></>}
      title="Xây dựng thói quen nói mỗi ngày"
    >
      <AuthForm action={signUp} submitLabel="Tạo tài khoản">
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
        <PasswordField autoComplete="new-password" hint="Ít nhất 8 ký tự" />
      </AuthForm>
    </AuthShell>
  );
}
