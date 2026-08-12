import { NavBar } from "./NavBar";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
// Import Firebase functions
import { getDatabase, ref, push as firebasePush, update as firebaseUpdate, onValue, get, remove as firebaseRemove} from 'firebase/database';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from "../auth/useAuth";
import resourcesData from "../data/resources.json";
import { CASE_CATEGORIES, LANGUAGE_OPTIONS, OTHER_LANGUAGE } from "../data/caseOptions";
import { uploadCaseDocument, deleteStorageFile } from "../utils/storage";
import { scheduleSlotUpdatesForDeletedCase } from "../utils/scheduleCleanup";

// ─── Reusable input components ─────────────────────────────────────────────────
// Every field has a small, permanently-visible floating label pinned to the
// top of the box — it never overlaps typed content and never doubles as
// placeholder text, so there's no separate placeholder to manage.

function FieldLabel({ htmlFor, label, required }) {
  return (
    <label htmlFor={htmlFor} className="ef-field-label">
      {label}
      {required && <span className="ef-required-asterisk">*</span>}
    </label>
  );
}

function FloatInput({ id, name, label, required, value, onChange, type = "text", readOnly }) {
  return (
    <div className="ef-field-wrap">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input
        type={type}
        className="form-control ef-field-box"
        id={id}
        name={name}
        value={value || ""}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
      />
    </div>
  );
}

function FloatSelect({ id, name, label, required, value, onChange, children, readOnly }) {
  return (
    <div className="ef-field-wrap">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <select
        className="form-select ef-field-box"
        id={id}
        name={name}
        value={value || ""}
        onChange={onChange}
        required={required}
        disabled={readOnly}
      >
        <option value="" disabled hidden></option>
        {children}
      </select>
    </div>
  );
}

function FloatTextarea({ id, name, label, required, value, onChange, height = "120px", readOnly }) {
  return (
    <div className="ef-field-wrap">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <textarea
        className="form-control ef-field-box"
        id={id}
        name={name}
        value={value || ""}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
        style={{ height }}
      />
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ title, sub, badge }) {
  return (
    <div className={`d-flex align-items-center gap-3 ${sub ? "mb-1" : "mt-5"}`}>
      <span className={`${sub ? "" : "fw-semibold "}text-muted small`}>{title}</span>
      {badge && <span className="ef-badge ef-badge--warning">{badge}</span>}
      <hr className="flex-grow-1 m-0" />
    </div>
  );
}

// A top-level category (Client Information, Case Information, Scheduling,
// Attorney Notes): its name sits in a sidebar to the left of its fields
// instead of on a horizontal divider line, with a vertical accent bar that
// highlights in the theme's call-to-action color on hover.
function Section({ title, id, children }) {
  return (
    <div className="ef-section" id={id}>
      {/* The sidebar box is just the bar itself, flush with the "Overview"
          tab's left edge on every section regardless of label length. The
          label sits outside that box — absolutely positioned to its left —
          so it never affects the bar's alignment. */}
      <div className="ef-section-sidebar">
        <span className="ef-section-label">{title}</span>
        <span className="ef-section-bar" aria-hidden="true"></span>
      </div>
      <div className="ef-section-body">
        <div className="row g-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Documents Tab ──────────────────────────────────────────────────────────────

function IconPaperclip() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFileOutline() {
  return (
    <svg width="52" height="64" viewBox="0 0 52 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2h26l14 14v44a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="white" stroke="var(--primary-text)" strokeWidth="2.5" />
      <path d="M32 2v12a2 2 0 0 0 2 2h12" fill="none" stroke="var(--primary-text)" strokeWidth="2.5" />
    </svg>
  );
}

function DocumentCard({ name, url, contentType, canDelete, isPending, onDelete }) {
  const isImage = (contentType || "").startsWith("image/");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <a
      className={`ef-doc-card${isPending ? " ef-doc-card--pending" : ""}`}
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
    >
      {canDelete && (
        <div className="ef-doc-card-menu" ref={menuRef}>
          <button
            type="button"
            className="ef-doc-card-more-btn"
            aria-label={`More options for ${name}`}
            title="More options"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen((o) => !o);
            }}
          >
            <IconKebab />
          </button>
          {isMenuOpen && (
            <div className="schedule-dropdown-menu ef-doc-card-dropdown" role="menu">
              <a
                href={url}
                download={name}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                className="schedule-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              >
                <IconDownload />
                <span>Download</span>
              </a>
              <button
                type="button"
                role="menuitem"
                className="schedule-dropdown-item schedule-dropdown-item-danger"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onDelete();
                }}
              >
                <IconTrash />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
      {isPending && <span className="ef-doc-card-pending-badge">Not saved yet</span>}
      <div className="ef-doc-card-filename">
        <IconPaperclip />
        <span className="ef-doc-card-filename-text">{name}</span>
      </div>
      <div className="ef-doc-card-preview">
        {isImage && url ? (
          <img src={url} alt={name} className="ef-doc-card-thumb" />
        ) : (
          <IconFileOutline />
        )}
        <span className="ef-doc-card-badge">{isImage ? "IMG" : "PDF"}</span>
      </div>
    </a>
  );
}

function DocumentsSection({ title, documents, canDelete, onDeleteDocument }) {
  return (
    <div className="mb-4">
      <SectionDivider title={title} />
      {documents.length === 0 ? (
        <p className="text-muted small ef-documents-empty">Empty</p>
      ) : (
        <div className="ef-doc-grid">
          {documents.map((doc, i) => (
            <DocumentCard
              key={doc.id ?? i}
              name={doc.name}
              url={doc.url}
              contentType={doc.contentType}
              canDelete={canDelete}
              isPending={doc.isPending}
              onDelete={() => onDeleteDocument(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ documents = {}, canDeleteClient, canDeleteAttorney, onDeleteDocument }) {
  return (
    <div className="ef-tab-body">
      <DocumentsSection
        title="Client Documents"
        documents={documents.client ?? []}
        canDelete={canDeleteClient}
        onDeleteDocument={(doc) => onDeleteDocument("client", doc)}
      />
      <DocumentsSection
        title="Attorney Documents"
        documents={documents.attorney ?? []}
        canDelete={canDeleteAttorney}
        onDeleteDocument={(doc) => onDeleteDocument("attorney", doc)}
      />
    </div>
  );
}

// ─── Recommended Resources Tab ─────────────────────────────────────────────────

function IconFilter() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4c.183-.53.399-1.031.647-1.492.148-.277.31-.53.492-.756A7.024 7.024 0 0 0 2.255 4H4.09zM3.13 5.5A9.94 9.94 0 0 0 2.82 8H0a7.958 7.958 0 0 1 .656-2.5H3.13zM4.847 5A12.5 12.5 0 0 0 4.51 7.5H7.5V5H4.847zM8.5 5v2.5h2.99A12.495 12.495 0 0 0 11.153 5H8.5zM4.51 8.5c.032.892.15 1.735.337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472A6.696 6.696 0 0 1 4.73 13.5c-.248-.461-.464-.962-.647-1.492H2.255a7.024 7.024 0 0 0 3.072 2.464zM3.13 10.5H.656A7.958 7.958 0 0 0 0 8h2.82c.03.87.14 1.708.31 2.5zm7.542 3.972A7.024 7.024 0 0 0 13.745 12H11.91c-.183.53-.4 1.03-.648 1.492a6.688 6.688 0 0 1-.59.98zM11.153 11h2.474c.17-.792.28-1.63.31-2.5H10.51c-.032.892-.15 1.735-.337 2.5h.98zM13.745 4H11.91a10.9 10.9 0 0 0-.647-1.492 6.688 6.688 0 0 0-.59-.98A7.024 7.024 0 0 1 13.745 4zM10.855 4a8.02 8.02 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z" />
    </svg>
  );
}

function IconPlusCircle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" />
      <path d="M8 5v6M5 8h6" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-2.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
    </svg>
  );
}

// Same floppy-disk icon Schedule.jsx uses for its "Save" action.
function IconSave() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4.207a2 2 0 0 0-.586-1.414l-2.793-2.793A2 2 0 0 0 11.207 1H2zm6 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm.5-9v4a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3h5.5z" />
    </svg>
  );
}

// Same "more actions" kebab icon Schedule.jsx uses.
function IconKebab() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.75"></circle>
      <circle cx="12" cy="12" r="1.75"></circle>
      <circle cx="12" cy="19" r="1.75"></circle>
    </svg>
  );
}

