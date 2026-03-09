import { useState, useCallback } from "react";

const LOAN_TYPES = ["Conventional", "FHA", "VA", "USDA"];

const SITES = {
  LDP: {
    label: "LDP",
    bucket: "213 – LDP",
    url: "https://www.hud.gov/program_offices/general_counsel/limited_denial_participation_hud_funding_disqualifications",
    allTypes: true,
    description: "Limited Denial of Participation list",
    fields: () => [{ label: "No borrower data needed — print full page (Landscape, 80%, Selection Only)" }],
  },
  GSA: {
    label: "GSA / SAM",
    bucket: "214 – GSA",
    url: "https://sam.gov/search/?index=ex&sort=-relevance&page=1&pageSize=25&sfm%5BsimpleSearch%5D%5BkeywordRadio%5D=ALL&sfm%5Bstatus%5D%5Bis_active%5D=true&sfm%5Bstatus%5D%5Bis_inactive%5D=false",
    allTypes: true,
    description: "Excluded Individuals search — add all borrowers + LO",
    fields: (data) => {
      const rows = [];
      if (data.borrowerFirst) rows.push({ label: "Borrower Full Name", value: [data.borrowerFirst, data.borrowerMiddle, data.borrowerLast].filter(Boolean).join(" ") });
      if (data.borrowerSSN) rows.push({ label: "Borrower SSN", value: data.borrowerSSN });
      if (data.coBorrower && data.coBorrowerFirst) rows.push({ label: "Co-Borrower Full Name", value: [data.coBorrowerFirst, data.coBorrowerMiddle, data.coBorrowerLast].filter(Boolean).join(" ") });
      if (data.coBorrower && data.coBorrowerSSN) rows.push({ label: "Co-Borrower SSN", value: data.coBorrowerSSN });
      if (data.loFirst) rows.push({ label: "LO Full Name", value: [data.loFirst, data.loMiddle, data.loLast].filter(Boolean).join(" ") });
      return rows;
    },
  },
  OFAC: {
    label: "OFAC",
    bucket: "220 – OFAC Search",
    url: "https://sanctionssearch.ofac.treas.gov/",
    allTypes: true,
    description: "Sanctions list — search all borrowers by name + state",
    fields: (data) => {
      const rows = [];
      if (data.borrowerFirst) rows.push({ label: "Borrower Full Name", value: [data.borrowerFirst, data.borrowerMiddle, data.borrowerLast].filter(Boolean).join(" ") });
      if (data.propertyState) rows.push({ label: "State", value: data.propertyState });
      if (data.coBorrower && data.coBorrowerFirst) rows.push({ label: "Co-Borrower Full Name", value: [data.coBorrowerFirst, data.coBorrowerMiddle, data.coBorrowerLast].filter(Boolean).join(" ") });
      return rows;
    },
  },
  BK: {
    label: "BK Search (AACER)",
    bucket: "225 – Bankruptcy Search",
    url: "https://www.aacer2.net/Home#/docketQueues",
    allTypes: true,
    description: "Bankruptcy search — search all borrowers",
    fields: (data) => {
      const rows = [];
      if (data.borrowerFirst) rows.push({ label: "Borrower First Name", value: data.borrowerFirst });
      if (data.borrowerLast) rows.push({ label: "Borrower Last Name", value: data.borrowerLast });
      if (data.borrowerSSN) rows.push({ label: "Borrower Last 4 SSN", value: data.borrowerSSN.slice(-4) });
      if (data.coBorrower && data.coBorrowerFirst) rows.push({ label: "Co-Borrower First Name", value: data.coBorrowerFirst });
      if (data.coBorrower && data.coBorrowerLast) rows.push({ label: "Co-Borrower Last Name", value: data.coBorrowerLast });
      if (data.coBorrower && data.coBorrowerSSN) rows.push({ label: "Co-Borrower Last 4 SSN", value: data.coBorrowerSSN.slice(-4) });
      return rows;
    },
  },
  CAIVRS: {
    label: "CAIVRS",
    bucket: "215 – CAIVRS",
    url: "https://entp.hud.gov/clas/",
    types: ["VA"],
    description: "VA loans only — Lender ID: 5598980000",
    fields: (data) => {
      const rows = [{ label: "Lender ID (VA)", value: "5598980000" }, { label: "Agency", value: "Veterans' Affairs" }];
      if (data.borrowerSSN) rows.push({ label: "Borrower SSN", value: data.borrowerSSN });
      if (data.coBorrower && data.coBorrowerSSN) rows.push({ label: "Co-Borrower SSN", value: data.coBorrowerSSN });
      return rows;
    },
  },
  FHAQuery: {
    label: "FHA Connection",
    bucket: "123/124/125 – Case/MIC/Refi",
    url: "https://entp.hud.gov/clas/",
    types: ["FHA"],
    description: "FHA loans only — Case Query + MIC + Refi Credit Query",
    fields: (data) => {
      const rows = [];
      if (data.borrowerSSN) rows.push({ label: "Borrower SSN", value: data.borrowerSSN });
      if (data.coBorrower && data.coBorrowerSSN) rows.push({ label: "Co-Borrower SSN", value: data.coBorrowerSSN });
      if (data.propertyZip) rows.push({ label: "Property Zip Code", value: data.propertyZip });
      return rows;
    },
  },
  WebLGY: {
    label: "VA WebLGY (IRRRL)",
    bucket: "206 – Case Assignment",
    url: "https://lgy.va.gov/lgyhub/",
    types: ["VA"],
    description: "VA loans only — Order IRRRL / Case Number",
    fields: (data) => {
      const rows = [];
      if (data.borrowerSSN) rows.push({ label: "Borrower SSN", value: data.borrowerSSN });
      if (data.borrowerDOB) rows.push({ label: "Borrower DOB (Month/Year)", value: data.borrowerDOB });
      if (data.coBorrower && data.coBorrowerSSN) rows.push({ label: "Co-Borrower SSN", value: data.coBorrowerSSN });
      return rows;
    },
  },
  FEMA: {
    label: "FEMA Flood",
    bucket: "132 – Flood Search",
    url: "https://msc.fema.gov/portal/home",
    allTypes: true,
    description: "Flood zone determination — search property address",
    fields: (data) => {
      const rows = [];
      const addr = [data.propertyAddress, data.propertyCity, data.propertyState, data.propertyZip].filter(Boolean).join(", ");
      if (addr) rows.push({ label: "Property Address", value: addr });
      return rows;
    },
  },
  NatGen: {
    label: "NatGen Insurance",
    bucket: "266 – Hazard Insurance",
    url: "https://clientsource.natgen.com/",
    allTypes: true,
    description: "Hazard insurance lookup — use account number from loan status",
    fields: (data) => {
      const rows = [];
      if (data.natgenAccount) rows.push({ label: "NatGen Account #", value: data.natgenAccount });
      else rows.push({ label: "Tip", value: "Find account # in Loan Status, 1003 URLA Part 3, or mortgage statement" });
      return rows;
    },
  },
};

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);
  if (!value) return null;
  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? "#22c55e" : "#1e3a5f",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        padding: "2px 10px",
        fontSize: 11,
        cursor: "pointer",
        marginLeft: 8,
        transition: "background 0.2s",
        fontFamily: "monospace",
        letterSpacing: 0.5,
      }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function SiteCard({ siteKey, site, formData, loanType }) {
  const show = site.allTypes || (site.types && site.types.includes(loanType));
  if (!show) return null;
  const fields = site.fields(formData);

  return (
    <div style={{
      background: "#0f1e33",
      border: "1px solid #1e3a5f",
      borderRadius: 10,
      padding: "16px 20px",
      marginBottom: 14,
      boxShadow: "0 2px 12px #00000040",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 15, fontFamily: "'DM Mono', monospace" }}>{site.label}</span>
          <span style={{
            marginLeft: 10,
            background: "#1e3a5f",
            color: "#93c5fd",
            fontSize: 10,
            borderRadius: 4,
            padding: "2px 8px",
            fontFamily: "monospace",
          }}>{site.bucket}</span>
        </div>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
            color: "#fff",
            textDecoration: "none",
            padding: "5px 14px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.4,
            boxShadow: "0 2px 8px #0ea5e940",
          }}
        >
          Open Site ↗
        </a>
      </div>
      <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 10px 0" }}>{site.description}</p>
      {fields.length > 0 && (
        <div style={{ background: "#0a1525", borderRadius: 6, padding: "10px 14px" }}>
          {fields.map((f, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: i < fields.length - 1 ? "1px solid #1e3a5f" : "none",
            }}>
              <span style={{ color: "#64748b", fontSize: 12, minWidth: 180 }}>{f.label}</span>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
                  {f.value || <em style={{ color: "#334155", fontStyle: "italic" }}>not entered</em>}
                </span>
                <CopyButton value={f.value} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  background: "#0a1525",
  border: "1px solid #1e3a5f",
  borderRadius: 6,
  color: "#e2e8f0",
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "'DM Mono', monospace",
  outline: "none",
};

const labelStyle = { color: "#93c5fd", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, display: "block" };

function Field({ label, name, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={type} name={name} value={value} onChange={onChange} placeholder={placeholder || ""} />
    </div>
  );
}

const INITIAL = {
  loanType: "Conventional",
  borrowerFirst: "", borrowerMiddle: "", borrowerLast: "",
  borrowerSSN: "", borrowerDOB: "",
  coBorrower: false,
  coBorrowerFirst: "", coBorrowerMiddle: "", coBorrowerLast: "",
  coBorrowerSSN: "",
  loFirst: "", loMiddle: "", loLast: "",
  propertyAddress: "", propertyCity: "", propertyState: "", propertyZip: "",
  natgenAccount: "",
};

export default function LoanLaunchPad() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const hasMinData = form.borrowerFirst && form.borrowerLast;

  const siteCount = Object.values(SITES).filter(s => s.allTypes || (s.types && s.types.includes(form.loanType))).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060e1a",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "0 0 60px 0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f1e33 0%, #0a1525 100%)",
        borderBottom: "1px solid #1e3a5f",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 4px 24px #00000060",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, filter: "drop-shadow(0 0 8px #0ea5e9)" }}>🚀</span>
            <span style={{ color: "#7dd3fc", fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Loan Launch Pad</span>
          </div>
          <p style={{ color: "#334155", fontSize: 12, margin: "2px 0 0 32px" }}>Enter once. Launch everywhere.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2].map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              style={{
                background: step === s ? "linear-gradient(135deg, #0ea5e9, #2563eb)" : "#1e3a5f",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s === 1 ? "1 · Enter Data" : `2 · Launch (${siteCount})`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 0" }}>

        {step === 1 && (
          <div>
            {/* Loan Type */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ ...labelStyle, fontSize: 12, marginBottom: 10 }}>Loan Type</label>
              <div style={{ display: "flex", gap: 10 }}>
                {LOAN_TYPES.map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, loanType: t }))} style={{
                    background: form.loanType === t ? "linear-gradient(135deg, #0ea5e9, #2563eb)" : "#0f1e33",
                    color: form.loanType === t ? "#fff" : "#64748b",
                    border: `1px solid ${form.loanType === t ? "#0ea5e9" : "#1e3a5f"}`,
                    borderRadius: 8, padding: "8px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}>{t}</button>
                ))}
              </div>
            </div>

            {/* Borrower */}
            <div style={{ background: "#0f1e33", border: "1px solid #1e3a5f", borderRadius: 10, padding: "18px 22px", marginBottom: 16 }}>
              <p style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 13, margin: "0 0 14px 0", letterSpacing: 1, textTransform: "uppercase" }}>Borrower</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="First Name" name="borrowerFirst" value={form.borrowerFirst} onChange={handleChange} />
                <Field label="Middle Name" name="borrowerMiddle" value={form.borrowerMiddle} onChange={handleChange} placeholder="Optional" />
                <Field label="Last Name" name="borrowerLast" value={form.borrowerLast} onChange={handleChange} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="SSN (full)" name="borrowerSSN" value={form.borrowerSSN} onChange={handleChange} placeholder="XXX-XX-XXXX" />
                <Field label="Date of Birth (MM/YYYY)" name="borrowerDOB" value={form.borrowerDOB} onChange={handleChange} placeholder="MM/YYYY" />
              </div>
            </div>

            {/* Co-Borrower toggle */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" name="coBorrower" checked={form.coBorrower} onChange={handleChange} style={{ width: 16, height: 16, accentColor: "#0ea5e9" }} />
                <span style={{ color: "#93c5fd", fontSize: 13, fontWeight: 600 }}>There is a Co-Borrower</span>
              </label>
            </div>

            {form.coBorrower && (
              <div style={{ background: "#0f1e33", border: "1px solid #1e3a5f", borderRadius: 10, padding: "18px 22px", marginBottom: 16 }}>
                <p style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 13, margin: "0 0 14px 0", letterSpacing: 1, textTransform: "uppercase" }}>Co-Borrower</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="First Name" name="coBorrowerFirst" value={form.coBorrowerFirst} onChange={handleChange} />
                  <Field label="Middle Name" name="coBorrowerMiddle" value={form.coBorrowerMiddle} onChange={handleChange} placeholder="Optional" />
                  <Field label="Last Name" name="coBorrowerLast" value={form.coBorrowerLast} onChange={handleChange} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="SSN (full)" name="coBorrowerSSN" value={form.coBorrowerSSN} onChange={handleChange} placeholder="XXX-XX-XXXX" />
                </div>
              </div>
            )}

            {/* Loan Officer */}
            <div style={{ background: "#0f1e33", border: "1px solid #1e3a5f", borderRadius: 10, padding: "18px 22px", marginBottom: 16 }}>
              <p style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 13, margin: "0 0 14px 0", letterSpacing: 1, textTransform: "uppercase" }}>Loan Officer</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="First Name" name="loFirst" value={form.loFirst} onChange={handleChange} />
                <Field label="Middle Name" name="loMiddle" value={form.loMiddle} onChange={handleChange} placeholder="Optional" />
                <Field label="Last Name" name="loLast" value={form.loLast} onChange={handleChange} />
              </div>
            </div>

            {/* Property */}
            <div style={{ background: "#0f1e33", border: "1px solid #1e3a5f", borderRadius: 10, padding: "18px 22px", marginBottom: 16 }}>
              <p style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 13, margin: "0 0 14px 0", letterSpacing: 1, textTransform: "uppercase" }}>Property</p>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <Field label="Street Address" name="propertyAddress" value={form.propertyAddress} onChange={handleChange} />
                <Field label="City" name="propertyCity" value={form.propertyCity} onChange={handleChange} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="State (2-letter)" name="propertyState" value={form.propertyState} onChange={handleChange} placeholder="e.g. TX" />
                <Field label="Zip Code" name="propertyZip" value={form.propertyZip} onChange={handleChange} />
                <Field label="NatGen Account #" name="natgenAccount" value={form.natgenAccount} onChange={handleChange} placeholder="Optional" />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!hasMinData}
              style={{
                background: hasMinData ? "linear-gradient(135deg, #0ea5e9, #2563eb)" : "#1e3a5f",
                color: hasMinData ? "#fff" : "#334155",
                border: "none",
                borderRadius: 8,
                padding: "12px 32px",
                fontSize: 15,
                fontWeight: 700,
                cursor: hasMinData ? "pointer" : "not-allowed",
                boxShadow: hasMinData ? "0 4px 20px #0ea5e950" : "none",
                marginTop: 8,
                width: "100%",
                letterSpacing: 0.5,
              }}
            >
              {hasMinData ? `Launch Pad →` : "Enter at least borrower first & last name to continue"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            {/* Summary bar */}
            <div style={{
              background: "#0f1e33",
              border: "1px solid #1e3a5f",
              borderRadius: 10,
              padding: "12px 20px",
              marginBottom: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <span style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 14 }}>
                  {[form.borrowerFirst, form.borrowerLast].join(" ")}
                  {form.coBorrower && form.coBorrowerLast ? ` & ${[form.coBorrowerFirst, form.coBorrowerLast].join(" ")}` : ""}
                </span>
                <span style={{
                  marginLeft: 12, background: "#0ea5e920", color: "#7dd3fc",
                  fontSize: 11, borderRadius: 4, padding: "2px 10px", fontWeight: 700, letterSpacing: 1
                }}>{form.loanType}</span>
              </div>
              <button onClick={() => setStep(1)} style={{
                background: "none", border: "1px solid #1e3a5f", color: "#64748b",
                borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer",
              }}>← Edit Data</button>
            </div>

            <p style={{ color: "#334155", fontSize: 12, marginBottom: 18 }}>
              Showing {siteCount} sites for <strong style={{ color: "#64748b" }}>{form.loanType}</strong> loan.
              Click <strong style={{ color: "#7dd3fc" }}>Open Site ↗</strong> to launch in a new tab, then use the <strong style={{ color: "#7dd3fc" }}>Copy</strong> buttons to paste data directly.
            </p>

            {Object.entries(SITES).map(([key, site]) => (
              <SiteCard key={key} siteKey={key} site={site} formData={form} loanType={form.loanType} />
            ))}

            {/* Print settings reminder */}
            <div style={{
              background: "#0f1e33", border: "1px dashed #1e3a5f", borderRadius: 10,
              padding: "14px 20px", marginTop: 8
            }}>
              <p style={{ color: "#64748b", fontSize: 12, fontWeight: 700, margin: "0 0 8px 0", letterSpacing: 1, textTransform: "uppercase" }}>Print Settings Quick Reference</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  ["LDP", "Landscape · Scale 80% · Selection Only · Headers+Footers"],
                  ["GSA", "Portrait · Full page"],
                  ["BK / OFAC / FEMA / CAIVRS", "Full page · Adobe PDF"],
                  ["FHA Case/Refi/MIC", "Full page · Adobe PDF · Ctrl+P"],
                ].map(([site, settings]) => (
                  <div key={site} style={{ background: "#0a1525", borderRadius: 6, padding: "8px 12px" }}>
                    <span style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 11 }}>{site}: </span>
                    <span style={{ color: "#64748b", fontSize: 11 }}>{settings}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
