import Image from "next/image";

const works = [
  {
    title: "Iconoclasm",
    titleZh: "偶像破坏运动",
    year: "2024",
    medium: "installation, mixed media",
    size: "variable dimensions",
    image: "/portfolio-test/iconoclasm-all.jpg",
    ratio: "portrait",
    category: "Installation",
    note: "A vertical installation study on image authority, surface damage, and the ritual charge of fragmented icons."
  },
  {
    title: "Society Hidden",
    titleZh: "社会隐藏",
    year: "2024",
    medium: "image series, sound",
    size: "digital print and audio",
    image: "/portfolio-test/society-hidden-1.jpg",
    ratio: "square",
    category: "Image / Sound",
    note: "A series that treats public visibility as a layered field, where bodies and signals become partially withheld."
  },
  {
    title: "Society Hidden",
    titleZh: "社会隐藏",
    year: "2024",
    medium: "image series, sound",
    size: "digital print and audio",
    image: "/portfolio-test/society-hidden-2.jpg",
    ratio: "square",
    category: "Image / Sound",
    note: "A second image from the same body of work, included here to test sequencing and serial rhythm."
  },
  {
    title: "A Horror That Seems To Exist And Not Exist",
    titleZh: "似有似无的恐怖",
    year: "2023",
    medium: "digital image",
    size: "dimensions variable",
    image: "/portfolio-test/terror-oxvtt.jpg",
    ratio: "landscape",
    category: "Digital Image",
    note: "A staged image exploring low-resolution threat, comic distortion, and the unstable border between figure and sign."
  },
  {
    title: "Measurement 2.0",
    titleZh: "测量 2.0",
    year: "2022",
    medium: "performance documentation",
    size: "photographic documentation",
    image: "/portfolio-test/measurement-2-0.jpg",
    ratio: "landscape",
    category: "Performance",
    note: "A documentation-based project that turns the studio and body into measuring instruments."
  },
  {
    title: "What Are You Looking For",
    titleZh: "你在寻找什么",
    year: "2021",
    medium: "digital collage",
    size: "digital print",
    image: "/portfolio-test/looking-for-1.jpg",
    ratio: "wide",
    category: "Digital Image",
    note: "A panoramic composition testing attention, search behavior, and the way image density changes reading speed."
  }
];

const categories = ["All", "Installation", "Image / Sound", "Digital Image", "Performance"];

export default function PortfolioTestPage() {
  return (
    <main className="portfolio-test">
      <section className="portfolio-hero" aria-labelledby="portfolio-title">
        <div className="portfolio-hero__media">
          <Image
            src="/portfolio-test/looking-for-1.jpg"
            alt="What Are You Looking For artwork documentation"
            fill
            priority
            sizes="(max-width: 960px) 100vw, 65vw"
          />
        </div>
        <div className="portfolio-hero__copy">
          <p className="portfolio-kicker">Selected Works / Portfolio PDF</p>
          <h1 id="portfolio-title">Lu Fanzhou</h1>
          <p>
            A concise selected works portfolio for installation, digital image, performance documentation, and
            image-sound projects, presented with formal captions and project rhythm.
          </p>
          <div className="portfolio-actions">
            <a href="/portfolio-test/lu-fanzhou-portfolio-test.pdf">Download PDF</a>
            <a href="#works">View works</a>
          </div>
          <dl className="portfolio-facts">
            <div>
              <dt>Works</dt>
              <dd>{works.length}</dd>
            </div>
            <div>
              <dt>Range</dt>
              <dd>2021-2024</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>Portfolio PDF</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="portfolio-controls" aria-label="Portfolio categories">
        {categories.map((category) => (
          <a key={category} href={category === "All" ? "#works" : `#${slug(category)}`}>
            {category}
          </a>
        ))}
      </section>

      <section className="portfolio-intro" aria-label="Portfolio statement">
        <p>
          The selected works establish a portfolio rhythm that alternates dense image fields with quieter
          documentation. The sequence favors project clarity first: each work keeps its caption close to the image,
          with short notes that support review without turning the portfolio into explanatory prose.
        </p>
      </section>

      <section className="portfolio-grid" id="works" aria-label="Selected works">
        {works.map((work, index) => (
          <article
            className={`portfolio-work portfolio-work--${work.ratio}`}
            id={categoryAnchor(work.category, index)}
            key={`${work.title}-${index}`}
          >
            <a className="portfolio-work__image" href={work.image}>
              <Image
                src={work.image}
                alt={`${work.title} / ${work.titleZh}`}
                fill
                sizes="(max-width: 960px) 100vw, 70vw"
              />
            </a>
            <div className="portfolio-work__body">
              <div>
                <p className="portfolio-work__index">{String(index + 1).padStart(2, "0")}</p>
                <h2>{work.title}</h2>
                <p className="portfolio-work__zh">{work.titleZh}</p>
              </div>
              <p className="portfolio-work__note">{work.note}</p>
              <dl className="portfolio-work__meta">
                <div>
                  <dt>Year</dt>
                  <dd>{work.year}</dd>
                </div>
                <div>
                  <dt>Medium</dt>
                  <dd>{work.medium}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{work.size}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </section>

      <section className="portfolio-index" aria-labelledby="portfolio-index-title">
        <h2 id="portfolio-index-title">Works Index</h2>
        <ol>
          {works.map((work, index) => (
            <li key={`${work.title}-index-${index}`}>
              <span>{work.title}</span>
              <span>{work.year}</span>
              <span>{work.medium}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function categoryAnchor(category: string, index: number) {
  const firstIndex = works.findIndex((work) => work.category === category);
  return firstIndex === index ? slug(category) : `work-${index + 1}`;
}
