import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Traitement des données personnelles et de santé dans SmokeTracker.",
};

const CARD_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "18px",
  padding: "clamp(18px, 3vw, 26px)",
  marginBottom: "16px",
} as const;

const TEXT_STYLE = {
  color: "var(--text-muted)",
  marginBottom: 0,
} as const;

export default function PrivacyPage() {
  return (
    <main
      style={{
        width: "min(720px, 100%)",
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 24px) 64px",
      }}
    >
      <p style={{ marginBottom: 24 }}>
        <Link href="/">← Retour au suivi</Link>
      </p>

      <h1 style={{ fontSize: "1.6rem", letterSpacing: "-0.02em", marginBottom: 8 }}>
        Confidentialité
      </h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 24 }}>
        Le suivi du tabagisme constitue une donnée de santé au sens de l&apos;article 9 du RGPD.
        Cette page décrit ce qui est stocké, où, et comment tout effacer.
      </p>

      <section style={CARD_STYLE}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Aucun serveur, aucun compte</h2>
        <p style={TEXT_STYLE}>
          L&apos;application est entièrement statique et ne dispose d&apos;aucun serveur
          applicatif. Il n&apos;y a ni inscription, ni identifiant, ni cookie publicitaire, ni
          analytique. Rien n&apos;est envoyé à l&apos;auteur de l&apos;application.
        </p>
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Données stockées sur votre appareil</h2>
        <ul style={{ ...TEXT_STYLE, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Le nombre de cigarettes par jour et l&apos;heure de la dernière saisie.</li>
          <li>Votre objectif quotidien.</li>
          <li>La date de votre dernier export de sauvegarde (pour afficher le rappel).</li>
        </ul>
        <p style={{ ...TEXT_STYLE, marginTop: 12 }}>
          Ces informations sont enregistrées dans le <code>localStorage</code> du navigateur,
          sous la clé <code>smokertrack.v1</code>. Elles ne transitent par aucun réseau.
        </p>
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Hébergement</h2>
        <p style={TEXT_STYLE}>
          La page elle-même est un fichier statique servi par GitHub Pages. Comme pour tout site
          web, l&apos;hébergeur peut journaliser les adresses IP lors du chargement des fichiers ;
          ces journaux ne contiennent aucune de vos consommations. Le service worker met les
          fichiers en cache pour fonctionner hors-ligne.
        </p>
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Vos droits</h2>
        <p style={TEXT_STYLE}>
          Consulter, corriger (« Annuler »), sauvegarder (« Exporter mes données ») et supprimer
          (« Effacer toutes mes données ») sont accessibles directement dans l&apos;application.
          Vous pouvez aussi vider les données du site depuis les réglages du navigateur.
        </p>
        <p style={{ ...TEXT_STYLE, marginTop: 12 }}>
          Durée de conservation : tant que vous ne supprimez pas les données. Aucune copie
          n&apos;est conservée ailleurs, donc <strong>pensez à exporter une sauvegarde</strong>{" "}
          avant de vider le stockage ou de changer d&apos;appareil. L&apos;application n&apos;est
          pas destinée aux mineurs et ne fournit aucun conseil médical.
        </p>
      </section>
    </main>
  );
}
