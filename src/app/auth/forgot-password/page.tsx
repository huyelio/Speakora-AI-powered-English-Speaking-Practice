import Link from "next/link";
import { AuthField } from "../../../components/auth/auth-field";
import { AuthShell } from "../../../components/auth/auth-shell";
import { requestPasswordReset } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function ForgotPasswordPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <AuthShell
      eyebrow="Khôi phục tài khoản"
      title="Lấy lại quyền truy cập"
      description="Nhập email đã đăng ký. Speakora sẽ gửi cho bạn một liên kết an toàn để tạo mật khẩu mới."
      footer={
        <Link className="auth-secondary-link" href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>
          Quay lại đăng nhập
        </Link>
      }
    >
      <AuthForm action={requestPasswordReset} submitLabel="Gửi liên kết đặt lại">
        <input name="next" type="hidden" value={returnPath} />
        <AuthField
          autoComplete="email"
          hint="Chúng tôi sẽ gửi hướng dẫn đến email này."
          id="email"
          label="Email"
          name="email"
          required
          type="email"
        />
      </AuthForm>
    </AuthShell>
  );
}
