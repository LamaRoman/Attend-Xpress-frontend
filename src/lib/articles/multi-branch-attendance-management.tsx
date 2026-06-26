export default function Content() {
  return (
    <div className="prose-article">
      <p>
        There&apos;s a specific point in a business&apos;s growth where attendance goes from
        &quot;solved&quot; to &quot;a recurring headache.&quot; It&apos;s the second branch.
      </p>
      <p>
        One location is easy. A device on the wall or a QR code at the door, one person
        pulling the report at month-end, done. The moment you open a second location — and
        especially a third, fourth, fifth — the whole thing changes character. Suddenly
        you&apos;re consolidating data from multiple sources, chasing branch managers for
        their reports, and finding out on the 3rd of the month that one branch&apos;s numbers
        don&apos;t add up.
      </p>

      <h2>How the pain actually shows up</h2>
      <p>
        The typical multi-branch attendance setup, before someone fixes it properly, looks
        like this: each branch has its own attendance device or its own register. Each
        branch produces its own report. Head office collects these reports — by email, by
        WhatsApp, sometimes by someone physically carrying a USB drive — and someone in HR
        merges them into a master Excel file.
      </p>
      <p>
        Every step in that chain is a place where things break. A branch manager forgets to
        send the report. Someone sends last month&apos;s file by mistake. The formats
        don&apos;t match because two branches use slightly different templates. A formula
        in the master sheet breaks when someone pastes data in the wrong column. Payroll is
        waiting on this consolidation, so every delay in attendance is a delay in salary.
      </p>
      <p>
        The person doing the merging spends the first three days of every month on it. That
        work produces nothing new — it&apos;s just moving data from five places into one
        place. And it has to happen again next month.
      </p>

      <h2>What &quot;built for multi-branch&quot; actually means</h2>
      <p>
        Software that genuinely handles multiple branches doesn&apos;t consolidate reports —
        it never separates the data in the first place. Every branch records into the same
        system. Head office sees all branches in one dashboard, in real time, without anyone
        sending anything to anyone.
      </p>
      <p>
        That&apos;s the core shift: no consolidation step, because there&apos;s nothing to
        consolidate. The data was always in one place.
      </p>
      <p>
        But that&apos;s only the start. Real multi-branch support has to handle the fact that
        branches aren&apos;t identical.
      </p>

      <h2>Branches are different from each other — the software has to know that</h2>
      <p>
        Your Kathmandu head office and your Biratnagar branch probably don&apos;t have the
        same working hours. Different branches may observe some different local holidays. The
        branch manager in Pokhara should be able to see and manage their own staff, but
        not the staff in Butwal.
      </p>
      <p>
        This is where a lot of &quot;multi-branch&quot; software falls short. It lets you tag
        employees with a branch name, but it treats every branch the same underneath.
        Genuinely multi-branch software lets each branch have:
      </p>
      <p>
        <strong>Its own geofence.</strong> If you use location-based clock-in, each
        branch&apos;s physical location is different. The geofence that defines &quot;at
        work&quot; for the Kathmandu office is useless for the Birgunj office. Each location
        needs its own boundary.
      </p>
      <p>
        <strong>Its own working schedule.</strong> Opening hours, shift patterns, weekend
        definitions — these can vary by branch, and the attendance rules need to follow.
      </p>
      <p>
        <strong>Its own admins.</strong> A branch manager should manage their branch. They
        shouldn&apos;t see or be able to change other branches&apos; data. The org admin at
        head office sees everything; branch admins see their slice.
      </p>
      <p>
        <strong>Roll-up reporting.</strong> Head office needs both views: each branch
        individually, and the whole organization combined. Without consolidating anything
        manually — the system produces both because the data lives in one structure.
      </p>

      <h2>The permission layer people forget</h2>
      <p>
        When you have one branch, everyone with access sees everything, and that&apos;s fine.
        With multiple branches, who-sees-what becomes a real requirement, and it&apos;s
        usually discovered too late.
      </p>
      <p>
        A branch manager who can accidentally edit another branch&apos;s attendance is a
        problem. An org admin who can&apos;t get a combined view across all branches is a
        problem. The role structure — org admin, branch admin, accountant, employee, each
        seeing the appropriate scope — needs to exist from the start, not get bolted on when
        someone notices the gap.
      </p>
      <p>
        This matters for payroll especially. Your accountant needs the combined view to
        process organization-wide payroll. Your branch managers need their own view to manage
        day-to-day. Those are different permission levels looking at the same underlying data.
      </p>

      <h2>What changes when you fix this</h2>
      <p>
        The most immediate change is that month-end stops being a fire drill. There&apos;s no
        consolidation, so there&apos;s no waiting on branch managers, no merging, no
        format mismatches. Payroll runs on data that&apos;s already complete and already in
        one place.
      </p>
      <p>
        The second change is visibility. Head office can look at any branch any day of the
        month, not just when the report finally arrives. A branch with an attendance problem
        — chronic late arrivals, an unusual absence pattern — is visible immediately, not
        discovered a month later.
      </p>
      <p>
        The third is that adding a branch stops being a project. When your sixth branch opens,
        you create it in the system, set its hours and geofence, assign its manager, and
        it&apos;s producing data into the same dashboard as the other five. No new device
        procurement, no new report template, no new step in the month-end chain.
      </p>
      <p>
        If you&apos;re running attendance across multiple locations and month-end
        consolidation is eating the first week of every month, the problem isn&apos;t your
        process discipline. It&apos;s that the data was split across systems that were never
        designed to be one. That&apos;s fixable.
      </p>
    </div>
  )
}
