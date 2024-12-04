import { render as preactRender } from "npm:preact@^10.25.0";
import { useEffect, useState } from "npm:preact@^10.25.0/hooks";

type OgData = {
  title: string;
  image: string;
};
const OgPreview = ({ url }: { url: string }) => {
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchOgData = async () => {
      try {
        const response = await fetch(
          `https://developer.mamezou-tech.com/api/og/preview?url=${encodeURIComponent(url)}`,
        );
        setOgData(await response.json());
      } catch (err) {
        setError(true);
      }
    };

    void fetchOgData();
  }, [url]);

  if (error) {
    return (
      <a
        href={url}
        className="new-tab-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {url}
      </a>
    );
  }

  if (!ogData) {
    return (
      <div className="og-preview-loading">
        Loading preview for <a href={url} target="_blank">{url}</a>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="og-preview"
    >
      <img src={ogData.image} alt={ogData.title} className="og-image" />
      <div className="og-title">{ogData.title}</div>
    </a>
  );
};

export function render({ url }: { url: string }, el: HTMLElement) {
  return preactRender(<OgPreview url={url} />, el);
}
