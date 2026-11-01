import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthField } from "../../../components/auth/auth-field";
import { AuthShell } from "../../../components/auth/auth-shell";
import { requestPasswordReset } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";
import { getT } from "../../../i18n/server";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function ForgotPasswordPage({ searchParams }: AuthPageProps) {
  const t = await getT();
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <AuthShell
      eyebrow={t("Khôi phục tài khoản")}
      title={t("Lấy lại quyền truy cập")}
      description={t("Nhập email đã đăng ký. Speakora sẽ gửi cho bạn một liên kết an toàn để tạo mật khẩu mới.")}
      footer={
        <Link className="auth-secondary-link" href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>
          {t("Quay lại đăng nhập")}
        </Link>
      }
    >
      <AuthForm action={requestPasswordReset} submitLabel={t("Gửi liên kết đặt lại")}>
        <input name="next" type="hidden" value={returnPath} />
        <AuthField
          autoComplete="email"
          hint={t("Chúng tôi sẽ gửi hướng dẫn đến email này.")}
          id="email"
          icon={<Mail size={21} />}
          placeholder="ban@example.com"
          label="Email"
          name="email"
          required
          type="email"
        />
      </AuthForm>
    </AuthShell>
  );
}
