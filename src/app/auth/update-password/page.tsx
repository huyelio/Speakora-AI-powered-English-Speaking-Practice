import Link from "next/link";
import { AuthShell } from "../../../components/auth/auth-shell";
import { PasswordField } from "../../../components/auth/password-field";
import { updatePassword } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function UpdatePasswordPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <AuthShell
      eyebrow="Bảo mật tài khoản"
      title="Tạo mật khẩu mới"
      description="Chọn một mật khẩu mới để tiếp tục hành trình luyện nói của bạn."
      footer={
        <Link className="auth-secondary-link" href={`/auth/sign-in?next=${encodeURIComponent(returnPath)}`}>
          Quay lại đăng nhập
        </Link>
      }
    >
      <AuthForm action={updatePassword} submitLabel="Cập nhật mật khẩu">
        <input name="next" type="hidden" value={returnPath} />
        <PasswordField
          autoComplete="new-password"
          hint="Ít nhất 8 ký tự."
          id="password"
          label="Mật khẩu mới"
        />
      </AuthForm>
    </AuthShell>
  );
}
