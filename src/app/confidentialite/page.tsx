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
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Données collectées</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-muted)", lineHeight: 1.7 }}>
          <li>Un identifiant technique anonyme (Firebase Auth) servant à isoler vos données.</li>
          <li>Le nombre de cigarettes par jour et l&apos;horodatage de la dernière saisie.</li>
          <li>Votre objectif quotidien.</li>
        </ul>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Aucune donnée de localisation, aucun contact, aucune donnée publicitaire, aucun traceur
          tiers, aucune analytique.
        </p>
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Hébergement</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Les données sont écrites dans le projet Firebase/Firestore que <em>vous</em> avez
          configuré. Aucun serveur intermédiaire de SmokeTracker ne les reçoit ni ne les revend.
          Choisissez une région européenne lors de la création du projet pour limiter les
          transferts hors UE.
        </p>
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Sécurité</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Chaque lecture et écriture est contrôlée par les règles Firestore du dépôt
          (<code>firestore.rules</code>) : un utilisateur ne peut accéder qu&apos;aux documents
          dont l&apos;identifiant correspond à son propre <code>uid</code>. Les horodatages sont
          générés par le serveur, jamais par le navigateur.
        </p>
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Vos droits</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Vous pouvez à tout moment consulter, corriger (bouton « Annuler ») et supprimer
          l&apos;intégralité de vos données via « Effacer toutes mes données » sur l&apos;écran
          principal. La suppression est immédiate et définitive.
        </p>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Durée de conservation : tant que vous ne supprimez pas vos données. L&apos;application
          n&apos;est pas destinée aux mineurs et ne fournit aucun conseil médical.
        </p>
      </section>
    </main>
  );
}
