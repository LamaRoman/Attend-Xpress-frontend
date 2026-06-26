export default function Content() {
  return (
    <div className="prose-article">
      <p>
        Leave is one of those things that seems simple until you&apos;re the one tracking it.
        How many days does each employee have left? Did that sick leave get approved? Is this
        person&apos;s home leave balance carrying over or expiring? When it&apos;s all in
        someone&apos;s head or a spreadsheet, the answers get fuzzy — and fuzzy leave records
        turn into disputes at exactly the wrong moments.
      </p>
      <p>
        Underneath the practical mess there&apos;s a legal layer. Nepal&apos;s Labor Act 2074
        (2017) sets out leave entitlements that employers are required to provide. Getting
        leave management right means getting both the tracking and the compliance right.
        Here&apos;s a plain overview of both.
      </p>
      <p className="text-sm italic text-slate-500">
        A note before the details: this is a general explanation, not legal advice. Labor
        rules get amended and interpreted, and specifics can vary by employment type and
        sector. For decisions with legal or financial consequence, confirm the current
        provisions with a qualified HR or legal professional.
      </p>

      <h2>The main leave types under the Labor Act</h2>
      <p>
        The Labor Act 2074 recognizes several categories of leave. The ones that matter most
        for day-to-day HR:
      </p>
      <p>
        <strong>Annual leave (home leave).</strong> Employees accrue annual leave based on
        days worked — broadly, one day of home leave for a set number of days worked. This
        leave generally accumulates and can be carried forward up to a cap, which makes
        accurate running balances important; you can&apos;t reconstruct a year of accrual
        from memory.
      </p>
      <p>
        <strong>Sick leave.</strong> Employees are entitled to a number of paid sick days per
        year. Unused sick leave and its carry-forward treatment differ from annual leave,
        which is one reason lumping all leave into a single &quot;leave balance&quot; causes
        problems.
      </p>
      <p>
        <strong>Maternity leave.</strong> Female employees are entitled to a substantial
        period of maternity leave with pay, as provided under the Act. This is a legal
        entitlement, not a discretionary benefit.
      </p>
      <p>
        <strong>Paternity leave.</strong> The Act also provides for paternity leave — a
        defined number of days for male employees — which many businesses still track
        informally and inconsistently.
      </p>
      <p>
        <strong>Public holidays.</strong> Separate from personal leave, employees are
        entitled to public holidays, including the major festivals. Female employees are
        additionally entitled to certain days such as those connected to specific festivals.
        These need to be reflected in the working calendar so they aren&apos;t counted as
        absence or deducted from personal leave.
      </p>

      <h2>Why spreadsheets fail at this</h2>
      <p>
        The problem with tracking leave manually isn&apos;t that it&apos;s impossible —
        it&apos;s that it requires perfect, continuous discipline, and one missed update
        corrupts the record going forward.
      </p>
      <p>
        Each leave type accrues differently and carries forward differently. Balances change
        every time someone takes leave or accrues more. A request has to be checked against
        the available balance for that specific leave type. With ten employees this is
        tedious; with fifty it&apos;s a part-time job; and at any size, the spreadsheet is
        only as accurate as the last person who remembered to update it.
      </p>
      <p>
        The failures show up at the worst times. An employee is told they have no annual
        leave left when they actually had five days. A maternity leave entitlement is
        miscalculated. Two managers approve overlapping leave because neither could see the
        other&apos;s decision. These aren&apos;t hypothetical — they&apos;re the normal
        result of running statutory entitlements on a shared spreadsheet.
      </p>

      <h2>The fiscal-year timing problem</h2>
      <p>
        Here&apos;s a detail that trips up software not built for Nepal: leave accrual and
        annual reset are tied to the Nepali fiscal year, which begins on Shrawan 1 — not
        January 1.
      </p>
      <p>
        If your system resets annual leave balances on the AD new year, every balance is
        wrong relative to how your business and your accountant actually account for the year.
        Leave management has to operate on the BS fiscal calendar to line up with everything
        else — payroll cycles, SSF, holiday lists. A leave system that resets at the wrong
        point in the year creates a discrepancy you&apos;ll be reconciling indefinitely.
      </p>

      <h2>What good leave management actually does</h2>
      <p>
        A proper leave system removes the manual tracking and the disputes that come with it.
        The pieces that matter:
      </p>
      <p>
        <strong>Separate balances per leave type.</strong> Annual, sick, maternity, paternity
        — each tracked on its own with its own accrual and carry-forward rule, not merged
        into one number.
      </p>
      <p>
        <strong>Request and approval in one place.</strong> An employee requests leave, the
        manager sees the request along with the current balance, and approves or declines.
        The balance updates automatically. No separate spreadsheet to remember to edit, no
        approval lost in an email thread.
      </p>
      <p>
        <strong>Automatic balance calculation.</strong> The system accrues leave as the
        employee works and deducts it as leave is taken, so the balance is always current and
        always correct. Anyone can check it in a second.
      </p>
      <p>
        <strong>BS fiscal-year alignment.</strong> Accruals and resets follow the Nepali
        fiscal year, so leave records line up with payroll and compliance.
      </p>
      <p>
        <strong>A record you can stand behind.</strong> When a question comes up about how
        much leave someone took or had, there&apos;s a clear, dated history — not a debate
        about who remembers what.
      </p>

      <h2>The compliance angle</h2>
      <p>
        Beyond convenience, accurate leave records are a compliance matter. The Labor Act
        sets minimum entitlements, and an employer needs to be able to demonstrate that
        employees received what they were due. In a dispute — or an inspection — a clear
        leave record is the difference between a quick answer and a problem.
      </p>
      <p>
        Maternity leave is the case where this matters most. It&apos;s a significant
        statutory entitlement, and mishandling it carries both legal and reputational cost.
        A system that tracks it correctly, against the right entitlement and the right
        calendar, protects both the employee and the business.
      </p>
      <p>
        Leave management isn&apos;t the most exciting part of running a business, but
        it&apos;s one where getting it wrong is expensive and getting it right is mostly a
        matter of using a system designed for the job — one that knows Nepal&apos;s leave
        types, the Labor Act&apos;s entitlements, and the BS fiscal year they all run on.
      </p>
    </div>
  )
}
