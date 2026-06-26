export default function Content() {
  return (
    <div className="prose-article">
      <p>
        The fingerprint machine sitting on the front desk at most offices across Nepal has
        become such a fixture that people barely question it anymore. It&apos;s just
        &quot;how attendance is done.&quot; But for a lot of businesses, it&apos;s also a
        constant source of small frustrations — the device that stops reading dusty fingers,
        the monthly report that requires someone to manually export data, the Rs 25,000
        machine that needs replacing when the sensor degrades.
      </p>
      <p>
        QR code attendance has emerged as a genuine alternative. Not a gimmick — a practical
        option that works better for certain kinds of businesses. Here&apos;s an honest
        comparison of both.
      </p>

      <h2>The real problem with biometric machines in Nepal</h2>
      <p>
        The most common biometric devices sold here use fingerprint scanners. They work
        reliably for office workers in clean environments. They start failing when your
        situation is different from that.
      </p>
      <p>
        Staff who work with their hands — construction, manufacturing, food service,
        cleaning — often have rough or calloused fingers that don&apos;t scan consistently.
        Dust and humidity degrade the sensor faster than the manufacturer&apos;s specs
        suggest. And the failure mode is never clean: the device starts partially working,
        some staff can scan and others can&apos;t, manual overrides creep in, and now you
        have a mix of automated and manual records that someone has to reconcile at the end
        of the month.
      </p>
      <p>
        The multi-branch problem is the bigger one for growing businesses. Each location
        needs its own device. Each device stores data locally. Getting that data consolidated
        means someone exporting files, emailing them to head office, and someone else merging
        them in Excel — every month. If you have three branches, that&apos;s a process
        running three times and depending on three people remembering to do it on time.
      </p>

      <h2>What buddy-punching actually looks like — and how QR handles it</h2>
      <p>
        Buddy-punching — one employee clocking in on behalf of another — is a real problem,
        especially in shift-based roles with loose supervision. This is the strongest
        argument for biometric: you cannot hand your fingerprint to a friend.
      </p>
      <p>
        QR code attendance addresses this differently, and it works. Modern attendance apps
        use rotating QR codes — the code refreshes every 60 to 90 seconds. The code on the
        office display at 9:01 AM is already expired by 9:03 AM. It can&apos;t be
        photographed and shared in a WhatsApp group for remote use; it requires physical
        presence close enough to read the live display.
      </p>
      <p>
        This solves buddy-punching just as effectively as biometric, without any hardware.
        The threat model is addressed directly.
      </p>

      <h2>The cost comparison</h2>
      <p>
        A decent fingerprint attendance device in Nepal runs between Rs 8,000 and Rs 35,000
        depending on brand and capacity, plus installation, networking, and software to
        extract reports. For a single office that&apos;s manageable. For five branches
        you&apos;re looking at serious upfront spend plus ongoing maintenance across all
        five devices.
      </p>
      <p>
        QR attendance is software only. No hardware beyond a tablet or monitor to display
        the rotating code — something most offices already have. A monthly or annual
        software subscription, and that&apos;s it. The math shifts significantly when you
        factor in branch count and the maintenance cost of physical devices over three to
        five years.
      </p>

      <h2>When biometric is still the right choice</h2>
      <p>
        Being fair: biometric makes sense in specific situations.
      </p>
      <p>
        A single large site with 200+ employees where device throughput matters — a factory
        gate where 150 people are clocking in within a 15-minute window. Locations with
        genuinely unreliable internet where you need offline-first record storage. Businesses
        where the biometric integration with existing payroll is already set up and working,
        and the cost of switching outweighs the friction of the current system.
      </p>
      <p>
        If none of those describe your situation, QR code attendance is almost certainly
        simpler, cheaper, and more flexible — especially for businesses running or planning
        to run multiple locations.
      </p>

      <h2>The field work angle</h2>
      <p>
        Biometric can never work outside your fixed office. A sales rep making calls in
        Pokhara, a delivery driver starting their route from a depot, a construction crew
        clocking in at a site — biometric is useless for all of these. QR works from any
        location you decide it should: one fixed office code, or a manager-generated code
        for a field assignment.
      </p>
      <p>
        That flexibility matters as soon as any part of your workforce isn&apos;t
        office-bound. It&apos;s one of the reasons QR attendance has grown quickly in Nepal
        over the last few years — businesses realized that biometric only solves the problem
        for employees who are physically in one place.
      </p>

      <h2>The bottom line</h2>
      <p>
        For most small and mid-sized businesses in Nepal — under 100 employees, possibly
        multi-location, with some staff working outside the office — QR code attendance is
        the better choice. It costs less, requires no hardware maintenance, handles multiple
        branches natively, and solves buddy-punching just as well when built with rotating
        codes.
      </p>
      <p>
        If you already have a biometric machine that&apos;s working, keep using it until
        it doesn&apos;t. If you&apos;re setting up fresh or expanding to another location,
        QR is worth a serious look before you buy another fingerprint reader.
      </p>
    </div>
  )
}
