import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthField } from "../../../components/auth/auth-field";
import { AuthShell } from "../../../components/auth/auth-shell";
import { PasswordField } from "../../../components/auth/password-field";
import { signUp } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";
import { getT } from "../../../i18n/server";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const t = await getT();
  const { next } = await searchParams;
  const returnPath = typeof next === "string" ? safeReturnPath(next) : "/onboarding";

  return (
    <AuthShell
      description={t("Tạo tài khoản để luyện theo trình độ, theo dõi tiến bộ và nhận gợi ý phù hợp.")}
      eyebrow={t("BẮT ĐẦU CÙNG SPEAKORA")}
      footer={<>{t("Đã có tài khoản?")} <Link href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>{t("Đăng nhập")}</Link></>}
      title={t("Xây dựng thói quen nói mỗi ngày")}
    >
      <AuthForm action={signUp} submitLabel={t("Tạo tài khoản")}>
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
        <PasswordField autoComplete="new-password" hint={t("Ít nhất 8 ký tự")} />
      </AuthForm>
    </AuthShell>
  );
}
