const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, PageNumber, PageBreak
} = require('docx');
const fs = require('fs');

const GOLD = "C9A84C";
const DARK = "1A1A2E";
const BORDER_COLOR = "C9A84C";

function border(color) {
  return { style: BorderStyle.SINGLE, size: 1, color: color || BORDER_COLOR };
}
function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 4 } },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        font: "Calibri",
        color: "1A1A1A",
        allCaps: true,
        characterSpacing: 40,
      })
    ]
  });
}

function field(label, value, highlighted) {
  const borders = {
    top: noBorder(), bottom: border("E8E0CC"), left: noBorder(), right: noBorder()
  };
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 3000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: highlighted ? { fill: "FFF8E8", type: ShadingType.CLEAR } : { fill: "F8F6F0", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 20, font: "Calibri", color: "555533" })]
        })]
      }),
      new TableCell({
        borders,
        width: { size: 6360, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 160, right: 120 },
        shading: highlighted ? { fill: "FFF8E8", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: value, size: 20, font: "Calibri", color: value.startsWith('[') ? "AA8822" : "1A1A1A", italics: value.startsWith('[') })]
        })]
      })
    ]
  });
}

function para(text, opts) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: "333333", ...(opts || {}) })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: "333333" })]
  });
}

function gameCategory(category, games) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "E0D8C0" };
  const borders = { top: b, bottom: b, left: b, right: b };
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 2800, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 120 },
        shading: { fill: "F5F0E0", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: category, bold: true, size: 20, font: "Calibri", color: "7A6020" })]
        })]
      }),
      new TableCell({
        borders,
        width: { size: 6560, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 120 },
        shading: { fill: "FDFCF8", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: games, size: 20, font: "Calibri", color: "333333" })]
        })]
      })
    ]
  });
}

function complianceRow(label, value) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: "D0E8D0" };
  const borders = { top: b, bottom: b, left: b, right: b };
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 3200, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 120 },
        shading: { fill: "F0F8F0", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 20, font: "Calibri", color: "2A6A2A" })]
        })]
      }),
      new TableCell({
        borders,
        width: { size: 6160, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 120 },
        shading: { fill: "FAFCFA", type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: value, size: 20, font: "Calibri", color: "333333" })]
        })]
      })
    ]
  });
}

