import type { SVGProps } from "react";

/** Icônes inline (aucune dépendance, aucun réseau requis). */
export function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M12 2c3.2 4.6 6 7 6 11a6 6 0 1 1-12 0c0-4 2.8-6.4 6-11Zm0 9.2c-1.5 2-2.4 2.8-2.4 4.1a2.4 2.4 0 0 0 4.8 0c0-1.3-.9-2.1-2.4-4.1Z"
      />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" {...props}>
      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  );
}

export function UndoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M9 7V4L3 9l6 5v-3.5c3 0 5.5 1 6.5 3.5.6-4-2-7-6.5-7Z"
      />
    </svg>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.1-4.1 1.4 1.4L11 16Z"
      />
    </svg>
  );
}
