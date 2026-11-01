import Link from "next/link";
import { AuthShell } from "../../../components/auth/auth-shell";
import { PasswordField } from "../../../components/auth/password-field";
import { updatePassword } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";
import { getT } from "../../../i18n/server";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function UpdatePasswordPage({ searchParams }: AuthPageProps) {
  const t = await getT();
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <AuthShell
      eyebrow={t("Bảo mật tài khoản")}
      title={t("Tạo mật khẩu mới")}
      description={t("Chọn một mật khẩu mới để tiếp tục hành trình luyện nói của bạn.")}
      footer={
        <Link className="auth-secondary-link" href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>
          {t("Quay lại đăng nhập")}
        </Link>
      }
    >
      <AuthForm action={updatePassword} submitLabel={t("Cập nhật mật khẩu")}>
        <input name="next" type="hidden" value={returnPath} />
        <PasswordField
          autoComplete="new-password"
          hint={t("Ít nhất 8 ký tự.")}
          id="password"
          label={t("Mật khẩu mới")}
        />
      </AuthForm>
    </AuthShell>
  );
}
