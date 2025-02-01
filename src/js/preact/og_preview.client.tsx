import { render as preactRender } from "npm:preact@^10.25.0";
import { useEffect, useState } from "npm:preact@^10.25.0/hooks";

type OgData = {
  title: string;
  image: string;
};

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  isExternal?: boolean;
};

const Link = ({ href, isExternal = false, children, ...props }: LinkProps) => {
  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
    </a>
  );
};

const decodeHtmlEntities = (str: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, "text/html");
  return doc.documentElement.textContent || "";
};

const OgPreview = ({ url }: { url: string }) => {
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [error, setError] = useState(false);
  const [isExternal, setIsExternal] = useState(false);

  useEffect(() => {
    setIsExternal(
      !url.startsWith("/") &&
        !url.startsWith("https://developer.mamezou-tech.com"),
    );
    const fetchOgData = async () => {
      try {
        const response = await fetch(
          `https://developer.mamezou-tech.com/api/og/preview?url=${
            encodeURIComponent(url)
          }`,
        );
        setOgData(await response.json());
      } catch (err) {
        setError(true);
      }
    };

    void fetchOgData();
  }, [url]);

  if (error) {
    return <Link href={url} isExternal={isExternal}>{url}</Link>;
  }

  if (!ogData) {
    return (
      <div className="og-preview-loading">
        Loading preview for{" "}
        <Link href={url} isExternal={isExternal}>{url}</Link>
      </div>
    );
  }

  return (
    <Link className="og-preview" href={url} isExternal={isExternal}>
      <img src={ogData.image} alt={ogData.title} className="og-image" />
      <div className="og-title">{decodeHtmlEntities(ogData.title)}</div>
    </Link>
  );
};

export function render({ url }: { url: string }, el: HTMLElement) {
  return preactRender(<OgPreview url={url} />, el);
}
