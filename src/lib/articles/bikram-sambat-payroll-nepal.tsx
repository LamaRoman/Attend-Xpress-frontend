export default function Content() {
  return (
    <div className="prose-article">
      <p>
        Most HR software sold in this region was built somewhere else — usually India.
        That&apos;s not a criticism; it&apos;s just a fact. And it creates a consistent
        problem for Nepali businesses: the software thinks in AD. Your business thinks
        in BS.
      </p>
      <p>
        This isn&apos;t a minor conversion issue you can work around with a calendar app.
        It&apos;s baked into the fundamental structure of how payroll, leave, and attendance
        work in Nepal, and it creates friction at every step.
      </p>

      <h2>Why the calendar matters more than you&apos;d think</h2>
      <p>
        Your fiscal year runs Shrawan 1 to Ashadh 31. The Nepali government publishes
        holiday lists in BS dates. Your employees know Dashain and Tihar by their BS dates —
        not by the AD equivalents, which change every year. Salary cycles are anchored to BS
        months. SSF filings reference Nepali fiscal year.
      </p>
      <p>
        Any software that doesn&apos;t understand this requires you to constantly translate.
        You look up that Dashain falls on Ashoj 15 this year, convert it to AD to enter it
        into the system, then verify the conversion is correct, then do it again next year
        when the AD date is different. Multiply that by 15 or 20 public holidays. Then do
        the same exercise for payroll cycle boundaries.
      </p>
      <p>
        It&apos;s death by a thousand cuts — no single step is catastrophic, but the total
        friction is significant, and it happens every month, every year.
      </p>

      <h2>The SSF filing problem</h2>
      <p>
        Social Security Fund contributions in Nepal align with Nepali fiscal year and
        Nepali months. The forms reference BS months. Your accountant works in BS months.
      </p>
      <p>
        If your payroll software generates reports in AD, those reports need to be translated
        before your accountant can use them. This is extra work every month, and it
        introduces errors. Conversion mistakes in payroll data affect SSF filings, which
        affects employee benefits and creates compliance risk.
      </p>
      <p>
        A payroll system that understands BS months generates an SSF-ready report directly —
        in the same month notation your accountant is already working in. One step instead
        of two, and no conversion.
      </p>

      <h2>What good BS calendar support actually looks like</h2>
      <p>
        There&apos;s &quot;supports Nepali calendar&quot; as a marketing bullet point, and
        there&apos;s actually supporting it. The difference is in the details.
      </p>
      <p>
        Leave balances should reset at Shrawan 1 — the start of the Nepali fiscal year —
        not January 1. If your software resets leave at the wrong time, your records are
        wrong from the first month.
      </p>
      <p>
        Holiday calendars should be entered and displayed in BS dates. If you have to enter
        Dashain as &quot;October 2&quot; and then remember to convert it next year when the
        AD date shifts, the system is making you do work it should do for you.
      </p>
      <p>
        Payroll reports and payslips should show the Nepali month prominently — not buried
        as a subtitle under an AD date range. Your employees read their payslips. They know
        which Nepali month they worked in. A payslip that says &quot;April 2025&quot; when
        the salary is for Baisakh 2082 creates confusion.
      </p>
      <p>
        The trickiest part: prorated salary calculations. BS months have irregular lengths —
        not 30 days each, and not consistent from year to year. Any payroll calculation that
        treats a month as 30 days is wrong for Nepal. When an employee joins on Baisakh 15,
        their prorated salary for that month needs to be based on the actual number of days
        in Baisakh that year, not a rounded approximation.
      </p>

      <h2>The parallel system problem</h2>
      <p>
        The HR managers I&apos;ve talked to who run Indian HR software have developed a
        workaround: the official payroll runs in the software in AD, and a parallel
        Excel sheet in BS is what the accountant actually uses for SSF filings and reporting.
      </p>
      <p>
        Two systems, double the data entry, and the inevitable divergence between them when
        something gets updated in one but not the other.
      </p>
      <p>
        This is not an unusual situation. A lot of Nepali businesses are running this way
        right now, treating it as the cost of using established software. It isn&apos;t
        something you have to accept — it&apos;s the result of using software that
        wasn&apos;t designed for Nepal and compensating for it manually.
      </p>

      <h2>What to ask before you buy</h2>
      <p>
        When evaluating any HR or payroll software for use in Nepal, these questions get
        to the heart of whether the BS calendar support is real or cosmetic:
      </p>
      <p>
        Can you set up payroll cycles by BS month — Baisakh through Chaitra — rather than
        by AD date ranges? Do holidays appear in the system in BS dates? Do generated
        payslips display the Nepali month? Does the system calculate prorated salary using
        the actual number of days in the relevant BS month?
      </p>
      <p>
        If the answers are hedged — &quot;you can enter a custom date range,&quot;
        &quot;you can work around it by...&quot; — that&apos;s not BS support. That&apos;s
        AD software with a thin compatibility shim. The friction will be there from day one.
      </p>
      <p>
        Nepal-specific payroll software exists. It handles BS natively because it was
        designed in Nepal, for Nepal. If your current software is making you maintain two
        systems or convert dates every month, that is a solvable problem.
      </p>
    </div>
  )
}
