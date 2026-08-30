import { AlertTriangle, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { Button } from '../../components/ui/Button'
import { clearPatientIdentity, getPatientIdentity, setPatientIdentity } from '../../lib/patientIdentity'

function SubPageHeader({ title }: { title: string }) {
  return (
    <>
      <BackLink label="Profile" />
      <h1 className="mb-5 font-display text-2xl font-bold text-[var(--color-text)]">{title}</h1>
    </>
  )
}

export function EditProfilePage() {
  const navigate = useNavigate()
  const identity = getPatientIdentity()
  const [name, setName] = useState(identity?.name ?? '')
  const [phone, setPhone] = useState(identity?.phone ?? '')

  return (
    <div className="animate-rise-in">
      <SubPageHeader title="Edit Profile" />
      <div className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          type="tel"
          className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
        />
        <Button
          size="lg"
          disabled={!name.trim()}
          onClick={() => {
            setPatientIdentity({ name: name.trim(), phone: phone.trim() || undefined })
            navigate('/profile', { replace: true })
          }}
        >
          Save changes
        </Button>
      </div>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <SubPageHeader title="Privacy Policy" />
      <PolicySection title="1. Information we collect">
        We collect the name, phone number, and queue/visit information you provide when getting a
        token through VisitNow.
      </PolicySection>
      <PolicySection title="2. How we use your information">
        Your information is used to create your token, show your position in a doctor's queue, and
        let the clinic verify your visit.
      </PolicySection>
      <PolicySection title="3. Data & this prototype">
        This is a product prototype. Data entered here is used only to demonstrate the VisitNow
        experience and is not sold or shared with third parties.
      </PolicySection>
      <PolicySection title="4. Contact">
        Questions about this policy can be sent through Contact Us.
      </PolicySection>
    </div>
  )
}

export function TermsPage() {
  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <SubPageHeader title="Terms & Conditions" />
      <PolicySection title="1. The service">
        VisitNow lets you get a digital token for a participating doctor's queue and track it
        remotely. It does not replace the clinic's own medical judgment or scheduling.
      </PolicySection>
      <PolicySection title="2. Token fees">
        The clinic's token fee belongs to the clinic. VisitNow's own platform fee (₹9) is separate
        and covers the service of issuing and tracking your token.
      </PolicySection>
      <PolicySection title="3. No guarantee of wait time">
        Estimated wait times are approximate, based on the doctor's current pace, and are not a
        guarantee of when you will be seen.
      </PolicySection>
      <PolicySection title="4. Prototype disclaimer">
        This is a demonstration product. Doctors, clinics, and queue data shown may be for
        demonstration purposes only.
      </PolicySection>
    </div>
  )
}

export function ContactPage() {
  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <SubPageHeader title="Contact Us" />
      <p className="text-sm text-[var(--color-text-muted)]">We're here to help. Reach out anytime.</p>
      <div className="flex flex-col gap-3">
        <ContactRow icon={Mail} label="Email" value="support@visitnow.app" />
        <ContactRow icon={Phone} label="Phone" value="+91 98765 43210" />
        <ContactRow icon={MapPin} label="Address" value="Hyderabad, Telangana, India" />
      </div>
    </div>
  )
}

export function DeleteProfilePage() {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)

  const deleteProfile = () => {
    clearPatientIdentity()
    navigate('/', { replace: true })
  }

  return (
    <div className="animate-rise-in flex flex-col gap-5">
      <SubPageHeader title="Delete Profile" />
      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-danger)]/25 bg-[var(--color-danger-bg)] p-4">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
        <p className="text-sm text-[var(--color-danger)]">
          This removes your saved name and phone number from this device. It won't cancel any
          active visit already in a doctor's queue. Visit the Visits tab first if you need to
          cancel one.
        </p>
      </div>

      {!confirming ? (
        <Button variant="danger" size="lg" onClick={() => setConfirming(true)}>
          Delete my profile
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">Are you sure?</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={deleteProfile}>
              Yes, delete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PolicySection({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-bold text-[var(--color-text)]">{title}</h2>
      <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{children}</p>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--color-text)]">{value}</p>
      </div>
    </div>
  )
}