function spacer(before) {
  return new Paragraph({ spacing: { before: before || 120, after: 0 }, children: [] });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u25AA",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } }
        }]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: GOLD, space: 4 } },
            spacing: { before: 0, after: 80 },
            children: [
              new TextRun({ text: "HATHOR ROYAL CASINO", bold: true, size: 18, font: "Calibri", color: GOLD, allCaps: true }),
              new TextRun({ text: "  \u2014  Gaming License Application", size: 18, font: "Calibri", color: "888888" }),
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 3, color: GOLD, space: 4 } },
            spacing: { before: 80 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CONFIDENTIAL \u00B7 HATHOR Royal Ltd. \u00B7 hathor.casino \u00B7 Page ", size: 16, font: "Calibri", color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Calibri", color: "AAAAAA" }),
            ]
          })
        ]
      })
    },
    children: [

      // ── COVER BLOCK ──────────────────────────────────────
      spacer(480),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: "\u2B21  HATHOR ROYAL CASINO", bold: true, size: 56, font: "Calibri", color: GOLD, allCaps: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: "Gaming License Application \u2014 Business Description", size: 26, font: "Calibri", color: "666644", italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: GOLD, space: 6 } },
        spacing: { before: 0, after: 360 },
        children: [new TextRun({ text: "Anjouan Online Gaming Commission  \u00B7  2026", size: 20, font: "Calibri", color: "999977" })]
      }),
      spacer(240),

      // ── 1. COMPANY INFORMATION ────────────────────────────
      sectionTitle("1. Company Information"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          field("Company Name", "HATHOR Royal Ltd."),
          field("Registered Address", "[TO BE FILLED BY APPLICANT]", true),
          field("Director(s)", "[TO BE FILLED BY APPLICANT]", true),
          field("Contact Email", "[TO BE FILLED — e.g. support@yourdomain.com]", true),
          field("Website", "[TO BE FILLED — e.g. yourdomain.casino]", true),
          field("Platform Domain", "[TO BE FILLED — e.g. https://yourdomain.casino]", true),
        ]
      }),
      spacer(200),

      // ── 2. BUSINESS DESCRIPTION ───────────────────────────
      sectionTitle("2. Business Description"),
      spacer(80),
      para(
        "HATHOR Royal Casino is a premium online casino platform built and operated by HATHOR Royal Ltd. " +
        "The platform operates on a virtual token system (1 EUR = 100 tokens), providing entertainment-focused " +
        "online gaming services to adult players (18+) worldwide. All games use cryptographically secure " +
        "server-side random number generation with a provably fair verification system, ensuring full " +
        "transparency and player trust."
      ),
      para(
        "The casino offers a diverse portfolio of 17 unique games across 6 categories, supporting 11 languages " +
        "and accepting both cryptocurrency and card payments. HATHOR Royal Casino is fully committed to " +
        "responsible gambling practices, KYC/AML compliance, and GDPR-compliant data protection."
      ),
      spacer(200),

      // ── 3. GAMES OFFERED ──────────────────────────────────
      sectionTitle("3. Games Offered  (17 unique games)"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2800, 6560],
        rows: [
          gameCategory("Slots", "Classic Slot Machine; NEXUS SLOTS \u2014 3D premium slot experience"),
          gameCategory("Crash Games", "Dragon Crash \u2014 multiplier crash game"),
          gameCategory("Table Games", "Blackjack (standard 21); Baccarat (punto banco); Roulette (European single zero)"),
          gameCategory("Card & Dice", "HiLo \u2014 predict higher or lower; Video Poker \u2014 Jacks or Better"),
          gameCategory("Strategy Games", "Mines \u2014 pick safe tiles; Dragon Tower \u2014 tower climbing game"),
          gameCategory("Number Games", "Keno \u2014 20-number draw; Limbo \u2014 target multiplier; Plinko \u2014 ball drop; Dice \u2014 roll over/under"),
          gameCategory("Wheel Games", "NEXUS WHEEL \u2014 3D spinning wheel with multipliers; Coin Flip"),
        ]
      }),
      spacer(200),

      // ── 4. TECHNICAL INFRASTRUCTURE ──────────────────────
      sectionTitle("4. Technical Infrastructure"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          field("Platform", "Custom-built proprietary software"),
          field("Hosting", "Railway.app (cloud infrastructure, 99.9% uptime SLA)"),
          field("RNG", "Cryptographically secure server-side random number generation"),
          field("Currency", "Virtual tokens \u2014 no real money gambling"),
          field("Languages", "11: English, Lithuanian, Russian, German, Polish, French, Turkish, Arabic, Chinese, Hindi, Ukrainian"),
          field("Payment Processing", "Cryptocurrency (NowPayments); Card payments (Stripe)"),
          field("Backend", "Node.js + Express; SQLite database"),
          field("Security", "HTTPS, token-based authentication, rate limiting, DDoS protection"),
        ]
      }),
      spacer(200),

      // ── 5. COMPLIANCE & PLAYER PROTECTION ────────────────
      sectionTitle("5. Compliance & Player Protection"),
      spacer(80),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3200, 6160],
        rows: [
          complianceRow("AML / KYC Policy", "Full KYC verification required before any withdrawal. Documents verified within 48 hours."),
          complianceRow("Responsible Gambling", "Self-exclusion, deposit limits, and reality checks available to all players."),
          complianceRow("Age Verification", "Mandatory 18+ verification for all players upon registration."),
          complianceRow("Restricted Jurisdictions", "USA, United Kingdom, France, Netherlands, Spain, Italy, Belgium, Australia."),
          complianceRow("Data Protection", "GDPR compliant. Full Privacy Policy and Data Processing agreements in place."),
          complianceRow("Governing Law", "Anjouan, Union of Comoros."),
          complianceRow("Platform URL", "[TO BE FILLED \u2014 your casino domain]"),
          complianceRow("Contact Email", "[TO BE FILLED \u2014 support / compliance email]"),
          complianceRow("Policies Published", "Terms & Conditions, Privacy Policy, AML Policy, Responsible Gambling Policy \u2014 all publicly accessible on the platform."),
        ]
      }),
      spacer(200),

      // ── 6. TARGET MARKETS ─────────────────────────────────
      sectionTitle("6. Target Markets"),
      spacer(80),
      para("HATHOR Royal Casino primarily targets players in the following regions:"),
      spacer(40),
      bullet("Central & Eastern Europe (Poland, Czech Republic, Slovakia, Hungary, Romania, Bulgaria, Croatia, Serbia)"),
      bullet("Western Europe \u2014 unregulated markets (Austria, Switzerland, Finland, Norway, Iceland, Cyprus, Malta, Greece, Portugal)"),
      bullet("Baltic & Nordic (Estonia, Latvia, Lithuania, Denmark, Sweden \u2014 where permitted)"),
      bullet("CIS Countries (Ukraine, Kazakhstan, Georgia, Armenia, Azerbaijan)"),
      bullet("Asia (India, Vietnam, Thailand, Philippines, Bangladesh, Indonesia)"),
      bullet("Middle East (Gulf states, Turkey, Egypt, Jordan, Lebanon)"),
      bullet("Latin America (Brazil, Mexico, Colombia, Argentina, Chile, Peru)"),
      bullet("Africa (Nigeria, South Africa, Kenya, Ghana)"),
      spacer(120),
      para(
        "Note: The platform does not accept players from jurisdictions where online gambling is explicitly " +
        "prohibited or where a local licence is mandatory (USA, UK, France, Netherlands, Spain, Italy, " +
        "Belgium, Australia). All player geo-blocking is enforced at the platform level.",
        { color: "666666", italics: true }
      ),
      spacer(280),

      // ── SIGNATURE BLOCK ───────────────────────────────────
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCAA", space: 4 } },
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: "Declaration", bold: true, size: 22, font: "Calibri", color: "444422" })]
      }),
      para(
        "I hereby declare that all information provided in this application is true, accurate, and complete " +
        "to the best of my knowledge. HATHOR Royal Ltd. commits to full compliance with Anjouan Online " +
        "Gaming Commission regulations and all applicable laws."
      ),
      spacer(400),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4500, 4860],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: { top: noBorder(), bottom: border("333333"), left: noBorder(), right: noBorder() },
                width: { size: 4500, type: WidthType.DXA },
                margins: { top: 40, bottom: 40, left: 0, right: 0 },
                children: [para(" "), para("Signature & Stamp", { color: "888888", size: 18 })]
              }),
              new TableCell({
                borders: { top: noBorder(), bottom: border("333333"), left: noBorder(), right: noBorder() },
                width: { size: 4860, type: WidthType.DXA },
                margins: { top: 40, bottom: 40, left: 120, right: 0 },
                children: [para(" "), para("Date", { color: "888888", size: 18 })]
              }),
            ]
          })
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(function(buffer) {
  fs.writeFileSync('C:/Users/PC/casino/HATHOR_License_Application_v2.docx', buffer);
  console.log('Done: HATHOR_License_Application_v2.docx (' + (buffer.length / 1024).toFixed(1) + ' KB)');
});
