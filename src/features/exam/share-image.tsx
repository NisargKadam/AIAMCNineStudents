import "server-only";
import { ImageResponse } from "next/og";
import { certificateFonts, verificationUrl } from "./certificate";
import { linkedinPath, type Instructor } from "./instructor";

const shapes = {
  /** Link previews on LinkedIn and elsewhere. */
  wide: { width: 1200, height: 630 },
  /** A feed post on Instagram. */
  square: { width: 1080, height: 1080 },
} as const;
export type ShareShape = keyof typeof shapes;

const navy = "#10212e";
const gold = "#b79756";
const paper = "#faf7f0";
const muted = "#62696d";

/**
 * The certificate as an image made for sharing. The instructor's name and
 * handles are printed on it, so wherever the picture goes the credit goes
 * with it.
 */
export async function certificateShareImage(
  certificate: { id: string; name: string; issuedAt: Date },
  shape: ShareShape,
  instructor: Instructor,
  options: { download?: boolean } = {},
) {
  const [noto, vibes] = await certificateFonts();
  const { width, height } = shapes[shape];
  const square = shape === "square";
  // The square canvas is taller, so everything on it is set a size up.
  const k = square ? 1.3 : 1;
  const px = (value: number) => Math.round(value * k);
  const nameSize = px(
    certificate.name.length > 34 ? 38 : certificate.name.length > 22 ? 50 : 62,
  );
  const handle = instructor.instagramHandle.trim().replace(/^@+/, "");
  const credit = [
    `Instructor: ${instructor.name}`,
    handle ? `@${handle}` : null,
    linkedinPath(instructor),
  ].filter(Boolean);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: navy,
        padding: px(24),
        paddingBottom: 0,
        fontFamily: "Noto Sans",
        color: navy,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: paper,
          border: `3px solid ${gold}`,
          borderRadius: 18,
          padding: `${px(30)}px ${px(56)}px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            bottom: 12,
            left: 12,
            display: "flex",
            border: "1px solid rgba(183,151,86,.5)",
            borderRadius: 10,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: px(17),
            letterSpacing: px(5),
            color: "#927039",
          }}
        >
          AI AMC / AGENTIC AI MASTERCLASS
        </div>
        <div
          style={{
            display: "flex",
            marginTop: px(square ? 34 : 16),
            fontSize: px(46),
          }}
        >
          Certificate of Completion
        </div>
        <div
          style={{
            display: "flex",
            marginTop: px(square ? 40 : 18),
            fontSize: px(13),
            letterSpacing: px(4),
            color: muted,
          }}
        >
          PRESENTED TO
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
            maxWidth: "92%",
            marginTop: px(8),
            fontSize: nameSize,
            lineHeight: 1.15,
          }}
        >
          {certificate.name}
        </div>
        <div
          style={{
            display: "flex",
            width: "58%",
            height: 2,
            marginTop: px(square ? 30 : 16),
            marginBottom: px(square ? 30 : 16),
            background: "rgba(183,151,86,.6)",
          }}
        />
        <div style={{ display: "flex", fontSize: px(19) }}>
          AI Agentic MasterClass Certified
        </div>
        <div style={{ display: "flex", marginTop: px(4), fontSize: px(30) }}>
          AI &amp; LLM Expert Engineer
        </div>
        <div
          style={{
            display: "flex",
            marginTop: px(square ? 40 : 14),
            fontFamily: "Great Vibes",
            fontSize: px(50),
            lineHeight: 1.1,
          }}
        >
          {instructor.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: px(12),
            letterSpacing: px(3),
            color: "#927039",
          }}
        >
          {`CERTIFIED BY ${instructor.name.toUpperCase()}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: px(square ? 44 : 14),
            fontSize: px(13),
            color: muted,
          }}
        >
          {`Issued ${certificate.issuedAt.toLocaleDateString("en-GB", {
            timeZone: "UTC",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}  ·  Verify at ${verificationUrl(certificate.id).replace(/^https?:\/\//, "")}`}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: px(58),
          fontSize: px(19),
          color: "#f1dca6",
        }}
      >
        {credit.join("    ·    ")}
      </div>
    </div>,
    {
      width,
      height,
      fonts: [
        { name: "Noto Sans", data: noto, weight: 400, style: "normal" },
        { name: "Great Vibes", data: vibes, weight: 400, style: "normal" },
      ],
      headers: {
        // The credit line follows the deployment's settings, so the image is
        // not cached for long.
        "Cache-Control": "public, max-age=3600",
        ...(options.download
          ? {
              "Content-Disposition":
                'attachment; filename="AI-AMC-Certificate.png"',
            }
          : {}),
      },
    },
  );
}
