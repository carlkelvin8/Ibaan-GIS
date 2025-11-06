// frontend/src/components/Admin/UserForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createUser, updateUser } from "../../api/user";

// Keep in sync with backend role names
const ROLE_OPTS = ["ADMIN", "ASSESSOR", "ENGINEER", "PLANNER", "BPLO"];
const STATUS_OPTS = ["active", "pending", "disabled"]; // shown only if admin editing

/**
 * Props:
 * - mode: 'create' | 'edit'
 * - initialValues?: { id, username, first_name, last_name, email, role, status, office_id?, municipality_id? }
 * - onSuccess?: () => void
 * - onCancel?: () => void
 * - canEditStatus?: boolean  // if true, show editable Status in EDIT mode only
 */
export default function UserForm({ mode = "create", initialValues, onSuccess, onCancel, canEditStatus = false }) {
  const isEdit = mode === "edit";

  const defaults = useMemo(
    () => ({
      id: initialValues?.id ?? null,
      username: initialValues?.username ?? "",
      first_name: initialValues?.first_name ?? "",
      last_name: initialValues?.last_name ?? "",
      email: initialValues?.email ?? "",
      password: "", // optional in edit
      role: (initialValues?.role ?? "BPLO").toString().toUpperCase(),
      status: (initialValues?.status ?? "pending").toString().toLowerCase(),
      office_id: initialValues?.office_id ?? "",
      municipality_id: initialValues?.municipality_id ?? "",
    }),
    [initialValues]
  );

  const [form, setForm] = useState(defaults);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => setForm(defaults), [defaults]);

  const update = (k) => (e) => {
    const v = e?.target?.type === "number" ? e.target.value : e.target.value;
    setForm((s) => ({ ...s, [k]: v }));
  };

  function isValidEmail(v) {
    return /^\S+@\S+\.\S+$/.test(String(v || "").trim());
  }

  function buildPayload() {
    const payload = {
      username: String(form.username || "").trim(),
      first_name: String(form.first_name || "").trim(),
      last_name: String(form.last_name || "").trim(),
      email: String(form.email || "").trim(),
      role: String(form.role || "").toUpperCase(),
      // status is AUTO-DETECTED by server; only include on edit when admin explicitly changes it
      office_id: form.office_id === "" ? null : Number(form.office_id),
      municipality_id: form.municipality_id === "" ? null : Number(form.municipality_id),
    };

    if (!isEdit) {
      payload.password = form.password;
    } else if (form.password && form.password.length >= 6) {
      payload.password = form.password;
    }

    if (isEdit && canEditStatus) {
      payload.status = String(form.status || "").toLowerCase();
    }

    return payload;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    // client-side guards
    if (!form.username?.trim()) return setErrorMsg("Username is required.");
    if (!form.first_name?.trim()) return setErrorMsg("First name is required.");
    if (!form.last_name?.trim()) return setErrorMsg("Last name is required.");
    if (!isValidEmail(form.email)) return setErrorMsg("Valid email is required.");
    if (!isEdit && (!form.password || form.password.length < 6)) {
      return setErrorMsg("Password must be at least 6 characters (create).");
    }
    if (!ROLE_OPTS.includes(String(form.role).toUpperCase())) {
      return setErrorMsg("Role is invalid.");
    }
    if (isEdit && canEditStatus) {
      if (!STATUS_OPTS.includes(String(form.status).toLowerCase())) {
        return setErrorMsg("Status is invalid.");
      }
    }

    const payload = buildPayload();

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateUser(form.id, payload);
      } else {
        await createUser(payload); // server derives status
      }
      onSuccess?.();
    } catch (err) {
      const apiMsg = err?.response?.data?.error || err?.message || "Request failed.";
      setErrorMsg(apiMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      {errorMsg ? <ErrorBox>{errorMsg}</ErrorBox> : null}

      {/* Row 1 */}
      <div style={row}>
        <Field label="Username" required>
          <input
            style={input}
            value={form.username}
            placeholder="e.g., juan.delacruz"
            onChange={update("username")}
            disabled={submitting || isEdit /* optionally prevent changing username on edit */}
            autoFocus
          />
        </Field>
        <Field label="Email" required>
          <input
            style={input}
            type="email"
            placeholder="e.g., juan@city.gov.ph"
            value={form.email}
            onChange={update("email")}
            disabled={submitting}
          />
        </Field>
      </div>

      {/* Row 2 */}
      <div style={row}>
        <Field label="First name" required>
          <input style={input} value={form.first_name} placeholder="e.g., Juan" onChange={update("first_name")} disabled={submitting} />
        </Field>
        <Field label="Last name" required>
          <input style={input} value={form.last_name} placeholder="e.g., Dela Cruz" onChange={update("last_name")} disabled={submitting} />
        </Field>
      </div>

      {/* Row 3 */}
      <div style={row}>
        <Field label="Role" required>
          <select style={input} value={form.role} onChange={update("role")} disabled={submitting}>
            <option value="" disabled>— Select role —</option>
            {ROLE_OPTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        {/* Status field: hidden on CREATE; on EDIT, editable only if canEditStatus, else read-only */}
        {isEdit ? (
          canEditStatus ? (
            <Field label="Status" required>
              <select style={input} value={form.status} onChange={update("status")} disabled={submitting}>
                <option value="" disabled>— Select status —</option>
                {STATUS_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Status">
              <input style={input} value={form.status} readOnly disabled />
            </Field>
          )
        ) : (
          <div />
        )}
      </div>

      {/* Row 4 */}
      <div style={row}>
        <Field label="Office ID">
          <input
            style={input}
            type="number"
            placeholder="e.g., 12"
            value={form.office_id}
            onChange={update("office_id")}
            disabled={submitting}
          />
        </Field>
        <Field label="Municipality ID">
          <input
            style={input}
            type="number"
            placeholder="e.g., 137402"
            value={form.municipality_id}
            onChange={update("municipality_id")}
            disabled={submitting}
          />
        </Field>
      </div>

      {/* Password (create required, edit optional) */}
      <div style={row}>
        <Field label={isEdit ? "New password (optional)" : "Password"} required={!isEdit}>
          <input
            style={input}
            type="password"
            value={form.password}
            onChange={update("password")}
            placeholder={isEdit ? "Leave blank to keep current password" : "Minimum 6 characters"}
            disabled={submitting}
          />
        </Field>
        <div />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button type="button" onClick={() => onCancel?.()} style={btnGhost} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" style={btnPrimary} disabled={submitting}>
          {submitting ? (isEdit ? "Saving…" : "Creating…") : isEdit ? "Save changes" : "Create user"}
        </button>
      </div>
    </form>
  );
}

/* ---------- tiny UI primitives ---------- */

function Field({ label, required = false, children }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
      <span style={{ color: "#374151", fontWeight: 600 }}>
        {label} {required ? <span style={{ color: "#dc2626" }}>*</span> : null}
      </span>
      {children}
    </label>
  );
}

function ErrorBox({ children }) {
  return (
    <div
      role="alert"
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#991b1b",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- styles ---------- */

const row = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const input = {
  padding: "8px 10px",
  border: "1px solid #d0d7de",
  borderRadius: 8,
  minHeight: 38,
  background: "#fff",
};

const btnPrimary = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  minHeight: 38,
  cursor: "pointer",
};

const btnGhost = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #d0d7de",
  background: "#f6f8fa",
  color: "#111827",
  fontWeight: 600,
  minHeight: 38,
  cursor: "pointer",
};
