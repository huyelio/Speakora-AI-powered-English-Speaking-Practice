import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthField } from "../../../components/auth/auth-field";
import { AuthShell } from "../../../components/auth/auth-shell";
import { PasswordField } from "../../../components/auth/password-field";
import { signIn } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";
import { getT } from "../../../i18n/server";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignInPage({ searchParams }: AuthPageProps) {
  const t = await getT();
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <AuthShell
      layout="welcome"
      description=""
      eyebrow={t("CHÀO MỪNG TRỞ LẠI")}
      footer={<>{t("Chưa có tài khoản?")} <Link href={`/auth/sign-up?next=${encodeURIComponent(returnPath)}`}>{t("Bắt đầu miễn phí")}</Link></>}
      title={t("Đăng nhập để tiếp tục luyện nói")}
    >
      <AuthForm action={signIn} submitLabel={t("Đăng nhập")}>
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
          labelAction={<Link href={`/auth/forgot-password?next=${encodeURIComponent(returnPath)}`}>{t("Quên mật khẩu?")}</Link>}
        />
      </AuthForm>
    </AuthShell>
  );
}
