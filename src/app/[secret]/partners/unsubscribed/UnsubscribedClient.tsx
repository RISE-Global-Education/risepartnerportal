"use client";

import { useCallback, useEffect, useState } from "react";
import { RISE_POC_OPTIONS } from "@/lib/rise-pocs";

interface Row {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  country: string | null;
  risePoc: string[];
  createdAt: string;
}

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none";

export default function UnsubscribedClient({ secret }: { secret: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [risePoc, setRisePoc] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ secret, page: String(page), q: query });
      const res = await fetch(`/api/unsubscribes?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.rows);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [secret, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search; reset to the first page when it changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function toggleRisePoc(n: string) {
    setRisePoc((prev) => (prev.includes(n) ? prev.filter((p) => p !== n) : [...prev, n]));
  }

  function resetForm() {
    setEmail("");
    setName("");
    setCompanyName("");
    setCountry("");
    setRisePoc([]);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/unsubscribes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, email, name, companyName, country, risePoc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      resetForm();
      setIsOpen(false);
      if (page === 1) await load();
      else setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row: Row) {
    if (!confirm(`Remove ${row.email} from the no-send list?`)) return;
    const res = await fetch("/api/unsubscribes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, id: row.id }),
    });
    if (res.ok) load();
    else alert("Failed to remove");
  }

  const csvHref = `/api/unsubscribes?${new URLSearchParams({ secret, format: "csv", q: query })}`;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mt-6">
      <p className="text-sm text-rise-brown mb-4">
        Emails that have unsubscribed. This is a record only — it does not block sends by itself.
      </p>

      {!isOpen ? (
        <div className="mb-6 text-center">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors"
          >
            + Add to No-Send List
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden max-w-4xl mx-auto">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-rise-black font-heading">Add to No-Send List</h2>
            <button
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="text-sm text-rise-brown hover:text-rise-black"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-rise-black mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-rise-black mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-rise-black mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-rise-black mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={INPUT}
                  placeholder="e.g. India"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-rise-black mb-2">Primary POC</label>
              <div className="flex gap-2 flex-wrap">
                {RISE_POC_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleRisePoc(n)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      risePoc.includes(n)
                        ? "bg-rise-green text-white border-rise-green"
                        : "bg-white text-rise-brown border-gray-200 hover:border-rise-green"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Adding..." : "Add to List"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email, name, company, country..."
          className="w-full max-w-sm px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none bg-white"
        />
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-rise-brown">{total} record{total === 1 ? "" : "s"}</span>
          <a
            href={csvHref}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-rise-green text-rise-green hover:bg-rise-green hover:text-white transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-rise-brown border-b border-gray-100">
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Primary POC</th>
              <th className="px-4 py-3 font-semibold">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loadError ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-red-500">{loadError}</td>
              </tr>
            ) : loading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-rise-brown">Loading...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-rise-brown">No records</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 text-rise-black">{r.email}</td>
                  <td className="px-4 py-2.5">{r.name || "—"}</td>
                  <td className="px-4 py-2.5">{r.companyName || "—"}</td>
                  <td className="px-4 py-2.5">{r.country || "—"}</td>
                  <td className="px-4 py-2.5">{r.risePoc?.length ? r.risePoc.join(", ") : "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(r)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-rise-brown disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-rise-brown">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-rise-brown disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
