import { updatePassword } from "../../../modules/auth/actions";
import { AuthForm } from "../../../modules/auth/form";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function UpdatePasswordPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  return (
    <main>
      <h1>Cập nhật mật khẩu</h1>
      <AuthForm action={updatePassword} submitLabel="Cập nhật mật khẩu">
        <input name="next" type="hidden" value={returnPath} />
        <p>
          <label htmlFor="password">Mật khẩu mới</label>
          <input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" />
        </p>
      </AuthForm>
    </main>
  );
}
