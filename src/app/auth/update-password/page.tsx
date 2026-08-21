import { updatePassword } from "../../../modules/auth/actions";
import { safeReturnPath } from "../../../modules/auth/redirect";

type AuthPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function UpdatePasswordPage({ searchParams }: AuthPageProps) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(typeof next === "string" ? next : null);

  async function submit(formData: FormData) {
    "use server";
    await updatePassword(formData);
  }

  return (
    <main>
      <h1>Cập nhật mật khẩu</h1>
      <form action={submit}>
        <input name="next" type="hidden" value={returnPath} />
        <p>
          <label htmlFor="password">Mật khẩu mới</label>
          <input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" />
        </p>
        <button type="submit">Cập nhật mật khẩu</button>
      </form>
    </main>
  );
}
