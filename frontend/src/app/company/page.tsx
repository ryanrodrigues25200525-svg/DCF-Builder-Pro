

// This page needs a ticker parameter to fetch data
// For now, show a placeholder prompting user to search for a company
export default function CompanyPage() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[var(--bg-app)]">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-2xl font-bold text-white">Company Overview</h1>
        <p className="text-white/60">
          Use the search bar above to find a company, or navigate to{" "}
          <a href="/financials" className="text-[var(--color-blue)] underline">
            Financials
          </a>
        </p>
      </div>
    </div>
  );
}