function IconPersonAdd() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
      <path fillRule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5z" />
    </svg>
  );
}

function IconArrowLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
      <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
      <path fillRule="evenodd" d="M7.646.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 1.707V11.5a.5.5 0 0 1-1 0V1.707L5.354 3.854a.5.5 0 1 1-.708-.708l3-3z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L13.882 4H4.118zM2.5 3V2h11v1h-11z" />
    </svg>
  );
}

// Case categories use "Misc." but the resource data uses the full word.
function toResourceCategory(caseCategory) {
  return caseCategory === "Misc." ? "Miscellaneous" : caseCategory;
}

// The source data is just a list of URLs (no titles) — derive a readable
// title from the last path segment.
function titleFromUrl(url) {
  try {
    const { pathname, hostname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || hostname;
    return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
}

function ResourceCard({ url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="ef-res-card">
      <IconGlobe />
      <span className="ef-res-card-title">{titleFromUrl(url)}</span>
    </a>
  );
}

function ResourcesColumn({ subcategory, urls }) {
  return (
    <div className="ef-res-column">
      <span className="ef-res-column-label">{subcategory}</span>
      {urls.map((url) => (
        <ResourceCard key={url} url={url} />
      ))}
    </div>
  );
}

function RecommendedResourcesTab({ defaultCategory }) {
  const categories = Object.keys(resourcesData);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState(
    categories.includes(defaultCategory) ? defaultCategory : categories[0]
  );
  const [activeFilters, setActiveFilters] = useState([]);

  function toggleFilter(category, subcategory) {
    setActiveFilters((prev) => {
      const exists = prev.some((f) => f.category === category && f.subcategory === subcategory);
      if (exists) return prev.filter((f) => !(f.category === category && f.subcategory === subcategory));
      return [...prev, { category, subcategory }];
    });
  }

  return (
    <div className="ef-tab-body">
      <div className="ef-res-toolbar">
        <div className="ef-res-filter-wrapper">
          <button type="button" className="btn btn-submit ef-res-filter-btn" onClick={() => setFilterOpen((o) => !o)}>
            <IconFilter /> Filter
          </button>
          {filterOpen && (
            <div className="ef-res-filter-panel">
              <select
                className="form-select form-select-sm mb-2"
                value={pickerCategory}
                onChange={(e) => setPickerCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="ef-res-filter-options">
                {Object.keys(resourcesData[pickerCategory]).map((sub) => {
                  const checked = activeFilters.some((f) => f.category === pickerCategory && f.subcategory === sub);
                  return (
                    <label key={sub} className="ef-res-filter-option">
                      <input type="checkbox" checked={checked} onChange={() => toggleFilter(pickerCategory, sub)} />
                      {sub}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {activeFilters.map((f) => (
          <span key={`${f.category}-${f.subcategory}`} className="ef-res-chip">
            {f.subcategory}
            <button type="button" onClick={() => toggleFilter(f.category, f.subcategory)}>
              <IconClose />
            </button>
          </span>
        ))}
      </div>

      {activeFilters.length === 0 ? (
        <p className="text-muted small ef-documents-empty">Use Filter to add resource topics.</p>
      ) : (
        <div className="ef-res-grid">
          {activeFilters.map((f) => (
            <ResourcesColumn
              key={`${f.category}-${f.subcategory}`}
              subcategory={f.subcategory}
              urls={resourcesData[f.category][f.subcategory].pages}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper function ──────────────────────────────────────────────────────────

// Every field marked with a red asterisk in the form, grouped by the state
// object it lives in. Keep these in sync with the `required` props / manual
// asterisks in the JSX below — this is what drives the "x/y required
// fields" counter and whether Save is enabled.
const REQUIRED_CLIENT_FIELDS = [
  "fname", "lname", "age", "sex", "incomeLevel", "addressLine1", "city",
  "zipCode", "phone", "email", "primaryLanguage", "proficiencyLevel",
];
const REQUIRED_CASE_FIELDS = ["category", "attorneyType", "briefDescription"];

// Languages offered by the Primary Language and Additional Language pickers,
// from the shared list the Case Library filter also reads. "Other" always sits
// last, after every named language.
function LanguageOptions() {
  return (
    <>
      {LANGUAGE_OPTIONS.map((language) => (
        <option key={language} value={language}>{language}</option>
      ))}
      <option value={OTHER_LANGUAGE}>Other (indicate in remarks)</option>
    </>
  );
}
const REQUIRED_ATTORNEY_NOTES_FIELDS = [
  "clientConsent", "referralPermission", "followUpProBono", "visitSummary", "reasonForVisit",
];

// The full shape of everything the Attorney Notes section can write. Cases
// saved before a field existed won't have it in Firebase, so loads get
// merged onto this — otherwise those keys would come back undefined and
// their inputs would silently fall back to uncontrolled.
const EMPTY_ATTORNEY_NOTES = {
  clientConsent: "",
  referralPermission: "",
  followUpProBono: "",
  followUpServiceTypes: [],
  followUpServiceDescription: "",
  visitSummaryStatus: "",
  kcbaReferralServices: [],
  visitSummary: "",
  reasonForVisit: "",
};

// Sub-fields that only apply while their parent choice is selected. When
// the parent changes away, the hidden values are cleared rather than left
// to be written to Firebase as stale answers to a question no longer asked.
const ATTORNEY_NOTES_DEPENDENTS = {
  followUpProBono: { showWhen: "Yes", clears: ["followUpServiceTypes", "followUpServiceDescription"] },
  visitSummaryStatus: { showWhen: "Referred to KCBA", clears: ["kcbaReferralServices"] },
};

// Only counts fields the current role can actually fill in — a section
// they can only read is somebody else's responsibility, so it shouldn't
// hold their Save hostage. Attorney Notes additionally only counts when
// that section is rendered at all.
function getRequiredFieldStatus({
  clientFormData, caseFormData, attorneyNotesFormData,
  includeAttorneyNotes, canEditClientInfo, canEditAttorneyNotes,
}) {
  const groups = [
    ...(canEditClientInfo ? [[REQUIRED_CLIENT_FIELDS, clientFormData]] : []),
    [REQUIRED_CASE_FIELDS, caseFormData], // every role can edit Case Information
    ...(includeAttorneyNotes && canEditAttorneyNotes
      ? [[REQUIRED_ATTORNEY_NOTES_FIELDS, attorneyNotesFormData]]
      : []),
  ];

  let total = 0;
  let filled = 0;
  for (const [fields, data] of groups) {
    for (const field of fields) {
      total++;
      if (data?.[field]) filled++;
    }
  }
  return { filled, total };
}

// Combines a section's already-saved documents with anything staged
// locally: saved docs marked for deletion drop out, and staged uploads get
// appended (flagged isPending so the card can say so and skip the confirm
// dialog on remove, since nothing was ever persisted for those).
function mergeDocumentsForDisplay(savedDocs, pendingUploads, pendingDeletes, section) {
  const deletedIds = new Set(
    pendingDeletes.filter((p) => p.section === section).map((p) => p.docId)
  );
  const saved = (savedDocs || []).filter((doc) => !deletedIds.has(doc.id));
  const pending = pendingUploads
    .filter((p) => p.section === section)
    .map((p) => ({
      id: p.localId,
      name: p.file.name,
      url: p.previewUrl,
      contentType: p.file.type,
      isPending: true,
    }));
  return [...saved, ...pending];
}

// ─── Unsaved changes warning ──────────────────────────────────────────────────
// Shown when something other than Save/Cancel tries to leave the page while
// there are unsaved edits. Reuses Schedule.jsx's modal styling.
function UnsavedChangesModal({ isSaving, requiredFields, onStay, onDiscard, onSave }) {
  const canSave = requiredFields.filled === requiredFields.total;
  return (
    <>
      <div className="schedule-modal-backdrop" onClick={onStay} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onStay}>✕</button>
        <h6 className="schedule-modal-title">Unsaved changes</h6>
        <p className="mb-2">
          You have changes that haven't been saved yet. Leaving now will discard them.
        </p>
        <p className="err-color mt-0 mb-3">
          {requiredFields.filled}/{requiredFields.total} required fields
          {!canSave && " — fill in the rest before you can save"}
        </p>
        <div className="d-flex justify-content-end gap-3">
          <button type="button" className="btn btn-cancel p-0 text-decoration-underline" onClick={onDiscard} disabled={isSaving}>
            Leave without saving
          </button>
          <button
            type="button"
            className="btn btn-submit d-inline-flex align-items-center gap-2"
            onClick={onSave}
            disabled={isSaving || !canSave}
            title={!canSave ? "Fill in all required fields before saving" : undefined}
          >
            <IconSave /> {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────
// In-app prompt rather than window.confirm, so deleting a case looks like the
// rest of the portal and can name the client it's about to remove. Same modal
// styling as the unsaved-changes prompt above.
function DeleteCaseModal({ clientName, isDeleting, error, onCancel, onConfirm }) {
  return (
    <>
      <div className="schedule-modal-backdrop" onClick={isDeleting ? undefined : onCancel} />
      <div className="schedule-modal-popup">
        <button className="schedule-modal-close-btn" onClick={onCancel} disabled={isDeleting}>✕</button>
        <h6 className="schedule-modal-title">Delete this case?</h6>
        <p className="mb-2">
          {clientName ? <><strong>{clientName}</strong>'s case</> : "This case"} and everything
          recorded on it will be removed for everyone.
        </p>
        <p className="err-color mt-0 mb-3">This cannot be undone.</p>
        {error && <p className="err-color mt-0 mb-3">{error}</p>}
        <div className="d-flex justify-content-end gap-3">
          <button type="button" className="btn btn-cancel p-0 text-decoration-underline" onClick={onCancel} disabled={isDeleting}>
            Keep case
          </button>
          <button type="button" className="btn btn-submit ef-delete-confirm-btn d-inline-flex align-items-center gap-2" onClick={onConfirm} disabled={isDeleting}>
            <IconTrash /> {isDeleting ? "Deleting…" : "Delete case"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ContactForm(props) {
  const navigate = useNavigate();
  const { id } = useParams(); // Firebase ID if editing
  const db = getDatabase();
  const { role, user } = useAuth();
  const canDelete = role === "Admin" || role === "Staff";

  // Section-level edit permissions. Every role can *read* the whole form —
  // locked sections render as read-only rather than being hidden.
  // (Case Information is editable by every role, so it needs no flag.)
  const canEditClientInfo = role === "Admin" || role === "Staff";
  const canEditAttorneyNotes = role === "Attorney" || role === "Legal Student";
  // Only the meeting platform/link are editable in Scheduling — the rest of
  // that section is set by the matching flow on the Schedule page.
  const canEditMeeting = role === "Admin" || role === "Staff";

  // State objects
  const [clientFormData, setClientFormData] = useState({
    fname: "", lname: "", addressLine1: "", city: "", age: "", sex: "",
    incomeLevel: "", addressLine2: "", zipCode: "", phone: "",
    backupPhone: "", email: "", primaryLanguage: "", proficiencyLevel: "",
    additionalLanguages: [],
  });

  const [caseFormData, setCaseFormData] = useState({
    category: "", attorneyType: "", briefDescription: "", remarks: "",
  });

  const [schedulingFormData, setSchedulingFormData] = useState({
    date: "", timeSlot: "", meetingPlatform: "", meetingLink: "",
    attorneyName: "", attorneyEmail: "", attorneyPhone: "",
    legalStudentName: "", legalStudentEmail: "", legalStudentPhone: "",
    interpreterName: "", interpreterEmail: "", interpreterPhone: "",
  });

  const [attorneyNotesFormData, setAttorneyNotesFormData] = useState(EMPTY_ATTORNEY_NOTES);

  const [matchFormData, setMatchFormData] = useState({
    attorney: "", legalStudent: "", interpreter: "",
  });

  const [dateAdded, setDateAdded] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  // Documents tab: { client: [...], attorney: [...] } as last saved in
  // Firebase. Which section a role uploads into (never both, and never a
  // choice — the upload button just routes automatically).
  const [documents, setDocuments] = useState({ client: [], attorney: [] });
  const fileInputRef = useRef(null);
  const uploadSection =
    role === "Admin" || role === "Staff" ? "client"
    : role === "Attorney" || role === "Legal Student" ? "attorney"
    : null;

  // Uploads/deletes stay local (state lives here, alongside every other
  // unsaved field, so switching tabs never loses them) and only reach
  // Firebase Storage/Database when the Save button actually runs.
  // pendingUploads: [{ localId, file, section, previewUrl }]
  // pendingDeletes: [{ section, docId, storagePath }]
  const [pendingUploads, setPendingUploads] = useState([]);
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation modal (replaces the browser's confirm dialog).
  const [isDeletePromptOpen, setIsDeletePromptOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Every edit routes through a handler, so flagging there is simpler and
  // more reliable than diffing state against a saved snapshot.
  const [hasEdits, setHasEdits] = useState(false);
  const markDirty = () => setHasEdits(true);
  const hasUnsavedChanges = hasEdits || pendingUploads.length > 0 || pendingDeletes.length > 0;

  // Set when something tried to navigate away with unsaved changes — holds
  // the action to run once the user decides (save first, or discard).
  const [unsavedPrompt, setUnsavedPrompt] = useState(null);

  // Merge saved docs (minus anything staged for deletion) with staged
  // uploads for display — this is what the Documents tab actually renders.
  const displayedDocuments = {
    client: mergeDocumentsForDisplay(documents.client, pendingUploads, pendingDeletes, "client"),
    attorney: mergeDocumentsForDisplay(documents.attorney, pendingUploads, pendingDeletes, "attorney"),
  };

  // Release local image preview URLs if the form is left (Cancel, back
  // button, etc.) without saving — otherwise they'd leak until reload,
  // since navigating within the app doesn't unload the document.
  const pendingUploadsRef = useRef(pendingUploads);
  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);
  useEffect(() => {
    return () => {
      pendingUploadsRef.current.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []);

  // ── "More options" menu (Assign + Delete live here) — close on outside click ──
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAssignSubmenuOpen, setIsAssignSubmenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
        setIsAssignSubmenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Staff users this case can be assigned to (writes their uid to createdBy —
  // the same field Firebase Rules use to scope which cases a Staff account
  // can see, per CaseLibrary's "Staff can only read cases they created").
  const [staffUsers, setStaffUsers] = useState([]);
  const [assignedStaffUid, setAssignedStaffUid] = useState("");
  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const usersObj = snapshot.val();
      if (!usersObj) {
        setStaffUsers([]);
        return;
      }
      const staff = Object.keys(usersObj)
        .map((uid) => ({ uid, ...usersObj[uid] }))
        .filter((u) => u.role === "Staff")
        .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));
      setStaffUsers(staff);
    });
    return () => unsubscribe();
  }, [db]);

  // New cases default to "assigned to whoever is filling out the form",
  // same as the old auto-stamp-on-submit behavior — derived rather than
  // seeded into state so it can't fight a user's own Assign pick.
  const effectiveAssignedUid = assignedStaffUid || (!id ? user?.uid ?? "" : "");

  // Local only — Assign doesn't touch Firebase until the case is actually
  // saved, so a not-yet-created case can be assigned too.
  const handleAssignToStaff = (staffUid) => {
    markDirty();
    setAssignedStaffUid(staffUid);
    setIsMoreMenuOpen(false);
    setIsAssignSubmenuOpen(false);
  };

  // Stages a PDF/image locally — nothing touches Storage/Database until
  // Save. Routes to Client Documents or Attorney Documents based on the
  // uploader's role: Admin/Staff go to "client", Attorney/Legal Student go
  // to "attorney". Every role can upload; which section it lands in just
  // isn't a choice they make. Works before the case is even saved, since
  // staging doesn't need a real case id yet.
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so selecting the same file again still fires onChange
    if (!file || !uploadSection) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      alert("Only PDF and image files can be uploaded.");
      return;
    }

    setPendingUploads((prev) => [
      ...prev,
      {
        localId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        section: uploadSection,
        // Local-only URL so an image shows a real thumbnail and the card
        // stays clickable/downloadable before it's ever actually uploaded;
        // revoked when the staged upload is removed or flushed.
        previewUrl: URL.createObjectURL(file),
      },
    ]);
  };

  // A staged (not-yet-saved) upload just gets dropped from the queue — it
  // was never persisted, so there's nothing to confirm or undo. A
  // already-saved document instead gets queued for deletion on Save.
  const handleDeleteDocument = (section, doc) => {
    if (doc.isPending) {
      setPendingUploads((prev) => {
        const match = prev.find((p) => p.localId === doc.id);
        if (match?.previewUrl) URL.revokeObjectURL(match.previewUrl);
        return prev.filter((p) => p.localId !== doc.id);
      });
      return;
    }
    if (!window.confirm(`Remove "${doc.name}"? This won't take effect until you Save.`)) return;
    setPendingDeletes((prev) => [
      ...prev,
      { section, docId: doc.id, storagePath: doc.storagePath },
    ]);
  };

  // 1. EFFECT: Fetch data from Firebase if an ID exists (Editing mode)
  useEffect(() => {
    if (id) {
      const caseRef = ref(db, `cases/${id}`);
      onValue(caseRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.clientInfo) setClientFormData(data.clientInfo);
          if (data.caseInfo) setCaseFormData(data.caseInfo);
          if (data.schedulingInfo) setSchedulingFormData(data.schedulingInfo);
          if (data.attorneyNotes) setAttorneyNotesFormData({ ...EMPTY_ATTORNEY_NOTES, ...data.attorneyNotes });
          if (data.matchInfo) setMatchFormData(data.matchInfo);
          if (data.dateAdded) setDateAdded(data.dateAdded);
          if (data.createdBy) setAssignedStaffUid(data.createdBy);
        }
      });
    }
  }, [id, db]);

  // 1b. EFFECT: Live-load this case's uploaded documents
  useEffect(() => {
    if (id) {
      const docsRef = ref(db, `cases/${id}/documents`);
      const unsubscribe = onValue(docsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const toArray = (section) =>
          section ? Object.keys(section).map((key) => ({ id: key, ...section[key] })) : [];
        setDocuments({ client: toArray(data.client), attorney: toArray(data.attorney) });
      });
      return () => unsubscribe();
    }
  }, [id, db]);

  // 2. Validation: derived straight from form state rather than mirrored
  // into a separate state + effect, so it can never lag a keystroke behind.
  const requiredFields = getRequiredFieldStatus({
    clientFormData,
    caseFormData,
    attorneyNotesFormData,
    includeAttorneyNotes: !!props.attorney,
    canEditClientInfo,
    canEditAttorneyNotes,
  });
  const isFormValid = requiredFields.filled === requiredFields.total;

  // Handlers
  const makeChangeHandler = (setter) => (e) => {
    const { name, value } = e.target;
    markDirty();
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange = makeChangeHandler(setClientFormData);
  const handleCaseChange = makeChangeHandler(setCaseFormData);
  // Meeting link only applies to a Virtual meeting, so switching to another
  // platform drops it rather than saving a link the meeting doesn't use.
  const handleSchedulingChange = (e) => {
    const { name, value } = e.target;
    markDirty();
    setSchedulingFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "meetingPlatform" && value !== "Virtual") next.meetingLink = "";
      return next;
    });
  };
  // Same as makeChangeHandler, but also resets any sub-fields that only
  // applied under the previously-selected answer (see
  // ATTORNEY_NOTES_DEPENDENTS) so hidden inputs never save stale values.
  const handleAttorneyNotesChange = (e) => {
    const { name, value } = e.target;
    markDirty();
    setAttorneyNotesFormData((prev) => {
      const next = { ...prev, [name]: value };
      const dependent = ATTORNEY_NOTES_DEPENDENTS[name];
      if (dependent && value !== dependent.showWhen) {
        for (const field of dependent.clears) {
          next[field] = EMPTY_ATTORNEY_NOTES[field];
        }
      }
      return next;
    });
  };
  const handleMatchChange = makeChangeHandler(setMatchFormData);

  // A couple of Attorney Notes fields (the KCBA referral services, the
  // follow-up service type) are checkbox groups — multiple values in an
  // array — rather than the single-value swap makeChangeHandler does.
  const handleAttorneyNotesArrayToggle = (field, option) => {
    markDirty();
    setAttorneyNotesFormData((prev) => {
      const current = prev[field] || [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [field]: next };
    });
  };

  // Additional (non-primary) languages: a repeatable language + proficiency row.
  const handleAddLanguage = () => {
    markDirty();
    setClientFormData((prev) => ({
      ...prev,
      additionalLanguages: [...(prev.additionalLanguages || []), { language: "", proficiencyLevel: "" }],
    }));
  };

  const handleRemoveLanguage = (index) => {
    markDirty();
    setClientFormData((prev) => ({
      ...prev,
      additionalLanguages: (prev.additionalLanguages || []).filter((_, i) => i !== index),
    }));
  };

  const handleLanguageFieldChange = (index, field, value) => {
    markDirty();
    setClientFormData((prev) => ({
      ...prev,
      additionalLanguages: (prev.additionalLanguages || []).map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  // 3. SUBMIT: Push or Update Firebase. `onDone` lets the unsaved-changes
  // prompt save first and then continue to wherever the user was headed,
  // instead of always bouncing to the case library.
  const handleSubmit = async (onDone) => {
    setIsSaving(true);

    const fullCaseData = {
      clientInfo: clientFormData,
      caseInfo: caseFormData,
      schedulingInfo: schedulingFormData,
      attorneyNotes: attorneyNotesFormData,
      matchInfo: matchFormData,
      status: (matchFormData && matchFormData.attorney) ? "scheduled" : "waitlisted",
      dateAdded: dateAdded ? dateAdded : new Date().toLocaleString()
     };

    // Assign (in the "more options" menu) only changes assignedStaffUid
    // locally — it doesn't touch Firebase until Save, so a brand-new,
    // not-yet-created case can be assigned too. Defaults to the current
    // user (see the effect below) exactly like the old auto-stamp did.
    if (effectiveAssignedUid) {
      fullCaseData.createdBy = effectiveAssignedUid;
    }

    try {
      let caseId = id;
      if (id) {
        await firebaseUpdate(ref(db, `cases/${id}`), fullCaseData);
      } else {
        const newCaseRef = await firebasePush(ref(db, "cases"), fullCaseData);
        caseId = newCaseRef.key;
      }

      // Flush staged document uploads/deletes now that a real case id
      // definitely exists — this is the only point any of it ever reaches
      // Storage/Database.
      for (const pending of pendingUploads) {
        const url = await uploadCaseDocument(caseId, pending.file);
        await firebasePush(ref(db, `cases/${caseId}/documents/${pending.section}`), {
          name: pending.file.name,
          url,
          contentType: pending.file.type,
          storagePath: `case-documents/${caseId}/${pending.file.name}`,
          uploadedBy: user?.uid ?? null,
          uploadedAt: new Date().toISOString(),
        });
        if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
      }
      for (const del of pendingDeletes) {
        await firebaseRemove(ref(db, `cases/${caseId}/documents/${del.section}/${del.docId}`));
        if (del.storagePath) {
          await deleteStorageFile(del.storagePath).catch((err) =>
            console.error("Error deleting document from Storage: ", err)
          );
        }
      }

      setHasEdits(false);
      setPendingUploads([]);
      setPendingDeletes([]);

      if (onDone) onDone();
      else navigate("/case-library");
    } catch (err) {
      console.error("Error saving case: ", err);
      alert("Something went wrong saving. Please try again.");
      setIsSaving(false);
    }
  };

  // Opens the confirmation modal; the removal itself is confirmDelete below.
  const handleDelete = () => {
    setDeleteError("");
    setIsDeletePromptOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");

    // Removing the case and its schedule slots in one multi-path update keeps
    // the two from ever disagreeing — either both go or neither does.
    const updates = { [`cases/${id}`]: null };
    try {
      const snapshot = await get(ref(db, "schedules"));
      Object.assign(updates, scheduleSlotUpdatesForDeletedCase(snapshot.val(), id));
    } catch (err) {
      // Couldn't check the schedules — delete the case anyway rather than
      // blocking on the cleanup, and say so in the log.
      console.error("Couldn't read schedules to clean up the deleted case: ", err);
    }

    try {
      await firebaseUpdate(ref(db), updates);
      navigate("/case-library");
    } catch (err) {
      console.error(`Error removing case: `, err);
      // Stay on the modal so the failure is visible instead of looking
      // like the delete silently worked.
      setIsDeleting(false);
      setDeleteError("Couldn't delete this case. Please try again.");
    }
  };

  // Cancel is the explicit "throw away my changes" action, so it just
  // leaves — the unsaved-changes prompt exists for every *other* way out.
  const handleCancel = () => {
    navigate("/case-library");
  };

  // Back returns to wherever the form was opened from — this page is reached
  // from the Case Library, the Schedule board and the Attorney view, so a
  // fixed destination would be wrong for two of the three. Opened directly by
  // URL (no in-app history to pop), it falls back to the case library.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/case-library");
  };

  // Unlike Cancel, Back isn't a "discard my changes" action, so it goes
  // through the same unsaved-changes prompt as the nav bar.
  const handleBack = () => {
    if (hasUnsavedChanges) setUnsavedPrompt({ proceed: goBack });
    else goBack();
  };

  // ── Guard every other way off this page ───────────────────────────────────
  // The app uses <BrowserRouter>, not a data router, so react-router's
  // useBlocker isn't available — intercept the clicks themselves instead.
  // Save/Cancel are inside .ef-page and deliberately excluded; this catches
  // the nav bar (logo, Schedule/Cases/Personnel/Access, Sign Out).
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    function handleCaptureClick(e) {
      const target = e.target.closest(".app-navbar a[href], .app-navbar-signout-btn");
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      const isSignOut = target.classList.contains("app-navbar-signout-btn");
      const href = target.getAttribute("href");
      setUnsavedPrompt({
        proceed: async () => {
          if (isSignOut) {
            await signOut(getAuth());
            navigate("/");
          } else if (href) {
            navigate(href);
          }
        },
      });
    }

    document.addEventListener("click", handleCaptureClick, true);
    return () => document.removeEventListener("click", handleCaptureClick, true);
  }, [hasUnsavedChanges, navigate]);

  // Reloading/closing the tab can't show a custom dialog — the browser's
  // own generic "Leave site?" prompt is the only option there.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const header = props.newForm
    ? <NewClientHeader onBack={handleBack} />
    : <ExistingClientHeader
        clientFormData={clientFormData}
        caseFormData={caseFormData}
        dateAdded={dateAdded}
        matchFormData={matchFormData}
        schedulingFormData={schedulingFormData}
        onBack={handleBack}
      />;

  const attorneySection = props.attorney
    ? <AttorneySection
        attorneyNotesFormData={attorneyNotesFormData}
        handleAttorneyNotesChange={handleAttorneyNotesChange}
        handleAttorneyNotesArrayToggle={handleAttorneyNotesArrayToggle}
        canEdit={canEditAttorneyNotes}
      />
    : "";

  return (
    <div>
      <NavBar active={"cases"} />
      {header}

      {isDeletePromptOpen && (
        <DeleteCaseModal
          clientName={`${clientFormData.fname || ""} ${clientFormData.lname || ""}`.trim()}
          isDeleting={isDeleting}
          error={deleteError}
          onCancel={() => setIsDeletePromptOpen(false)}
          onConfirm={confirmDelete}
        />
      )}

      {unsavedPrompt && (
        <UnsavedChangesModal
          isSaving={isSaving}
          requiredFields={requiredFields}
          onStay={() => setUnsavedPrompt(null)}
          onDiscard={() => {
            const { proceed } = unsavedPrompt;
            setUnsavedPrompt(null);
            proceed();
          }}
          onSave={() => {
            const { proceed } = unsavedPrompt;
            handleSubmit(() => {
              setUnsavedPrompt(null);
              proceed();
            });
          }}
        />
      )}

      <div className="container py-5 ef-page ef-page-indent">
        <div className="ef-tabs">
          <div className="ef-tabs-buttons">
            <button
              type="button"
              className={`ef-tab-btn${activeTab === "overview" ? " ef-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={`ef-tab-btn${activeTab === "documents" ? " ef-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("documents")}
            >
              Documents
            </button>
            <button
              type="button"
              className={`ef-tab-btn${activeTab === "resources" ? " ef-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("resources")}
            >
              Resources
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            {activeTab === "documents" && uploadSection && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="d-none"
                  onChange={handleFileSelected}
                />
                <button
                  type="button"
                  className="btn btn-primary ef-upload-btn d-inline-flex align-items-center gap-2"
                  title="Staged locally — click Save to actually upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconUpload /> Upload
                </button>
              </>
            )}
            {canDelete && activeTab === "overview" && (
              <div className="schedule-actions-menu" ref={moreMenuRef}>
                <button
                  type="button"
                  className="schedule-kebab-btn"
                  onClick={() => setIsMoreMenuOpen((o) => !o)}
                  title="More options"
                  aria-label="More options for this case"
                  aria-haspopup="true"
                  aria-expanded={isMoreMenuOpen}
                >
                  <IconKebab />
                </button>
                {isMoreMenuOpen && !isAssignSubmenuOpen && (
                  <div className="schedule-dropdown-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="schedule-dropdown-item"
                      onClick={() => setIsAssignSubmenuOpen(true)}
                    >
                      <IconPersonAdd />
                      <span className="flex-grow-1">Staff</span>
                      <IconChevronRight />
                    </button>
                    <div className="schedule-dropdown-divider" role="separator"></div>
                    <button
                      type="button"
                      role="menuitem"
                      className="schedule-dropdown-item schedule-dropdown-item-danger"
                      disabled={!isFormValid}
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleDelete();
                      }}
                    >
                      <IconTrash />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
                {isMoreMenuOpen && isAssignSubmenuOpen && (
                  <div className="schedule-dropdown-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="schedule-dropdown-item"
                      onClick={() => setIsAssignSubmenuOpen(false)}
                    >
                      <span>&larr; Back</span>
                    </button>
                    <div className="schedule-dropdown-divider" role="separator"></div>
                    <div className="ef-assign-list">
                      {staffUsers.length === 0 ? (
                        <p className="text-muted small px-2 mb-1">No Staff accounts found.</p>
                      ) : (
                        staffUsers.map((staff) => (
                          <button
                            key={staff.uid}
                            type="button"
                            role="menuitem"
                            className="schedule-dropdown-item"
                            aria-pressed={staff.uid === effectiveAssignedUid}
                            onClick={() => handleAssignToStaff(staff.uid)}
                          >
                            <span className="flex-grow-1">{staff.name || staff.email}</span>
                            {staff.uid === effectiveAssignedUid && <IconCheck />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ef-page-body">
        {activeTab === "documents" ? (
          <DocumentsTab
            documents={displayedDocuments}
            canDeleteClient={uploadSection === "client"}
            canDeleteAttorney={uploadSection === "attorney"}
            onDeleteDocument={handleDeleteDocument}
          />
        ) : activeTab === "resources" ? (
          <RecommendedResourcesTab defaultCategory={toResourceCategory(caseFormData.category)} />
        ) : (
        <>
        <p className="small mb-4 err-color">* indicates required field</p>

        {/* ── CLIENT INFORMATION ── */}
        <Section title="Client Information">
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="fname" name="fname" label="First Name" required value={clientFormData.fname} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="lname" name="lname" label="Last Name" required value={clientFormData.lname} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <FloatInput id="age" name="age" label="Age" required value={clientFormData.age} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <FloatSelect id="sex" name="sex" label="Sex" required value={clientFormData.sex} onChange={handleClientChange} readOnly={!canEditClientInfo}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </FloatSelect>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <FloatInput id="incomeLevel" name="incomeLevel" label="Income Level" required value={clientFormData.incomeLevel} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="addressLine1" name="addressLine1" label="Address Line 1" required value={clientFormData.addressLine1} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="addressLine2" name="addressLine2" label="Address Line 2" value={clientFormData.addressLine2} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="city" name="city" label="City" required value={clientFormData.city} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="zipCode" name="zipCode" label="Zip Code" required value={clientFormData.zipCode} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-6">
            <FloatInput id="email" name="email" label="Email" required type="email" value={clientFormData.email} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="phone" name="phone" label="Phone Number" required type="tel" value={clientFormData.phone} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="backupPhone" name="backupPhone" label="Backup Phone Number" type="tel" value={clientFormData.backupPhone} onChange={handleClientChange} readOnly={!canEditClientInfo} />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatSelect id="primaryLanguage" name="primaryLanguage" label="Primary Language" required value={clientFormData.primaryLanguage} onChange={handleClientChange} readOnly={!canEditClientInfo}>
              <LanguageOptions />
            </FloatSelect>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatSelect id="proficiencyLevel" name="proficiencyLevel" label="Level of Proficiency" required value={clientFormData.proficiencyLevel} onChange={handleClientChange} readOnly={!canEditClientInfo}>
              <option value="Fluent">Fluent</option>
              <option value="Working Proficiency">Working Proficiency</option>
              <option value="Limited">Limited</option>
            </FloatSelect>
          </div>

          {(clientFormData.additionalLanguages || []).map((lang, idx) => (
            <div className="col-12" key={idx}>
              <div className="row g-4 align-items-center ef-lang-row">
                <div className="col-12 col-md-6 col-xl-3">
                  <FloatSelect
                    id={`additionalLanguage-${idx}`}
                    name={`additionalLanguage-${idx}`}
                    label="Additional Language"
                    value={lang.language}
                    onChange={(e) => handleLanguageFieldChange(idx, "language", e.target.value)}
                    readOnly={!canEditClientInfo}
                  >
                    <LanguageOptions />
                  </FloatSelect>
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <FloatSelect
                    id={`additionalLanguageProficiency-${idx}`}
                    name={`additionalLanguageProficiency-${idx}`}
                    label="Level of Proficiency"
                    value={lang.proficiencyLevel}
                    onChange={(e) => handleLanguageFieldChange(idx, "proficiencyLevel", e.target.value)}
                    readOnly={!canEditClientInfo}
                  >
                    <option value="Fluent">Fluent</option>
                    <option value="Working Proficiency">Working Proficiency</option>
                    <option value="Limited">Limited</option>
                  </FloatSelect>
                </div>
                {canEditClientInfo && (
                  <div className="col-auto">
                    <button
                      type="button"
                      className="ef-lang-remove-btn"
                      aria-label="Remove language"
                      title="Remove language"
                      onClick={() => handleRemoveLanguage(idx)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {canEditClientInfo && (
            <div className="col-12">
              <button type="button" className="ef-lang-add-btn" onClick={handleAddLanguage}>
                <IconPlusCircle /> Add language
              </button>
            </div>
          )}
        </Section>

        {/* ── CASE INFORMATION ── */}
        <Section title="Case Information">
          <div className="col-12 col-md-6 col-xl-3">
            <FloatSelect id="category" name="category" label="Category" required value={caseFormData.category} onChange={handleCaseChange}>
              {CASE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </FloatSelect>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatSelect id="attorneyType" name="attorneyType" label="Type of Attorney" required value={caseFormData.attorneyType} onChange={handleCaseChange}>
              <option value="Corporate Law">Corporate Law</option>
              <option value="Criminal Defense">Criminal Defense</option>
              <option value="Family Law">Family Law</option>
              <option value="Immigration Law">Immigration Law</option>
              <option value="Tax Law">Tax Law</option>
              <option value="Real Estate Law">Real Estate Law</option>
              <option value="Employment Law">Employment Law</option>
              <option value="Personal Injury">Personal Injury</option>
              <option value="Intellectual Property">Intellectual Property</option>
              <option value="General Practice">General Practice</option>
            </FloatSelect>
          </div>
          <div className="col-12 col-xl-6 d-none d-xl-block" aria-hidden="true"></div>
          <div className="col-12 col-xl-6">
            <FloatTextarea id="briefDescription" name="briefDescription" label="Brief Description of Issues" required value={caseFormData.briefDescription} onChange={handleCaseChange} />
          </div>
          <div className="col-12 col-xl-6">
            <FloatTextarea id="remarks" name="remarks" label="Remarks" value={caseFormData.remarks} onChange={handleCaseChange} />
          </div>
        </Section>

        {/* ── SCHEDULING ── */}
        <Section title="Scheduling">
          <div className="col-12 col-md-6 col-xl-3">
            {/* type="text", not "date" — read only, and a native date input
                always shows its own "mm/dd/yyyy" placeholder even when empty. */}
            <FloatInput id="date" name="date" label="Date" value={schedulingFormData.date} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="timeSlot" name="timeSlot" label="Time Slot" value={schedulingFormData.timeSlot} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatSelect id="meetingPlatform" name="meetingPlatform" label="Meeting Platform" value={schedulingFormData.meetingPlatform} onChange={handleSchedulingChange} readOnly={!canEditMeeting}>
              <option value="Virtual">Virtual</option>
              <option value="Phone Call">Phone Call</option>
              <option value="In Person">In Person</option>
            </FloatSelect>
          </div>
          {/* A link is only meaningful for a Virtual meeting. */}
          {schedulingFormData.meetingPlatform === "Virtual" && (
            <div className="col-12 col-md-6 col-xl-3">
              <FloatInput id="meetingLink" name="meetingLink" label="Meeting Link" value={schedulingFormData.meetingLink} onChange={handleSchedulingChange} readOnly={!canEditMeeting} />
            </div>
          )}

          <div className="col-12">
            <SectionDivider title="Attorney" sub />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="attorneyName" name="attorneyName" label="Name" value={schedulingFormData.attorneyName} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="attorneyEmail" name="attorneyEmail" label="Email" type="email" value={schedulingFormData.attorneyEmail} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="attorneyPhone" name="attorneyPhone" label="Phone Number" type="tel" value={schedulingFormData.attorneyPhone} readOnly />
          </div>

          <div className="col-12">
            <SectionDivider title="Legal Student" sub />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="legalStudentName" name="legalStudentName" label="Name" value={schedulingFormData.legalStudentName} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="legalStudentEmail" name="legalStudentEmail" label="Email" type="email" value={schedulingFormData.legalStudentEmail} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="legalStudentPhone" name="legalStudentPhone" label="Phone Number" type="tel" value={schedulingFormData.legalStudentPhone} readOnly />
          </div>

          <div className="col-12">
            <SectionDivider title="Interpreter" sub />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="interpreterName" name="interpreterName" label="Name" value={schedulingFormData.interpreterName} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="interpreterEmail" name="interpreterEmail" label="Email" type="email" value={schedulingFormData.interpreterEmail} readOnly />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <FloatInput id="interpreterPhone" name="interpreterPhone" label="Phone Number" type="tel" value={schedulingFormData.interpreterPhone} readOnly />
          </div>
        </Section>

        {attorneySection}
        </>
        )}
        </div>

        {/* Bottom Section — Delete moved into the tabs row's "more options" menu */}
        <div className="d-flex justify-content-end align-items-end mb-2 ef-bottom-bar">
          <div className="d-flex flex-column align-items-end">
            <p className="err-color">{requiredFields.filled}/{requiredFields.total} required fields</p>
            <div className="d-flex gap-3">
              <button type="button" className="btn btn-cancel" onClick={handleCancel} disabled={isSaving}>Cancel</button>
              <button type="button" className="btn btn-submit d-inline-flex align-items-center gap-2" disabled={!isFormValid || isSaving} onClick={() => handleSubmit()}>
                <IconSave /> {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Headers ──────────────────────────────────────────────────────────────────

// Returns to the page the form was opened from. Sits above the title on both
// headers so it reads as "leave this case", separate from the Cancel/Save
// pair that acts on the form's contents.
function BackButton({ onBack }) {
  return (
    <button type="button" className="ef-back-btn" onClick={onBack}>
      <IconArrowLeft /> Back
    </button>
  );
}

function ExistingClientHeader({ clientFormData, caseFormData, dateAdded, matchFormData, schedulingFormData, onBack }) {
  // Use the human-readable names from schedulingInfo, not the UIDs in matchInfo
  const attorneyName = schedulingFormData?.attorneyName || "";
  const legalStudentName = schedulingFormData?.legalStudentName || "";
  const interpreterName = schedulingFormData?.interpreterName || "";

  return (
    <div className="container pt-5 pb-3 mb-0 ef-page-indent">
      <BackButton onBack={onBack} />
      <div className="d-flex justify-content-between align-items-end">
        <div>
          <p className="mb-0 edit-form-title">
            {clientFormData.fname || "Client Name not Assigned"} {clientFormData.lname || ""}
          </p>
          <p className="mb-0 edit-form-subtitle">
            {caseFormData.category || "Category not Assigned"} | {clientFormData.primaryLanguage || "Language not Assigned"}
          </p>
          {/* Its own line — the date isn't one of the case's attributes the
              way category and language are. A case that hasn't been saved
              yet has no dateAdded; it's stamped on the first save. */}
          <p className="mb-1 edit-form-subtitle">
            Date Added: {dateAdded ? dateAdded.split(" ")[0] : "Not saved yet"}
          </p>
          {/* Email / phone chips */}
          <div className="ef-header-meta">
            {clientFormData.email && (
              <span className="ef-header-contact-chip">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                </svg>
                {clientFormData.email}
              </span>
            )}
            {clientFormData.phone && (
              <span className="ef-header-contact-chip">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                  <path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511Z"/>
                </svg>
                {clientFormData.phone}
              </span>
            )}
          </div>
        </div>

        {/* ── Right: Attorney / Legal Student / Interpreter (read-only) ── */}
        <div className="ef-header-assignments">
          <div className="ef-header-assign-slot">
            <span className="ef-header-assign-role">Attorney</span>
            <span className={`ef-header-assign-pill${!attorneyName ? " ef-header-assign-pill--empty" : ""}`}>
              {attorneyName || "Unassigned"}
            </span>
          </div>
          <div className="ef-header-assign-slot">
            <span className="ef-header-assign-role">Legal Student</span>
            <span className={`ef-header-assign-pill${!legalStudentName ? " ef-header-assign-pill--empty" : ""}`}>
              {legalStudentName || "Unassigned"}
            </span>
          </div>
          <div className="ef-header-assign-slot">
            <span className="ef-header-assign-role">Interpreter</span>
            <span className={`ef-header-assign-pill${!interpreterName ? " ef-header-assign-pill--empty" : ""}`}>
              {interpreterName || "Unassigned"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


function NewClientHeader({ onBack }) {
  return (
    <div className="container pt-5 pb-3 ef-page-indent">
      <BackButton onBack={onBack} />
      <div className="d-flex justify-content-between align-items-center">
        <h1>New Case</h1>
      </div>
    </div>
  );
}

// The "Future Work"/"Summary of Visit" statement text below is still
// placeholder lorem ipsum — real wording for those hasn't been written yet.
const EF_CONSENT_BULLETS = [
  "I understand the Neighborhood Legal Clinics (NLC) program provides advice and consultation only, meaning the attorney I meet with will not represent me in court or provide further services.",
  "I understand that NLC attorneys are volunteers and are not available for hire to represent me.",
  "I understand the NLC attorney may not specialize in the area of law that I need help with, but will make every attempt to answer my questions accurately.",
  "I understand that information disclosed to NLC attorneys and staff is protected by the attorney-client privilege, but that protection may be limited if I bring other people into the session.",
  "I understand that I cannot return to the NLC for the same issue if that issue does not have legal merit.",
  "I understand that the NLC is drug, alcohol, weapon, violence, aggressive behavior and threat free.",
];

const EF_KCBA_SERVICES = ["Bankruptcy", "Estate Planning", "SS Overpayments", "Vacating Records", "Debt"];

const EF_FOLLOWUP_SERVICE_TYPES = [
  "Brief service (letter writing, reviewing paper, etc.)",
  "Ongoing Representation in a legal matter",
];

// Reason for Client's Visit — mirrors the same category/subcategory
// taxonomy as the Recommended Resources tab (resourcesData.json), with the
// numeric case-type codes attorneys use elsewhere. Kept as its own list
// (rather than reading resourcesData directly) since the codes aren't part
// of that data and the wording here differs slightly in a couple of spots.
const EF_VISIT_REASON_CATEGORIES = [
  {
    category: "Consumer / Finance",
    items: [
      { code: 1, label: "Bankruptcy/Debtor Relief" },
      { code: 2, label: "Collections/Repo/Garnishment" },
      { code: 3, label: "Contracts/Warranties" },
      { code: 4, label: "Collection Practices/Creditor Harass." },
      { code: 5, label: "Predatory Lending Practices" },
      { code: 6, label: "Loans/ Installment Purchases" },
      { code: 7, label: "Public Utilities" },
      { code: 8, label: "Unfair Sales Practices" },
      { code: 9, label: "Other Consumer / Finance" },
    ],
  },
  {
    category: "Education",
    items: [
      { code: 11, label: "Education" },
      { code: 12, label: "Discipline" },
      { code: 13, label: "Special Education/Learning Dis." },
      { code: 14, label: "Access" },
      { code: 15, label: "Vocational Education" },
      { code: 16, label: "Student Financial Aid" },
      { code: 19, label: "Other Education" },
    ],
  },
  {
    category: "Employment",
    items: [
      { code: 21, label: "Employment Discrimination" },
      { code: 22, label: "Wage Claims and Other FLSA" },
      { code: 23, label: "Earned Income Tax Credit" },
      { code: 24, label: "Taxes" },
      { code: 25, label: "Employee Rights" },
      { code: 26, label: "Agricultural Workers Issues" },
      { code: 29, label: "Other Employment" },
    ],
  },
  {
    category: "Family",
    items: [
      { code: 30, label: "Adoption" },
      { code: 31, label: "Child Custody/ Visitation" },
      { code: 32, label: "Divorce / Separation" },
      { code: 33, label: "Adult Guardianship", note: "(for Minor Guardianship, see 44)" },
      { code: 34, label: "Name Change" },
      { code: 35, label: "Paternal Rights Termination" },
      { code: 36, label: "Paternity" },
      { code: 37, label: "Domestic Abuse" },
      { code: 38, label: "Child Support" },
      { code: 39, label: "Other Family Law" },
    ],
  },
  {
    category: "Juvenile",
    items: [
      { code: 41, label: "Juvenile Delinquent" },
      { code: 42, label: "Dependency (Abuse/Neglect)" },
      { code: 43, label: "Emancipation" },
      { code: 44, label: "Guardianship/ 3rd party custody" },
      { code: 49, label: "Other Juvenile" },
    ],
  },
  {
    category: "Health",
    items: [
      { code: 51, label: "Medicaid" },
      { code: 52, label: "Medicare" },
      { code: 53, label: "Govt. Child Health Ins. Programs" },
      { code: 54, label: "Home and Community Based Care" },
      { code: 55, label: "Private Health Insurance" },
      { code: 56, label: "Long Term Health Care Facilities" },
      { code: 57, label: "State and Local Health" },
      { code: 59, label: "Other Health" },
    ],
  },
  {
    category: "Housing",
    items: [
      { code: 61, label: "Federally Subsidized Housing" },
      { code: 62, label: "Real Property/Home Ownership" },
      { code: 63, label: "Private Landlord/Tenant" },
      { code: 64, label: "Public Housing" },
      { code: 65, label: "Mobile Homes" },
      { code: 66, label: "Housing Discrimination" },
      { code: 67, label: "Mortgage Foreclosures" },
      { code: 68, label: "Mortgage Predatory Lending" },
      { code: 69, label: "Other Housing" },
    ],
  },
  {
    category: "Income Maintenance",
    items: [
      { code: 71, label: "TANF / Welfare" },
      { code: 72, label: "Social Security" },
      { code: 73, label: "Food Stamps" },
      { code: 74, label: "SSID" },
      { code: 75, label: "SSI" },
      { code: 76, label: "Unemployment Compensation" },
      { code: 77, label: "Veterans Benefits" },
      { code: 78, label: "State and Local Income Maintenance" },
      { code: 79, label: "Other Income Maintenance" },
    ],
  },
  {
    category: "Individual Rights",
    items: [
      { code: 81, label: "Immigration / Naturalization" },
      { code: 82, label: "Mental Health" },
      { code: 83, label: "Prisoners' Rights" },
      { code: 84, label: "Disability Rights" },
      { code: 85, label: "Civil Rights" },
      { code: 86, label: "Human Trafficking" },
      { code: 89, label: "Other Individual Rights" },
    ],
  },
  {
    category: "Miscellaneous",
    items: [
      { code: 91, label: "Assistance to Non-Profit or Group" },
      { code: 92, label: "Indian Law" },
      { code: 93, label: "Traffic / Drivers License" },
      { code: 94, label: "Torts" },
      { code: 95, label: "Estate Planning / Wills / Probate" },
      { code: 96, label: "Advanced Directives/ Power of Attorneys" },
      { code: 97, label: "Vacating Record" },
      { code: 98, label: "Criminal" },
      { code: 99, label: "Other" },
      { code: 100, label: "Municipal Legal Needs" },
    ],
  },
];

function RadioField({ name, value, currentValue, label, onChange, disabled, children }) {
  const id = `${name}-${value}`;
  return (
    <div className="form-check">
      <input
        className="form-check-input"
        type="radio"
        name={name}
        id={id}
        value={value}
        checked={currentValue === value}
        onChange={onChange}
        disabled={disabled}
      />
      <label className="form-check-label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function AttorneySection({ attorneyNotesFormData, handleAttorneyNotesChange, handleAttorneyNotesArrayToggle, canEdit }) {
  const kcbaSelected = attorneyNotesFormData.kcbaReferralServices || [];
  const followUpServiceSelected = attorneyNotesFormData.followUpServiceTypes || [];

  return (
    <Section title="Attorney Notes" id="attorney-section">
      {/* ── Consent (attorney check) ── */}
      <div className="col-12">
        <SectionDivider title="Consent (attorney check)" sub badge="Attorneys Only" />

        <p className="fw-bold mb-2">Please read the statement below and ask consent from client prior to the legal consultation.</p>
        <ul className="ef-statement-list">
          {EF_CONSENT_BULLETS.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
        <div className="row g-4 mb-4">
          <div className="col-12 col-md-6 col-xl-3">
            <FloatSelect id="clientConsent" name="clientConsent" label="Client Consent" required value={attorneyNotesFormData.clientConsent} onChange={handleAttorneyNotesChange} readOnly={!canEdit}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </FloatSelect>
          </div>
        </div>

        <p className="fw-bold mb-2">Please read the statement below and ask consent from client prior to the legal consultation.</p>
        <ul className="ef-statement-list">
          <li>I give NLC permission to disclose my information for the purpose of referring me for other services.</li>
        </ul>
        <div className="row g-4">
          <div className="col-12 col-md-6 col-xl-3">
            <FloatSelect id="referralPermission" name="referralPermission" label="Referral Permission" required value={attorneyNotesFormData.referralPermission} onChange={handleAttorneyNotesChange} readOnly={!canEdit}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </FloatSelect>
          </div>
        </div>
      </div>

      {/* ── Future Work with this Client ── */}
      <div className="col-12">
        <SectionDivider title="Future Work with this Client" sub />
        <p className="fw-bold mb-2">In the spirit of volunteerism, if the client is able to hire an attorney please refer to an attorney outside of yourself or your firm.</p>
        <p className="mb-2">
          Do you plan to follow up outside the clinic pro bono?
          <span className="ef-required-asterisk">*</span>
        </p>
        <div className="d-flex gap-4">
          <RadioField name="followUpProBono" value="Yes" currentValue={attorneyNotesFormData.followUpProBono} label="Yes" onChange={handleAttorneyNotesChange} disabled={!canEdit} />
          <RadioField name="followUpProBono" value="No" currentValue={attorneyNotesFormData.followUpProBono} label="No" onChange={handleAttorneyNotesChange} disabled={!canEdit} />
        </div>

        {attorneyNotesFormData.followUpProBono === "Yes" && (
          <div className="mt-3">
            <p className="mb-2">If yes, are you providing a:</p>
            <div className="d-flex flex-column gap-2 mb-3">
              {EF_FOLLOWUP_SERVICE_TYPES.map((type) => (
                <label key={type} className="ef-checkbox-inline">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={followUpServiceSelected.includes(type)}
                    onChange={() => handleAttorneyNotesArrayToggle("followUpServiceTypes", type)}
                    disabled={!canEdit}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
            <div className="row g-4">
              <div className="col-12">
                <FloatTextarea
                  id="followUpServiceDescription" name="followUpServiceDescription" label="Please describe services"
                  value={attorneyNotesFormData.followUpServiceDescription} onChange={handleAttorneyNotesChange} readOnly={!canEdit} height="100px"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary of Visit ── */}
      <div className="col-12">
        <SectionDivider title="Summary of Visit" sub />
        <div className="mb-3">
          <RadioField
            name="visitSummaryStatus" value="No further services" currentValue={attorneyNotesFormData.visitSummaryStatus}
            label="This client requires no further services and should not return to the clinic for this legal issue"
            onChange={handleAttorneyNotesChange}
            disabled={!canEdit}
          />
          <RadioField
            name="visitSummaryStatus" value="May return after to-do list" currentValue={attorneyNotesFormData.visitSummaryStatus}
            label="Client may return to the clinic after completing the To-Do list"
            onChange={handleAttorneyNotesChange}
            disabled={!canEdit}
          />
          <RadioField
            name="visitSummaryStatus" value="Referred to KCBA" currentValue={attorneyNotesFormData.visitSummaryStatus}
            label="Client was referred to KCBA Volunteer Legal Services for:"
            onChange={handleAttorneyNotesChange}
            disabled={!canEdit}
          >
            <div className="ef-checkbox-row">
              {EF_KCBA_SERVICES.map((service) => (
                <label key={service} className="ef-checkbox-inline">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={kcbaSelected.includes(service)}
                    onChange={() => handleAttorneyNotesArrayToggle("kcbaReferralServices", service)}
                    disabled={!canEdit}
                  />
                  <span>{service}</span>
                </label>
              ))}
            </div>
          </RadioField>
          <RadioField
            name="visitSummaryStatus" value="Referred to Lawyer Referral Service" currentValue={attorneyNotesFormData.visitSummaryStatus}
            label="Client was referred to Lawyer Referral Service (if over 200% income and needs ongoing representation or has a contingency fee case)"
            onChange={handleAttorneyNotesChange}
            disabled={!canEdit}
          />
          <RadioField
            name="visitSummaryStatus" value="Should not return" currentValue={attorneyNotesFormData.visitSummaryStatus}
            label="This client should not return to the NLC for any reason (if checked, please describe in detail below)"
            onChange={handleAttorneyNotesChange}
            disabled={!canEdit}
          />
        </div>
        <FloatTextarea id="visitSummary" name="visitSummary" label="Please summarize the client's legal issue and advice given" required value={attorneyNotesFormData.visitSummary} onChange={handleAttorneyNotesChange} readOnly={!canEdit} height="140px" />
      </div>

      {/* ── Reason for Client's Visit ── */}
      <div className="col-12">
        <SectionDivider title="Reason for Client's Visit" sub />
        <p className="fw-bold mb-2">
          Check ONE only
          <span className="ef-required-asterisk">*</span>
        </p>
        {/* Same category grid as the Recommended Resources tab (.ef-res-*),
            so this list reads as the same taxonomy in the same layout. */}
        <div className="ef-res-grid">
          {EF_VISIT_REASON_CATEGORIES.map(({ category, items }) => (
            <div className="ef-res-column" key={category}>
              <span className="ef-res-column-label">{category}</span>
              {items.map((item) => (
                <div key={item.code}>
                  <RadioField
                    name="reasonForVisit"
                    value={String(item.code)}
                    currentValue={attorneyNotesFormData.reasonForVisit}
                    label={`${item.label} (${item.code})`}
                    onChange={handleAttorneyNotesChange}
                    disabled={!canEdit}
                  />
                  {item.note && <div className="text-muted small ef-visit-reason-note">{item.note}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
