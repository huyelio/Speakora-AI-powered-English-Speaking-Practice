import { ScenarioCatalog } from "../../../components/conversation/scenario-catalog";
import styles from "../../../components/conversation/conversation.module.css";
import { getT } from "../../../i18n/server";

/** AI role-play hub. Sessions open on /conversation/session?scenario=… or ?session=…. */
export default async function ConversationPage() {
  const t = await getT();
  return (
    <div className={styles.hub}>
      <header className="a5-hub-head">
        <h1>{t("Hội thoại")} <i>{t("với AI")}</i></h1>
        <p>{t("Đóng vai trong một tình huống đời thường và luyện nói tự nhiên như ngoài đời.")}</p>
      </header>
      <ScenarioCatalog />
    </div>
  );
}
