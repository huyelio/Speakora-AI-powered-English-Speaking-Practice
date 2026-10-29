import { ScenarioCatalog } from "../../../components/conversation/scenario-catalog";
import styles from "../../../components/conversation/conversation.module.css";

/** AI role-play hub. Sessions open on /conversation/session?scenario=… or ?session=…. */
export default function ConversationPage() {
  return (
    <div className={styles.hub}>
      <header className="a5-hub-head">
        <h1>Hội thoại <i>với AI</i></h1>
        <p>Đóng vai trong một tình huống đời thường và luyện nói tự nhiên như ngoài đời.</p>
      </header>
      <ScenarioCatalog />
    </div>
  );
}
