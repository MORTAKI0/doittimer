import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

function iconProps({ size = 18, className, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    ...props,
  };
}

export function IconDashboard(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

export function IconTasks(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

export function IconFocus(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12l4 4L19 6" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5Z" />
    </svg>
  );
}

export function IconPulse(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 12h4l2-5 4 10 2-5h4" />
    </svg>
  );
}
